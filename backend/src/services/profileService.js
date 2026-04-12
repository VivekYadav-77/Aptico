import { and, desc, eq, inArray, ne, or, sql } from 'drizzle-orm';
import { analyses, connections, follows, userProfiles, users } from '../db/schema.js';
import { createNotification } from '../utils/notificationHelper.js';

const USERNAME_PATTERN = /^[a-z0-9_-]{3,30}$/;

function serviceError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
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

export async function getPublicProfile(db, username) {
  const rows = await db
    .select({
      user_id: userProfiles.userId,
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
    .where(and(eq(userProfiles.username, username), eq(userProfiles.isPublic, true)))
    .limit(1);

  if (!rows[0]) {
    throw serviceError('Profile not found', 404);
  }

  const latestAnalysisRows = await db
    .select({
      target_role: analyses.companyName,
      confidence_score: analyses.confidenceScore,
      gap_analysis_json: analyses.gapAnalysisJson
    })
    .from(analyses)
    .where(eq(analyses.userId, rows[0].user_id))
    .orderBy(desc(analyses.createdAt))
    .limit(1);

  const latestAnalysis = latestAnalysisRows[0];

  const connectionRows = await db
    .select()
    .from(connections)
    .where(and(or(eq(connections.requesterId, rows[0].user_id), eq(connections.recipientId, rows[0].user_id)), eq(connections.status, 'accepted')));

  const otherIds = connectionRows.map((connection) => (connection.requesterId === rows[0].user_id ? connection.recipientId : connection.requesterId));
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
