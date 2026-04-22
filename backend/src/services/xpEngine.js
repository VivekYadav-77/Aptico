import { and, eq, gte, lt, sql } from 'drizzle-orm';
import { applicationLogs, rejectionLogs, users } from '../db/schema.js';

const APPLICATION_XP_TIERS = [
  { maxCount: 5, xp: 20 },
  { maxCount: 15, xp: 5 }
];

const REJECTION_STAGE_XP = {
  resume: 50,
  first_round: 100,
  hiring_manager: 175,
  final: 250
};

const SHADOWBAN_STRINGS = new Set([
  'a',
  'aa',
  'aaa',
  'abc',
  'asdf',
  'company',
  'demo',
  'dummy',
  'fake',
  'job',
  'na',
  'none',
  'null',
  'qwerty',
  'role',
  'sample',
  'test',
  'testing',
  '123',
  '1234'
]);

function getUtcDayRange(now = new Date()) {
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return { start, end };
}

function normalizeProofField(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ');
}

function isPlausibleText(value) {
  const normalized = normalizeProofField(value);
  const compact = normalized.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (normalized.length < 3) {
    return false;
  }

  if (!/[a-z]/i.test(normalized)) {
    return false;
  }

  if (SHADOWBAN_STRINGS.has(compact)) {
    return false;
  }

  if (/^([a-z0-9])\1{2,}$/i.test(compact)) {
    return false;
  }

  if (/^[^a-z]+$/i.test(normalized)) {
    return false;
  }

  return true;
}

export async function getTodayIntegrityCounts(db, userId, now = new Date()) {
  const { start, end } = getUtcDayRange(now);

  const [appRows, rejectionRows] = await Promise.all([
    db
      .select({ count: sql`count(*)::int` })
      .from(applicationLogs)
      .where(
        and(
          eq(applicationLogs.userId, userId),
          eq(applicationLogs.isShadowbanned, false),
          gte(applicationLogs.createdAt, start),
          lt(applicationLogs.createdAt, end)
        )
      ),
    db
      .select({ count: sql`count(*)::int` })
      .from(rejectionLogs)
      .where(
        and(
          eq(rejectionLogs.userId, userId),
          eq(rejectionLogs.isShadowbanned, false),
          gte(rejectionLogs.createdAt, start),
          lt(rejectionLogs.createdAt, end)
        )
      )
  ]);

  return {
    applicationsToday: Number(appRows[0]?.count || 0),
    rejectionsToday: Number(rejectionRows[0]?.count || 0)
  };
}

export function calculateApplicationXp(applicationCountToday) {
  const count = Number(applicationCountToday || 0);
  const tier = APPLICATION_XP_TIERS.find((entry) => count >= 1 && count <= entry.maxCount);
  return tier?.xp || 0;
}

export function calculateRejectionXp(stageRejected) {
  return REJECTION_STAGE_XP[stageRejected] || 0;
}

export async function applyXpDecayIfNeeded(db, userId, now = new Date()) {
  const [user] = await db
    .select({
      resilienceXp: users.resilienceXp,
      lastXpDecayAt: users.lastXpDecayAt
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return null;
  }

  const lastDecayAt = user.lastXpDecayAt ? new Date(user.lastXpDecayAt) : null;
  const shouldDecay = !lastDecayAt || now.getTime() - lastDecayAt.getTime() >= 7 * 24 * 60 * 60 * 1000;

  if (!shouldDecay) {
    return {
      decayed: false,
      resilienceXp: Number(user.resilienceXp || 0)
    };
  }

  const currentXp = Number(user.resilienceXp || 0);
  const decayAmount = Math.floor(currentXp * 0.05);
  const nextXp = Math.max(0, currentXp - decayAmount);

  await db
    .update(users)
    .set({
      resilienceXp: nextXp,
      lastXpDecayAt: now
    })
    .where(eq(users.id, userId));

  return {
    decayed: true,
    decayAmount,
    resilienceXp: nextXp
  };
}

export async function grantXp(db, userId, xpEarned) {
  const nextDelta = Math.max(0, Number(xpEarned || 0));

  if (!nextDelta) {
    const [user] = await db
      .select({ resilienceXp: users.resilienceXp })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return Number(user?.resilienceXp || 0);
  }

  const [updatedUser] = await db
    .update(users)
    .set({
      resilienceXp: sql`${users.resilienceXp} + ${nextDelta}`
    })
    .where(eq(users.id, userId))
    .returning({
      resilienceXp: users.resilienceXp
    });

  return Number(updatedUser?.resilienceXp || 0);
}

export async function shouldShadowban(db, userId, companyName, roleTitle, options = {}) {
  const normalizedCompanyName = normalizeProofField(companyName);
  const normalizedRoleTitle = normalizeProofField(roleTitle);

  if (!isPlausibleText(normalizedCompanyName)) {
    return { shadowbanned: true, reason: 'implausible_company_name' };
  }

  if (!isPlausibleText(normalizedRoleTitle)) {
    return { shadowbanned: true, reason: 'implausible_role_title' };
  }

  const counts = await getTodayIntegrityCounts(db, userId, options.now);

  if (counts.applicationsToday >= 15 && options.kind !== 'rejection') {
    return { shadowbanned: true, reason: 'application_daily_cap_reached' };
  }

  if (counts.rejectionsToday >= 5) {
    return { shadowbanned: true, reason: 'rejection_daily_cap_reached' };
  }

  return { shadowbanned: false, reason: 'clear' };
}
