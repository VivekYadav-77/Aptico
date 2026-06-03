import crypto from 'node:crypto';
import { and, desc, eq, lt, or, sql } from 'drizzle-orm';
import { communityWins, publicJobCache, userProfiles, users, winLikes } from '../../db/schema.js';

const MAX_WINS_PER_WEEK = 3;

function serviceError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function trimOrNull(value) {
  const trimmed = String(value || '').trim();
  return trimmed || null;
}

function parseScheduledAt(value) {
  if (!value) {
    return null;
  }

  const scheduledAt = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(scheduledAt.getTime())) {
    throw serviceError('Scheduled time is invalid', 400);
  }

  if (scheduledAt.getTime() <= Date.now()) {
    throw serviceError('Scheduled time must be in the future', 400);
  }

  return scheduledAt;
}

function selectWinShape(viewerId = null) {
  const shape = {
    id: communityWins.id,
    user_id: communityWins.userId,
    role_title: communityWins.roleTitle,
    company_name: communityWins.companyName,
    search_duration_weeks: communityWins.searchDurationWeeks,
    message: communityWins.message,
    likes_count: communityWins.likesCount,
    is_visible: communityWins.isVisible,
    scheduled_at: communityWins.scheduledAt,
    created_at: communityWins.createdAt,
    user: {
      name: users.name,
      avatar_url: users.avatarUrl,
      username: userProfiles.username
    }
  };

  if (viewerId) {
    shape.has_liked = sql`exists(select 1 from win_likes where win_id = community_wins.id and user_id = ${viewerId})`.mapWith(Boolean);
  } else {
    shape.has_liked = sql`false`.mapWith(Boolean);
  }

  return shape;
}

function getWeekBounds(value) {
  const date = new Date(value);
  const start = new Date(date);
  const day = start.getDay();
  const daysSinceMonday = (day + 6) % 7;

  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - daysSinceMonday);

  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  return { start, end };
}

async function assertWeeklyWinLimit(db, userId, publicationDate, { excludeWinId = null } = {}) {
  const { start, end } = getWeekBounds(publicationDate);
  const filters = [
    eq(communityWins.userId, userId),
    eq(communityWins.isVisible, true),
    sql`coalesce(${communityWins.scheduledAt}, ${communityWins.createdAt}) >= ${start}`,
    sql`coalesce(${communityWins.scheduledAt}, ${communityWins.createdAt}) < ${end}`
  ];

  if (excludeWinId) {
    filters.push(sql`${communityWins.id} <> ${excludeWinId}`);
  }

  const rows = await db
    .select({ total: sql`count(*)::int` })
    .from(communityWins)
    .where(and(...filters));

  if (Number(rows[0]?.total || 0) >= MAX_WINS_PER_WEEK) {
    throw serviceError(`You can publish up to ${MAX_WINS_PER_WEEK} community wins per week`, 429);
  }
}

function normalizeJobId(job) {
  const sourceId = job.job_id || job.jobId || job.id || job.sourceId || job.url || job.apply_url || job.applyUrl;
  const raw = String(sourceId || `${job.source || 'job'}:${job.title || ''}:${job.company || ''}`).trim();
  return raw.slice(0, 200) || crypto.createHash('sha256').update(JSON.stringify(job)).digest('hex');
}

function normalizeApplyUrl(job) {
  return trimOrNull(job.apply_url || job.applyUrl || job.url || job.redirectUrl);
}

function normalizeGhostScore(job) {
  const value = job.ghost_score ?? job.ghostScore ?? job.scamScore ?? null;
  return typeof value === 'number' ? value : value === null ? null : Number(value);
}

export async function postWin(db, userId, data) {
  const roleTitle = trimOrNull(data.role_title || data.roleTitle);
  const companyName = trimOrNull(data.company_name || data.companyName);
  const message = trimOrNull(data.message);
  const duration = data.search_duration_weeks ?? data.searchDurationWeeks ?? null;
  const scheduledAt = parseScheduledAt(data.scheduled_at || data.scheduledAt);

  if (!roleTitle || roleTitle.length > 100) {
    throw serviceError('Role title is required and must be 100 characters or less', 400);
  }

  if (companyName && companyName.length > 100) {
    throw serviceError('Company name must be 100 characters or less', 400);
  }

  if (duration !== null && (!Number.isInteger(Number(duration)) || Number(duration) < 1 || Number(duration) > 200)) {
    throw serviceError('Search duration must be an integer from 1 to 200 weeks', 400);
  }

  if (message && message.length > 280) {
    throw serviceError('Message must be 280 characters or less', 400);
  }

  await assertWeeklyWinLimit(db, userId, scheduledAt || new Date());

  const inserted = await db
    .insert(communityWins)
    .values({
      userId,
      roleTitle,
      companyName,
      searchDurationWeeks: duration === null ? null : Number(duration),
      message,
      scheduledAt
    })
    .returning();

  const rows = await db
    .select(selectWinShape(userId))
    .from(communityWins)
    .innerJoin(users, eq(communityWins.userId, users.id))
    .leftJoin(userProfiles, eq(communityWins.userId, userProfiles.userId))
    .where(eq(communityWins.id, inserted[0].id))
    .limit(1);

  return rows[0];
}

export async function getWinsFeed(db, viewerId, { limit = 20, offset = 0 } = {}) {
  const rows = await db
    .select(selectWinShape(viewerId))
    .from(communityWins)
    .innerJoin(users, eq(communityWins.userId, users.id))
    .leftJoin(userProfiles, eq(communityWins.userId, userProfiles.userId))
    .where(and(eq(communityWins.isVisible, true), or(sql`${communityWins.scheduledAt} is null`, sql`${communityWins.scheduledAt} <= now()`)))
    .orderBy(desc(communityWins.createdAt))
    .limit(limit)
    .offset(offset);

  return rows;
}

export async function getMyWins(db, userId, { limit = 20, offset = 0 } = {}) {
  return db
    .select(selectWinShape(userId))
    .from(communityWins)
    .innerJoin(users, eq(communityWins.userId, users.id))
    .leftJoin(userProfiles, eq(communityWins.userId, userProfiles.userId))
    .where(and(eq(communityWins.userId, userId), eq(communityWins.isVisible, true)))
    .orderBy(desc(sql`coalesce(${communityWins.scheduledAt}, ${communityWins.createdAt})`))
    .limit(limit)
    .offset(offset);
}

export async function updateWin(db, userId, winId, data) {
  const roleTitle = trimOrNull(data.role_title || data.roleTitle);
  const companyName = trimOrNull(data.company_name || data.companyName);
  const message = trimOrNull(data.message);
  const duration = data.search_duration_weeks ?? data.searchDurationWeeks ?? null;

  if (!roleTitle || roleTitle.length > 100) {
    throw serviceError('Role title is required and must be 100 characters or less', 400);
  }

  if (companyName && companyName.length > 100) {
    throw serviceError('Company name must be 100 characters or less', 400);
  }

  if (duration !== null && (!Number.isInteger(Number(duration)) || Number(duration) < 1 || Number(duration) > 200)) {
    throw serviceError('Search duration must be an integer from 1 to 200 weeks', 400);
  }

  if (message && message.length > 280) {
    throw serviceError('Message must be 280 characters or less', 400);
  }

  const existingRows = await db
    .select({
      id: communityWins.id,
      createdAt: communityWins.createdAt,
      scheduledAt: communityWins.scheduledAt
    })
    .from(communityWins)
    .where(and(eq(communityWins.id, winId), eq(communityWins.userId, userId), eq(communityWins.isVisible, true)))
    .limit(1);

  const existingWin = existingRows[0];
  if (!existingWin) {
    throw serviceError('You cannot edit this win', 403);
  }

  const scheduledAt = parseScheduledAt(data.scheduled_at || data.scheduledAt);
  const existingScheduleIsFuture = existingWin.scheduledAt && new Date(existingWin.scheduledAt).getTime() > Date.now();
  const publicationDate = scheduledAt || (existingScheduleIsFuture ? new Date() : existingWin.createdAt || new Date());

  await assertWeeklyWinLimit(db, userId, publicationDate, { excludeWinId: winId });

  const updated = await db
    .update(communityWins)
    .set({
      roleTitle,
      companyName,
      searchDurationWeeks: duration === null ? null : Number(duration),
      message,
      scheduledAt
    })
    .where(and(eq(communityWins.id, winId), eq(communityWins.userId, userId), eq(communityWins.isVisible, true)))
    .returning({ id: communityWins.id });

  if (!updated[0]) {
    throw serviceError('You cannot edit this win', 403);
  }

  const rows = await db
    .select(selectWinShape(userId))
    .from(communityWins)
    .innerJoin(users, eq(communityWins.userId, users.id))
    .leftJoin(userProfiles, eq(communityWins.userId, userProfiles.userId))
    .where(eq(communityWins.id, updated[0].id))
    .limit(1);

  return rows[0];
}

export async function deleteWin(db, userId, winId) {
  const updated = await db
    .update(communityWins)
    .set({ isVisible: false })
    .where(and(eq(communityWins.id, winId), eq(communityWins.userId, userId), eq(communityWins.isVisible, true)))
    .returning({ id: communityWins.id });

  if (!updated[0]) {
    throw serviceError('You cannot delete this win', 403);
  }

  return { success: true };
}

export async function likeWin(db, userId, winId) {
  const existingRows = await db
    .select({ id: winLikes.id })
    .from(winLikes)
    .where(and(eq(winLikes.winId, winId), eq(winLikes.userId, userId)))
    .limit(1);

  const existing = existingRows[0];

  if (existing) {
    await db.delete(winLikes).where(eq(winLikes.id, existing.id));
    const rows = await db
      .update(communityWins)
      .set({ likesCount: sql`${communityWins.likesCount} - 1` })
      .where(and(eq(communityWins.id, winId), eq(communityWins.isVisible, true), or(sql`${communityWins.scheduledAt} is null`, sql`${communityWins.scheduledAt} <= now()`)))
      .returning({ likesCount: communityWins.likesCount });

    if (!rows[0]) throw serviceError('Win not found', 404);

    return { success: true, liked: false, newLikesCount: rows[0].likesCount };
  } else {
    await db.insert(winLikes).values({ winId, userId });
    const rows = await db
      .update(communityWins)
      .set({ likesCount: sql`${communityWins.likesCount} + 1` })
      .where(and(eq(communityWins.id, winId), eq(communityWins.isVisible, true), or(sql`${communityWins.scheduledAt} is null`, sql`${communityWins.scheduledAt} <= now()`)))
      .returning({ likesCount: communityWins.likesCount });

    if (!rows[0]) throw serviceError('Win not found', 404);

    return { success: true, liked: true, newLikesCount: rows[0].likesCount };
  }
}

export async function getWinLikers(db, winId, { limit = 20, offset = 0 } = {}) {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      avatarUrl: users.avatarUrl,
      username: userProfiles.username,
      headline: userProfiles.headline
    })
    .from(winLikes)
    .innerJoin(users, eq(winLikes.userId, users.id))
    .leftJoin(userProfiles, eq(winLikes.userId, userProfiles.userId))
    .where(eq(winLikes.winId, winId))
    .orderBy(desc(winLikes.createdAt))
    .limit(limit)
    .offset(offset);

  return rows;
}

export async function getPublicJobsFeed(db, { limit = 30, offset = 0, jobType = null } = {}) {
  const filters = [or(lt(publicJobCache.ghostScore, 60), sql`${publicJobCache.ghostScore} is null`)];

  if (jobType) {
    filters.push(eq(publicJobCache.jobType, jobType));
  }

  return db
    .select()
    .from(publicJobCache)
    .where(and(...filters))
    .orderBy(desc(publicJobCache.searchCount), desc(publicJobCache.cachedAt))
    .limit(limit)
    .offset(offset);
}

export async function addJobsToPublicCache(db, jobs) {
  if (!db || !Array.isArray(jobs) || jobs.length === 0) {
    return;
  }

  for (const job of jobs) {
    const ghostScore = normalizeGhostScore(job);
    const applyUrl = normalizeApplyUrl(job);

    if ((typeof ghostScore === 'number' && ghostScore >= 70) || !applyUrl) {
      continue;
    }

    await db
      .insert(publicJobCache)
      .values({
        jobId: normalizeJobId(job),
        title: String(job.title || 'Untitled role').trim().slice(0, 200),
        company: String(job.company || 'Unknown company').trim().slice(0, 200),
        location: trimOrNull(job.location)?.slice(0, 200) || null,
        jobType: trimOrNull(job.job_type || job.jobType)?.slice(0, 50) || null,
        stipend: trimOrNull(job.stipend)?.slice(0, 100) || null,
        salary: trimOrNull(job.salary)?.slice(0, 100) || null,
        applyUrl,
        source: String(job.source || job.sourceKey || 'unknown').trim().slice(0, 100),
        ghostScore: Number.isFinite(ghostScore) ? ghostScore : null,
        postedAt: job.posted_at || job.postedAt ? new Date(job.posted_at || job.postedAt) : null
      })
      .onConflictDoUpdate({
        target: publicJobCache.jobId,
        set: {
          searchCount: sql`${publicJobCache.searchCount} + 1`,
          cachedAt: new Date()
        }
      });
  }
}
