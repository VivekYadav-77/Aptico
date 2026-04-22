import { and, asc, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { z } from 'zod';
import { applicationLogs, notifications, squadActivities, squadMembers, squads, users } from '../db/schema.js';
import { applyXpDecayIfNeeded, calculateApplicationXp, getTodayIntegrityCounts, grantXp, shouldShadowban } from '../services/xpEngine.js';

const joinSquadSchema = z.object({
  weeklyGoal: z.coerce.number().int().min(4).max(500).optional()
});

const logAppSchema = z.object({
  companyName: z.string().trim().min(3).max(160),
  roleTitle: z.string().trim().min(3).max(160)
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
    String(error?.message || '').includes('relation "squads" does not exist') ||
    String(error?.message || '').includes('relation "squad_activities" does not exist')
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

function parseUtcDate(value) {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addUtcDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function toDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function getCurrentDateKey() {
  return toDateKey(new Date());
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function ceilPositive(value) {
  if (value <= 0) return 0;
  return Math.ceil(value);
}

function buildWeekTimeline(weekOf) {
  const start = parseUtcDate(weekOf);

  if (!start) {
    return [];
  }

  return Array.from({ length: 7 }, (_, index) => {
    const date = addUtcDays(start, index);
    return {
      index,
      dateKey: toDateKey(date),
      label: date.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' })
    };
  });
}

function buildActivityMessage(activity, actorAlias) {
  if (activity.activityType === 'apps_logged') {
    const companyName = String(activity.metadata?.companyName || '').trim();
    const roleTitle = String(activity.metadata?.roleTitle || '').trim();

    if (companyName && roleTitle) {
      return `${actorAlias || 'A squadmate'} logged ${roleTitle} at ${companyName}.`;
    }

    if (companyName) {
      return `${actorAlias || 'A squadmate'} logged an application to ${companyName}.`;
    }

    return `${actorAlias || 'A squadmate'} logged ${activity.quantity} application${activity.quantity === 1 ? '' : 's'}.`;
  }

  if (activity.activityType === 'squad_ping') {
    const targetCount = Number(activity.metadata?.targetCount || 0);
    return `${actorAlias || 'A squadmate'} sent an anonymous nudge${targetCount ? ` to ${targetCount} teammate${targetCount === 1 ? '' : 's'}` : ''}.`;
  }

  return `${actorAlias || 'A new squadmate'} joined the squad.`;
}

function getContributionState(memberApps) {
  const totalApps = memberApps.reduce((sum, value) => sum + value, 0);

  if (!totalApps) {
    return {
      state: 'forming',
      label: 'Forming rhythm',
      description: 'No applications have been logged yet, so balance will appear once the first output lands.',
      score: 0
    };
  }

  const shares = memberApps.map((value) => value / totalApps);
  const maxShare = Math.max(...shares);
  const activeMembers = memberApps.filter((value) => value > 0).length;
  const balanceScore = Math.max(0, Math.round((1 - maxShare) * 100));

  if (maxShare <= 0.4 && activeMembers >= Math.max(2, Math.ceil(memberApps.length * 0.75))) {
    return {
      state: 'balanced',
      label: 'Balanced push',
      description: 'Output is spread across the squad, which lowers burnout risk and keeps the weekly target healthy.',
      score: balanceScore
    };
  }

  if (maxShare <= 0.6) {
    return {
      state: 'top_heavy',
      label: 'Top-heavy',
      description: 'One or two aliases are carrying most of the load. A small lift from others would stabilize the squad.',
      score: balanceScore
    };
  }

  return {
    state: 'fragile',
    label: 'Fragile',
    description: 'The squad is relying on a single heavy contributor right now. Momentum will drop fast if that person slows down.',
    score: balanceScore
  };
}

async function createSquadActivity(db, values) {
  await db.insert(squadActivities).values({
    squadId: values.squadId,
    userId: values.userId || null,
    activityType: values.activityType,
    eventDate: values.eventDate || getCurrentDateKey(),
    quantity: values.quantity || 0,
    metadata: values.metadata || {}
  });
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

  const weekStart = parseUtcDate(squad.weekOf);
  const weekEnd = weekStart ? toDateKey(addUtcDays(weekStart, 6)) : squad.weekOf;
  const timeline = buildWeekTimeline(squad.weekOf);
  const activityRows = await db
    .select({
      userId: squadActivities.userId,
      activityType: squadActivities.activityType,
      quantity: squadActivities.quantity,
      eventDate: squadActivities.eventDate,
      metadata: squadActivities.metadata,
      createdAt: squadActivities.createdAt
    })
    .from(squadActivities)
    .where(
      and(
        eq(squadActivities.squadId, membership.squadId),
        gte(squadActivities.eventDate, squad.weekOf),
        lte(squadActivities.eventDate, weekEnd)
      )
    )
    .orderBy(desc(squadActivities.createdAt));

  const totalApps = memberRows.reduce((sum, member) => sum + Number(member.appsSentThisWeek || 0), 0);
  const totalInterviews = memberRows.reduce((sum, member) => sum + Number(member.interviewsThisWeek || 0), 0);
  const memberCount = memberRows.length;
  const weeklyGoal = Number(squad.weeklyGoal || DEFAULT_WEEKLY_GOAL);
  const progressPercent = weeklyGoal > 0 ? Math.min(100, Math.round((totalApps / weeklyGoal) * 100)) : 0;
  const today = new Date();
  const todayKey = toDateKey(today);
  const currentDayIndex = weekStart ? clamp(Math.floor((parseUtcDate(todayKey) - weekStart) / 86400000), 0, 6) : 0;
  const daysElapsed = clamp(currentDayIndex + 1, 1, 7);
  const daysRemaining = Math.max(0, 7 - daysElapsed);
  const expectedAppsByNow = Math.min(weeklyGoal, ceilPositive((weeklyGoal * daysElapsed) / 7));
  const remainingApps = Math.max(0, weeklyGoal - totalApps);
  const dailyGoal = weeklyGoal / 7;
  const paceGap = totalApps - expectedAppsByNow;
  const appsPerDayNeeded = daysRemaining ? Math.ceil(remainingApps / daysRemaining) : remainingApps;
  const perMemberTarget = memberCount ? weeklyGoal / memberCount : weeklyGoal;
  const perMemberExpectedByNow = memberCount ? expectedAppsByNow / memberCount : expectedAppsByNow;
  const contributions = memberRows.map((member) => Number(member.appsSentThisWeek || 0));
  const balance = getContributionState(contributions);
  const aliasByUserId = new Map(memberRows.map((member) => [member.userId, member.anonymousAlias]));
  const dailyAppsByUser = new Map(memberRows.map((member) => [member.userId, new Map(timeline.map((day) => [day.dateKey, 0]))]));

  for (const activity of activityRows) {
    if (activity.activityType !== 'apps_logged') {
      continue;
    }

    const userTimeline = dailyAppsByUser.get(activity.userId);

    if (userTimeline && userTimeline.has(activity.eventDate)) {
      userTimeline.set(activity.eventDate, Number(userTimeline.get(activity.eventDate) || 0) + Number(activity.quantity || 0));
    }
  }

  const recentEvents = activityRows.slice(0, 8).map((activity) => {
    const actorAlias = activity.userId ? aliasByUserId.get(activity.userId) : null;
    return {
      type: activity.activityType,
      actorAlias,
      quantity: Number(activity.quantity || 0),
      createdAt: activity.createdAt,
      eventDate: activity.eventDate,
      message: buildActivityMessage(activity, actorAlias),
      metadata: activity.metadata || {}
    };
  });

  const lastPing = activityRows.find((activity) => activity.activityType === 'squad_ping') || null;
  const appsAfterLastPing =
    lastPing && lastPing.createdAt
      ? activityRows
          .filter((activity) => activity.activityType === 'apps_logged' && new Date(activity.createdAt).getTime() > new Date(lastPing.createdAt).getTime())
          .reduce((sum, activity) => sum + Number(activity.quantity || 0), 0)
      : 0;
  const isClutchMode =
    !remainingApps
      ? false
      : daysRemaining <= 2 || paceGap < 0 || appsPerDayNeeded > Math.max(1, Math.ceil(dailyGoal * 1.4));

  const milestones = [
    {
      id: 'pace',
      label: paceGap >= 0 ? 'Stay ahead of pace' : 'Get back on pace',
      appsNeeded: paceGap >= 0 ? Math.max(0, appsPerDayNeeded) : Math.max(0, Math.abs(paceGap)),
      description:
        paceGap >= 0
          ? `Keep landing about ${Math.max(1, appsPerDayNeeded)} apps a day to hold the current advantage.`
          : `${Math.max(0, Math.abs(paceGap))} more apps closes the pace deficit right now.`
    },
    {
      id: 'fifty',
      label: progressPercent >= 50 ? 'Push to 75%' : 'Unlock 50%',
      appsNeeded:
        progressPercent >= 50
          ? Math.max(0, Math.ceil(weeklyGoal * 0.75) - totalApps)
          : Math.max(0, Math.ceil(weeklyGoal * 0.5) - totalApps),
      description:
        progressPercent >= 50
          ? 'Crossing 75% makes the finish line visible for every squadmate.'
          : 'Getting halfway changes the energy of the whole squad and makes the goal feel reachable.'
    },
    {
      id: 'goal',
      label: remainingApps ? 'Secure the weekly unlock' : 'Goal secured',
      appsNeeded: remainingApps,
      description: remainingApps ? 'Finish the shared target and the whole squad receives the XP unlock.' : 'The squad has already locked in the shared XP reward.'
    }
  ].filter((milestone, index, list) => list.findIndex((entry) => entry.id === milestone.id) === index);

  return {
    squad: {
      id: squad.id,
      squadName: squad.squadName,
      weeklyGoal,
      weekOf: squad.weekOf,
      memberCount,
      openSeats: Math.max(0, SQUAD_SIZE - memberCount),
      isFull: memberCount >= SQUAD_SIZE,
      totalApps,
      totalInterviews,
      progressPercent,
      goalReached: Boolean(squad.goalRewardedAt) || totalApps >= weeklyGoal
    },
    meta: {
      weekStart: squad.weekOf,
      weekEnd,
      daysElapsed,
      daysRemaining,
      currentDayIndex,
      expectedAppsByNow,
      paceGap,
      appsPerDayNeeded,
      remainingApps,
      dailyGoal: Math.ceil(dailyGoal),
      formationLabel:
        memberCount >= SQUAD_SIZE
          ? 'Full squad'
          : memberCount > 1
            ? `${Math.max(0, SQUAD_SIZE - memberCount)} seat${Math.max(0, SQUAD_SIZE - memberCount) === 1 ? '' : 's'} still open`
            : 'Waiting for more teammates'
    },
    insights: {
      balance,
      clutchMode: {
        active: isClutchMode,
        label: remainingApps ? 'Stealth clutch mode' : 'Goal complete',
        deficitApps: Math.max(0, Math.abs(paceGap)),
        recoveryAppsNeeded: remainingApps,
        appsPerDayNeeded,
        message: remainingApps
          ? `The squad needs ${Math.max(1, appsPerDayNeeded)} apps a day for the rest of the week to keep the unlock alive.`
          : 'The squad has already cleared the weekly target.'
      },
      milestones,
      pingStatus: {
        totalPingsThisWeek: activityRows.filter((activity) => activity.activityType === 'squad_ping').length,
        lastPingAt: lastPing?.createdAt || null,
        appsAfterLastPing
      },
      recentEvents
    },
    me:
      memberRows
        .filter((member) => member.userId === userId)
        .map((member) => {
          const appsSentThisWeek = Number(member.appsSentThisWeek || 0);
          const fairShareRemaining = Math.max(0, Math.ceil(perMemberTarget - appsSentThisWeek));
          return {
            alias: member.alias,
            appsSentThisWeek,
            interviewsThisWeek: Number(member.interviewsThisWeek || 0),
            joinedAt: member.joinedAt,
            isCurrentUser: true,
            paceDelta: Math.round(appsSentThisWeek - perMemberExpectedByNow),
            fairShareRemaining,
            dailyTargetFromHere: daysRemaining ? Math.ceil(fairShareRemaining / daysRemaining) : fairShareRemaining
          };
        })[0] || null,
    members: memberRows.map((member) => ({
      alias: member.alias,
      appsSentThisWeek: Number(member.appsSentThisWeek || 0),
      interviewsThisWeek: Number(member.interviewsThisWeek || 0),
      joinedAt: member.joinedAt,
      isCurrentUser: member.userId === userId,
      paceDelta: Math.round(Number(member.appsSentThisWeek || 0) - perMemberExpectedByNow),
      sharePercent: totalApps ? Math.round((Number(member.appsSentThisWeek || 0) / totalApps) * 100) : 0,
      dailyTrail: timeline.map((day) => {
        const count = Number(dailyAppsByUser.get(member.userId)?.get(day.dateKey) || 0);
        return {
          dateKey: day.dateKey,
          label: day.label,
          count,
          active: count > 0,
          isToday: day.index === currentDayIndex
        };
      })
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

    await createSquadActivity(request.server.db, {
      squadId: openSquad.id,
      userId: request.auth.userId,
      activityType: 'member_joined',
      eventDate: getCurrentDateKey(),
      metadata: {}
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

    const shadowbanDecision = await shouldShadowban(
      request.server.db,
      request.auth.userId,
      body.companyName,
      body.roleTitle
    );

    await request.server.db.insert(applicationLogs).values({
      userId: request.auth.userId,
      squadId: membership.squadId,
      companyName: body.companyName,
      roleTitle: body.roleTitle,
      isShadowbanned: shadowbanDecision.shadowbanned
    });

    let goalRewardGranted = false;

    if (!shadowbanDecision.shadowbanned) {
      await applyXpDecayIfNeeded(request.server.db, request.auth.userId);
      const counts = await getTodayIntegrityCounts(request.server.db, request.auth.userId);
      const xpEarned = calculateApplicationXp(counts.applicationsToday);

      await grantXp(request.server.db, request.auth.userId, xpEarned);

      await request.server.db
        .update(squadMembers)
        .set({
          appsSentThisWeek: sql`${squadMembers.appsSentThisWeek} + 1`
        })
        .where(eq(squadMembers.userId, request.auth.userId));

      await createSquadActivity(request.server.db, {
        squadId: membership.squadId,
        userId: request.auth.userId,
        activityType: 'apps_logged',
        eventDate: getCurrentDateKey(),
        quantity: 1,
        metadata: {
          companyName: body.companyName,
          roleTitle: body.roleTitle,
          xpEarned
        }
      });

      goalRewardGranted = await grantGoalRewardIfNeeded(request.server.db, membership.squadId, request.auth.userId);
    }

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

    const expectedPerMember = snapshot.members.length ? snapshot.meta.expectedAppsByNow / snapshot.members.length : 0;
    const laggingMembers = snapshot.members.filter(
      (member) => !member.isCurrentUser && member.appsSentThisWeek < expectedPerMember
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
            `An anonymous squadmate pinged the squad. You are ${Math.max(1, Math.ceil(expectedPerMember - Number(member.appsSentThisWeek || 0)))} apps behind the current pace.`
        })
      )
    );

    await createSquadActivity(request.server.db, {
      squadId: membership.squadId,
      userId: request.auth.userId,
      activityType: 'squad_ping',
      eventDate: getCurrentDateKey(),
      quantity: targetRows.length,
      metadata: {
        targetCount: targetRows.length
      }
    });

    return reply.send({
      success: true,
      notifiedCount: targetRows.length
    });
  } catch (error) {
    return sendError(reply, error, 'Could not send squad ping.');
  }
}
