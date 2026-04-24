import crypto from 'node:crypto';
import { and, asc, desc, eq, gte, inArray, ne, or, sql } from 'drizzle-orm';
import { analyses, applicationLogs, connections, follows, profileSettings, rejectionLogs, userProfiles, users } from '../db/schema.js';
import { createNotification } from '../utils/notificationHelper.js';

const USERNAME_PATTERN = /^[a-z0-9_-]{3,30}$/;

/**
 * Generates a unique username from an email address.
 * Takes the local part, strips invalid characters, and appends random digits if needed.
 */
function generateUsernameFromEmail(email) {
  const localPart = String(email || '').split('@')[0] || '';
  let base = localPart.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 20);

  if (base.length < 3) {
    base = 'user-' + crypto.randomBytes(3).toString('hex');
  }

  return base;
}

/**
 * Ensures a user_profiles row exists for the given user.
 * If no profile exists, creates one with an auto-generated username.
 * This is called during registration / login so every user is discoverable.
 */
export async function ensureUserProfile(db, user) {
  if (!user?.id || !user?.email) {
    return null;
  }

  const existing = await db
    .select({ id: userProfiles.id })
    .from(userProfiles)
    .where(eq(userProfiles.userId, user.id))
    .limit(1);

  if (existing[0]) {
    return existing[0];
  }

  let username = generateUsernameFromEmail(user.email);

  // Check for uniqueness, append random suffix if taken
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = attempt === 0 ? username : `${username.slice(0, 24)}-${crypto.randomBytes(2).toString('hex')}`;
    const taken = await db
      .select({ id: userProfiles.id })
      .from(userProfiles)
      .where(eq(userProfiles.username, candidate))
      .limit(1);

    if (!taken[0]) {
      username = candidate;
      break;
    }
  }

  try {
    const rows = await db
      .insert(userProfiles)
      .values({
        userId: user.id,
        username,
        headline: null,
        location: null,
        skills: null,
        isPublic: true
      })
      .onConflictDoNothing()
      .returning();

    return rows[0] || null;
  } catch {
    // Profile may have been created concurrently, that's fine
    return null;
  }
}

function serviceError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function isMissingRelationError(error, relationName) {
  return error?.code === '42P01' && String(error?.message || '').includes(`relation "${relationName}" does not exist`);
}

function isMissingColumnError(error, columnName) {
  return error?.code === '42703' && String(error?.message || '').includes(columnName);
}

function normalizeProfileData(data) {
  return {
    username: String(data.username || '').trim(),
    headline: data.headline ? String(data.headline).trim() : null,
    location: data.location ? String(data.location).trim() : null,
    skills: Array.isArray(data.skills) ? data.skills.map((skill) => String(skill).trim()).filter(Boolean).slice(0, 20) : null,
    isPublic: typeof data.is_public === 'boolean' ? data.is_public : data.isPublic ?? true
  };
}

function startOfUtcDay(date) {
  const next = new Date(date);
  next.setUTCHours(0, 0, 0, 0);
  return next;
}

function toDateKey(date) {
  return startOfUtcDay(date).toISOString().slice(0, 10);
}

function addUtcDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function formatDisplayDate(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function calculateLongestStreak(dateKeys) {
  if (!dateKeys.length) {
    return 0;
  }

  let longest = 0;
  let current = 0;
  let previous = null;

  for (const key of dateKeys) {
    const currentDate = new Date(`${key}T00:00:00Z`);

    if (!previous) {
      current = 1;
    } else {
      const dayDiff = Math.round((currentDate.getTime() - previous.getTime()) / 86400000);
      current = dayDiff === 1 ? current + 1 : 1;
    }

    longest = Math.max(longest, current);
    previous = currentDate;
  }

  return longest;
}

async function buildResiliencePortfolio(db, profileOwnerId) {
  const now = new Date();
  const today = startOfUtcDay(now);
  const applicationsSince = addUtcDays(today, -89);
  const heatmapSince = addUtcDays(today, -29);
  const averageSince = addUtcDays(today, -6);
  let recentApplications = [];
  let totalApplicationsRows = [{ total: 0 }];
  let streakRows = [];

  try {
    [recentApplications, totalApplicationsRows, streakRows] = await Promise.all([
      db
        .select({
          companyName: applicationLogs.companyName,
          roleTitle: applicationLogs.roleTitle,
          jobUrl: applicationLogs.jobUrl,
          createdAt: applicationLogs.createdAt
        })
        .from(applicationLogs)
        .where(
          and(
            eq(applicationLogs.userId, profileOwnerId),
            eq(applicationLogs.isShadowbanned, false),
            gte(applicationLogs.createdAt, applicationsSince)
          )
        )
        .orderBy(desc(applicationLogs.createdAt)),
      db
        .select({ total: sql`count(*)::int` })
        .from(applicationLogs)
        .where(and(eq(applicationLogs.userId, profileOwnerId), eq(applicationLogs.isShadowbanned, false))),
      db
        .select({
          createdAt: applicationLogs.createdAt
        })
        .from(applicationLogs)
        .where(and(eq(applicationLogs.userId, profileOwnerId), eq(applicationLogs.isShadowbanned, false)))
        .orderBy(asc(applicationLogs.createdAt))
    ]);
  } catch (error) {
    if (isMissingColumnError(error, 'job_url')) {
      [recentApplications, totalApplicationsRows, streakRows] = await Promise.all([
        db
          .select({
            companyName: applicationLogs.companyName,
            roleTitle: applicationLogs.roleTitle,
            createdAt: applicationLogs.createdAt
          })
          .from(applicationLogs)
          .where(
            and(
              eq(applicationLogs.userId, profileOwnerId),
              eq(applicationLogs.isShadowbanned, false),
              gte(applicationLogs.createdAt, applicationsSince)
            )
          )
          .orderBy(desc(applicationLogs.createdAt)),
        db
          .select({ total: sql`count(*)::int` })
          .from(applicationLogs)
          .where(and(eq(applicationLogs.userId, profileOwnerId), eq(applicationLogs.isShadowbanned, false))),
        db
          .select({
            createdAt: applicationLogs.createdAt
          })
          .from(applicationLogs)
          .where(and(eq(applicationLogs.userId, profileOwnerId), eq(applicationLogs.isShadowbanned, false)))
          .orderBy(asc(applicationLogs.createdAt))
      ]);
    } else if (!isMissingRelationError(error, 'application_logs')) {
      throw error;
    }
  }

  let recentRejections = [];
  let totalRejectionsRows = [{ total: 0 }];

  try {
    [recentRejections, totalRejectionsRows] = await Promise.all([
      db
        .select({
          companyName: rejectionLogs.companyName,
          roleTitle: rejectionLogs.roleTitle,
          jobUrl: rejectionLogs.jobUrl,
          stageRejected: rejectionLogs.stageRejected,
          createdAt: rejectionLogs.createdAt
        })
        .from(rejectionLogs)
        .where(
          and(
            eq(rejectionLogs.userId, profileOwnerId),
            eq(rejectionLogs.isShadowbanned, false),
            gte(rejectionLogs.createdAt, applicationsSince)
          )
        )
        .orderBy(desc(rejectionLogs.createdAt)),
      db
        .select({ total: sql`count(*)::int` })
        .from(rejectionLogs)
        .where(and(eq(rejectionLogs.userId, profileOwnerId), eq(rejectionLogs.isShadowbanned, false)))
    ]);
  } catch (error) {
    if (!isMissingColumnError(error, 'job_url')) {
      throw error;
    }

    [recentRejections, totalRejectionsRows] = await Promise.all([
      db
        .select({
          companyName: rejectionLogs.companyName,
          roleTitle: rejectionLogs.roleTitle,
          stageRejected: rejectionLogs.stageRejected,
          createdAt: rejectionLogs.createdAt
        })
        .from(rejectionLogs)
        .where(
          and(
            eq(rejectionLogs.userId, profileOwnerId),
            eq(rejectionLogs.isShadowbanned, false),
            gte(rejectionLogs.createdAt, applicationsSince)
          )
        )
        .orderBy(desc(rejectionLogs.createdAt)),
      db
        .select({ total: sql`count(*)::int` })
        .from(rejectionLogs)
        .where(and(eq(rejectionLogs.userId, profileOwnerId), eq(rejectionLogs.isShadowbanned, false)))
    ]);
  }

  const dailyCounts = new Map();

  for (let index = 0; index < 30; index += 1) {
    const date = addUtcDays(heatmapSince, index);
    dailyCounts.set(toDateKey(date), 0);
  }

  for (const row of recentApplications) {
    const key = toDateKey(row.createdAt);
    if (dailyCounts.has(key)) {
      dailyCounts.set(key, Number(dailyCounts.get(key) || 0) + 1);
    }
  }

  const applicationDateKeys = [...new Set(streakRows.map((row) => toDateKey(row.createdAt)))];
  const averageWindowCount = recentApplications.filter((row) => row.createdAt && new Date(row.createdAt).getTime() >= averageSince.getTime()).length;

  return {
    heatmap: Array.from(dailyCounts.entries()).map(([date, count]) => ({
      date,
      count,
      intensity: count >= 5 ? 'strong' : count >= 3 ? 'medium' : count >= 1 ? 'light' : 'empty'
    })),
    applicationHistory: recentApplications.slice(0, 10).map((row) => ({
      companyName: row.companyName,
      roleTitle: row.roleTitle,
      jobUrl: row.jobUrl,
      createdAt: row.createdAt,
      dateLabel: formatDisplayDate(row.createdAt)
    })),
    rejectionJourney: recentRejections.slice(0, 10).map((row) => ({
      companyName: row.companyName,
      roleTitle: row.roleTitle,
      jobUrl: row.jobUrl,
      stageRejected: row.stageRejected,
      stageLabel: String(row.stageRejected || '').replace(/_/g, ' '),
      createdAt: row.createdAt,
      dateLabel: formatDisplayDate(row.createdAt)
    })),
    stats: {
      totalApplications: Number(totalApplicationsRows[0]?.total || 0),
      totalRejections: Number(totalRejectionsRows[0]?.total || 0),
      currentDailyAverage: Number((averageWindowCount / 7).toFixed(1)),
      longestStreak: calculateLongestStreak(applicationDateKeys)
    }
  };
}

export async function createOrUpdateProfile(db, userId, data) {
  const profile = normalizeProfileData(data);

  if (!USERNAME_PATTERN.test(profile.username)) {
    throw serviceError('Username must be 3-30 lowercase characters, numbers, hyphens or underscores only', 400);
  }

  const takenRows = await db
    .select({ id: userProfiles.id })
    .from(userProfiles)
    .where(and(eq(userProfiles.username, profile.username), ne(userProfiles.userId, userId)))
    .limit(1);

  if (takenRows[0]) {
    throw serviceError('Username already taken', 409);
  }

  const rows = await db
    .insert(userProfiles)
    .values({
      userId,
      username: profile.username,
      headline: profile.headline,
      location: profile.location,
      skills: profile.skills,
      isPublic: profile.isPublic,
      updatedAt: new Date()
    })
    .onConflictDoUpdate({
      target: userProfiles.userId,
      set: {
        username: profile.username,
        headline: profile.headline,
        location: profile.location,
        skills: profile.skills,
        isPublic: profile.isPublic,
        updatedAt: new Date()
      }
    })
    .returning();

  return rows[0];
}

export async function getPublicProfile(db, username, viewerId = null) {
  const normalizedUsername = String(username || '').trim().toLowerCase();
  const rows = await db
    .select({
      user_id: userProfiles.userId,
      is_public: userProfiles.isPublic,
      username: userProfiles.username,
      headline: userProfiles.headline,
      location: userProfiles.location,
      skills: userProfiles.skills,
      follower_count: userProfiles.followerCount,
      following_count: userProfiles.followingCount,
      name: users.name,
      avatar_url: users.avatarUrl,
      created_at: userProfiles.createdAt
    })
    .from(userProfiles)
    .innerJoin(users, eq(userProfiles.userId, users.id))
    .where(eq(userProfiles.username, normalizedUsername))
    .limit(1);

  if (!rows[0]) {
    throw serviceError('Profile not found', 404);
  }

  const profileOwnerId = rows[0].user_id;

  // Fetch profile_settings for enriched sections
  const settingsRows = await db
    .select({ settingsJson: profileSettings.settingsJson })
    .from(profileSettings)
    .where(eq(profileSettings.userId, profileOwnerId))
    .limit(1);

  const rawSettings = settingsRows[0]?.settingsJson || {};

  // Determine viewer relationship
  const isSelf = viewerId && viewerId === profileOwnerId;
  let isConnected = false;
  const effectiveIsPublic = typeof rawSettings.publicProfile === 'boolean'
    ? rawSettings.publicProfile
    : rows[0].is_public !== false;

  if (!effectiveIsPublic && !isSelf) {
    throw serviceError('Profile not found', 404);
  }

  if (viewerId && !isSelf) {
    const connRows = await db
      .select({ id: connections.id })
      .from(connections)
      .where(and(
        or(
          and(eq(connections.requesterId, viewerId), eq(connections.recipientId, profileOwnerId)),
          and(eq(connections.requesterId, profileOwnerId), eq(connections.recipientId, viewerId))
        ),
        eq(connections.status, 'accepted')
      ))
      .limit(1);
    isConnected = Boolean(connRows[0]);
  }

  // Section visibility defaults to 'everyone' if not set
  const sectionVis = rawSettings.sectionVisibility || {};
  const defaultVis = 'everyone';

  function canViewSection(sectionKey) {
    const vis = sectionVis[sectionKey] || defaultVis;
    if (vis === 'everyone') return true;
    if (vis === 'connections' && (isSelf || isConnected)) return true;
    if (vis === 'only_me' && isSelf) return true;
    return false;
  }

  // Build enriched settings — only include sections the viewer can see
  const enrichedSettings = {
    sectionVisibility: sectionVis,
    viewerRelationship: isSelf ? 'self' : isConnected ? 'connected' : 'public',
    banner_url: rawSettings.banner_url || null,
    banner_preference: rawSettings.banner_preference || 'badge'
  };

  // About section
  if (canViewSection('about')) {
    enrichedSettings.bio = rawSettings.bio || null;
    enrichedSettings.currentTitle = rawSettings.currentTitle || null;
    enrichedSettings.currentCompany = rawSettings.currentCompany || null;
    enrichedSettings.yearsExperience = rawSettings.yearsExperience || null;
    enrichedSettings.currentStatus = rawSettings.currentStatus || null;
    enrichedSettings.employmentType = rawSettings.employmentType || null;
    enrichedSettings.industry = rawSettings.industry || null;
    enrichedSettings.availability = rawSettings.availability || null;
    enrichedSettings.openToWork = rawSettings.openToWork || false;
  }

  // Featured section
  if (canViewSection('featured')) {
    enrichedSettings.featured = Array.isArray(rawSettings.featured) ? rawSettings.featured : [];
  }

  // Digital footprint / public links
  if (canViewSection('digitalFootprint')) {
    enrichedSettings.linkedin = rawSettings.linkedin || null;
    enrichedSettings.github = rawSettings.github || null;
    enrichedSettings.portfolio = rawSettings.portfolio || null;
    enrichedSettings.website = rawSettings.website || null;
  }

  // Experience section
  if (canViewSection('experience')) {
    enrichedSettings.experiences = Array.isArray(rawSettings.experiences) ? rawSettings.experiences : [];
  }

  // Education section
  if (canViewSection('education')) {
    enrichedSettings.educationEntries = Array.isArray(rawSettings.educationEntries) ? rawSettings.educationEntries : [];
    // Fallback: build from legacy single-entry fields
    if (!enrichedSettings.educationEntries.length && (rawSettings.school || rawSettings.degree)) {
      enrichedSettings.educationEntries = [{
        school: rawSettings.school || '',
        degree: rawSettings.degree || '',
        field: rawSettings.fieldOfStudy || '',
        startYear: '',
        endYear: rawSettings.graduationYear || '',
        activities: rawSettings.learningFocus || ''
      }];
    }
  }

  // Licenses & Certifications
  if (canViewSection('licenses')) {
    enrichedSettings.licenses = Array.isArray(rawSettings.licenses) ? rawSettings.licenses : [];
    // Fallback: parse legacy comma-separated certifications
    if (!enrichedSettings.licenses.length && rawSettings.certifications) {
      const certList = typeof rawSettings.certifications === 'string'
        ? rawSettings.certifications.split(',').map(s => s.trim()).filter(Boolean)
        : [];
      enrichedSettings.licenses = certList.map(name => ({ name, issuingOrg: '', issueDate: '', credentialUrl: '' }));
    }
  }

  // Skills section
  if (canViewSection('skills')) {
    enrichedSettings.topSkills = Array.isArray(rawSettings.topSkills)
      ? rawSettings.topSkills
      : (typeof rawSettings.topSkills === 'string' ? rawSettings.topSkills.split(',').map(s => s.trim()).filter(Boolean) : []);
    enrichedSettings.tools = Array.isArray(rawSettings.tools)
      ? rawSettings.tools
      : (typeof rawSettings.tools === 'string' ? rawSettings.tools.split(',').map(s => s.trim()).filter(Boolean) : []);
    enrichedSettings.languages = Array.isArray(rawSettings.languages)
      ? rawSettings.languages
      : (typeof rawSettings.languages === 'string' ? rawSettings.languages.split(',').map(s => s.trim()).filter(Boolean) : []);
  }

  // Honors & Awards
  if (canViewSection('honorsAwards')) {
    enrichedSettings.honorsAwards = Array.isArray(rawSettings.honorsAwards) ? rawSettings.honorsAwards : [];
    // Fallback: parse legacy achievements
    if (!enrichedSettings.honorsAwards.length && rawSettings.achievements) {
      const achList = Array.isArray(rawSettings.achievements) ? rawSettings.achievements
        : (typeof rawSettings.achievements === 'string' ? rawSettings.achievements.split(',').map(s => s.trim()).filter(Boolean) : []);
      enrichedSettings.honorsAwards = achList.map(title => ({ title, issuer: '', date: '', description: '' }));
    }
  }

  const resiliencePortfolio = canViewSection('resiliencePortfolio')
    ? await buildResiliencePortfolio(db, profileOwnerId)
    : null;

  // Fetch analysis, connections as before
  const latestAnalysisRows = await db
    .select({
      target_role: analyses.companyName,
      confidence_score: analyses.confidenceScore,
      gap_analysis_json: analyses.gapAnalysisJson
    })
    .from(analyses)
    .where(eq(analyses.userId, profileOwnerId))
    .orderBy(desc(analyses.createdAt))
    .limit(1);

  const latestAnalysis = latestAnalysisRows[0];

  const connectionRows = await db
    .select()
    .from(connections)
    .where(and(or(eq(connections.requesterId, profileOwnerId), eq(connections.recipientId, profileOwnerId)), eq(connections.status, 'accepted')));

  const otherIds = connectionRows.map((connection) => (connection.requesterId === profileOwnerId ? connection.recipientId : connection.requesterId));
  const connectionPreview = otherIds.length
    ? await db
      .select({
        name: users.name,
        avatar_url: users.avatarUrl,
        username: userProfiles.username,
        headline: userProfiles.headline
      })
      .from(users)
      .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
      .where(inArray(users.id, otherIds.slice(0, 6)))
    : [];

  return {
    ...rows[0],
    enriched_settings: enrichedSettings,
    resilience_portfolio: resiliencePortfolio,
    connection_count: connectionRows.length,
    connections_preview: connectionPreview,
    latest_analysis: latestAnalysis
      ? {
        target_role: latestAnalysis.target_role,
        confidence_score: latestAnalysis.confidence_score,
        top_skill_gaps: (latestAnalysis.gap_analysis_json?.keywordMismatches || [])
          .slice(0, 3)
          .map((item) => item?.keyword)
          .filter(Boolean)
      }
      : null
  };
}

export async function followUser(db, followerId, targetUsername) {
  const targetRows = await db
    .select({ userId: userProfiles.userId })
    .from(userProfiles)
    .where(eq(userProfiles.username, targetUsername))
    .limit(1);

  const targetUserId = targetRows[0]?.userId;

  if (!targetUserId) {
    throw serviceError('User not found', 404);
  }

  if (followerId === targetUserId) {
    throw serviceError('You cannot follow yourself', 400);
  }

  const inserted = await db
    .insert(follows)
    .values({
      followerId,
      followingId: targetUserId
    })
    .onConflictDoNothing()
    .returning({ id: follows.id });

  if (inserted[0]) {
    const followerRows = await db.select({ name: users.name }).from(users).where(eq(users.id, followerId)).limit(1);

    await Promise.all([
      db
        .update(userProfiles)
        .set({ followingCount: sql`${userProfiles.followingCount} + 1`, updatedAt: new Date() })
        .where(eq(userProfiles.userId, followerId)),
      db
        .update(userProfiles)
        .set({ followerCount: sql`${userProfiles.followerCount} + 1`, updatedAt: new Date() })
        .where(eq(userProfiles.userId, targetUserId))
    ]);

    createNotification(db, {
      userId: targetUserId,
      type: 'new_follower',
      actorId: followerId,
      entityId: null,
      entityType: null,
      message: `${followerRows[0]?.name || 'Someone'} started following you`
    });
  }

  return { success: true, action: 'followed' };
}

export async function unfollowUser(db, followerId, targetUsername) {
  const targetRows = await db
    .select({ userId: userProfiles.userId })
    .from(userProfiles)
    .where(eq(userProfiles.username, targetUsername))
    .limit(1);

  const targetUserId = targetRows[0]?.userId;

  if (!targetUserId) {
    throw serviceError('User not found', 404);
  }

  const deleted = await db
    .delete(follows)
    .where(and(eq(follows.followerId, followerId), eq(follows.followingId, targetUserId)))
    .returning({ id: follows.id });

  if (deleted[0]) {
    await Promise.all([
      db
        .update(userProfiles)
        .set({
          followingCount: sql`greatest(${userProfiles.followingCount} - 1, 0)`,
          updatedAt: new Date()
        })
        .where(eq(userProfiles.userId, followerId)),
      db
        .update(userProfiles)
        .set({
          followerCount: sql`greatest(${userProfiles.followerCount} - 1, 0)`,
          updatedAt: new Date()
        })
        .where(eq(userProfiles.userId, targetUserId))
    ]);
  }

  return { success: true, action: 'unfollowed' };
}

export async function isFollowing(db, followerId, targetUserId) {
  const rows = await db
    .select({ id: follows.id })
    .from(follows)
    .where(and(eq(follows.followerId, followerId), eq(follows.followingId, targetUserId)))
    .limit(1);

  return Boolean(rows[0]);
}
