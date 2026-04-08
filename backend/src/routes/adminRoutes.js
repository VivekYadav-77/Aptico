import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { refreshTokens } from '../db/schema.js';

const ACCESS_TOKEN_BLACKLIST_TTL_SECONDS = 15 * 60;
const REDIS_DISPATCH_WINDOW_MS = 200;

const paramsSchema = z.object({
  userId: z.string().uuid()
});

function wait(durationMs) {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
}

export default async function adminRoutes(app) {
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
}
