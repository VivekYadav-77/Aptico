import crypto from 'node:crypto';
import { and, eq, gte, inArray, lt, sql } from 'drizzle-orm';
import {
  profileSettings,
  squadMembers,
  squadMonthlyRewards,
  squadMonthlyScores,
  squadScoreEvents,
  squads,
  users
} from '../../db/schema.js';

export const REWARD_BY_RANK = {
  1: { stickerId: 'event_squad_monthly_gold', title: 'Monthly Squad Gold', xpBonus: 300 },
  2: { stickerId: 'event_squad_monthly_silver', title: 'Monthly Squad Silver', xpBonus: 200 },
  3: { stickerId: 'event_squad_monthly_bronze', title: 'Monthly Squad Bronze', xpBonus: 100 }
};

const AUTO_APPROVAL_GUARD = {
  maxSpamPenalty: 15,
  maxSuspiciousEventCount: 3,
  minActiveMemberCount: 2,
  minEligiblePoints: 50
};

const EVENT_RULES = {
  application: { points: 10, cap: 5, window: 'day', capGroup: 'application' },
  weekly_goal: { points: 60, cap: 1, window: 'week', scope: 'squad', capGroup: 'weekly_goal' },
  signal_drop: { points: 4, cap: 2, window: 'day', capGroup: 'signal_drop' },
  accolade: { points: 3, cap: 3, window: 'day', capGroup: 'accolade' },
  sticker_drop: { points: 1, cap: 5, window: 'day', capGroup: 'light_comms' },
  quick_signal: { points: 1, cap: 5, window: 'day', capGroup: 'light_comms' },
  text_message: { points: 1, cap: 3, window: 'day', capGroup: 'text_message' },
  archetype_selected: { points: 5, cap: 1, window: 'week', capGroup: 'archetype_selected' },
  synergy_burst: { points: 20, cap: 1, window: 'week', scope: 'squad', capGroup: 'synergy_burst' },
  ping: { points: 2, cap: 2, window: 'week', capGroup: 'ping' }
};

const PENALTY_PER_SUSPICIOUS_EVENT = 5;

function toDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function toPeriod(date = new Date()) {
  return date.toISOString().slice(0, 7);
}

function parsePeriod(period) {
  if (typeof period === 'string' && /^\d{4}-\d{2}$/.test(period)) {
    return period;
  }

  return toPeriod();
}

export function getPeriodBounds(period = toPeriod()) {
  const safePeriod = parsePeriod(period);
  const start = new Date(`${safePeriod}-01T00:00:00Z`);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  return { period: safePeriod, start, end };
}

function isClosedPeriod(period) {
  return parsePeriod(period) < toPeriod();
}

function getWeekBounds(date = new Date()) {
  const start = new Date(date);
  const day = start.getUTCDay();
  const distanceFromMonday = (day + 6) % 7;
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - distanceFromMonday);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);
  return { start, end };
}

function normalizeText(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function hashContent(value) {
  return crypto.createHash('sha256').update(normalizeText(value)).digest('hex');
}

function normalizeJobKey(metadata = {}) {
  return [metadata.companyName, metadata.roleTitle, metadata.jobUrl || '']
    .map((part) => normalizeText(part).replace(/[^a-z0-9:/.-]/g, ''))
    .join('|');
}

function eventTypesForCapGroup(capGroup) {
  return Object.entries(EVENT_RULES)
    .filter(([, rule]) => rule.capGroup === capGroup)
    .map(([eventType]) => eventType);
}

async function countExistingEligibleEvents(db, { eventType, capGroup, squadId, userId, eventDate, createdAt }) {
  const rule = EVENT_RULES[eventType];
  if (!rule?.cap) return 0;

  let start;
  let end;

  if (rule.window === 'week') {
    ({ start, end } = getWeekBounds(createdAt));
  } else {
    start = new Date(`${eventDate}T00:00:00Z`);
    end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
  }

  const eventTypes = eventTypesForCapGroup(capGroup || rule.capGroup);
  const scopeClause = rule.scope === 'squad' ? eq(squadScoreEvents.squadId, squadId) : eq(squadScoreEvents.userId, userId);

  const rows = await db
    .select({ count: sql`count(*)::int` })
    .from(squadScoreEvents)
    .where(
      and(
        scopeClause,
        inArray(squadScoreEvents.eventType, eventTypes),
        gte(squadScoreEvents.createdAt, start),
        lt(squadScoreEvents.createdAt, end),
        sql`${squadScoreEvents.eligiblePoints} > 0`
      )
    );

  return Number(rows[0]?.count || 0);
}

async function evaluateSpam(db, payload, rule, period) {
  const reasons = [];
  const metadata = { ...(payload.metadata || {}) };
  const normalizedContent = normalizeText(metadata.content || payload.content || '');

  if (payload.shadowbanned) {
    reasons.push('shadowbanned');
  }

  if (payload.eventType === 'text_message') {
    if (normalizedContent.length < 24) {
      reasons.push('text_too_short');
    }

    const contentHash = hashContent(normalizedContent);
    metadata.contentHash = contentHash;

    const duplicates = await db
      .select({ id: squadScoreEvents.id })
      .from(squadScoreEvents)
      .where(
        and(
          eq(squadScoreEvents.userId, payload.userId),
          eq(squadScoreEvents.period, period),
          eq(squadScoreEvents.eventType, 'text_message'),
          sql`${squadScoreEvents.metadata}->>'contentHash' = ${contentHash}`
        )
      )
      .limit(1);

    if (duplicates[0]) {
      reasons.push('duplicate_text');
    }
  }

  if (payload.eventType === 'application') {
    const jobKey = normalizeJobKey(metadata);
    metadata.jobKey = jobKey;

    const duplicateRows = await db
      .select({ id: squadScoreEvents.id })
      .from(squadScoreEvents)
      .where(
        and(
          eq(squadScoreEvents.userId, payload.userId),
          eq(squadScoreEvents.period, period),
          eq(squadScoreEvents.eventType, 'application'),
          sql`${squadScoreEvents.metadata}->>'jobKey' = ${jobKey}`
        )
      )
      .limit(1);

    if (duplicateRows[0]) {
      reasons.push('duplicate_application');
    }

    if (metadata.jobUrl) {
      const urlRows = await db
        .select({ count: sql`count(distinct ${squadScoreEvents.userId})::int` })
        .from(squadScoreEvents)
        .where(
          and(
            eq(squadScoreEvents.period, period),
            eq(squadScoreEvents.eventType, 'application'),
            sql`${squadScoreEvents.metadata}->>'jobUrl' = ${metadata.jobUrl}`
          )
        );

      if (Number(urlRows[0]?.count || 0) >= 4) {
        reasons.push('repeated_url');
      }
    }
  }

  const oneHourAgo = new Date((payload.createdAt || new Date()).getTime() - 60 * 60 * 1000);
  const burstRows = await db
    .select({ count: sql`count(*)::int` })
    .from(squadScoreEvents)
    .where(and(eq(squadScoreEvents.squadId, payload.squadId), gte(squadScoreEvents.createdAt, oneHourAgo)));

  if (Number(burstRows[0]?.count || 0) >= 20) {
    reasons.push('suspicious_burst');
  }

  const capCount = await countExistingEligibleEvents(db, {
    eventType: payload.eventType,
    capGroup: rule.capGroup,
    squadId: payload.squadId,
    userId: payload.userId,
    eventDate: payload.eventDate,
    createdAt: payload.createdAt || new Date()
  });

  if (rule.cap && capCount >= rule.cap) {
    reasons.push(`${rule.window}_cap_reached`);
  }

  return {
    metadata,
    reason: reasons[0] || 'eligible',
    spamStatus: reasons.length ? 'flagged' : 'clear',
    eligiblePoints: reasons.length ? 0 : rule.points
  };
}

export async function recordSquadScoreEvent(db, payload) {
  if (!db || !payload?.squadId || !payload?.eventType || !payload?.sourceType || !payload?.sourceId) {
    return null;
  }

  const rule = EVENT_RULES[payload.eventType];
  if (!rule) {
    return null;
  }

  const createdAt = payload.createdAt || new Date();
  const eventDate = payload.eventDate || toDateKey(createdAt);
  const period = payload.period || toPeriod(createdAt);

  const existing = await db
    .select({ id: squadScoreEvents.id })
    .from(squadScoreEvents)
    .where(and(eq(squadScoreEvents.sourceType, payload.sourceType), eq(squadScoreEvents.sourceId, String(payload.sourceId))))
    .limit(1);

  if (existing[0]) {
    return existing[0];
  }

  const decision = await evaluateSpam(db, { ...payload, createdAt, eventDate }, rule, period);

  const inserted = await db
    .insert(squadScoreEvents)
    .values({
      squadId: payload.squadId,
      userId: payload.userId || null,
      period,
      eventDate,
      eventType: payload.eventType,
      sourceType: payload.sourceType,
      sourceId: String(payload.sourceId),
      rawPoints: rule.points,
      eligiblePoints: decision.eligiblePoints,
      spamStatus: decision.spamStatus,
      reason: decision.reason,
      metadata: decision.metadata,
      createdAt
    })
    .returning({ id: squadScoreEvents.id });

  return inserted[0] || null;
}

function summarizeScoreRows(rows, period, publishedMap = new Map()) {
  const grouped = new Map();

  for (const row of rows) {
    const entry =
      grouped.get(row.squadId) ||
      {
        squadId: row.squadId,
        squadName: row.squadName,
        period,
        rawPoints: 0,
        eligiblePoints: 0,
        suspiciousEventCount: 0,
        spamPenalty: 0,
        qualityScore: 0,
        activeMemberIds: new Set(),
        lastValidAt: null,
        breakdown: {},
        reward: publishedMap.get(row.squadId) || null
      };

    const rawPoints = Number(row.rawPoints || 0);
    const eligiblePoints = Number(row.eligiblePoints || 0);
    entry.rawPoints += rawPoints;
    entry.eligiblePoints += eligiblePoints;

    if (row.spamStatus !== 'clear') {
      entry.suspiciousEventCount += 1;
    }

    if (eligiblePoints > 0 && row.userId) {
      entry.activeMemberIds.add(row.userId);
      const createdAt = row.createdAt ? new Date(row.createdAt) : null;
      if (createdAt && (!entry.lastValidAt || createdAt > entry.lastValidAt)) {
        entry.lastValidAt = createdAt;
      }
    }

    const currentBreakdown = entry.breakdown[row.eventType] || { rawPoints: 0, eligiblePoints: 0, count: 0 };
    currentBreakdown.rawPoints += rawPoints;
    currentBreakdown.eligiblePoints += eligiblePoints;
    currentBreakdown.count += 1;
    entry.breakdown[row.eventType] = currentBreakdown;

    grouped.set(row.squadId, entry);
  }

  return [...grouped.values()].map((entry) => {
    const spamPenalty = entry.suspiciousEventCount * PENALTY_PER_SUSPICIOUS_EVENT;
    return {
      ...entry,
      activeMemberCount: entry.activeMemberIds.size,
      activeMemberIds: undefined,
      spamPenalty,
      qualityScore: Math.max(0, entry.eligiblePoints - spamPenalty),
      lastValidAt: entry.lastValidAt ? entry.lastValidAt.toISOString() : null
    };
  });
}

export function buildRankedLeaderboardFromRows(rows, period, publishedMap = new Map()) {
  const ranked = summarizeScoreRows(rows, period, publishedMap)
    .sort((a, b) => {
      if (b.qualityScore !== a.qualityScore) return b.qualityScore - a.qualityScore;
      if (a.suspiciousEventCount !== b.suspiciousEventCount) return a.suspiciousEventCount - b.suspiciousEventCount;
      if (b.activeMemberCount !== a.activeMemberCount) return b.activeMemberCount - a.activeMemberCount;
      return new Date(a.lastValidAt || 0).getTime() - new Date(b.lastValidAt || 0).getTime();
    })
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  return ranked.map((entry, index) => {
    const previousEntry = index > 0 ? ranked[index - 1] : null;
    const nextEntry = index < ranked.length - 1 ? ranked[index + 1] : null;
    return {
      ...entry,
      nextRankDelta: previousEntry ? Math.max(0, previousEntry.qualityScore - entry.qualityScore) : 0,
      previousRankDelta: nextEntry ? Math.max(0, entry.qualityScore - nextEntry.qualityScore) : 0,
      isRewardRank: entry.rank <= 3
    };
  });
}

async function getPublishedRewards(db, period) {
  const rows = await db.select().from(squadMonthlyRewards).where(eq(squadMonthlyRewards.period, period));
  return new Map(
    rows.map((row) => [
      row.squadId,
      {
        rank: Number(row.rank),
        stickerId: row.stickerId,
        title: row.title,
        xpBonus: Number(row.xpBonus || 0),
        approvedAt: row.approvedAt,
        mode: row.metadata?.mode || 'manual'
      }
    ])
  );
}

export async function refreshMonthlyScores(db, periodInput) {
  const { period, start, end } = getPeriodBounds(periodInput);
  const publishedMap = await getPublishedRewards(db, period);

  const rows = await db
    .select({
      squadId: squadScoreEvents.squadId,
      userId: squadScoreEvents.userId,
      eventType: squadScoreEvents.eventType,
      rawPoints: squadScoreEvents.rawPoints,
      eligiblePoints: squadScoreEvents.eligiblePoints,
      spamStatus: squadScoreEvents.spamStatus,
      createdAt: squadScoreEvents.createdAt,
      squadName: squads.squadName
    })
    .from(squadScoreEvents)
    .innerJoin(squads, eq(squadScoreEvents.squadId, squads.id))
    .where(and(eq(squadScoreEvents.period, period), gte(squadScoreEvents.createdAt, start), lt(squadScoreEvents.createdAt, end)));

  const ranked = buildRankedLeaderboardFromRows(rows, period, publishedMap);
  const finalizedRows = await db
    .select({
      squadId: squadMonthlyScores.squadId,
      reviewStatus: squadMonthlyScores.reviewStatus,
      publishedAt: squadMonthlyScores.publishedAt,
      finalizedAt: squadMonthlyScores.finalizedAt,
      metadata: squadMonthlyScores.metadata
    })
    .from(squadMonthlyScores)
    .where(eq(squadMonthlyScores.period, period));
  const statusBySquad = new Map(finalizedRows.map((row) => [row.squadId, row]));

  for (const entry of ranked) {
    const status = statusBySquad.get(entry.squadId);
    const currentMetadata = status?.metadata || {};
    await db
      .insert(squadMonthlyScores)
      .values({
        squadId: entry.squadId,
        period,
        eligiblePoints: entry.eligiblePoints,
        rawPoints: entry.rawPoints,
        spamPenalty: entry.spamPenalty,
        qualityScore: entry.qualityScore,
        suspiciousEventCount: entry.suspiciousEventCount,
        activeMemberCount: entry.activeMemberCount,
        rank: entry.rank,
        reviewStatus: status?.reviewStatus || 'active',
        publishedAt: status?.publishedAt || null,
        finalizedAt: status?.finalizedAt || null,
        metadata: {
          ...currentMetadata,
          breakdown: entry.breakdown,
          lastValidAt: entry.lastValidAt,
          nextRankDelta: entry.nextRankDelta,
          previousRankDelta: entry.previousRankDelta
        },
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: [squadMonthlyScores.squadId, squadMonthlyScores.period],
        set: {
          eligiblePoints: entry.eligiblePoints,
          rawPoints: entry.rawPoints,
          spamPenalty: entry.spamPenalty,
          qualityScore: entry.qualityScore,
          suspiciousEventCount: entry.suspiciousEventCount,
          activeMemberCount: entry.activeMemberCount,
          rank: entry.rank,
          metadata: {
            ...currentMetadata,
            breakdown: entry.breakdown,
            lastValidAt: entry.lastValidAt,
            nextRankDelta: entry.nextRankDelta,
            previousRankDelta: entry.previousRankDelta
          },
          updatedAt: new Date()
        }
      });
  }

  return ranked;
}

export function getReviewReasons(entry) {
  const reasons = [];
  if (entry.spamPenalty > AUTO_APPROVAL_GUARD.maxSpamPenalty) reasons.push('spam_penalty_high');
  if (entry.suspiciousEventCount > AUTO_APPROVAL_GUARD.maxSuspiciousEventCount) reasons.push('too_many_suspicious_events');
  if (entry.activeMemberCount < AUTO_APPROVAL_GUARD.minActiveMemberCount) reasons.push('not_enough_active_members');
  if (entry.eligiblePoints < AUTO_APPROVAL_GUARD.minEligiblePoints) reasons.push('not_enough_eligible_points');
  return reasons;
}

export function canAutoApprove(entry) {
  return getReviewReasons(entry).length === 0;
}

async function grantMonthlyReward(db, { entry, period, rank, approvedBy = null, approvedAt = new Date(), mode = 'auto' }) {
  const reward = REWARD_BY_RANK[rank];
  if (!reward) return false;

  const insertedReward = await db
    .insert(squadMonthlyRewards)
    .values({
      squadId: entry.squadId,
      period,
      rank,
      stickerId: reward.stickerId,
      title: reward.title,
      xpBonus: reward.xpBonus,
      approvedBy,
      approvedAt,
      metadata: {
        qualityScore: entry.qualityScore,
        mode
      }
    })
    .onConflictDoNothing()
    .returning({ id: squadMonthlyRewards.id });

  if (!insertedReward[0]) {
    return false;
  }

  const members = await db.select({ userId: squadMembers.userId }).from(squadMembers).where(eq(squadMembers.squadId, entry.squadId));

  await Promise.all(
    members.map(async (member) => {
      await db
        .update(users)
        .set({ resilienceXp: sql`${users.resilienceXp} + ${reward.xpBonus}` })
        .where(eq(users.id, member.userId));
      await addStickerToUserSettings(db, member.userId, reward.stickerId);
    })
  );

  return true;
}

export async function autoFinalizeClosedPeriodIfNeeded(db, periodInput) {
  const period = parsePeriod(periodInput);
  if (!isClosedPeriod(period)) {
    return { finalized: false, reason: 'period_active' };
  }

  const existingFinalized = await db
    .select({ count: sql`count(*)::int` })
    .from(squadMonthlyScores)
    .where(and(eq(squadMonthlyScores.period, period), sql`${squadMonthlyScores.finalizedAt} is not null`));

  if (Number(existingFinalized[0]?.count || 0) > 0) {
    return { finalized: false, reason: 'already_finalized' };
  }

  const ranked = await refreshMonthlyScores(db, period);
  const topThree = ranked.slice(0, 3);
  const now = new Date();

  for (const entry of ranked) {
    const isTopThree = entry.rank <= 3;
    const reviewReasons = isTopThree ? getReviewReasons(entry) : [];
    const autoApproved = isTopThree && reviewReasons.length === 0;
    const needsReview = isTopThree && reviewReasons.length > 0;

    await db
      .update(squadMonthlyScores)
      .set({
        reviewStatus: autoApproved ? 'auto_approved' : needsReview ? 'needs_review' : 'reviewed',
        finalizedAt: now,
        publishedAt: autoApproved ? now : null,
        metadata: {
          breakdown: entry.breakdown,
          lastValidAt: entry.lastValidAt,
          nextRankDelta: entry.nextRankDelta,
          previousRankDelta: entry.previousRankDelta,
          autoFinalized: true,
          reviewReasons
        },
        updatedAt: now
      })
      .where(and(eq(squadMonthlyScores.period, period), eq(squadMonthlyScores.squadId, entry.squadId)));

    if (autoApproved) {
      await grantMonthlyReward(db, { entry, period, rank: entry.rank, approvedAt: now, mode: 'auto' });
    }
  }

  return {
    finalized: true,
    autoApprovedCount: topThree.filter(canAutoApprove).length,
    needsReviewCount: topThree.filter((entry) => !canAutoApprove(entry)).length
  };
}

function decorateEntries({ entries, statusBySquad, rewards, currentSquadId = null }) {
  return entries.map((entry) => {
    const status = statusBySquad.get(entry.squadId);
    const reward = rewards.get(entry.squadId) || entry.reward || null;
    const reviewReasons = Array.isArray(status?.metadata?.reviewReasons) ? status.metadata.reviewReasons : getReviewReasons(entry);
    const rewardStatus = reward
      ? reward.mode === 'auto' ? 'auto_approved' : 'published'
      : status?.reviewStatus === 'auto_approved'
        ? 'auto_approved'
        : status?.reviewStatus === 'needs_review'
          ? 'needs_review'
          : entry.rank <= 3
            ? isClosedPeriod(entry.period) ? 'pending' : 'live'
            : 'not_reward_rank';

    return {
      ...entry,
      isCurrentUserSquad: Boolean(currentSquadId && entry.squadId === currentSquadId),
      isRewardRank: entry.rank <= 3,
      reward,
      rewardStatus,
      reviewReason: reviewReasons[0] || null,
      reviewReasons
    };
  });
}

async function getStatusBySquad(db, period) {
  const rows = await db
    .select({
      squadId: squadMonthlyScores.squadId,
      reviewStatus: squadMonthlyScores.reviewStatus,
      metadata: squadMonthlyScores.metadata,
      publishedAt: squadMonthlyScores.publishedAt,
      finalizedAt: squadMonthlyScores.finalizedAt
    })
    .from(squadMonthlyScores)
    .where(eq(squadMonthlyScores.period, period));

  return new Map(rows.map((row) => [row.squadId, row]));
}

async function getCurrentSquadId(db, userId) {
  if (!userId) return null;
  const membership = await db
    .select({ squadId: squadMembers.squadId })
    .from(squadMembers)
    .where(eq(squadMembers.userId, userId))
    .limit(1);
  return membership[0]?.squadId || null;
}

export async function getLeaderboard(db, { period: periodInput, limit = 50, userId = null, includeMyRank = false, skipAutoFinalize = false } = {}) {
  const period = parsePeriod(periodInput);
  if (!skipAutoFinalize) {
    await autoFinalizeClosedPeriodIfNeeded(db, period);
  }

  const ranked = await refreshMonthlyScores(db, period);
  const rewards = await getPublishedRewards(db, period);
  const statusBySquad = await getStatusBySquad(db, period);
  const currentSquadId = await getCurrentSquadId(db, userId);
  const safeLimit = Math.max(1, Math.min(100, Number(limit || 50)));
  const visibleEntries = ranked.slice(0, safeLimit);
  const decoratedVisible = decorateEntries({ entries: visibleEntries, statusBySquad, rewards, currentSquadId });
  const myEntry = currentSquadId ? ranked.find((entry) => entry.squadId === currentSquadId) || null : null;
  const decoratedMyEntry = myEntry ? decorateEntries({ entries: [myEntry], statusBySquad, rewards, currentSquadId })[0] : null;
  const publishedCount = rewards.size;
  const needsReviewCount = [...statusBySquad.values()].filter((status) => status.reviewStatus === 'needs_review').length;

  return {
    period,
    reviewStatus: publishedCount ? (needsReviewCount ? 'partial_review' : 'published') : period === toPeriod() ? 'active' : needsReviewCount ? 'needs_review' : 'provisional',
    entries: decoratedVisible,
    podium: decoratedVisible.slice(0, 3),
    myRank: includeMyRank ? decoratedMyEntry : null,
    hasMore: ranked.length > safeLimit,
    totalSquads: ranked.length,
    autoFinalize: {
      enabled: true,
      closedPeriod: isClosedPeriod(period),
      needsReviewCount,
      publishedCount
    }
  };
}

export async function getMyLeaderboardRank(db, userId, periodInput) {
  const period = parsePeriod(periodInput);
  const leaderboard = await getLeaderboard(db, { period, limit: 100, userId, includeMyRank: true });
  return {
    period,
    entry: leaderboard.myRank || null
  };
}

async function addStickerToUserSettings(db, userId, stickerId) {
  const rows = await db
    .select({ id: profileSettings.id, settingsJson: profileSettings.settingsJson })
    .from(profileSettings)
    .where(eq(profileSettings.userId, userId))
    .limit(1);

  const settings = rows[0]?.settingsJson || {};
  const unlockedStickers = Array.isArray(settings.unlockedStickers) ? [...settings.unlockedStickers] : [];
  if (!unlockedStickers.includes(stickerId)) {
    unlockedStickers.push(stickerId);
  }

  const updatedSettings = {
    ...settings,
    unlockedStickers,
    monthlySquadReward: stickerId
  };

  if (rows[0]) {
    await db
      .update(profileSettings)
      .set({ settingsJson: updatedSettings, updatedAt: new Date() })
      .where(eq(profileSettings.id, rows[0].id));
  } else {
    await db.insert(profileSettings).values({ userId, settingsJson: updatedSettings });
  }
}

export async function finalizeMonthlyLeaderboard(db, { period: periodInput, approvedBy, approvedSquadIds = null, disqualifiedSquadIds = [], action = 'publish_top_3', squadId = null }) {
  const period = parsePeriod(periodInput);
  const disqualified = new Set(disqualifiedSquadIds || []);
  const leaderboard = await getLeaderboard(db, { period, limit: 100, skipAutoFinalize: true });
  const eligibleEntries = leaderboard.entries.filter((entry) => !disqualified.has(entry.squadId));
  const now = new Date();

  if (action === 'approve' && squadId) {
    const entry = leaderboard.entries.find((item) => item.squadId === squadId);
    if (entry?.rank && entry.rank <= 3) {
      await grantMonthlyReward(db, { entry, period, rank: entry.rank, approvedBy, approvedAt: now, mode: 'manual_approve' });
      await db
        .update(squadMonthlyScores)
        .set({ reviewStatus: 'approved', publishedAt: now, finalizedAt: now, updatedAt: now })
        .where(and(eq(squadMonthlyScores.period, period), eq(squadMonthlyScores.squadId, squadId)));
    }

    return getLeaderboard(db, { period, limit: 50, skipAutoFinalize: true });
  }

  if (action === 'disqualify' && squadId) {
    await db
      .update(squadMonthlyScores)
      .set({
        reviewStatus: 'disqualified',
        finalizedAt: now,
        publishedAt: null,
        updatedAt: now
      })
      .where(and(eq(squadMonthlyScores.period, period), eq(squadMonthlyScores.squadId, squadId)));

    return getLeaderboard(db, { period, limit: 50, skipAutoFinalize: true });
  }

  if (action === 'promote_next_eligible') {
    const rewardRows = await db.select({ rank: squadMonthlyRewards.rank }).from(squadMonthlyRewards).where(eq(squadMonthlyRewards.period, period));
    const usedRanks = new Set(rewardRows.map((row) => Number(row.rank)));
    const nextRank = [1, 2, 3].find((rank) => !usedRanks.has(rank));
    const nextEntry = leaderboard.entries.find((entry) => entry.rank > 3 && entry.rewardStatus !== 'needs_review' && entry.rewardStatus !== 'published' && canAutoApprove(entry));

    if (nextRank && nextEntry) {
      await grantMonthlyReward(db, { entry: nextEntry, period, rank: nextRank, approvedBy, approvedAt: now, mode: 'promote_next_eligible' });
      await db
        .update(squadMonthlyScores)
        .set({ reviewStatus: 'approved', publishedAt: now, finalizedAt: now, updatedAt: now })
        .where(and(eq(squadMonthlyScores.period, period), eq(squadMonthlyScores.squadId, nextEntry.squadId)));
    }

    return getLeaderboard(db, { period, limit: 50, skipAutoFinalize: true });
  }

  const winnerEntries = (approvedSquadIds?.length
    ? approvedSquadIds
        .map((squadId) => eligibleEntries.find((entry) => entry.squadId === squadId))
        .filter(Boolean)
    : eligibleEntries
  ).slice(0, 3);

  for (const entry of leaderboard.entries) {
    await db
      .update(squadMonthlyScores)
      .set({
        reviewStatus: disqualified.has(entry.squadId) ? 'disqualified' : winnerEntries.some((winner) => winner.squadId === entry.squadId) ? 'approved' : 'reviewed',
        finalizedAt: now,
        publishedAt: winnerEntries.some((winner) => winner.squadId === entry.squadId) ? now : null,
        updatedAt: now
      })
      .where(and(eq(squadMonthlyScores.period, period), eq(squadMonthlyScores.squadId, entry.squadId)));
  }

  for (const [index, entry] of winnerEntries.entries()) {
    const rank = index + 1;
    await grantMonthlyReward(db, { entry, period, rank, approvedBy, approvedAt: now, mode: 'manual_publish' });
  }

  return getLeaderboard(db, { period, limit: 50, skipAutoFinalize: true });
}
