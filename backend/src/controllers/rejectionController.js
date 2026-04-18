import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { rejectionLogs, users } from '../db/schema.js';

const rejectionSchema = z.object({
  companyName: z.string().trim().min(1).max(160),
  roleTitle: z.string().trim().min(1).max(160),
  stageRejected: z.enum(['resume', 'first_round', 'hiring_manager', 'final'])
});

const STAGE_XP = {
  resume: 50,
  first_round: 100,
  hiring_manager: 175,
  final: 250
};

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
    const xpEarned = STAGE_XP[body.stageRejected];

    await request.server.db.insert(rejectionLogs).values({
      userId: request.auth.userId,
      companyName: body.companyName,
      roleTitle: body.roleTitle,
      stageRejected: body.stageRejected
    });

    await request.server.db
      .update(users)
      .set({
        resilienceXp: sql`${users.resilienceXp} + ${xpEarned}`
      })
      .where(eq(users.id, request.auth.userId));

    const [updatedUser] = await request.server.db
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
        resilienceXp: updatedUser?.resilienceXp || 0,
        level: Math.floor((updatedUser?.resilienceXp || 0) / 1000) + 1
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
