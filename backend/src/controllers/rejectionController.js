import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { rejectionLogs, squadActivities, squadMembers, squads, users } from '../db/schema.js';
import { applyXpDecayIfNeeded, calculateRejectionXp, grantXp, shouldShadowban } from '../services/xpEngine.js';

const rejectionSchema = z.object({
  companyName: z.string().trim().min(1).max(160),
  roleTitle: z.string().trim().min(1).max(160),
  jobUrl: z.preprocess(
    (value) => (typeof value === 'string' && !value.trim() ? undefined : value),
    z.string().trim().url().max(500).optional()
  ),
  stageRejected: z.enum(['resume', 'first_round', 'hiring_manager', 'final'])
});

function requireDatabase(db) {
  if (!db) {
    const error = new Error('Database is not configured yet.');
    error.statusCode = 503;
    throw error;
  }
}

function isMissingJobUrlColumnError(error) {
  return error?.code === '42703' && String(error?.message || '').includes('job_url');
}

function isMissingShadowbanColumnError(error) {
  return error?.code === '42703' && String(error?.message || '').includes('is_shadowbanned');
}

function normalizeExecuteRows(result) {
  if (Array.isArray(result)) {
    return result;
  }

  if (Array.isArray(result?.rows)) {
    return result.rows;
  }

  return [];
}

async function getRejectionLogColumns(db) {
  try {
    const result = await db.execute(sql`
      select column_name
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'rejection_logs'
    `);

    return new Set(normalizeExecuteRows(result).map((row) => row.column_name));
  } catch {
    return null;
  }
}

async function insertRejectionLogWithCompatibility(db, values) {
  const columns = await getRejectionLogColumns(db);
  let insertValues = {
    userId: values.userId,
    companyName: values.companyName,
    roleTitle: values.roleTitle,
    stageRejected: values.stageRejected
  };

  if (!columns || columns.has('job_url')) {
    insertValues.jobUrl = values.jobUrl;
  }

  if (!columns || columns.has('is_shadowbanned')) {
    insertValues.isShadowbanned = values.isShadowbanned;
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await db.insert(rejectionLogs).values(insertValues);
      return;
    } catch (error) {
      if (isMissingJobUrlColumnError(error) && 'jobUrl' in insertValues) {
        const { jobUrl: _jobUrl, ...fallbackValues } = insertValues;
        insertValues = fallbackValues;
        continue;
      }

      if (isMissingShadowbanColumnError(error) && 'isShadowbanned' in insertValues) {
        const { isShadowbanned: _isShadowbanned, ...fallbackValues } = insertValues;
        insertValues = fallbackValues;
        continue;
      }

      throw error;
    }
  }

  throw new Error('Could not insert rejection log with the current database schema.');
}

function getWeekStart(date = new Date()) {
  const current = new Date(date);
  const day = current.getUTCDay();
  const distanceFromMonday = (day + 6) % 7;
  current.setUTCHours(0, 0, 0, 0);
  current.setUTCDate(current.getUTCDate() - distanceFromMonday);
  return current.toISOString().slice(0, 10);
}

function getCurrentDateKey() {
  return new Date().toISOString().slice(0, 10);
}

async function getExistingSquadMembership(db, userId) {
  try {
    const rows = await db
      .select({
        id: squadMembers.id,
        squadId: squadMembers.squadId
      })
      .from(squadMembers)
      .where(eq(squadMembers.userId, userId))
      .limit(1);

    if (!rows[0]) return null;

    // Ensure the squad is on the current week
    const currentWeek = getWeekStart();
    const squadRows = await db
      .select({ id: squads.id, weekOf: squads.weekOf })
      .from(squads)
      .where(eq(squads.id, rows[0].squadId))
      .limit(1);

    if (!squadRows[0]) return null;

    // If the squad is on an older week, skip updating (the squad controller handles week rollovers)
    if (squadRows[0].weekOf !== currentWeek) return null;

    return rows[0];
  } catch {
    // Squad tables may not exist yet
    return null;
  }
}

async function createSquadActivityForRejection(db, { squadId, userId, companyName, roleTitle, stageRejected }) {
  try {
    await db.insert(squadActivities).values({
      squadId,
      userId,
      activityType: 'rejection_logged',
      eventDate: getCurrentDateKey(),
      quantity: 1,
      metadata: {
        companyName,
        roleTitle,
        stageRejected
      }
    });
  } catch {
    // Non-critical — don't break the rejection flow if squad activity insert fails
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

    await insertRejectionLogWithCompatibility(request.server.db, {
      userId: request.auth.userId,
      companyName: body.companyName,
      roleTitle: body.roleTitle,
      jobUrl: body.jobUrl || null,
      stageRejected: body.stageRejected,
      isShadowbanned: shadowbanDecision.shadowbanned
    });

    if (!shadowbanDecision.shadowbanned) {
      await applyXpDecayIfNeeded(request.server.db, request.auth.userId);
      const resilienceXp = await grantXp(request.server.db, request.auth.userId, xpEarned);

      // Update squad activity if the user is in a squad
      const membership = await getExistingSquadMembership(request.server.db, request.auth.userId);

      if (membership) {
        try {
          await request.server.db
            .update(squadMembers)
            .set({
              appsSentThisWeek: sql`${squadMembers.appsSentThisWeek} + 1`
            })
            .where(eq(squadMembers.userId, request.auth.userId));

          await createSquadActivityForRejection(request.server.db, {
            squadId: membership.squadId,
            userId: request.auth.userId,
            companyName: body.companyName,
            roleTitle: body.roleTitle,
            stageRejected: body.stageRejected
          });
        } catch {
          // Non-critical — don't break the rejection flow
        }
      }

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
