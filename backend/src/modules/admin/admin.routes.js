import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { adminAuditLogs, adminRestrictions, emailDeliveryLogs, emailServiceBlocks, refreshTokens, supportTicketInternalNotes, supportTicketMessages, supportTickets, users } from '../../db/schema.js';
import { cleanupOldAnalyticsEvents, recordAdminAuditLog } from '../analytics/analytics.service.js';
import { createNotification } from '../../shared/utils/notification-helper.js';
import { sendSupportEmail } from '../../shared/services/email.service.js';
import {
  applyContentAction,
  changeUserRole,
  changeUserStatus,
  editUser,
  inviteUser,
  setEmailServiceBlock,
  setUserRestrictions
} from './admin-controls.service.js';
import { finalizeMonthlyLeaderboard, getLeaderboard } from '../squads/squad-leaderboard.service.js';

const ACCESS_TOKEN_BLACKLIST_TTL_SECONDS = 15 * 60;
const REDIS_DISPATCH_WINDOW_MS = 200;

const paramsSchema = z.object({
  userId: z.string().uuid()
});

const leaderboardQuerySchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/).optional()
});

const finalizeLeaderboardSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  action: z.enum(['publish_top_3', 'approve', 'disqualify', 'promote_next_eligible']).optional(),
  squadId: z.string().uuid().optional(),
  approvedSquadIds: z.array(z.string().uuid()).max(3).optional(),
  disqualifiedSquadIds: z.array(z.string().uuid()).optional()
});

const cleanupAnalyticsSchema = z.object({
  retentionDays: z.coerce.number().int().min(30).max(365).default(90)
});

const inviteUserSchema = z.object({
  email: z.string().trim().email(),
  name: z.string().trim().max(120).optional().nullable(),
  role: z.enum(['user', 'admin']).default('user'),
  reason: z.string().trim(),
  confirmTarget: z.string().trim().optional(),
  confirmEmail: z.string().trim().optional()
});

const editUserSchema = z.object({
  email: z.string().trim().email().optional(),
  name: z.string().trim().max(120).optional().nullable(),
  reason: z.string().trim(),
  confirmTarget: z.string().trim().optional()
});

const roleSchema = z.object({
  role: z.enum(['user', 'admin']),
  reason: z.string().trim(),
  confirmTarget: z.string().trim()
});

const statusSchema = z.object({
  status: z.enum(['active', 'restricted', 'blocked', 'deactivated']),
  reason: z.string().trim(),
  confirmTarget: z.string().trim().optional()
});

const restrictionsSchema = z.object({
  reason: z.string().trim(),
  confirmTarget: z.string().trim().optional(),
  restrictions: z.array(z.object({
    feature: z.string().trim(),
    isRestricted: z.boolean(),
    expiresAt: z.string().datetime().optional().nullable()
  })).min(1).max(20)
});

const contentParamsSchema = z.object({
  contentType: z.string().trim(),
  contentId: z.string().trim().min(1)
});

const contentActionSchema = z.object({
  action: z.enum(['hide', 'unhide', 'delete']),
  reason: z.string().trim(),
  confirmTarget: z.string().trim()
});

const supportParamsSchema = z.object({
  ticketId: z.string().uuid()
});

const supportReplySchema = z.object({
  message: z.string().trim().min(2).max(4000)
});

const supportUpdateSchema = z.object({
  status: z.enum(['open', 'pending_admin', 'waiting_user', 'resolved', 'closed']).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  reason: z.string().trim().min(6).max(1000)
});

const supportAssignSchema = z.object({
  assignedAdminId: z.string().uuid().optional().nullable(),
  assignToMe: z.boolean().optional(),
  reason: z.string().trim().min(6).max(1000)
});

const supportInternalNoteSchema = z.object({
  note: z.string().trim().min(2).max(4000)
});

const emailServiceBlockSchema = z.object({
  email: z.string().trim().email(),
  isBlocked: z.boolean(),
  reason: z.string().trim(),
  confirmTarget: z.string().trim().optional(),
  confirmEmail: z.string().trim().optional()
});

function sendAdminError(reply, error, fallbackMessage) {
  const statusCode = error.name === 'ZodError' ? 400 : error.statusCode || 500;
  return reply.code(statusCode).send({
    success: false,
    error: error.message || fallbackMessage
  });
}

function wait(durationMs) {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
}

async function getSupportTicketWithUser(db, ticketId) {
  const rows = await db
    .select({
      id: supportTickets.id,
      userId: supportTickets.userId,
      contactEmail: supportTickets.contactEmail,
      subject: supportTickets.subject,
      status: supportTickets.status,
      priority: supportTickets.priority,
      userEmail: users.email,
      userName: users.name
    })
    .from(supportTickets)
    .leftJoin(users, eq(supportTickets.userId, users.id))
    .where(eq(supportTickets.id, ticketId))
    .limit(1);

  return rows[0] || null;
}

async function isSupportEmailBlocked(db, email) {
  if (!email) return false;
  const rows = await db
    .select({ id: emailServiceBlocks.id })
    .from(emailServiceBlocks)
    .where(and(eq(emailServiceBlocks.email, email), eq(emailServiceBlocks.isBlocked, true)))
    .limit(1);
  return Boolean(rows[0]);
}

function sendSupportUpdateEmail({ db, request, ticket, subject, title, message, logType }) {
  const email = ticket.userEmail || ticket.contactEmail;
  if (!email) return;

  void (async () => {
    try {
      const blocked = await isSupportEmailBlocked(db, email);
      if (blocked) {
        return;
      }

      await sendSupportEmail({
        db,
        request,
        email,
        name: ticket.userName,
        userId: ticket.userId,
        subject,
        title,
        message,
        ticketSubject: ticket.subject,
        logType
      });
    } catch (error) {
      request.log?.warn?.({ error }, 'Support email notification failed');
    }
  })();
}

export default async function adminRoutes(app) {
  app.post('/support/:ticketId/reply', async (request, reply) => {
    try {
      const { ticketId } = supportParamsSchema.parse(request.params || {});
      const body = supportReplySchema.parse(request.body || {});
      const db = request.server.db;

      if (!db) {
        return reply.code(503).send({ success: false, error: 'Database is not configured yet.' });
      }

      const ticket = await getSupportTicketWithUser(db, ticketId);
      if (!ticket) {
        return reply.code(404).send({ success: false, error: 'Support ticket was not found.' });
      }

      const [message] = await db
        .insert(supportTicketMessages)
        .values({
          ticketId,
          senderUserId: request.auth.userId,
          senderRole: 'admin',
          message: body.message
        })
        .returning();

      await db
        .update(supportTickets)
        .set({
          status: 'waiting_user',
          updatedAt: new Date(),
          lastAdminReplyAt: new Date()
        })
        .where(eq(supportTickets.id, ticketId));

      if (ticket.userId) {
        createNotification(db, {
          userId: ticket.userId,
          type: 'support_ticket_reply',
          actorId: request.auth.userId,
          entityId: ticket.id,
          entityType: 'support_ticket',
          message: `Admin replied to your support ticket: ${ticket.subject}`
        });
      }

      sendSupportUpdateEmail({
        db,
        request,
        ticket,
        subject: `Aptico support replied: ${ticket.subject}`,
        title: 'Admin replied to your support ticket',
        message: body.message,
        logType: 'support_ticket_reply'
      });

      await recordAdminAuditLog({
        db,
        request,
        adminUserId: request.auth.userId,
        action: 'support_ticket_reply',
        targetType: 'support_ticket',
        targetId: ticket.id,
        metadata: { subject: ticket.subject }
      });

      return reply.code(201).send({ success: true, data: message });
    } catch (error) {
      return sendAdminError(reply, error, 'Could not reply to support ticket.');
    }
  });

  app.patch('/support/:ticketId', async (request, reply) => {
    try {
      const { ticketId } = supportParamsSchema.parse(request.params || {});
      const body = supportUpdateSchema.parse(request.body || {});
      const db = request.server.db;

      if (!db) {
        return reply.code(503).send({ success: false, error: 'Database is not configured yet.' });
      }

      const ticket = await getSupportTicketWithUser(db, ticketId);
      if (!ticket) {
        return reply.code(404).send({ success: false, error: 'Support ticket was not found.' });
      }

      const updates = { updatedAt: new Date() };
      if (body.status) updates.status = body.status;
      if (body.priority) updates.priority = body.priority;
      if (body.status === 'resolved') updates.resolvedAt = new Date();
      if (body.status === 'closed') updates.closedAt = new Date();
      if (body.status === 'open') {
        updates.resolvedAt = null;
        updates.closedAt = null;
      }
      if (body.priority === 'urgent') updates.escalatedAt = new Date();

      const [updated] = await db
        .update(supportTickets)
        .set(updates)
        .where(eq(supportTickets.id, ticketId))
        .returning();

      if (body.status && body.status !== ticket.status) {
        if (ticket.userId) {
          createNotification(db, {
            userId: ticket.userId,
            type: 'support_ticket_status',
            actorId: request.auth.userId,
            entityId: ticket.id,
            entityType: 'support_ticket',
            message: `Your support ticket "${ticket.subject}" is now ${body.status.replaceAll('_', ' ')}.`
          });
        }

        sendSupportUpdateEmail({
          db,
          request,
          ticket,
          subject: `Aptico support status updated: ${ticket.subject}`,
          title: 'Support ticket status updated',
          message: `Your support ticket is now ${body.status.replaceAll('_', ' ')}.\n\nReason: ${body.reason}`,
          logType: 'support_ticket_status'
        });
      }

      await recordAdminAuditLog({
        db,
        request,
        adminUserId: request.auth.userId,
        action: 'support_ticket_update',
        targetType: 'support_ticket',
        targetId: ticket.id,
        metadata: {
          reason: body.reason,
          status: body.status || ticket.status,
          priority: body.priority || ticket.priority
        }
      });

      return reply.send({ success: true, data: updated });
    } catch (error) {
      return sendAdminError(reply, error, 'Could not update support ticket.');
    }
  });

  app.post('/support/:ticketId/assign', async (request, reply) => {
    try {
      const { ticketId } = supportParamsSchema.parse(request.params || {});
      const body = supportAssignSchema.parse(request.body || {});
      const db = request.server.db;

      if (!db) {
        return reply.code(503).send({ success: false, error: 'Database is not configured yet.' });
      }

      const ticket = await getSupportTicketWithUser(db, ticketId);
      if (!ticket) {
        return reply.code(404).send({ success: false, error: 'Support ticket was not found.' });
      }

      const assignedAdminId = body.assignToMe ? request.auth.userId : body.assignedAdminId || null;
      const [updated] = await db
        .update(supportTickets)
        .set({
          assignedAdminId,
          assignedAt: assignedAdminId ? new Date() : null,
          updatedAt: new Date()
        })
        .where(eq(supportTickets.id, ticketId))
        .returning();

      await recordAdminAuditLog({
        db,
        request,
        adminUserId: request.auth.userId,
        action: 'support_ticket_assign',
        targetType: 'support_ticket',
        targetId: ticket.id,
        metadata: { reason: body.reason, assignedAdminId }
      });

      return reply.send({ success: true, data: updated });
    } catch (error) {
      return sendAdminError(reply, error, 'Could not assign support ticket.');
    }
  });

  app.post('/support/:ticketId/internal-notes', async (request, reply) => {
    try {
      const { ticketId } = supportParamsSchema.parse(request.params || {});
      const body = supportInternalNoteSchema.parse(request.body || {});
      const db = request.server.db;

      if (!db) {
        return reply.code(503).send({ success: false, error: 'Database is not configured yet.' });
      }

      const ticket = await getSupportTicketWithUser(db, ticketId);
      if (!ticket) {
        return reply.code(404).send({ success: false, error: 'Support ticket was not found.' });
      }

      const [note] = await db
        .insert(supportTicketInternalNotes)
        .values({
          ticketId,
          adminUserId: request.auth.userId,
          note: body.note
        })
        .returning();

      await recordAdminAuditLog({
        db,
        request,
        adminUserId: request.auth.userId,
        action: 'support_internal_note',
        targetType: 'support_ticket',
        targetId: ticket.id,
        metadata: { noteLength: body.note.length }
      });

      return reply.code(201).send({ success: true, data: note });
    } catch (error) {
      return sendAdminError(reply, error, 'Could not add internal support note.');
    }
  });

  app.post('/email-service/block', async (request, reply) => {
    try {
      const body = emailServiceBlockSchema.parse(request.body || {});
      if (!request.server.db) {
        return reply.code(503).send({ success: false, error: 'Database is not configured yet.' });
      }

      const block = await setEmailServiceBlock({
        db: request.server.db,
        request,
        adminUserId: request.auth.userId,
        payload: body
      });

      return reply.send({ success: true, data: block });
    } catch (error) {
      return sendAdminError(reply, error, 'Could not update email service access.');
    }
  });

  app.post('/users/invite', async (request, reply) => {
    try {
      const body = inviteUserSchema.parse(request.body || {});
      if (!request.server.db) {
        return reply.code(503).send({ success: false, error: 'Database is not configured yet.' });
      }

      const user = await inviteUser({
        db: request.server.db,
        request,
        adminUserId: request.auth.userId,
        payload: body
      });

      return reply.code(201).send({ success: true, data: user });
    } catch (error) {
      return sendAdminError(reply, error, 'Could not invite user.');
    }
  });

  app.patch('/users/:userId', async (request, reply) => {
    try {
      const { userId } = paramsSchema.parse(request.params || {});
      const body = editUserSchema.parse(request.body || {});
      if (!request.server.db) {
        return reply.code(503).send({ success: false, error: 'Database is not configured yet.' });
      }

      const user = await editUser({
        db: request.server.db,
        request,
        adminUserId: request.auth.userId,
        userId,
        payload: body
      });

      return reply.send({ success: true, data: user });
    } catch (error) {
      return sendAdminError(reply, error, 'Could not edit user.');
    }
  });

  app.post('/users/:userId/role', async (request, reply) => {
    try {
      const { userId } = paramsSchema.parse(request.params || {});
      const body = roleSchema.parse(request.body || {});
      if (!request.server.db) {
        return reply.code(503).send({ success: false, error: 'Database is not configured yet.' });
      }

      const user = await changeUserRole({
        db: request.server.db,
        request,
        adminUserId: request.auth.userId,
        userId,
        payload: body
      });

      return reply.send({ success: true, data: user });
    } catch (error) {
      return sendAdminError(reply, error, 'Could not change user role.');
    }
  });

  app.post('/users/:userId/status', async (request, reply) => {
    try {
      const { userId } = paramsSchema.parse(request.params || {});
      const body = statusSchema.parse(request.body || {});
      if (!request.server.db) {
        return reply.code(503).send({ success: false, error: 'Database is not configured yet.' });
      }

      const user = await changeUserStatus({
        db: request.server.db,
        request,
        adminUserId: request.auth.userId,
        userId,
        payload: body
      });

      return reply.send({ success: true, data: user });
    } catch (error) {
      return sendAdminError(reply, error, 'Could not change user status.');
    }
  });

  app.post('/users/:userId/restrictions', async (request, reply) => {
    try {
      const { userId } = paramsSchema.parse(request.params || {});
      const body = restrictionsSchema.parse(request.body || {});
      if (!request.server.db) {
        return reply.code(503).send({ success: false, error: 'Database is not configured yet.' });
      }

      const restrictions = await setUserRestrictions({
        db: request.server.db,
        request,
        adminUserId: request.auth.userId,
        userId,
        payload: body
      });

      return reply.send({ success: true, data: restrictions });
    } catch (error) {
      return sendAdminError(reply, error, 'Could not change user restrictions.');
    }
  });

  app.post('/content/:contentType/:contentId/action', async (request, reply) => {
    try {
      const params = contentParamsSchema.parse(request.params || {});
      const body = contentActionSchema.parse(request.body || {});
      if (!request.server.db) {
        return reply.code(503).send({ success: false, error: 'Database is not configured yet.' });
      }

      const result = await applyContentAction({
        db: request.server.db,
        request,
        adminUserId: request.auth.userId,
        contentType: params.contentType,
        contentId: params.contentId,
        payload: body
      });

      return reply.send({ success: true, data: result });
    } catch (error) {
      return sendAdminError(reply, error, 'Could not moderate content.');
    }
  });

  app.get('/squad-leaderboard', async (request, reply) => {
    try {
      const query = leaderboardQuerySchema.parse(request.query || {});
      const db = request.server.db;

      if (!db) {
        return reply.code(503).send({
          success: false,
          error: 'Database is not configured yet.'
        });
      }

      const leaderboard = await getLeaderboard(db, {
        period: query.period,
        limit: 100
      });

      return reply.send({
        success: true,
        data: leaderboard
      });
    } catch (error) {
      const statusCode = error.name === 'ZodError' ? 400 : error.statusCode || 500;
      return reply.code(statusCode).send({
        success: false,
        error: error.message || 'Could not load squad leaderboard review.'
      });
    }
  });

  app.post('/squad-leaderboard/finalize', async (request, reply) => {
    try {
      const body = finalizeLeaderboardSchema.parse(request.body || {});
      const db = request.server.db;

      if (!db) {
        return reply.code(503).send({
          success: false,
          error: 'Database is not configured yet.'
        });
      }

      const leaderboard = await finalizeMonthlyLeaderboard(db, {
        period: body.period,
        approvedBy: request.auth.userId,
        action: body.action || 'publish_top_3',
        squadId: body.squadId || null,
        approvedSquadIds: body.approvedSquadIds || null,
        disqualifiedSquadIds: body.disqualifiedSquadIds || []
      });

      await recordAdminAuditLog({
        db,
        request,
        adminUserId: request.auth.userId,
        action: 'squad_leaderboard_finalize',
        targetType: 'squad_leaderboard',
        targetId: body.squadId || body.period || null,
        metadata: {
          period: body.period,
          action: body.action || 'publish_top_3',
          approvedCount: body.approvedSquadIds?.length || 0,
          disqualifiedCount: body.disqualifiedSquadIds?.length || 0
        }
      });

      return reply.send({
        success: true,
        data: leaderboard
      });
    } catch (error) {
      const statusCode = error.name === 'ZodError' ? 400 : error.statusCode || 500;
      return reply.code(statusCode).send({
        success: false,
        error: error.message || 'Could not finalize squad leaderboard.'
      });
    }
  });

  app.post('/revoke/:userId', async (request, reply) => {
    const startedAt = Date.now();

    try {
      const { userId } = paramsSchema.parse(request.params || {});
      const db = request.server.db;
      const redis = request.server.services?.redis;

      if (!db) {
        return reply.code(503).send({
          success: false,
          error: 'Database is not configured yet.'
        });
      }

      if (!redis?.isConfigured?.()) {
        return reply.code(503).send({
          success: false,
          error: 'Redis is not configured yet.'
        });
      }

      const activeSessions = await db
        .select({
          id: refreshTokens.id,
          accessTokenJti: refreshTokens.accessTokenJti
        })
        .from(refreshTokens)
        .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));

      if (activeSessions.length) {
        const blacklistWrites = Promise.allSettled(
          activeSessions.map((session) =>
            redis.set(`revoked_jwt:${session.accessTokenJti}`, userId, ACCESS_TOKEN_BLACKLIST_TTL_SECONDS)
          )
        );

        await Promise.race([blacklistWrites, wait(REDIS_DISPATCH_WINDOW_MS)]);

        await db
          .update(refreshTokens)
          .set({
            revokedAt: new Date()
          })
          .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
      }

      await recordAdminAuditLog({
        db,
        request,
        adminUserId: request.auth.userId,
        action: 'revoke_user_sessions',
        targetType: 'user',
        targetId: userId,
        metadata: {
          revokedSessionCount: activeSessions.length
        }
      });

      return reply.send({
        success: true,
        data: {
          userId,
          revokedSessionCount: activeSessions.length,
          completedInMs: Date.now() - startedAt
        }
      });
    } catch (error) {
      const statusCode = error.name === 'ZodError' ? 400 : error.statusCode || 500;
      return reply.code(statusCode).send({
        success: false,
        error: error.message || 'Admin revoke failed.'
      });
    }
  });

  app.post('/analytics/cleanup', async (request, reply) => {
    try {
      const body = cleanupAnalyticsSchema.parse(request.body || {});
      const db = request.server.db;

      if (!db) {
        return reply.code(503).send({
          success: false,
          error: 'Database is not configured yet.'
        });
      }

      const result = await cleanupOldAnalyticsEvents(db, body.retentionDays);

      await recordAdminAuditLog({
        db,
        request,
        adminUserId: request.auth.userId,
        action: 'analytics_cleanup',
        targetType: 'analytics_events',
        metadata: {
          retentionDays: body.retentionDays,
          deletedCount: result.deletedCount
        }
      });

      return reply.send({
        success: true,
        data: result
      });
    } catch (error) {
      const statusCode = error.name === 'ZodError' ? 400 : error.statusCode || 500;
      return reply.code(statusCode).send({
        success: false,
        error: error.message || 'Analytics cleanup failed.'
      });
    }
  });
}
