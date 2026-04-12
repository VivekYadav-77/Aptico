import crypto from 'node:crypto';
import { and, desc, eq, lt, or, sql } from 'drizzle-orm';
import { communityWins, publicJobCache, userProfiles, users } from '../db/schema.js';

function serviceError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function trimOrNull(value) {
  const trimmed = String(value || '').trim();
  return trimmed || null;
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

  const recentRows = await db
    .select({ id: communityWins.id })
    .from(communityWins)
    .where(and(eq(communityWins.userId, userId), sql`${communityWins.createdAt} > now() - interval '7 days'`))
    .limit(1);

  if (recentRows[0]) {
    throw serviceError('You can post one win per week', 429);
  }

  const inserted = await db
    .insert(communityWins)
    .values({
      userId,
      roleTitle,
      companyName,
      searchDurationWeeks: duration === null ? null : Number(duration),
      message
    })
    .returning();

  const rows = await db
    .select({
      id: communityWins.id,
      role_title: communityWins.roleTitle,
      company_name: communityWins.companyName,
      search_duration_weeks: communityWins.searchDurationWeeks,
      message: communityWins.message,
      likes_count: communityWins.likesCount,
      created_at: communityWins.createdAt,
      user: {
        name: users.name,
        avatar_url: users.avatarUrl,
        username: userProfiles.username
      }
    })
    .from(communityWins)
    .innerJoin(users, eq(communityWins.userId, users.id))
    .leftJoin(userProfiles, eq(communityWins.userId, userProfiles.userId))
    .where(eq(communityWins.id, inserted[0].id))
    .limit(1);

  return rows[0];
}

export async function getWinsFeed(db, { limit = 20, offset = 0 } = {}) {
  const rows = await db
    .select({
      id: communityWins.id,
      role_title: communityWins.roleTitle,
      company_name: communityWins.companyName,
      search_duration_weeks: communityWins.searchDurationWeeks,
      message: communityWins.message,
      likes_count: communityWins.likesCount,
      created_at: communityWins.createdAt,
      user: {
        name: users.name,
        avatar_url: users.avatarUrl,
        username: userProfiles.username
      }
    })
    .from(communityWins)
    .innerJoin(users, eq(communityWins.userId, users.id))
    .leftJoin(userProfiles, eq(communityWins.userId, userProfiles.userId))
    .where(eq(communityWins.isVisible, true))
    .orderBy(desc(communityWins.createdAt))
    .limit(limit)
    .offset(offset);

  return rows;
}

export async function likeWin(db, userId, winId) {
  const rows = await db
    .update(communityWins)
    .set({ likesCount: sql`${communityWins.likesCount} + 1` })
    .where(and(eq(communityWins.id, winId), eq(communityWins.isVisible, true)))
    .returning({ likesCount: communityWins.likesCount });

  if (!rows[0]) {
    throw serviceError('Win not found', 404);
  }

  return { success: true, newLikesCount: rows[0].likesCount };
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
