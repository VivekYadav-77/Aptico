import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { notifications, squadMembers, squads, users } from '../db/schema.js';

const joinSquadSchema = z.object({
  weeklyGoal: z.coerce.number().int().min(4).max(500).optional()
});

const logAppSchema = z.object({
  count: z.coerce.number().int().min(1).max(25).default(1)
});

const pingSchema = z.object({
  message: z.string().trim().max(140).optional().nullable()
});

const SQUAD_SIZE = 4;
const DEFAULT_WEEKLY_GOAL = 40;
const SQUAD_GOAL_XP = 100;

const ADJECTIVES = [
  'Silent',
  'Steady',
  'Rapid',
  'Ghost',
  'Hidden',
  'Neon',
  'Velvet',
  'Crimson',
  'Steel',
  'Solar',
  'Midnight',
  'Rocket'
];

const NOUNS = ['Ninja', 'Falcon', 'Cipher', 'Wolf', 'Comet', 'Runner', 'Fox', 'Pilot', 'Panther', 'Orbit', 'Voyager', 'Scout'];
const SQUAD_PREFIXES = ['Alpha', 'Nova', 'Signal', 'Velocity', 'Stealth', 'Summit', 'Orbit', 'Pulse', 'Atlas', 'Iron'];
const SQUAD_SUFFIXES = ['Wolves', 'Makers', 'Raiders', 'Pilots', 'League', 'Collective', 'Sprint', 'Crew', 'Trackers', 'Circuit'];

function requireDatabase(db) {
  if (!db) {
    const error = new Error('Database is not configured yet.');
    error.statusCode = 503;
    throw error;
  }
}

function isMissingSquadSchemaError(error) {
  return error?.code === '42P01' && (
    String(error?.message || '').includes('relation "squad_members" does not exist') ||
    String(error?.message || '').includes('relation "squads" does not exist')
  );
}

function getWeekStart(date = new Date()) {
  const current = new Date(date);
  const day = current.getUTCDay();
  const distanceFromMonday = (day + 6) % 7;
  current.setUTCHours(0, 0, 0, 0);
  current.setUTCDate(current.getUTCDate() - distanceFromMonday);
  return current.toISOString().slice(0, 10);
}

function randomFrom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function buildAlias() {
  return `${randomFrom(ADJECTIVES)} ${randomFrom(NOUNS)}`;
}

function buildSquadName() {
  return `${randomFrom(SQUAD_PREFIXES)} ${randomFrom(SQUAD_SUFFIXES)}`;
}

async function ensureCurrentSquadWeek(db, squadId, currentWeek) {
  const rows = await db
    .select({
      id: squads.id,
      squadName: squads.squadName,
      weeklyGoal: squads.weeklyGoal,
      weekOf: squads.weekOf,
      goalRewardedAt: squads.goalRewardedAt,
      createdAt: squads.createdAt
    })
    .from(squads)
    .where(eq(squads.id, squadId))
    .limit(1);

  const squad = rows[0];

  if (!squad) {
    return null;
  }

  if (squad.weekOf === currentWeek) {
    return squad;
  }

  await db
    .update(squads)
    .set({
      weekOf: currentWeek,
      goalRewardedAt: null
    })
    .where(eq(squads.id, squadId));

  await db
    .update(squadMembers)
    .set({
      appsSentThisWeek: 0,
      interviewsThisWeek: 0
    })
    .where(eq(squadMembers.squadId, squadId));

  return {
    ...squad,
    weekOf: currentWeek,
    goalRewardedAt: null
  };
}

async function getExistingMembership(db, userId, currentWeek) {
  const rows = await db
    .select({
      id: squadMembers.id,
      squadId: squadMembers.squadId,
      anonymousAlias: squadMembers.anonymousAlias
    })
    .from(squadMembers)
    .where(eq(squadMembers.userId, userId))
    .limit(1);

  const membership = rows[0];

  if (!membership) {
    return null;
  }

  const squad = await ensureCurrentSquadWeek(db, membership.squadId, currentWeek);

  if (!squad) {
    return null;
  }

  return membership;
}

async function findOpenSquad(db, currentWeek) {
  const rows = await db
    .select({
      id: squads.id,
      squadName: squads.squadName,
      weeklyGoal: squads.weeklyGoal,
      memberCount: sql`count(${squadMembers.id})::int`
    })
    .from(squads)
    .leftJoin(squadMembers, eq(squadMembers.squadId, squads.id))
    .where(eq(squads.weekOf, currentWeek))
    .groupBy(squads.id)
    .having(sql`count(${squadMembers.id}) < ${SQUAD_SIZE}`)
    .orderBy(asc(squads.createdAt))
    .limit(1);

  return rows[0] || null;
}

async function generateUniqueAlias(db, squadId) {
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const candidate = buildAlias();
    const rows = await db
      .select({ id: squadMembers.id })
      .from(squadMembers)
      .where(and(eq(squadMembers.squadId, squadId), eq(squadMembers.anonymousAlias, candidate)))
      .limit(1);

    if (!rows[0]) {
      return candidate;
    }
  }

  return `${buildAlias()} ${Math.floor(100 + Math.random() * 900)}`;
}

async function getSquadSnapshot(db, userId, currentWeek) {
  const membershipRows = await db
    .select({
      squadId: squadMembers.squadId,
      alias: squadMembers.anonymousAlias,
      appsSentThisWeek: squadMembers.appsSentThisWeek,
      interviewsThisWeek: squadMembers.interviewsThisWeek
    })
    .from(squadMembers)
    .where(eq(squadMembers.userId, userId))
    .limit(1);

  const membership = membershipRows[0];

  if (!membership) {
    return null;
  }

  const squad = await ensureCurrentSquadWeek(db, membership.squadId, currentWeek);

  if (!squad) {
    return null;
  }

  const memberRows = await db
    .select({
      id: squadMembers.id,
      userId: squadMembers.userId,
      alias: squadMembers.anonymousAlias,
      appsSentThisWeek: squadMembers.appsSentThisWeek,
      interviewsThisWeek: squadMembers.interviewsThisWeek,
      joinedAt: squadMembers.createdAt
    })
    .from(squadMembers)
    .where(eq(squadMembers.squadId, membership.squadId))
    .orderBy(desc(squadMembers.appsSentThisWeek), asc(squadMembers.createdAt));

  const totalApps = memberRows.reduce((sum, member) => sum + Number(member.appsSentThisWeek || 0), 0);
  const totalInterviews = memberRows.reduce((sum, member) => sum + Number(member.interviewsThisWeek || 0), 0);
  const memberCount = memberRows.length;
  const weeklyGoal = Number(squad.weeklyGoal || DEFAULT_WEEKLY_GOAL);
  const progressPercent = weeklyGoal > 0 ? Math.min(100, Math.round((totalApps / weeklyGoal) * 100)) : 0;
  const averageApps = memberCount ? totalApps / memberCount : 0;

  return {
    squad: {
      id: squad.id,
      squadName: squad.squadName,
      weeklyGoal,
      weekOf: squad.weekOf,
      memberCount,
      totalApps,
      totalInterviews,
      progressPercent,
      goalReached: Boolean(squad.goalRewardedAt) || totalApps >= weeklyGoal
    },
    me:
      memberRows
        .filter((member) => member.userId === userId)
        .map((member) => ({
          alias: member.alias,
          appsSentThisWeek: Number(member.appsSentThisWeek || 0),
          interviewsThisWeek: Number(member.interviewsThisWeek || 0),
          joinedAt: member.joinedAt,
          isCurrentUser: true,
          paceDelta: Math.round(Number(member.appsSentThisWeek || 0) - averageApps)
        }))[0] || null,
    members: memberRows.map((member) => ({
      alias: member.alias,
      appsSentThisWeek: Number(member.appsSentThisWeek || 0),
      interviewsThisWeek: Number(member.interviewsThisWeek || 0),
      joinedAt: member.joinedAt,
      isCurrentUser: member.userId === userId,
      paceDelta: Math.round(Number(member.appsSentThisWeek || 0) - averageApps)
    }))
  };
}

async function grantGoalRewardIfNeeded(db, squadId, actorUserId) {
  const currentWeek = getWeekStart();
  const squad = await ensureCurrentSquadWeek(db, squadId, currentWeek);

  if (!squad) {
    return false;
  }

  const totals = await db
    .select({
      totalApps: sql`coalesce(sum(${squadMembers.appsSentThisWeek}), 0)::int`
    })
    .from(squadMembers)
    .where(eq(squadMembers.squadId, squadId));

  const totalApps = Number(totals[0]?.totalApps || 0);

  if (squad.goalRewardedAt || totalApps < Number(squad.weeklyGoal || DEFAULT_WEEKLY_GOAL)) {
    return false;
  }

  await db
    .update(squads)
    .set({
      goalRewardedAt: new Date()
    })
    .where(eq(squads.id, squadId));

  const memberRows = await db
    .select({
      userId: squadMembers.userId
    })
    .from(squadMembers)
    .where(eq(squadMembers.squadId, squadId));

  await Promise.all([
    ...memberRows.map((member) =>
      db
        .update(users)
        .set({
          resilienceXp: sql`${users.resilienceXp} + ${SQUAD_GOAL_XP}`
        })
        .where(eq(users.id, member.userId))
    ),
    ...memberRows.map((member) =>
      db.insert(notifications).values({
        userId: member.userId,
        type: 'squad_goal_reached',
        actorId: actorUserId,
        entityId: squadId,
        entityType: 'squad',
        message: `Your squad hit the weekly goal. +${SQUAD_GOAL_XP} XP unlocked for every member.`
      })
    )
  ]);

  return true;
}

function sendError(reply, error, fallbackMessage) {
  if (isMissingSquadSchemaError(error)) {
    return reply.code(503).send({
      success: false,
      error: 'Squads are not available until the database schema is updated.'
    });
  }

  const statusCode = error.name === 'ZodError' ? 400 : error.statusCode || 500;
  return reply.code(statusCode).send({
    success: false,
    error: error.message || fallbackMessage
  });
}

export async function joinSquadController(request, reply) {
  try {
    requireDatabase(request.server.db);
    const currentWeek = getWeekStart();
    const body = joinSquadSchema.parse(request.body || {});
    const weeklyGoal = body.weeklyGoal || DEFAULT_WEEKLY_GOAL;

    const existingMembership = await getExistingMembership(request.server.db, request.auth.userId, currentWeek);

    if (existingMembership) {
      const snapshot = await getSquadSnapshot(request.server.db, request.auth.userId, currentWeek);
      return reply.send({
        success: true,
        joined: false,
        data: snapshot
      });
    }

    let openSquad = await findOpenSquad(request.server.db, currentWeek);

    if (!openSquad) {
      const created = await request.server.db
        .insert(squads)
        .values({
          squadName: buildSquadName(),
          weeklyGoal,
          weekOf: currentWeek
        })
        .returning({
          id: squads.id
        });

      openSquad = {
        id: created[0].id
      };
    }

    const alias = await generateUniqueAlias(request.server.db, openSquad.id);

    await request.server.db.insert(squadMembers).values({
      squadId: openSquad.id,
      userId: request.auth.userId,
      anonymousAlias: alias
    });

    const snapshot = await getSquadSnapshot(request.server.db, request.auth.userId, currentWeek);

    return reply.code(201).send({
      success: true,
      joined: true,
      data: snapshot
    });
  } catch (error) {
    return sendError(reply, error, 'Could not join a squad.');
  }
}

export async function getMySquadController(request, reply) {
  try {
    requireDatabase(request.server.db);
    const snapshot = await getSquadSnapshot(request.server.db, request.auth.userId, getWeekStart());

    return reply.send({
      success: true,
      data: snapshot
    });
  } catch (error) {
    return sendError(reply, error, 'Could not load your squad.');
  }
}

export async function logSquadAppController(request, reply) {
  try {
    requireDatabase(request.server.db);
    const body = logAppSchema.parse(request.body || {});
    const currentWeek = getWeekStart();
    const membership = await getExistingMembership(request.server.db, request.auth.userId, currentWeek);

    if (!membership) {
      return reply.code(404).send({
        success: false,
        error: 'Join a squad before logging applications.'
      });
    }

    await request.server.db
      .update(squadMembers)
      .set({
        appsSentThisWeek: sql`${squadMembers.appsSentThisWeek} + ${body.count}`
      })
      .where(eq(squadMembers.userId, request.auth.userId));

    const goalRewardGranted = await grantGoalRewardIfNeeded(request.server.db, membership.squadId, request.auth.userId);
    const snapshot = await getSquadSnapshot(request.server.db, request.auth.userId, currentWeek);

    return reply.send({
      success: true,
      goalRewardGranted,
      data: snapshot
    });
  } catch (error) {
    return sendError(reply, error, 'Could not log squad applications.');
  }
}

export async function pingSquadController(request, reply) {
  try {
    requireDatabase(request.server.db);
    const body = pingSchema.parse(request.body || {});
    const currentWeek = getWeekStart();
    const membership = await getExistingMembership(request.server.db, request.auth.userId, currentWeek);

    if (!membership) {
      return reply.code(404).send({
        success: false,
        error: 'Join a squad before sending pings.'
      });
    }

    const snapshot = await getSquadSnapshot(request.server.db, request.auth.userId, currentWeek);

    if (!snapshot?.members?.length) {
      return reply.send({ success: true, notifiedCount: 0 });
    }

    const totalApps = snapshot.squad.totalApps;
    const averageApps = snapshot.members.length ? totalApps / snapshot.members.length : 0;
    const laggingMembers = snapshot.members.filter(
      (member) => !member.isCurrentUser && member.appsSentThisWeek < averageApps
    );

    const laggingAliases = laggingMembers.map((member) => member.alias);

    if (!laggingAliases.length) {
      return reply.send({
        success: true,
        notifiedCount: 0
      });
    }

    const targetRows = await request.server.db
      .select({
        userId: squadMembers.userId,
        alias: squadMembers.anonymousAlias,
        appsSentThisWeek: squadMembers.appsSentThisWeek
      })
      .from(squadMembers)
      .where(and(eq(squadMembers.squadId, membership.squadId), inArray(squadMembers.anonymousAlias, laggingAliases)));

    await Promise.all(
      targetRows.map((member) =>
        request.server.db.insert(notifications).values({
          userId: member.userId,
          type: 'squad_ping',
          actorId: null,
          entityId: membership.squadId,
          entityType: 'squad',
          message:
            body.message ||
            `An anonymous squadmate pinged the squad. You are ${Math.max(1, Math.ceil(averageApps - Number(member.appsSentThisWeek || 0)))} apps behind the current pace.`
        })
      )
    );

    return reply.send({
      success: true,
      notifiedCount: targetRows.length
    });
  } catch (error) {
    return sendError(reply, error, 'Could not send squad ping.');
  }
}
