import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { rejectionLogs, users } from '../db/schema.js';
import { applyXpDecayIfNeeded, calculateRejectionXp, grantXp, shouldShadowban } from '../services/xpEngine.js';

const rejectionSchema = z.object({
  companyName: z.string().trim().min(1).max(160),
  roleTitle: z.string().trim().min(1).max(160),
  stageRejected: z.enum(['resume', 'first_round', 'hiring_manager', 'final'])
});

function requireDatabase(db) {
  if (!db) {
    const error = new Error('Database is not configured yet.');
    error.statusCode = 503;
    throw error;
  }
}

export async function createRejectionController(request, reply) {
  try {
    requireDatabase(request.server.db);

    const body = rejectionSchema.parse(request.body || {});
    const xpEarned = calculateRejectionXp(body.stageRejected);
    const shadowbanDecision = await shouldShadowban(
      request.server.db,
      request.auth.userId,
      body.companyName,
      body.roleTitle,
      { kind: 'rejection' }
    );

    await request.server.db.insert(rejectionLogs).values({
      userId: request.auth.userId,
      companyName: body.companyName,
      roleTitle: body.roleTitle,
      stageRejected: body.stageRejected,
      isShadowbanned: shadowbanDecision.shadowbanned
    });

    if (!shadowbanDecision.shadowbanned) {
      await applyXpDecayIfNeeded(request.server.db, request.auth.userId);
      const resilienceXp = await grantXp(request.server.db, request.auth.userId, xpEarned);

      return reply.code(201).send({
        success: true,
        data: {
          xpEarned,
          resilienceXp,
          level: Math.floor(resilienceXp / 1000) + 1
        }
      });
    }

    const [currentUser] = await request.server.db
      .select({
        resilienceXp: users.resilienceXp
      })
      .from(users)
      .where(eq(users.id, request.auth.userId))
      .limit(1);

    return reply.code(201).send({
      success: true,
      data: {
        xpEarned,
        resilienceXp: Number(currentUser?.resilienceXp || 0),
        level: Math.floor(Number(currentUser?.resilienceXp || 0) / 1000) + 1
      }
    });
  } catch (error) {
    const statusCode = error.name === 'ZodError' ? 400 : error.statusCode || 500;

    return reply.code(statusCode).send({
      success: false,
      error: error.message || 'Could not log rejection.'
    });
  }
}
