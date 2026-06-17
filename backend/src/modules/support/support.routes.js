import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { emailServiceBlocks, supportTicketMessages, supportTickets, users } from '../../db/schema.js';
import { authenticateRequest } from '../../shared/middleware/auth.middleware.js';

export const SUPPORT_CATEGORIES = [
  'account_restriction',
  'feature_restriction_appeal',
  'email_access',
  'job_search',
  'analysis',
  'squad_community',
  'bug_report',
  'feedback',
  'other'
];

export const SUPPORT_STATUSES = ['open', 'pending_admin', 'waiting_user', 'resolved', 'closed'];
export const SUPPORT_PRIORITIES = ['low', 'normal', 'high', 'urgent'];

const ticketBodySchema = z.object({
  category: z.enum(SUPPORT_CATEGORIES),
  subject: z.string().trim().min(6).max(160),
  message: z.string().trim().min(12).max(4000),
  relatedFeature: z.string().trim().max(100).optional().nullable()
});

const publicTicketBodySchema = ticketBodySchema.extend({
  email: z.string().trim().email().transform((value) => value.toLowerCase())
});

const messageBodySchema = z.object({
  message: z.string().trim().min(2).max(4000)
});

const ticketParamsSchema = z.object({
  ticketId: z.string().uuid()
});

function sendSupportError(reply, error, fallbackMessage) {
  const statusCode = error.name === 'ZodError' ? 400 : error.statusCode || 500;
  return reply.code(statusCode).send({
    success: false,
    error: error.message || fallbackMessage
  });
}

function serializeTicket(row) {
  return {
    id: row.id,
    userId: row.userId,
    userEmail: row.userEmail,
    userName: row.userName,
    category: row.category,
    subject: row.subject,
    message: row.message,
    status: row.status,
    priority: row.priority,
    relatedFeature: row.relatedFeature,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    lastAdminReplyAt: row.lastAdminReplyAt,
    lastUserReplyAt: row.lastUserReplyAt
  };
}

async function findUserTicket(db, ticketId, userId) {
  const rows = await db
    .select()
    .from(supportTickets)
    .where(and(eq(supportTickets.id, ticketId), eq(supportTickets.userId, userId)))
    .limit(1);

  return rows[0] || null;
}

async function findUserByEmail(db, email) {
  const rows = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return rows[0] || null;
}

async function getEmailServiceBlock(db, email) {
  const rows = await db
    .select({ id: emailServiceBlocks.id, reason: emailServiceBlocks.reason })
    .from(emailServiceBlocks)
    .where(and(eq(emailServiceBlocks.email, email), eq(emailServiceBlocks.isBlocked, true)))
    .limit(1);

  return rows[0] || null;
}

export default async function supportRoutes(app) {
  app.post('/public/tickets', async (request, reply) => {
    try {
      const body = publicTicketBodySchema.parse(request.body || {});
      const db = request.server.db;

      if (!db) {
        return reply.code(503).send({ success: false, error: 'Database is not configured yet.' });
      }

      const [matchedUser, emailBlock] = await Promise.all([
        findUserByEmail(db, body.email),
        getEmailServiceBlock(db, body.email)
      ]);
      const now = new Date();
      const [ticket] = await db
        .insert(supportTickets)
        .values({
          userId: matchedUser?.id || null,
          contactEmail: body.email,
          isPublic: true,
          category: body.category,
          subject: body.subject,
          message: body.message,
          relatedFeature: body.relatedFeature || null,
          status: 'open',
          priority: 'normal',
          lastUserReplyAt: now,
          updatedAt: now,
          emailServiceBlockedAtSubmit: emailBlock ? now : null
        })
        .returning();

      await db.insert(supportTicketMessages).values({
        ticketId: ticket.id,
        senderUserId: matchedUser?.id || null,
        senderRole: 'user',
        message: body.message
      });

      return reply.code(201).send({
        success: true,
        data: {
          id: ticket.id,
          emailServiceBlocked: Boolean(emailBlock),
          message: emailBlock
            ? 'Support request submitted. Email updates are disabled for this address, so please use the app or wait for admin follow-up.'
            : 'Support request submitted. If email updates are available, admin replies may be sent to your inbox.'
        }
      });
    } catch (error) {
      return sendSupportError(reply, error, 'Could not create public support ticket.');
    }
  });

  app.get('/tickets', { preHandler: authenticateRequest }, async (request, reply) => {
    try {
      const rows = await request.server.db
        .select({
          id: supportTickets.id,
          userId: supportTickets.userId,
          contactEmail: supportTickets.contactEmail,
          isPublic: supportTickets.isPublic,
          category: supportTickets.category,
          subject: supportTickets.subject,
          message: supportTickets.message,
          status: supportTickets.status,
          priority: supportTickets.priority,
          relatedFeature: supportTickets.relatedFeature,
          createdAt: supportTickets.createdAt,
          updatedAt: supportTickets.updatedAt,
          lastAdminReplyAt: supportTickets.lastAdminReplyAt,
          lastUserReplyAt: supportTickets.lastUserReplyAt,
          emailServiceBlockedAtSubmit: supportTickets.emailServiceBlockedAtSubmit
        })
        .from(supportTickets)
        .where(eq(supportTickets.userId, request.auth.userId))
        .orderBy(desc(supportTickets.updatedAt))
        .limit(100);

      return reply.send({ success: true, data: rows.map(serializeTicket) });
    } catch (error) {
      return sendSupportError(reply, error, 'Could not load support tickets.');
    }
  });

  app.post('/tickets', { preHandler: authenticateRequest }, async (request, reply) => {
    try {
      const body = ticketBodySchema.parse(request.body || {});
      const now = new Date();
      const rows = await request.server.db
        .insert(supportTickets)
        .values({
          userId: request.auth.userId,
          contactEmail: null,
          isPublic: false,
          category: body.category,
          subject: body.subject,
          message: body.message,
          relatedFeature: body.relatedFeature || null,
          status: 'open',
          priority: 'normal',
          lastUserReplyAt: now,
          updatedAt: now
        })
        .returning();

      const ticket = rows[0];
      await request.server.db.insert(supportTicketMessages).values({
        ticketId: ticket.id,
        senderUserId: request.auth.userId,
        senderRole: 'user',
        message: body.message
      });

      return reply.code(201).send({ success: true, data: ticket });
    } catch (error) {
      return sendSupportError(reply, error, 'Could not create support ticket.');
    }
  });

  app.get('/tickets/:ticketId', { preHandler: authenticateRequest }, async (request, reply) => {
    try {
      const { ticketId } = ticketParamsSchema.parse(request.params || {});
      const ticket = await findUserTicket(request.server.db, ticketId, request.auth.userId);

      if (!ticket) {
        return reply.code(404).send({ success: false, error: 'Support ticket was not found.' });
      }

      const messages = await request.server.db
        .select({
          id: supportTicketMessages.id,
          ticketId: supportTicketMessages.ticketId,
          senderUserId: supportTicketMessages.senderUserId,
          senderRole: supportTicketMessages.senderRole,
          message: supportTicketMessages.message,
          createdAt: supportTicketMessages.createdAt,
          senderName: users.name,
          senderEmail: users.email
        })
        .from(supportTicketMessages)
        .leftJoin(users, eq(supportTicketMessages.senderUserId, users.id))
        .where(eq(supportTicketMessages.ticketId, ticket.id))
        .orderBy(supportTicketMessages.createdAt);

      return reply.send({ success: true, data: { ticket, messages } });
    } catch (error) {
      return sendSupportError(reply, error, 'Could not load support ticket.');
    }
  });

  app.post('/tickets/:ticketId/messages', { preHandler: authenticateRequest }, async (request, reply) => {
    try {
      const { ticketId } = ticketParamsSchema.parse(request.params || {});
      const body = messageBodySchema.parse(request.body || {});
      const ticket = await findUserTicket(request.server.db, ticketId, request.auth.userId);

      if (!ticket) {
        return reply.code(404).send({ success: false, error: 'Support ticket was not found.' });
      }

      if (ticket.status === 'closed') {
        return reply.code(400).send({ success: false, error: 'This ticket is closed. Please create a new ticket if you still need help.' });
      }

      const [message] = await request.server.db
        .insert(supportTicketMessages)
        .values({
          ticketId: ticket.id,
          senderUserId: request.auth.userId,
          senderRole: 'user',
          message: body.message
        })
        .returning();

      await request.server.db
        .update(supportTickets)
        .set({
          status: 'pending_admin',
          updatedAt: new Date(),
          lastUserReplyAt: new Date()
        })
        .where(eq(supportTickets.id, ticket.id));

      return reply.code(201).send({ success: true, data: message });
    } catch (error) {
      return sendSupportError(reply, error, 'Could not add support reply.');
    }
  });
}
