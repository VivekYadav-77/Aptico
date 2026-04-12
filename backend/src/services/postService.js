import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { analyses, follows, postComments, posts, userProfiles, users } from '../db/schema.js';
import { createNotification } from '../utils/notificationHelper.js';

const POST_TYPES = new Set(['career_update', 'job_tip', 'job_share', 'analysis_share', 'question']);
const CAREER_UPDATE_TYPES = new Set(['got_hired', 'got_promoted', 'started_learning', 'completed_course', 'new_project']);

function serviceError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeLimit(value, fallback = 20) {
  const number = Number(value);
  return Number.isInteger(number) ? Math.min(Math.max(number, 1), 50) : fallback;
}

function normalizeOffset(value) {
  const number = Number(value);
  return Number.isInteger(number) ? Math.max(number, 0) : 0;
}

function topSkillGaps(analysis) {
  return (analysis?.gapAnalysisJson?.keywordMismatches || [])
    .slice(0, 3)
    .map((item) => item?.keyword)
    .filter(Boolean);
}

function selectPostShape() {
  return {
    id: posts.id,
    user_id: posts.userId,
    post_type: posts.postType,
    content: posts.content,
    analysis_id: posts.analysisId,
    job_data: posts.jobData,
    career_update_type: posts.careerUpdateType,
    likes_count: posts.likesCount,
    comments_count: posts.commentsCount,
    is_visible: posts.isVisible,
    created_at: posts.createdAt,
    updated_at: posts.updatedAt,
    user: {
      name: users.name,
      avatar_url: users.avatarUrl,
      username: userProfiles.username,
      headline: userProfiles.headline
    },
    analysis: {
      company_name: analyses.companyName,
      confidence_score: analyses.confidenceScore,
      gap_analysis_json: analyses.gapAnalysisJson
    }
  };
}

async function getActorName(db, userId) {
  const rows = await db.select({ name: users.name }).from(users).where(eq(users.id, userId)).limit(1);
  return rows[0]?.name || 'Someone';
}

async function getEnrichedPost(db, postId) {
  const rows = await db
    .select(selectPostShape())
    .from(posts)
    .innerJoin(users, eq(posts.userId, users.id))
    .leftJoin(userProfiles, eq(posts.userId, userProfiles.userId))
    .leftJoin(analyses, eq(posts.analysisId, analyses.id))
    .where(eq(posts.id, postId))
    .limit(1);

  const row = rows[0];
  if (!row) {
    return null;
  }

  return {
    ...row,
    analysis: row.analysis?.company_name || row.analysis?.confidence_score != null
      ? { ...row.analysis, top_skill_gaps: topSkillGaps({ gapAnalysisJson: row.analysis.gap_analysis_json }) }
      : null
  };
}

export async function createPost(db, userId, data) {
  const postType = data?.post_type;
  const content = String(data?.content || '').trim();

  if (!POST_TYPES.has(postType)) {
    throw serviceError('Invalid post type', 400);
  }

  if (!content) {
    throw serviceError('Post content is required', 400);
  }

  if (content.length > 500) {
    throw serviceError('Post content cannot exceed 500 characters', 400);
  }

  let analysisRow = null;
  if (postType === 'analysis_share') {
    if (!data.analysis_id) {
      throw serviceError('Analysis is required for this post type', 400);
    }

    const analysisRows = await db
      .select()
      .from(analyses)
      .where(and(eq(analyses.id, data.analysis_id), eq(analyses.userId, userId)))
      .limit(1);

    analysisRow = analysisRows[0];
    if (!analysisRow) {
      throw serviceError('Analysis not found or does not belong to you', 403);
    }
  }

  if (postType === 'career_update' && !CAREER_UPDATE_TYPES.has(data.career_update_type)) {
    throw serviceError('Career update type is required', 400);
  }

  if (postType === 'job_share') {
    const jobData = data.job_data;
    if (!jobData || typeof jobData !== 'object' || !jobData.title || !jobData.applyUrl) {
      throw serviceError('Job title and apply URL are required', 400);
    }
  }

  const recentRows = await db
    .select({ total: sql`count(*)::int` })
    .from(posts)
    .where(and(eq(posts.userId, userId), sql`${posts.createdAt} > now() - interval '24 hours'`));

  if (Number(recentRows[0]?.total || 0) >= 10) {
    throw serviceError('You can post up to 10 times per day', 429);
  }

  const inserted = await db
    .insert(posts)
    .values({
      userId,
      postType,
      content,
      analysisId: postType === 'analysis_share' ? data.analysis_id : null,
      jobData: postType === 'job_share' ? data.job_data : null,
      careerUpdateType: postType === 'career_update' ? data.career_update_type : null
    })
    .returning({ id: posts.id });

  const post = await getEnrichedPost(db, inserted[0].id);

  if (post && analysisRow) {
    post.analysis = {
      company_name: analysisRow.companyName,
      confidence_score: analysisRow.confidenceScore,
      gap_analysis_json: analysisRow.gapAnalysisJson,
      top_skill_gaps: topSkillGaps(analysisRow)
    };
  }

  return post;
}

export async function getFeedPosts(db, userId, { limit = 20, offset = 0, filterType = null } = {}) {
  const followingRows = await db
    .select({ followingId: follows.followingId })
    .from(follows)
    .where(eq(follows.followerId, userId));

  const feedUserIds = [...new Set([userId, ...followingRows.map((row) => row.followingId)])];
  const filters = [inArray(posts.userId, feedUserIds), eq(posts.isVisible, true)];

  if (filterType) {
    filters.push(eq(posts.postType, filterType));
  }

  const rows = await db
    .select(selectPostShape())
    .from(posts)
    .innerJoin(users, eq(posts.userId, users.id))
    .leftJoin(userProfiles, eq(posts.userId, userProfiles.userId))
    .leftJoin(analyses, eq(posts.analysisId, analyses.id))
    .where(and(...filters))
    .orderBy(desc(posts.createdAt))
    .limit(normalizeLimit(limit))
    .offset(normalizeOffset(offset));

  return rows.map((row) => ({
    ...row,
    analysis: row.analysis?.company_name || row.analysis?.confidence_score != null
      ? { ...row.analysis, top_skill_gaps: topSkillGaps({ gapAnalysisJson: row.analysis.gap_analysis_json }) }
      : null
  }));
}

export async function getPublicFeedPosts(db, { limit = 20, offset = 0, filterType = null, userId = null } = {}) {
  const filters = [eq(posts.isVisible, true)];

  if (filterType) {
    filters.push(eq(posts.postType, filterType));
  }

  if (userId) {
    filters.push(eq(posts.userId, userId));
  }

  const rows = await db
    .select(selectPostShape())
    .from(posts)
    .innerJoin(users, eq(posts.userId, users.id))
    .leftJoin(userProfiles, eq(posts.userId, userProfiles.userId))
    .leftJoin(analyses, eq(posts.analysisId, analyses.id))
    .where(and(...filters))
    .orderBy(desc(posts.createdAt))
    .limit(normalizeLimit(limit))
    .offset(normalizeOffset(offset));

  return rows.map((row) => ({
    ...row,
    analysis: row.analysis?.company_name || row.analysis?.confidence_score != null
      ? { ...row.analysis, top_skill_gaps: topSkillGaps({ gapAnalysisJson: row.analysis.gap_analysis_json }) }
      : null
  }));
}

export async function likePost(db, userId, postId) {
  const updated = await db
    .update(posts)
    .set({ likesCount: sql`${posts.likesCount} + 1`, updatedAt: new Date() })
    .where(and(eq(posts.id, postId), eq(posts.isVisible, true)))
    .returning({ userId: posts.userId, likesCount: posts.likesCount });

  const post = updated[0];
  if (!post) {
    throw serviceError('Post not found', 404);
  }

  if (post.userId !== userId) {
    const actorName = await getActorName(db, userId);
    createNotification(db, {
      userId: post.userId,
      type: 'post_like',
      actorId: userId,
      entityId: postId,
      entityType: 'post',
      message: `${actorName} liked your post`
    });
  }

  return { success: true, newLikesCount: post.likesCount };
}

export async function addComment(db, userId, postId, content) {
  const trimmed = String(content || '').trim();

  if (!trimmed) {
    throw serviceError('Comment is required', 400);
  }

  if (trimmed.length > 300) {
    throw serviceError('Comment cannot exceed 300 characters', 400);
  }

  const postRows = await db
    .select({ userId: posts.userId })
    .from(posts)
    .where(and(eq(posts.id, postId), eq(posts.isVisible, true)))
    .limit(1);

  const post = postRows[0];
  if (!post) {
    throw serviceError('Post not found', 404);
  }

  const inserted = await db
    .insert(postComments)
    .values({ postId, userId, content: trimmed })
    .returning({ id: postComments.id });

  await db
    .update(posts)
    .set({ commentsCount: sql`${posts.commentsCount} + 1`, updatedAt: new Date() })
    .where(eq(posts.id, postId));

  if (post.userId !== userId) {
    const actorName = await getActorName(db, userId);
    createNotification(db, {
      userId: post.userId,
      type: 'post_comment',
      actorId: userId,
      entityId: postId,
      entityType: 'post',
      message: `${actorName} commented on your post`
    });
  }

  const rows = await db
    .select({
      id: postComments.id,
      post_id: postComments.postId,
      user_id: postComments.userId,
      content: postComments.content,
      created_at: postComments.createdAt,
      user: {
        name: users.name,
        avatar_url: users.avatarUrl,
        username: userProfiles.username
      }
    })
    .from(postComments)
    .innerJoin(users, eq(postComments.userId, users.id))
    .leftJoin(userProfiles, eq(postComments.userId, userProfiles.userId))
    .where(eq(postComments.id, inserted[0].id))
    .limit(1);

  return rows[0];
}

export async function getPostComments(db, postId, { limit = 20, offset = 0 } = {}) {
  return db
    .select({
      id: postComments.id,
      post_id: postComments.postId,
      user_id: postComments.userId,
      content: postComments.content,
      created_at: postComments.createdAt,
      user: {
        name: users.name,
        avatar_url: users.avatarUrl,
        username: userProfiles.username
      }
    })
    .from(postComments)
    .innerJoin(users, eq(postComments.userId, users.id))
    .leftJoin(userProfiles, eq(postComments.userId, userProfiles.userId))
    .where(eq(postComments.postId, postId))
    .orderBy(asc(postComments.createdAt))
    .limit(normalizeLimit(limit))
    .offset(normalizeOffset(offset));
}

export async function deletePost(db, userId, postId) {
  const postRows = await db
    .select({ id: posts.id })
    .from(posts)
    .where(and(eq(posts.id, postId), eq(posts.userId, userId), eq(posts.isVisible, true)))
    .limit(1);

  if (!postRows[0]) {
    throw serviceError('You cannot delete this post', 403);
  }

  await db
    .update(posts)
    .set({ isVisible: false, updatedAt: new Date() })
    .where(eq(posts.id, postId));

  return { success: true };
}
