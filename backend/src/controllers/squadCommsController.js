import { and, asc, desc, eq, gte, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { notifications, profileSettings, squadMembers, squadMessages, squads } from '../db/schema.js';

const QUICK_SIGNALS = new Set(['HYPE', 'ON_IT', 'MISSION_SECURED', 'LEAD_VOUCHED', 'SHIELD_UP']);
const ARCHETYPE_LABELS = {
  grinder: 'Grinder',
  motivator: 'Motivator',
  scout: 'Scout'
};

const messageSchema = z.object({
  messageType: z.enum(['text', 'quick_signal', 'sticker_drop', 'signal_drop', 'accolade']),
  content: z.string().trim().min(1).max(200),
  metadata: z.record(z.unknown()).optional()
});

const archetypeSchema = z.object({
  role: z.enum(['grinder', 'motivator', 'scout'])
});

function requireDatabase(db) {
  if (!db) {
    const error = new Error('Database is not configured yet.');
    error.statusCode = 503;
    throw error;
  }
}

function publicError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function getWeekStart(date = new Date()) {
  const current = new Date(date);
  const day = current.getUTCDay();
  const distanceFromMonday = (day + 6) % 7;
  current.setUTCHours(0, 0, 0, 0);
  current.setUTCDate(current.getUTCDate() - distanceFromMonday);
  return current.toISOString().slice(0, 10);
}

function toDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function getTodayStart() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return today;
}

export function getMilestonePhase(progressPercent) {
  const safeProgress = Number(progressPercent) || 0;
  if (safeProgress >= 100) return 4;
  if (safeProgress >= 75) return 3;
  if (safeProgress >= 50) return 2;
  if (safeProgress >= 25) return 1;
  return 0;
}

function hasLikelyPii(content) {
  const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
  const phonePattern = /(?:\+?\d[\s().-]*){8,}/;
  return emailPattern.test(content) || phonePattern.test(content);
}

function sanitizeContent(content) {
  return String(content || '')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeMetadata(metadata = {}) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return {};
  }

  return metadata;
}

async function ensureCurrentSquadWeek(db, squad) {
  const currentWeek = getWeekStart();

  if (!squad || squad.weekOf === currentWeek) {
    return squad;
  }

  await db
    .update(squads)
    .set({
      weekOf: currentWeek,
      goalRewardedAt: null,
      synergyScore: 0,
      synergyBurstAt: null
    })
    .where(eq(squads.id, squad.id));

  await db
    .update(squadMembers)
    .set({
      appsSentThisWeek: 0,
      interviewsThisWeek: 0,
      archetypeRole: null,
      sparksSentThisWeek: 0
    })
    .where(eq(squadMembers.squadId, squad.id));

  return {
    ...squad,
    weekOf: currentWeek,
    goalRewardedAt: null,
    synergyScore: 0,
    synergyBurstAt: null
  };
}

async function getMembershipContext(db, userId) {
  const rows = await db
    .select({
      memberId: squadMembers.id,
      squadId: squadMembers.squadId,
      userId: squadMembers.userId,
      alias: squadMembers.anonymousAlias,
      archetypeRole: squadMembers.archetypeRole,
      appsSentThisWeek: squadMembers.appsSentThisWeek,
      sparksSentThisWeek: squadMembers.sparksSentThisWeek,
      squadName: squads.squadName,
      weeklyGoal: squads.weeklyGoal,
      weekOf: squads.weekOf,
      goalRewardedAt: squads.goalRewardedAt,
      synergyScore: squads.synergyScore,
      synergyBurstAt: squads.synergyBurstAt
    })
    .from(squadMembers)
    .innerJoin(squads, eq(squadMembers.squadId, squads.id))
    .where(eq(squadMembers.userId, userId))
    .limit(1);

  const row = rows[0];

  if (!row) {
    return null;
  }

  const squad = await ensureCurrentSquadWeek(db, {
    id: row.squadId,
    squadName: row.squadName,
    weeklyGoal: row.weeklyGoal,
    weekOf: row.weekOf,
    goalRewardedAt: row.goalRewardedAt,
    synergyScore: row.synergyScore,
    synergyBurstAt: row.synergyBurstAt
  });

  return {
    memberId: row.memberId,
    squadId: row.squadId,
    userId: row.userId,
    alias: row.alias,
    archetypeRole: squad.weekOf === row.weekOf ? row.archetypeRole : null,
    appsSentThisWeek: squad.weekOf === row.weekOf ? row.appsSentThisWeek : 0,
    sparksSentThisWeek: squad.weekOf === row.weekOf ? row.sparksSentThisWeek : 0,
    squad
  };
}

async function getSquadProgress(db, squadId, weeklyGoal) {
  const totals = await db
    .select({
      totalApps: sql`coalesce(sum(${squadMembers.appsSentThisWeek}), 0)::int`
    })
    .from(squadMembers)
    .where(eq(squadMembers.squadId, squadId));

  const totalApps = Number(totals[0]?.totalApps || 0);
  const safeGoal = Math.max(1, Number(weeklyGoal) || 1);
  return {
    totalApps,
    progressPercent: Math.min(100, Math.round((totalApps / safeGoal) * 100))
  };
}

function isSynergyBurstActive(synergyBurstAt) {
  if (!synergyBurstAt) return false;
  const burstTime = new Date(synergyBurstAt).getTime();
  return Number.isFinite(burstTime) && Date.now() - burstTime < 24 * 60 * 60 * 1000;
}

function compactMomentumSurges(messages) {
  const compacted = [];
  let activeGroup = null;

  function flushGroup() {
    if (!activeGroup) return;

    if (activeGroup.items.length < 2) {
      compacted.push(...activeGroup.items);
    } else {
      compacted.push({
        id: `momentum-${activeGroup.items[0].id}`,
        messageType: 'momentum_surge',
        content: `${activeGroup.items.length} applications logged in the last 10 minutes. Squad is surging.`,
        metadata: {
          type: 'momentum_surge',
          count: activeGroup.items.length,
          aliases: [...new Set(activeGroup.items.map((item) => item.metadata?.alias).filter(Boolean))]
        },
        createdAt: activeGroup.items[activeGroup.items.length - 1].createdAt
      });
    }

    activeGroup = null;
  }

  for (const message of messages) {
    const isAppLogSystem = message.messageType === 'system' && message.metadata?.type === 'apps_logged';

    if (!isAppLogSystem) {
      flushGroup();
      compacted.push(message);
      continue;
    }

    const messageTime = new Date(message.createdAt).getTime();

    if (!activeGroup || messageTime - activeGroup.windowStart > 10 * 60 * 1000) {
      flushGroup();
      activeGroup = {
        windowStart: messageTime,
        items: [message]
      };
      continue;
    }

    activeGroup.items.push(message);
  }

  flushGroup();
  return compacted;
}

async function getUnlockedStickerIds(db, userId) {
  const rows = await db
    .select({
      settingsJson: profileSettings.settingsJson
    })
    .from(profileSettings)
    .where(eq(profileSettings.userId, userId))
    .limit(1);

  const settings = rows[0]?.settingsJson || {};
  return Array.isArray(settings.unlockedStickers) ? settings.unlockedStickers : [];
}

async function notifySynergyBurst(db, squadId, actorMemberId) {
  const members = await db
    .select({
      userId: squadMembers.userId
    })
    .from(squadMembers)
    .where(eq(squadMembers.squadId, squadId));

  await Promise.all(
    members.map((member) =>
      db.insert(notifications).values({
        userId: member.userId,
        type: 'squad_synergy_burst',
        actorId: null,
        entityId: squadId,
        entityType: 'squad',
        message: 'Your squad hit a Synergy Burst. The war room is glowing for the next 24 hours.'
      })
    )
  );

  await db.insert(squadMessages).values({
    squadId,
    senderMemberId: actorMemberId,
    messageType: 'system',
    content: 'SYNERGY BURST ONLINE. Squad resilience is amplified for 24 hours.',
    metadata: {
      type: 'synergy_burst',
      alias: 'System'
    },
    milestonePhase: 0
  });
}

async function insertSystemMessage(db, { squadId, senderMemberId = null, content, metadata = {}, milestonePhase = 0 }) {
  await db.insert(squadMessages).values({
    squadId,
    senderMemberId,
    messageType: 'system',
    content,
    metadata: {
      alias: 'System',
      ...metadata
    },
    milestonePhase
  });
}

async function getCurrentPhaseForSquad(db, squadId, weeklyGoal) {
  const progress = await getSquadProgress(db, squadId, weeklyGoal);
  return getMilestonePhase(progress.progressPercent);
}

export async function injectDailyBriefingController(db, squadId) {
  if (!db || !squadId) return;

  const squadRows = await db
    .select({
      weeklyGoal: squads.weeklyGoal,
      synergyScore: squads.synergyScore
    })
    .from(squads)
    .where(eq(squads.id, squadId))
    .limit(1);

  const squad = squadRows[0];
  if (!squad) return;

  const progress = await getSquadProgress(db, squadId, squad.weeklyGoal);
  const currentPhase = getMilestonePhase(progress.progressPercent);
  const todayKey = toDateKey();

  const existing = await db
    .select({ id: squadMessages.id })
    .from(squadMessages)
    .where(
      and(
        eq(squadMessages.squadId, squadId),
        eq(squadMessages.messageType, 'system'),
        eq(squadMessages.milestonePhase, currentPhase),
        gte(squadMessages.createdAt, getTodayStart()),
        sql`${squadMessages.metadata}->>'type' = 'daily_briefing'`
      )
    )
    .limit(1);

  if (existing[0]) return;

  const leaders = await db
    .select({
      alias: squadMembers.anonymousAlias,
      appsSentThisWeek: squadMembers.appsSentThisWeek
    })
    .from(squadMembers)
    .where(eq(squadMembers.squadId, squadId))
    .orderBy(desc(squadMembers.appsSentThisWeek))
    .limit(1);

  const leader = leaders[0];
  const pace = progress.totalApps >= Math.ceil((Number(squad.weeklyGoal || 1) * 3) / 7) ? 'ahead' : 'forming';
  const leaderLine = leader?.appsSentThisWeek
    ? `${leader.alias} leads with ${leader.appsSentThisWeek} apps.`
    : 'No clear lead yet.';

  await insertSystemMessage(db, {
    squadId,
    content: `[BRIEFING] Squad pace: ${pace}. ${leaderLine} Who is joining the push today?`,
    metadata: {
      type: 'daily_briefing',
      briefingDate: todayKey,
      totalApps: progress.totalApps
    },
    milestonePhase: currentPhase
  });
}

export async function injectAppLoggedCommsEvent(db, { squadId, userId, companyName, roleTitle }) {
  if (!db || !squadId || !userId) return;

  const memberRows = await db
    .select({
      id: squadMembers.id,
      alias: squadMembers.anonymousAlias,
      archetypeRole: squadMembers.archetypeRole
    })
    .from(squadMembers)
    .where(and(eq(squadMembers.squadId, squadId), eq(squadMembers.userId, userId)))
    .limit(1);

  const member = memberRows[0];
  if (!member) return;

  const squadRows = await db.select({ weeklyGoal: squads.weeklyGoal }).from(squads).where(eq(squads.id, squadId)).limit(1);
  const phase = await getCurrentPhaseForSquad(db, squadId, squadRows[0]?.weeklyGoal);

  await insertSystemMessage(db, {
    squadId,
    senderMemberId: member.id,
    content: `${member.alias} logged an application.`,
    metadata: {
      type: 'apps_logged',
      alias: member.alias,
      archetypeRole: member.archetypeRole,
      companyName: sanitizeContent(companyName),
      roleTitle: sanitizeContent(roleTitle)
    },
    milestonePhase: phase
  });
}

export async function injectMissionSecuredCommsEvent(db, squadId) {
  if (!db || !squadId) return;

  const squadRows = await db.select({ weeklyGoal: squads.weeklyGoal }).from(squads).where(eq(squads.id, squadId)).limit(1);
  const phase = await getCurrentPhaseForSquad(db, squadId, squadRows[0]?.weeklyGoal);

  await insertSystemMessage(db, {
    squadId,
    content: 'MISSION SECURED. Squad hit the weekly goal. XP unlocked for all.',
    metadata: {
      type: 'goal_reached'
    },
    milestonePhase: phase
  });
}

export async function getCommsController(request, reply) {
  try {
    requireDatabase(request.server.db);

    const context = await getMembershipContext(request.server.db, request.auth.userId);
    if (!context) {
      return reply.code(404).send({ success: false, error: 'Join a squad before opening comms.' });
    }

    const progress = await getSquadProgress(request.server.db, context.squadId, context.squad.weeklyGoal);
    const currentPhase = getMilestonePhase(progress.progressPercent);

    const rows = await request.server.db
      .select({
        id: squadMessages.id,
        senderMemberId: squadMessages.senderMemberId,
        messageType: squadMessages.messageType,
        content: squadMessages.content,
        metadata: squadMessages.metadata,
        milestonePhase: squadMessages.milestonePhase,
        createdAt: squadMessages.createdAt
      })
      .from(squadMessages)
      .where(
        and(
          eq(squadMessages.squadId, context.squadId),
          or(eq(squadMessages.milestonePhase, currentPhase), eq(squadMessages.messageType, 'system'))
        )
      )
      .orderBy(desc(squadMessages.createdAt))
      .limit(40);

    const messages = compactMomentumSurges(rows.reverse()).map((message) => ({
      ...message,
      isMine: message.senderMemberId === context.memberId
    }));

    return reply.send({
      success: true,
      data: {
        messages,
        currentPhase,
        synergyScore: Number(context.squad.synergyScore || 0),
        synergyBurstActive: isSynergyBurstActive(context.squad.synergyBurstAt),
        myArchetype: context.archetypeRole,
        myAlias: context.alias
      }
    });
  } catch (error) {
    const statusCode = error.name === 'ZodError' ? 400 : error.statusCode || 500;
    return reply.code(statusCode).send({ success: false, error: error.message || 'Could not load squad comms.' });
  }
}

export async function postMessageController(request, reply) {
  try {
    requireDatabase(request.server.db);

    const context = await getMembershipContext(request.server.db, request.auth.userId);
    if (!context) {
      return reply.code(404).send({ success: false, error: 'Join a squad before sending comms.' });
    }

    const body = messageSchema.parse(request.body || {});
    const metadata = normalizeMetadata(body.metadata);
    let content = sanitizeContent(body.content);

    if (body.messageType === 'text' && hasLikelyPii(content)) {
      throw publicError('Keep comms alias-only. Emails and phone numbers are not allowed here.');
    }

    if (body.messageType === 'quick_signal') {
      content = content.toUpperCase();
      if (!QUICK_SIGNALS.has(content)) {
        throw publicError('Unknown quick signal.');
      }

      if (content === 'LEAD_VOUCHED' && context.archetypeRole !== 'scout') {
        throw publicError('Only The Scout can send LEAD_VOUCHED.');
      }

      if (content === 'SHIELD_UP' && context.archetypeRole !== 'motivator') {
        throw publicError('Only The Motivator can send SHIELD_UP.');
      }
    }

    if (body.messageType === 'sticker_drop') {
      const unlockedStickerIds = await getUnlockedStickerIds(request.server.db, request.auth.userId);
      const stickerId = String(metadata.stickerId || content).trim();

      if (!unlockedStickerIds.includes(stickerId)) {
        throw publicError('That sticker is not unlocked yet.');
      }

      content = stickerId;
    }

    if (body.messageType === 'signal_drop') {
      if (context.archetypeRole !== 'scout') {
        throw publicError('Only The Scout can post Signal Drops.');
      }

      const url = String(metadata.url || '').trim();
      try {
        new URL(url);
      } catch {
        throw publicError('Signal Drops need a valid job URL.');
      }

      metadata.url = url;
      metadata.title = sanitizeContent(metadata.title || content).slice(0, 100);
      metadata.companyName = sanitizeContent(metadata.companyName || '').slice(0, 80);
      metadata.note = sanitizeContent(metadata.note || '').slice(0, 120);
      content = metadata.title || 'Signal Drop';
    }

    if (body.messageType === 'accolade') {
      const targetAlias = sanitizeContent(metadata.targetAlias || content);
      if (!targetAlias || targetAlias === context.alias) {
        throw publicError('Choose another squad alias for the Resilience Spark.');
      }

      const targetRows = await request.server.db
        .select({ id: squadMembers.id, alias: squadMembers.anonymousAlias })
        .from(squadMembers)
        .where(and(eq(squadMembers.squadId, context.squadId), eq(squadMembers.anonymousAlias, targetAlias)))
        .limit(1);

      if (!targetRows[0]) {
        throw publicError('Target alias is not in your squad.');
      }

      metadata.targetAlias = targetAlias;
      content = targetAlias;

      const nextScore = Number(context.squad.synergyScore || 0) + 10;

      await request.server.db
        .update(squadMembers)
        .set({ sparksSentThisWeek: sql`${squadMembers.sparksSentThisWeek} + 1` })
        .where(eq(squadMembers.id, context.memberId));

      if (nextScore >= 100) {
        await request.server.db
          .update(squads)
          .set({
            synergyScore: 0,
            synergyBurstAt: new Date()
          })
          .where(eq(squads.id, context.squadId));

        await notifySynergyBurst(request.server.db, context.squadId, context.memberId);
      } else {
        await request.server.db
          .update(squads)
          .set({
            synergyScore: nextScore
          })
          .where(eq(squads.id, context.squadId));
      }
    }

    const progress = await getSquadProgress(request.server.db, context.squadId, context.squad.weeklyGoal);
    const currentPhase = getMilestonePhase(progress.progressPercent);

    const inserted = await request.server.db
      .insert(squadMessages)
      .values({
        squadId: context.squadId,
        senderMemberId: context.memberId,
        messageType: body.messageType,
        content,
        metadata: {
          ...metadata,
          alias: context.alias,
          archetypeRole: context.archetypeRole
        },
        milestonePhase: currentPhase
      })
      .returning({
        id: squadMessages.id,
        senderMemberId: squadMessages.senderMemberId,
        messageType: squadMessages.messageType,
        content: squadMessages.content,
        metadata: squadMessages.metadata,
        milestonePhase: squadMessages.milestonePhase,
        createdAt: squadMessages.createdAt
      });

    return reply.code(201).send({
      success: true,
      data: {
        message: {
          ...inserted[0],
          isMine: true
        }
      }
    });
  } catch (error) {
    const statusCode = error.name === 'ZodError' ? 400 : error.statusCode || 500;
    return reply.code(statusCode).send({ success: false, error: error.message || 'Could not send squad comms.' });
  }
}

export async function setArchetypeController(request, reply) {
  try {
    requireDatabase(request.server.db);

    const context = await getMembershipContext(request.server.db, request.auth.userId);
    if (!context) {
      return reply.code(404).send({ success: false, error: 'Join a squad before selecting a role.' });
    }

    if (context.archetypeRole) {
      return reply.code(409).send({ success: false, error: 'Role locked for this week.' });
    }

    const body = archetypeSchema.parse(request.body || {});

    await request.server.db
      .update(squadMembers)
      .set({ archetypeRole: body.role })
      .where(eq(squadMembers.id, context.memberId));

    const progress = await getSquadProgress(request.server.db, context.squadId, context.squad.weeklyGoal);
    const currentPhase = getMilestonePhase(progress.progressPercent);

    await insertSystemMessage(request.server.db, {
      squadId: context.squadId,
      senderMemberId: context.memberId,
      content: `${context.alias} has taken the role of The ${ARCHETYPE_LABELS[body.role]}.`,
      metadata: {
        type: 'archetype_selected',
        alias: context.alias,
        archetypeRole: body.role
      },
      milestonePhase: currentPhase
    });

    return reply.send({
      success: true,
      data: {
        role: body.role
      }
    });
  } catch (error) {
    const statusCode = error.name === 'ZodError' ? 400 : error.statusCode || 500;
    return reply.code(statusCode).send({ success: false, error: error.message || 'Could not set squad archetype.' });
  }
}
