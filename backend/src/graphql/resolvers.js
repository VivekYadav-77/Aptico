import { and, desc, eq, gte, ilike, isNull, sql } from 'drizzle-orm';
import {
  adminAuditLogs,
  adminRestrictions,
  analyses,
  analyticsEvents,
  apiUsage,
  communityWins,
  emailDeliveryLogs,
  emailServiceBlocks,
  generatedContent,
  posts,
  refreshTokens,
  savedJobs,
  users,
  visitorSessions
} from '../db/schema.js';
import {
  listModerationActions,
  listModerationQueue,
  listRestrictionsForUser
} from '../modules/admin/admin-controls.service.js';

async function getCount(db, table, whereClause) {
  const query = db
    .select({
      count: sql`cast(count(*) as integer)`
    })
    .from(table);

  const executableQuery = whereClause ? query.where(whereClause) : query;

  const [row] = await executableQuery;
  return Number(row?.count || 0);
}

function serializeDate(value) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : String(value);
}

function serializeMetadata(value) {
  try {
    return JSON.stringify(value || {});
  } catch {
    return '{}';
  }
}

function normalizeLimit(value, fallback = 30, max = 100) {
  const number = Number(value);
  return Number.isInteger(number) ? Math.min(Math.max(number, 1), max) : fallback;
}

async function requireDb(context) {
  if (!context.db) {
    const error = new Error('Database is not configured yet.');
    error.statusCode = 503;
    throw error;
  }

  return context.db;
}

export const resolvers = {
  Query: {
    adminOverview: async (_source, _args, context) => {
      const db = await requireDb(context);

      const [
        totalUsers,
        totalAnalyses,
        totalGeneratedContent,
        totalSavedJobs,
        activeRefreshTokens,
        revokedRefreshTokens,
        totalVisits,
        uniqueVisitors,
        totalEvents,
        apiErrors,
        adminActions,
        restrictedUsers,
        blockedUsers,
        deactivatedUsers,
        hiddenPosts,
        hiddenWins,
        pendingModeration
      ] =
        await Promise.all([
          getCount(db, users),
          getCount(db, analyses),
          getCount(db, generatedContent),
          getCount(db, savedJobs),
          getCount(db, refreshTokens, isNull(refreshTokens.revokedAt)),
          getCount(db, refreshTokens, sql`${refreshTokens.revokedAt} is not null`),
          getCount(db, analyticsEvents, eq(analyticsEvents.eventType, 'page_view')),
          (async () => {
            const [row] = await db
              .select({ count: sql`cast(count(distinct ${analyticsEvents.visitorId}) as integer)` })
              .from(analyticsEvents)
              .where(eq(analyticsEvents.eventType, 'page_view'));
            return Number(row?.count || 0);
          })(),
          getCount(db, analyticsEvents),
          getCount(db, analyticsEvents, eq(analyticsEvents.eventType, 'api_error')),
          getCount(db, adminAuditLogs),
          getCount(db, users, eq(users.status, 'restricted')),
          getCount(db, users, eq(users.status, 'blocked')),
          getCount(db, users, eq(users.status, 'deactivated')),
          getCount(db, posts, eq(posts.isVisible, false)),
          getCount(db, communityWins, eq(communityWins.isVisible, false)),
          getCount(db, adminRestrictions, eq(adminRestrictions.isRestricted, true))
        ]);

      const [apiUsageRow] = await db
        .select({
          totalApiRequests: sql`cast(coalesce(sum(${apiUsage.requestCount}), 0) as integer)`
        })
        .from(apiUsage);

      return {
        totalUsers,
        totalAnalyses,
        totalGeneratedContent,
        totalSavedJobs,
        totalApiRequests: Number(apiUsageRow?.totalApiRequests || 0),
        activeRefreshTokens,
        revokedRefreshTokens,
        totalVisits,
        uniqueVisitors,
        activeVisitors: await getCount(
          db,
          visitorSessions,
          gte(visitorSessions.lastSeenAt, new Date(Date.now() - 15 * 60 * 1000))
        ),
        totalEvents,
        apiErrors,
        adminActions,
        restrictedUsers,
        blockedUsers,
        deactivatedUsers,
        hiddenPosts,
        hiddenWins,
        pendingModeration
      };
    },
    apiUsageMetrics: async (_source, _args, context) => {
      const db = await requireDb(context);
      const rows = await db.select().from(apiUsage).orderBy(desc(apiUsage.date), desc(apiUsage.requestCount));

      return rows.map((row) => ({
        sourceName: row.sourceName,
        date: row.date,
        requestCount: row.requestCount,
        last429At: serializeDate(row.last429At)
      }));
    },
    emailUsageMetrics: async (_source, _args, context) => {
      const db = await requireDb(context);
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const [row] = await db
        .select({
          total: sql`cast(count(*) as integer)`,
          sent: sql`cast(count(*) filter (where ${emailDeliveryLogs.status} = 'sent') as integer)`,
          failed: sql`cast(count(*) filter (where ${emailDeliveryLogs.status} = 'failed') as integer)`,
          pending: sql`cast(count(*) filter (where ${emailDeliveryLogs.status} = 'pending') as integer)`,
          failedLast24h: sql`cast(count(*) filter (where ${emailDeliveryLogs.status} = 'failed' and ${emailDeliveryLogs.createdAt} >= ${oneDayAgo}) as integer)`,
          lastSentAt: sql`max(${emailDeliveryLogs.deliveredAt})`
        })
        .from(emailDeliveryLogs);

      return {
        total: Number(row?.total || 0),
        sent: Number(row?.sent || 0),
        failed: Number(row?.failed || 0),
        pending: Number(row?.pending || 0),
        failedLast24h: Number(row?.failedLast24h || 0),
        lastSentAt: serializeDate(row?.lastSentAt)
      };
    },
    emailDeliveryLogs: async (_source, args, context) => {
      const db = await requireDb(context);
      const conditions = [];
      const emailSearch = String(args.email || '').trim();

      if (emailSearch) conditions.push(ilike(emailDeliveryLogs.email, `%${emailSearch}%`));
      if (args.emailType) conditions.push(eq(emailDeliveryLogs.emailType, args.emailType));
      if (args.status) conditions.push(eq(emailDeliveryLogs.status, args.status));

      const baseQuery = db
        .select({
          id: emailDeliveryLogs.id,
          userId: emailDeliveryLogs.userId,
          userEmail: users.email,
          userName: users.name,
          email: emailDeliveryLogs.email,
          emailType: emailDeliveryLogs.emailType,
          provider: emailDeliveryLogs.provider,
          status: emailDeliveryLogs.status,
          subject: emailDeliveryLogs.subject,
          country: emailDeliveryLogs.country,
          region: emailDeliveryLogs.region,
          city: emailDeliveryLogs.city,
          errorCode: emailDeliveryLogs.errorCode,
          errorMessage: emailDeliveryLogs.errorMessage,
          createdAt: emailDeliveryLogs.createdAt,
          deliveredAt: emailDeliveryLogs.deliveredAt
        })
        .from(emailDeliveryLogs)
        .leftJoin(users, eq(emailDeliveryLogs.userId, users.id));

      const filteredQuery = conditions.length ? baseQuery.where(and(...conditions)) : baseQuery;
      const rows = await filteredQuery
        .orderBy(desc(emailDeliveryLogs.createdAt))
        .limit(normalizeLimit(args.limit, 50, 100));

      return rows.map((row) => ({
        ...row,
        createdAt: serializeDate(row.createdAt),
        deliveredAt: serializeDate(row.deliveredAt)
      }));
    },
    emailServiceBlocks: async (_source, args, context) => {
      const db = await requireDb(context);
      const conditions = [];
      const emailSearch = String(args.email || '').trim();

      if (emailSearch) conditions.push(ilike(emailServiceBlocks.email, `%${emailSearch}%`));

      const creator = users;
      const baseQuery = db
        .select({
          id: emailServiceBlocks.id,
          email: emailServiceBlocks.email,
          isBlocked: emailServiceBlocks.isBlocked,
          reason: emailServiceBlocks.reason,
          createdBy: emailServiceBlocks.createdBy,
          createdByEmail: creator.email,
          createdAt: emailServiceBlocks.createdAt,
          updatedAt: emailServiceBlocks.updatedAt
        })
        .from(emailServiceBlocks)
        .leftJoin(creator, eq(emailServiceBlocks.createdBy, creator.id));

      const filteredQuery = conditions.length ? baseQuery.where(and(...conditions)) : baseQuery;
      const rows = await filteredQuery
        .orderBy(desc(emailServiceBlocks.updatedAt))
        .limit(normalizeLimit(args.limit, 50, 100));

      return rows.map((row) => ({
        ...row,
        createdAt: serializeDate(row.createdAt),
        updatedAt: serializeDate(row.updatedAt)
      }));
    },
    adminUsers: async (_source, _args, context) => {
      const db = await requireDb(context);
      const rows = await db.select().from(users).orderBy(desc(users.createdAt));

      return Promise.all(
        rows.map(async (user) => {
          const [activeSessionCount, analysesCount, savedJobsCount, restrictionCount] = await Promise.all([
            getCount(db, refreshTokens, and(eq(refreshTokens.userId, user.id), isNull(refreshTokens.revokedAt))),
            getCount(db, analyses, eq(analyses.userId, user.id)),
            getCount(db, savedJobs, eq(savedJobs.userId, user.id)),
            getCount(
              db,
              adminRestrictions,
              and(
                eq(adminRestrictions.userId, user.id),
                eq(adminRestrictions.isRestricted, true),
                sql`(${adminRestrictions.expiresAt} is null or ${adminRestrictions.expiresAt} > now())`
              )
            )
          ]);
          const [eventCount, lastSeenRow] = await Promise.all([
            getCount(db, analyticsEvents, eq(analyticsEvents.userId, user.id)),
            db
              .select({ lastSeenAt: sql`max(${visitorSessions.lastSeenAt})` })
              .from(visitorSessions)
              .where(eq(visitorSessions.userId, user.id))
          ]);

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            avatarUrl: user.avatarUrl,
            role: user.role,
            status: user.status || 'active',
            createdAt: serializeDate(user.createdAt),
            lastLogin: serializeDate(user.lastLogin),
            activeSessionCount,
            analysesCount,
            savedJobsCount,
            eventCount,
            restrictionCount,
            lastSeenAt: serializeDate(lastSeenRow[0]?.lastSeenAt)
          };
        })
      );
    },
    visitorTrends: async (_source, args, context) => {
      const db = await requireDb(context);
      const days = normalizeLimit(args.days, 14, 90);
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const rows = await db
        .select({
          date: sql`to_char(date(${analyticsEvents.createdAt}), 'YYYY-MM-DD')`,
          visits: sql`cast(count(*) filter (where ${analyticsEvents.eventType} = 'page_view') as integer)`,
          uniqueVisitors: sql`cast(count(distinct ${analyticsEvents.visitorId}) as integer)`,
          events: sql`cast(count(*) as integer)`
        })
        .from(analyticsEvents)
        .where(gte(analyticsEvents.createdAt, since))
        .groupBy(sql`date(${analyticsEvents.createdAt})`)
        .orderBy(sql`date(${analyticsEvents.createdAt})`);

      return rows.map((row) => ({
        date: String(row.date),
        visits: Number(row.visits || 0),
        uniqueVisitors: Number(row.uniqueVisitors || 0),
        events: Number(row.events || 0)
      }));
    },
    topPages: async (_source, args, context) => {
      const db = await requireDb(context);
      const rows = await db
        .select({
          label: sql`coalesce(${analyticsEvents.path}, 'Unknown')`,
          value: sql`cast(count(*) as integer)`
        })
        .from(analyticsEvents)
        .where(eq(analyticsEvents.eventType, 'page_view'))
        .groupBy(analyticsEvents.path)
        .orderBy(desc(sql`count(*)`))
        .limit(normalizeLimit(args.limit, 10, 50));

      return rows.map((row) => ({ label: String(row.label), value: Number(row.value || 0) }));
    },
    trafficSources: async (_source, args, context) => {
      const db = await requireDb(context);
      const rows = await db
        .select({
          label: sql`coalesce(${analyticsEvents.source}, 'Direct')`,
          value: sql`cast(count(*) as integer)`
        })
        .from(analyticsEvents)
        .where(eq(analyticsEvents.eventType, 'page_view'))
        .groupBy(analyticsEvents.source)
        .orderBy(desc(sql`count(*)`))
        .limit(normalizeLimit(args.limit, 10, 50));

      return rows.map((row) => ({ label: String(row.label), value: Number(row.value || 0) }));
    },
    geoBreakdown: async (_source, args, context) => {
      const db = await requireDb(context);
      const rows = await db
        .select({
          label: sql`coalesce(nullif(concat_ws(', ', ${analyticsEvents.city}, ${analyticsEvents.region}, ${analyticsEvents.country}), ''), 'Unknown')`,
          value: sql`cast(count(*) as integer)`
        })
        .from(analyticsEvents)
        .where(eq(analyticsEvents.eventType, 'page_view'))
        .groupBy(analyticsEvents.city, analyticsEvents.region, analyticsEvents.country)
        .orderBy(desc(sql`count(*)`))
        .limit(normalizeLimit(args.limit, 10, 50));

      return rows.map((row) => ({ label: String(row.label), value: Number(row.value || 0) }));
    },
    deviceBreakdown: async (_source, _args, context) => {
      const db = await requireDb(context);
      const rows = await db
        .select({
          label: sql`coalesce(${analyticsEvents.deviceCategory}, 'Unknown')`,
          value: sql`cast(count(*) as integer)`
        })
        .from(analyticsEvents)
        .where(eq(analyticsEvents.eventType, 'page_view'))
        .groupBy(analyticsEvents.deviceCategory)
        .orderBy(desc(sql`count(*)`));

      return rows.map((row) => ({ label: String(row.label), value: Number(row.value || 0) }));
    },
    recentEvents: async (_source, args, context) => {
      const db = await requireDb(context);
      const conditions = [];
      if (args.eventType) conditions.push(eq(analyticsEvents.eventType, args.eventType));
      if (args.userId) conditions.push(eq(analyticsEvents.userId, args.userId));

      const baseQuery = db
        .select({
          id: analyticsEvents.id,
          eventType: analyticsEvents.eventType,
          userId: analyticsEvents.userId,
          userEmail: users.email,
          visitorId: analyticsEvents.visitorId,
          path: analyticsEvents.path,
          referrer: analyticsEvents.referrer,
          source: analyticsEvents.source,
          deviceCategory: analyticsEvents.deviceCategory,
          browserName: analyticsEvents.browserName,
          country: analyticsEvents.country,
          region: analyticsEvents.region,
          city: analyticsEvents.city,
          metadata: analyticsEvents.metadata,
          createdAt: analyticsEvents.createdAt
        })
        .from(analyticsEvents)
        .leftJoin(users, eq(analyticsEvents.userId, users.id));
      const filteredQuery = conditions.length ? baseQuery.where(and(...conditions)) : baseQuery;
      const rows = await filteredQuery
        .orderBy(desc(analyticsEvents.createdAt))
        .limit(normalizeLimit(args.limit, 30, 100));

      return rows.map((row) => ({
        ...row,
        metadata: serializeMetadata(row.metadata),
        createdAt: serializeDate(row.createdAt)
      }));
    },
    userActivity: async (_source, args, context) => {
      const db = await requireDb(context);
      const rows = await db
        .select({
          id: analyticsEvents.id,
          eventType: analyticsEvents.eventType,
          userId: analyticsEvents.userId,
          userEmail: users.email,
          visitorId: analyticsEvents.visitorId,
          path: analyticsEvents.path,
          referrer: analyticsEvents.referrer,
          source: analyticsEvents.source,
          deviceCategory: analyticsEvents.deviceCategory,
          browserName: analyticsEvents.browserName,
          country: analyticsEvents.country,
          region: analyticsEvents.region,
          city: analyticsEvents.city,
          metadata: analyticsEvents.metadata,
          createdAt: analyticsEvents.createdAt
        })
        .from(analyticsEvents)
        .leftJoin(users, eq(analyticsEvents.userId, users.id))
        .where(eq(analyticsEvents.userId, args.userId))
        .orderBy(desc(analyticsEvents.createdAt))
        .limit(normalizeLimit(args.limit, 30, 100));

      return rows.map((row) => ({
        ...row,
        metadata: serializeMetadata(row.metadata),
        createdAt: serializeDate(row.createdAt)
      }));
    },
    adminAuditLogs: async (_source, args, context) => {
      const db = await requireDb(context);
      const rows = await db
        .select({
          id: adminAuditLogs.id,
          adminUserId: adminAuditLogs.adminUserId,
          adminEmail: users.email,
          action: adminAuditLogs.action,
          targetType: adminAuditLogs.targetType,
          targetId: adminAuditLogs.targetId,
          metadata: adminAuditLogs.metadata,
          createdAt: adminAuditLogs.createdAt
        })
        .from(adminAuditLogs)
        .leftJoin(users, eq(adminAuditLogs.adminUserId, users.id))
        .orderBy(desc(adminAuditLogs.createdAt))
        .limit(normalizeLimit(args.limit, 30, 100));

      return rows.map((row) => ({
        ...row,
        metadata: serializeMetadata(row.metadata),
        createdAt: serializeDate(row.createdAt)
      }));
    },
    adminRestrictions: async (_source, args, context) => {
      const db = await requireDb(context);

      if (args.userId) {
        return listRestrictionsForUser(db, args.userId);
      }

      const rows = await db
        .select()
        .from(adminRestrictions)
        .orderBy(desc(adminRestrictions.updatedAt))
        .limit(100);

      return rows.map((row) => ({
        id: row.id,
        userId: row.userId,
        feature: row.feature,
        isRestricted: row.isRestricted,
        reason: row.reason,
        expiresAt: serializeDate(row.expiresAt),
        createdBy: row.createdBy,
        createdAt: serializeDate(row.createdAt),
        updatedAt: serializeDate(row.updatedAt)
      }));
    },
    adminModerationQueue: async (_source, args, context) => {
      const db = await requireDb(context);
      return listModerationQueue(db, {
        contentType: args.contentType,
        limit: args.limit,
        search: args.search
      });
    },
    adminModerationActions: async (_source, args, context) => {
      const db = await requireDb(context);
      return listModerationActions(db, {
        limit: args.limit
      });
    },
    suspiciousSignals: async (_source, _args, context) => {
      const db = await requireDb(context);
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const [apiErrorRow] = await db
        .select({
          count: sql`cast(count(*) as integer)`,
          lastSeenAt: sql`max(${analyticsEvents.createdAt})`
        })
        .from(analyticsEvents)
        .where(and(eq(analyticsEvents.eventType, 'api_error'), gte(analyticsEvents.createdAt, oneDayAgo)));
      const burstRows = await db
        .select({
          visitorId: analyticsEvents.visitorId,
          count: sql`cast(count(*) as integer)`,
          lastSeenAt: sql`max(${analyticsEvents.createdAt})`
        })
        .from(analyticsEvents)
        .where(gte(analyticsEvents.createdAt, oneHourAgo))
        .groupBy(analyticsEvents.visitorId)
        .having(sql`count(*) > 100`)
        .limit(5);

      const signals = [];
      if (Number(apiErrorRow?.count || 0) > 0) {
        signals.push({
          label: 'API errors in last 24h',
          severity: Number(apiErrorRow.count) > 20 ? 'high' : 'medium',
          detail: 'Client or server flows are reporting failed API activity.',
          count: Number(apiErrorRow.count || 0),
          lastSeenAt: serializeDate(apiErrorRow.lastSeenAt)
        });
      }

      for (const row of burstRows) {
        signals.push({
          label: 'High event burst',
          severity: Number(row.count) > 250 ? 'high' : 'medium',
          detail: `Visitor ${String(row.visitorId || 'unknown').slice(0, 12)} generated unusual activity in one hour.`,
          count: Number(row.count || 0),
          lastSeenAt: serializeDate(row.lastSeenAt)
        });
      }

      return signals;
    }
  }
};

export default resolvers;
