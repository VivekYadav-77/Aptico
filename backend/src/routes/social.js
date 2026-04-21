import { and, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { analyses, communityWins, connections, notifications, publicJobCache, userProfiles, users } from '../db/schema.js';
import { authenticateRequest, optionalAuthenticateRequest } from '../middlewares/authMiddleware.js';
import {
  createOrUpdateProfile,
  followUser,
  getPublicProfile,
  isFollowing,
  unfollowUser
} from '../services/profileService.js';
import {
  getConnections,
  getConnectionStatus,
  getPendingRequests,
  respondToRequest,
  sendConnectionRequest
} from '../services/connectionService.js';
import {
  addComment,
  createPost,
  deletePost,
  getFeedPosts,
  getPostComments,
  getPublicFeedPosts,
  likePost
} from '../services/postService.js';
import { getPublicJobsFeed, getWinsFeed, likeWin, postWin } from '../services/socialService.js';
import { getUnreadCount } from '../utils/notificationHelper.js';

const USERNAME_PATTERN = /^[a-z0-9_-]{3,30}$/;

const profileBodySchema = z.object({
  username: z.string().trim().regex(USERNAME_PATTERN),
  headline: z.string().trim().max(120).optional().nullable(),
  location: z.string().trim().max(100).optional().nullable(),
  skills: z.array(z.string().trim().min(1).max(50)).max(20).optional().nullable(),
  is_public: z.boolean().optional()
});

const winBodySchema = z.object({
  role_title: z.string().trim().min(1).max(100),
  company_name: z.string().trim().max(100).optional().nullable(),
  search_duration_weeks: z.number().int().min(1).max(200).optional().nullable(),
  message: z.string().trim().max(280).optional().nullable()
});

const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0)
});

const postTypeSchema = z.enum(['career_update', 'job_tip', 'job_share', 'analysis_share', 'question']);

const postBodySchema = z.object({
  post_type: postTypeSchema,
  content: z.string().trim().min(1).max(500),
  analysis_id: z.string().uuid().optional().nullable(),
  job_data: z.record(z.any()).optional().nullable(),
  career_update_type: z.string().optional().nullable()
});

const feedQuerySchema = paginationSchema.extend({
  filterType: postTypeSchema.optional().nullable(),
  userId: z.string().uuid().optional().nullable()
});

const commentBodySchema = z.object({
  content: z.string().trim().min(1).max(300)
});

const connectionRequestSchema = z.object({
  note: z.string().trim().max(150).optional().nullable()
});

const connectionResponseSchema = z.object({
  action: z.enum(['accepted', 'declined'])
});

const notificationQuerySchema = paginationSchema.extend({
  unreadOnly: z.coerce.boolean().default(false)
});

const notificationReadSchema = z.object({
  notificationIds: z.array(z.string().uuid()).optional(),
  markAllRead: z.boolean().optional()
});

function parseCachedJson(value) {
  if (!value) {
    return null;
  }

  try {
    return typeof value === 'string' ? JSON.parse(value) : value;
  } catch {
    return null;
  }
}

function sendError(reply, error, fallbackMessage) {
  const statusCode = error.name === 'ZodError' ? 400 : error.statusCode || 500;
  return reply.code(statusCode).send({
    success: false,
    error: error.message || fallbackMessage
  });
}

async function getProfileByUsername(db, username) {
  const rows = await db
    .select({ userId: userProfiles.userId })
    .from(userProfiles)
    .where(eq(userProfiles.username, username))
    .limit(1);

  return rows[0] || null;
}

export default async function socialRoutes(app) {
  app.get('/check-username/:username', async (request, reply) => {
    try {
      const username = String(request.params.username || '').trim();
      const valid = USERNAME_PATTERN.test(username);

      if (!valid) {
        return reply.send({
          available: false,
          valid: false,
          error: 'Username must be 3-30 lowercase characters, numbers, hyphens or underscores only'
        });
      }

      const existing = await getProfileByUsername(request.server.db, username);

      return reply.send({
        available: !existing,
        valid: true,
        error: existing ? 'Username already taken' : null
      });
    } catch (error) {
      return sendError(reply, error, 'Could not check username.');
    }
  });

  app.get('/my-profile', { preHandler: authenticateRequest }, async (request, reply) => {
    try {
      const rows = await request.server.db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, request.auth.userId))
        .limit(1);

      return reply.send(rows[0] || null);
    } catch (error) {
      return sendError(reply, error, 'Could not load profile.');
    }
  });

  app.get('/profile/:username/is-following', { preHandler: authenticateRequest }, async (request, reply) => {
    try {
      const target = await getProfileByUsername(request.server.db, request.params.username);

      if (!target) {
        return reply.code(404).send({ success: false, error: 'User not found' });
      }

      const following = await isFollowing(request.server.db, request.auth.userId, target.userId);
      return reply.send({ isFollowing: following });
    } catch (error) {
      return sendError(reply, error, 'Could not check follow status.');
    }
  });

  app.get('/profile/:username', { preHandler: optionalAuthenticateRequest }, async (request, reply) => {
    try {
      const username = String(request.params.username || '').trim();
      const viewerId = request.auth?.userId || null;
      const redis = request.server.services?.redis;

      // Authenticated viewers always get fresh data (settings changes, visibility updates)
      // Only anonymous visitors use cache
      if (!viewerId) {
        const cacheKey = `profile:username:${username}`;
        const cached = parseCachedJson(await redis?.get(cacheKey));
        if (cached) {
          return reply.send(cached);
        }

        const profile = await getPublicProfile(request.server.db, username, null);
        await redis?.set(cacheKey, JSON.stringify(profile), 120);
        return reply.send(profile);
      }

      const profile = await getPublicProfile(request.server.db, username, viewerId);
      return reply.send(profile);
    } catch (error) {
      if (error.statusCode === 404) {
        return reply.code(404).send({ error: 'Profile not found' });
      }

      return sendError(reply, error, 'Could not load profile.');
    }
  });

  app.put('/profile', { preHandler: authenticateRequest }, async (request, reply) => {
    try {
      const body = profileBodySchema.parse(request.body || {});
      const oldProfileRows = await request.server.db
        .select({ username: userProfiles.username })
        .from(userProfiles)
        .where(eq(userProfiles.userId, request.auth.userId))
        .limit(1);

      const profile = await createOrUpdateProfile(request.server.db, request.auth.userId, body);
      const redis = request.server.services?.redis;

      await Promise.all(
        [oldProfileRows[0]?.username, profile.username]
          .filter(Boolean)
          .map((username) => redis?.del(`profile:username:${username}`))
      );

      return reply.send(profile);
    } catch (error) {
      return sendError(reply, error, 'Could not save profile.');
    }
  });

  app.post('/follow/:username', { preHandler: authenticateRequest }, async (request, reply) => {
    try {
      const result = await followUser(request.server.db, request.auth.userId, request.params.username);
      return reply.send(result);
    } catch (error) {
      return sendError(reply, error, 'Could not follow user.');
    }
  });

  app.delete('/follow/:username', { preHandler: authenticateRequest }, async (request, reply) => {
    try {
      const result = await unfollowUser(request.server.db, request.auth.userId, request.params.username);
      return reply.send(result);
    } catch (error) {
      return sendError(reply, error, 'Could not unfollow user.');
    }
  });

  app.post('/wins', { preHandler: authenticateRequest }, async (request, reply) => {
    try {
      const body = winBodySchema.parse(request.body || {});
      const win = await postWin(request.server.db, request.auth.userId, body);
      await request.server.services?.redis?.del('platform:stats');
      return reply.code(201).send(win);
    } catch (error) {
      return sendError(reply, error, 'Could not post win.');
    }
  });

  app.get('/wins', async (request, reply) => {
    try {
      const query = paginationSchema.parse(request.query || {});
      const cacheKey = `wins:feed:${query.limit}:${query.offset}`;
      const redis = request.server.services?.redis;
      const cached = parseCachedJson(await redis?.get(cacheKey));

      if (cached) {
        return reply.send(cached);
      }

      const wins = await getWinsFeed(request.server.db, query);
      const totalRows = await request.server.db
        .select({ total: sql`count(*)::int` })
        .from(communityWins)
        .where(eq(communityWins.isVisible, true));
      const payload = { wins, total: totalRows[0]?.total || 0 };

      await redis?.set(cacheKey, JSON.stringify(payload), 120);
      return reply.send(payload);
    } catch (error) {
      return sendError(reply, error, 'Could not load wins.');
    }
  });

  app.post('/wins/:winId/like', { preHandler: authenticateRequest }, async (request, reply) => {
    try {
      const result = await likeWin(request.server.db, request.auth.userId, request.params.winId);
      return reply.send(result);
    } catch (error) {
      return sendError(reply, error, 'Could not like win.');
    }
  });

  app.get('/public-jobs', async (request, reply) => {
    try {
      const query = paginationSchema.extend({ limit: z.coerce.number().int().min(1).max(50).default(30), jobType: z.string().trim().optional() }).parse(request.query || {});
      const cacheKey = `public:jobs:${query.jobType || 'all'}:${query.limit}:${query.offset}`;
      const redis = request.server.services?.redis;
      const cached = parseCachedJson(await redis?.get(cacheKey));

      if (cached) {
        return reply.send(cached);
      }

      const jobs = await getPublicJobsFeed(request.server.db, query);
      const payload = { jobs };

      await redis?.set(cacheKey, JSON.stringify(payload), 600);
      return reply.send(payload);
    } catch (error) {
      return sendError(reply, error, 'Could not load public jobs.');
    }
  });

  app.get('/stats', async (request, reply) => {
    try {
      const redis = request.server.services?.redis;
      const cached = parseCachedJson(await redis?.get('platform:stats'));

      if (cached) {
        return reply.send(cached);
      }

      const [totalUsers, totalAnalyses, totalWins, totalPublicJobs] = await Promise.all([
        request.server.db.select({ total: sql`count(*)::int` }).from(users),
        request.server.db.select({ total: sql`count(*)::int` }).from(analyses),
        request.server.db.select({ total: sql`count(*)::int` }).from(communityWins).where(eq(communityWins.isVisible, true)),
        request.server.db.select({ total: sql`count(*)::int` }).from(publicJobCache)
      ]);
      const payload = {
        totalUsers: totalUsers[0]?.total || 0,
        totalAnalyses: totalAnalyses[0]?.total || 0,
        totalWins: totalWins[0]?.total || 0,
        totalPublicJobs: totalPublicJobs[0]?.total || 0
      };

      await redis?.set('platform:stats', JSON.stringify(payload), 600);
      return reply.send(payload);
    } catch (error) {
      return sendError(reply, error, 'Could not load stats.');
    }
  });

  app.post('/posts', { preHandler: authenticateRequest }, async (request, reply) => {
    try {
      const body = postBodySchema.parse(request.body || {});
      const post = await createPost(request.server.db, request.auth.userId, body);
      return reply.code(201).send(post);
    } catch (error) {
      return sendError(reply, error, 'Could not create post.');
    }
  });

  app.get('/feed', { preHandler: authenticateRequest }, async (request, reply) => {
    try {
      const query = feedQuerySchema.omit({ userId: true }).parse(request.query || {});
      const posts = await getFeedPosts(request.server.db, request.auth.userId, query);
      return reply.send({ posts, hasMore: posts.length === query.limit });
    } catch (error) {
      return sendError(reply, error, 'Could not load feed.');
    }
  });

  app.get('/feed/public', async (request, reply) => {
    try {
      const query = feedQuerySchema.parse(request.query || {});
      const cacheKey = `public:feed:${query.filterType || 'all'}:${query.userId || 'all'}:${query.offset}`;
      const redis = request.server.services?.redis;
      const cached = parseCachedJson(await redis?.get(cacheKey));

      if (cached) {
        return reply.send(cached);
      }

      const posts = await getPublicFeedPosts(request.server.db, query);
      const payload = { posts, hasMore: posts.length === query.limit };
      await redis?.set(cacheKey, JSON.stringify(payload), 180);
      return reply.send(payload);
    } catch (error) {
      return sendError(reply, error, 'Could not load public feed.');
    }
  });

  app.post('/posts/:postId/like', { preHandler: authenticateRequest }, async (request, reply) => {
    try {
      const result = await likePost(request.server.db, request.auth.userId, request.params.postId);
      return reply.send(result);
    } catch (error) {
      return sendError(reply, error, 'Could not like post.');
    }
  });

  app.post('/posts/:postId/comments', { preHandler: authenticateRequest }, async (request, reply) => {
    try {
      const body = commentBodySchema.parse(request.body || {});
      const comment = await addComment(request.server.db, request.auth.userId, request.params.postId, body.content);
      return reply.code(201).send(comment);
    } catch (error) {
      return sendError(reply, error, 'Could not add comment.');
    }
  });

  app.get('/posts/:postId/comments', async (request, reply) => {
    try {
      const query = paginationSchema.parse(request.query || {});
      const comments = await getPostComments(request.server.db, request.params.postId, query);
      return reply.send({ comments });
    } catch (error) {
      return sendError(reply, error, 'Could not load comments.');
    }
  });

  app.delete('/posts/:postId', { preHandler: authenticateRequest }, async (request, reply) => {
    try {
      const result = await deletePost(request.server.db, request.auth.userId, request.params.postId);
      return reply.send(result);
    } catch (error) {
      return sendError(reply, error, 'Could not delete post.');
    }
  });

  app.post('/connections/request/:username', { preHandler: authenticateRequest }, async (request, reply) => {
    try {
      const body = connectionRequestSchema.parse(request.body || {});
      const connection = await sendConnectionRequest(request.server.db, request.auth.userId, request.params.username, body.note);
      return reply.code(201).send(connection);
    } catch (error) {
      return sendError(reply, error, 'Could not send connection request.');
    }
  });

  app.put('/connections/:connectionId', { preHandler: authenticateRequest }, async (request, reply) => {
    try {
      const body = connectionResponseSchema.parse(request.body || {});
      const result = await respondToRequest(request.server.db, request.auth.userId, request.params.connectionId, body.action);
      return reply.send(result);
    } catch (error) {
      return sendError(reply, error, 'Could not respond to request.');
    }
  });

  app.get('/connections', { preHandler: authenticateRequest }, async (request, reply) => {
    try {
      const rows = await getConnections(request.server.db, request.auth.userId);
      return reply.send({ connections: rows });
    } catch (error) {
      return sendError(reply, error, 'Could not load connections.');
    }
  });

  app.get('/connections/pending', { preHandler: authenticateRequest }, async (request, reply) => {
    try {
      const rows = await getPendingRequests(request.server.db, request.auth.userId);
      return reply.send({ requests: rows });
    } catch (error) {
      return sendError(reply, error, 'Could not load pending requests.');
    }
  });

  app.get('/connections/status/:username', { preHandler: authenticateRequest }, async (request, reply) => {
    try {
      const target = await getProfileByUsername(request.server.db, request.params.username);
      if (!target) {
        return reply.code(404).send({ success: false, error: 'User not found' });
      }

      const connectionData = await getConnectionStatus(request.server.db, request.auth.userId, target.userId);
      return reply.send(connectionData);
    } catch (error) {
      return sendError(reply, error, 'Could not load connection status.');
    }
  });

  app.get('/notifications', { preHandler: authenticateRequest }, async (request, reply) => {
    try {
      const query = notificationQuerySchema.parse(request.query || {});
      const filters = [eq(notifications.userId, request.auth.userId)];

      if (query.unreadOnly) {
        filters.push(eq(notifications.isRead, false));
      }

      const rows = await request.server.db
        .select({
          id: notifications.id,
          type: notifications.type,
          actor_id: notifications.actorId,
          entity_id: notifications.entityId,
          entity_type: notifications.entityType,
          message: notifications.message,
          is_read: notifications.isRead,
          created_at: notifications.createdAt,
          actor: {
            name: users.name,
            avatar_url: users.avatarUrl,
            username: userProfiles.username
          }
        })
        .from(notifications)
        .leftJoin(users, eq(notifications.actorId, users.id))
        .leftJoin(userProfiles, eq(notifications.actorId, userProfiles.userId))
        .where(and(...filters))
        .orderBy(desc(notifications.createdAt))
        .limit(query.limit)
        .offset(query.offset);

      const unreadCount = await getUnreadCount(request.server.db, request.auth.userId);
      return reply.send({ notifications: rows, unreadCount });
    } catch (error) {
      return sendError(reply, error, 'Could not load notifications.');
    }
  });

  app.put('/notifications/read', { preHandler: authenticateRequest }, async (request, reply) => {
    try {
      const body = notificationReadSchema.parse(request.body || {});
      let updated = [];

      if (body.markAllRead) {
        updated = await request.server.db
          .update(notifications)
          .set({ isRead: true })
          .where(and(eq(notifications.userId, request.auth.userId), eq(notifications.isRead, false)))
          .returning({ id: notifications.id });
      } else if (body.notificationIds?.length) {
        updated = await request.server.db
          .update(notifications)
          .set({ isRead: true })
          .where(and(eq(notifications.userId, request.auth.userId), inArray(notifications.id, body.notificationIds)))
          .returning({ id: notifications.id });
      }

      return reply.send({ success: true, updatedCount: updated.length });
    } catch (error) {
      return sendError(reply, error, 'Could not mark notifications as read.');
    }
  });

  // app.get('/notifications/count', { preHandler: authenticateRequest }, async (request, reply) => {
  //   try {
  //     const cacheKey = `notif:count:${request.auth.userId}`;
  //     const redis = request.server.services?.redis;
  //     const cached = parseCachedJson(await redis?.get(cacheKey));

  //     if (cached) {
  //       return reply.send(cached);
  //     }

  //     const unreadCount = await getUnreadCount(request.server.db, request.auth.userId);
  //     const payload = { unreadCount };
  //     await redis?.set(cacheKey, JSON.stringify(payload), 30);
  //     return reply.send(payload);
  //   } catch (error) {
  //     return sendError(reply, error, 'Could not load notification count.');
  //   }
  // });

  app.get('/people/search', { preHandler: authenticateRequest }, async (request, reply) => {
    try {
      const q = String(request.query?.q || '').trim();
      const filters = [
        sql`${userProfiles.userId} <> ${request.auth.userId}`,
        sql`not exists (
          select 1 from connections c
          where c.status = 'accepted'
          and ((c.requester_id = ${request.auth.userId} and c.recipient_id = ${userProfiles.userId})
            or (c.recipient_id = ${request.auth.userId} and c.requester_id = ${userProfiles.userId}))
        )`
      ];

      if (q.length >= 2) {
        const pattern = `%${q}%`;
        filters.push(
          or(
            ilike(users.name, pattern),
            ilike(userProfiles.username, pattern),
            ilike(userProfiles.headline, pattern),
            sql`array_to_string(${userProfiles.skills}, ',') ilike ${pattern}`
          )
        );
      }

      const rows = await request.server.db
        .select({
          name: users.name,
          avatar_url: users.avatarUrl,
          username: userProfiles.username,
          headline: userProfiles.headline,
          location: userProfiles.location,
          skills: userProfiles.skills,
          follower_count: userProfiles.followerCount
        })
        .from(userProfiles)
        .innerJoin(users, eq(userProfiles.userId, users.id))
        .where(and(...filters))
        .orderBy(desc(userProfiles.followerCount))
        .limit(20);

      return reply.send({ people: rows });
    } catch (error) {
      return sendError(reply, error, 'Could not search people.');
    }
  });
}
