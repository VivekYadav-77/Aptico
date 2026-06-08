import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { refreshTokens } from '../../db/schema.js';
import { cleanupOldAnalyticsEvents, recordAdminAuditLog } from '../analytics/analytics.service.js';
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

function wait(durationMs) {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
}

export default async function adminRoutes(app) {
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
