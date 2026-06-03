import { and, desc, eq, inArray, isNotNull, isNull, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { communityWins, postComments, postLikes, posts, userProfiles, users, winLikes } from '../../db/schema.js';
import { authenticateRequest } from '../../shared/middleware/auth.middleware.js';

const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0)
});

const bulkUnlikeSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().uuid(),
        activity_type: z.enum(['post_like', 'win_like']).optional(),
        type: z.enum(['post_like', 'win_like', 'post', 'win']).optional()
      })
    )
    .min(1)
    .max(100)
});

const bulkDeleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100).optional(),
  items: z.array(z.object({ id: z.string().uuid() })).min(1).max(100).optional()
});

const PUBLICATION_FILTER = or(sql`${posts.scheduledAt} is null`, sql`${posts.scheduledAt} <= now()`);
const WIN_PUBLICATION_FILTER = or(sql`${communityWins.scheduledAt} is null`, sql`${communityWins.scheduledAt} <= now()`);

function normalizeLimit(value, fallback = 20) {
  const number = Number(value);
  return Number.isInteger(number) ? Math.min(Math.max(number, 1), 50) : fallback;
}

function normalizeOffset(value) {
  const number = Number(value);
  return Number.isInteger(number) ? Math.max(number, 0) : 0;
}

function sendError(reply, error, fallbackMessage) {
  const statusCode = error.name === 'ZodError' ? 400 : error.statusCode || 500;
  return reply.code(statusCode).send({
    success: false,
    error: error.message || fallbackMessage
  });
}

function postHref(postId, commentId = null) {
  const params = new URLSearchParams({ postId });
  if (commentId) params.set('commentId', commentId);
  return `/home?${params.toString()}`;
}

function winHref(winId) {
  return `/wins?winId=${winId}`;
}

function ownerShape() {
  return {
    id: users.id,
    name: users.name,
    avatar_url: users.avatarUrl,
    username: userProfiles.username,
    headline: userProfiles.headline
  };
}

function mapPostLike(row) {
  return {
    id: row.id,
    activity_type: 'post_like',
    target_type: 'post',
    target_id: row.target_id,
    href: postHref(row.target_id),
    preview: row.preview,
    created_at: row.created_at,
    target: {
      id: row.target_id,
      post_type: row.post_type,
      content: row.preview,
      created_at: row.target_created_at,
      likes_count: row.likes_count,
      comments_count: row.comments_count
    },
    owner: row.owner
  };
}

function mapWinLike(row) {
  return {
    id: row.id,
    activity_type: 'win_like',
    target_type: 'win',
    target_id: row.target_id,
    href: winHref(row.target_id),
    preview: row.preview,
    created_at: row.created_at,
    target: {
      id: row.target_id,
      role_title: row.role_title,
      company_name: row.company_name,
      created_at: row.target_created_at,
      likes_count: row.likes_count
    },
    owner: row.owner
  };
}

function mapCommentActivity(row, activityType) {
  return {
    id: row.id,
    activity_type: activityType,
    target_type: 'post',
    target_id: row.post_id,
    parent_id: row.parent_id,
    href: postHref(row.post_id, row.id),
    preview: row.content,
    created_at: row.created_at,
    target: {
      id: row.post_id,
      post_type: row.post_type,
      content: row.post_content,
      created_at: row.post_created_at,
      comments_count: row.comments_count
    },
    owner: row.owner
  };
}

async function getLikedPosts(db, userId, limit, offset) {
  return db
    .select({
      id: postLikes.id,
      target_id: posts.id,
      preview: posts.content,
      post_type: posts.postType,
      likes_count: posts.likesCount,
      comments_count: posts.commentsCount,
      target_created_at: posts.createdAt,
      created_at: postLikes.createdAt,
      owner: ownerShape()
    })
    .from(postLikes)
    .innerJoin(posts, eq(postLikes.postId, posts.id))
    .innerJoin(users, eq(posts.userId, users.id))
    .leftJoin(userProfiles, eq(posts.userId, userProfiles.userId))
    .where(and(eq(postLikes.userId, userId), eq(posts.isVisible, true), PUBLICATION_FILTER))
    .orderBy(desc(postLikes.createdAt))
    .limit(limit)
    .offset(offset);
}

async function getLikedWins(db, userId, limit, offset) {
  return db
    .select({
      id: winLikes.id,
      target_id: communityWins.id,
      preview: sql`concat(${communityWins.roleTitle}, coalesce(' at ' || ${communityWins.companyName}, ''))`.mapWith(String),
      role_title: communityWins.roleTitle,
      company_name: communityWins.companyName,
      likes_count: communityWins.likesCount,
      target_created_at: communityWins.createdAt,
      created_at: winLikes.createdAt,
      owner: ownerShape()
    })
    .from(winLikes)
    .innerJoin(communityWins, eq(winLikes.winId, communityWins.id))
    .innerJoin(users, eq(communityWins.userId, users.id))
    .leftJoin(userProfiles, eq(communityWins.userId, userProfiles.userId))
    .where(and(eq(winLikes.userId, userId), eq(communityWins.isVisible, true), WIN_PUBLICATION_FILTER))
    .orderBy(desc(winLikes.createdAt))
    .limit(limit)
    .offset(offset);
}

async function getUserComments(db, userId, { limit, offset, replies }) {
  const parentFilter = replies ? isNotNull(postComments.parentId) : isNull(postComments.parentId);

  return db
    .select({
      id: postComments.id,
      post_id: postComments.postId,
      parent_id: postComments.parentId,
      content: postComments.content,
      created_at: postComments.createdAt,
      post_content: posts.content,
      post_type: posts.postType,
      comments_count: posts.commentsCount,
      post_created_at: posts.createdAt,
      owner: ownerShape()
    })
    .from(postComments)
    .innerJoin(posts, eq(postComments.postId, posts.id))
    .innerJoin(users, eq(posts.userId, users.id))
    .leftJoin(userProfiles, eq(posts.userId, userProfiles.userId))
    .where(and(eq(postComments.userId, userId), parentFilter, eq(posts.isVisible, true), PUBLICATION_FILTER))
    .orderBy(desc(postComments.createdAt))
    .limit(limit)
    .offset(offset);
}

function groupCounts(rows, key) {
  return rows.reduce((counts, row) => {
    const id = row[key];
    counts.set(id, (counts.get(id) || 0) + 1);
    return counts;
  }, new Map());
}

export default async function activityRoutes(app) {
  app.get('/likes', { preHandler: authenticateRequest }, async (request, reply) => {
    try {
      const query = paginationSchema.parse(request.query || {});
      const limit = normalizeLimit(query.limit);
      const offset = normalizeOffset(query.offset);
      const fetchLimit = limit + offset + 1;
      const [postRows, winRows] = await Promise.all([
        getLikedPosts(request.server.db, request.auth.userId, fetchLimit, 0),
        getLikedWins(request.server.db, request.auth.userId, fetchLimit, 0)
      ]);

      const merged = [...postRows.map(mapPostLike), ...winRows.map(mapWinLike)].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      const items = merged.slice(offset, offset + limit);

      return reply.send({ items, hasMore: merged.length > offset + limit });
    } catch (error) {
      return sendError(reply, error, 'Could not load your likes.');
    }
  });

  app.get('/comments', { preHandler: authenticateRequest }, async (request, reply) => {
    try {
      const query = paginationSchema.parse(request.query || {});
      const rows = await getUserComments(request.server.db, request.auth.userId, {
        limit: query.limit + 1,
        offset: query.offset,
        replies: false
      });
      return reply.send({
        items: rows.slice(0, query.limit).map((row) => mapCommentActivity(row, 'comment')),
        hasMore: rows.length > query.limit
      });
    } catch (error) {
      return sendError(reply, error, 'Could not load your comments.');
    }
  });

  app.get('/replies', { preHandler: authenticateRequest }, async (request, reply) => {
    try {
      const query = paginationSchema.parse(request.query || {});
      const rows = await getUserComments(request.server.db, request.auth.userId, {
        limit: query.limit + 1,
        offset: query.offset,
        replies: true
      });
      return reply.send({
        items: rows.slice(0, query.limit).map((row) => mapCommentActivity(row, 'reply')),
        hasMore: rows.length > query.limit
      });
    } catch (error) {
      return sendError(reply, error, 'Could not load your replies.');
    }
  });

  app.post('/bulk-unlike', { preHandler: authenticateRequest }, async (request, reply) => {
    try {
      const body = bulkUnlikeSchema.parse(request.body || {});
      const postLikeIds = body.items
        .filter((item) => item.activity_type === 'post_like' || item.type === 'post_like' || item.type === 'post')
        .map((item) => item.id);
      const winLikeIds = body.items
        .filter((item) => item.activity_type === 'win_like' || item.type === 'win_like' || item.type === 'win')
        .map((item) => item.id);

      const deletedPostLikes = postLikeIds.length
        ? await request.server.db
            .delete(postLikes)
            .where(and(eq(postLikes.userId, request.auth.userId), inArray(postLikes.id, postLikeIds)))
            .returning({ postId: postLikes.postId })
        : [];
      const deletedWinLikes = winLikeIds.length
        ? await request.server.db
            .delete(winLikes)
            .where(and(eq(winLikes.userId, request.auth.userId), inArray(winLikes.id, winLikeIds)))
            .returning({ winId: winLikes.winId })
        : [];

      for (const [postId, count] of groupCounts(deletedPostLikes, 'postId')) {
        await request.server.db
          .update(posts)
          .set({ likesCount: sql`GREATEST(${posts.likesCount} - ${count}, 0)`, updatedAt: new Date() })
          .where(eq(posts.id, postId));
      }

      for (const [winId, count] of groupCounts(deletedWinLikes, 'winId')) {
        await request.server.db
          .update(communityWins)
          .set({ likesCount: sql`GREATEST(${communityWins.likesCount} - ${count}, 0)` })
          .where(eq(communityWins.id, winId));
      }

      return reply.send({
        success: true,
        updatedCount: deletedPostLikes.length + deletedWinLikes.length
      });
    } catch (error) {
      return sendError(reply, error, 'Could not unlike selected items.');
    }
  });

  app.post('/bulk-delete', { preHandler: authenticateRequest }, async (request, reply) => {
    try {
      const body = bulkDeleteSchema.parse(request.body || {});
      const ids = body.ids || body.items?.map((item) => item.id) || [];

      if (!ids.length) {
        return reply.code(400).send({ success: false, error: 'Select at least one activity item.' });
      }

      const deletedComments = await request.server.db
        .delete(postComments)
        .where(and(eq(postComments.userId, request.auth.userId), inArray(postComments.id, ids)))
        .returning({ postId: postComments.postId });

      for (const [postId, count] of groupCounts(deletedComments, 'postId')) {
        await request.server.db
          .update(posts)
          .set({ commentsCount: sql`GREATEST(${posts.commentsCount} - ${count}, 0)`, updatedAt: new Date() })
          .where(eq(posts.id, postId));
      }

      return reply.send({ success: true, deletedCount: deletedComments.length });
    } catch (error) {
      return sendError(reply, error, 'Could not delete selected activity.');
    }
  });
}
