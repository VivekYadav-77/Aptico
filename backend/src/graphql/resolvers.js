import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { analyses, apiUsage, generatedContent, refreshTokens, savedJobs, users } from '../db/schema.js';

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

      const [totalUsers, totalAnalyses, totalGeneratedContent, totalSavedJobs, activeRefreshTokens, revokedRefreshTokens] =
        await Promise.all([
          getCount(db, users),
          getCount(db, analyses),
          getCount(db, generatedContent),
          getCount(db, savedJobs),
          getCount(db, refreshTokens, isNull(refreshTokens.revokedAt)),
          getCount(db, refreshTokens, sql`${refreshTokens.revokedAt} is not null`)
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
        revokedRefreshTokens
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
    adminUsers: async (_source, _args, context) => {
      const db = await requireDb(context);
      const rows = await db.select().from(users).orderBy(desc(users.createdAt));

      return Promise.all(
        rows.map(async (user) => {
          const [activeSessionCount, analysesCount, savedJobsCount] = await Promise.all([
            getCount(db, refreshTokens, and(eq(refreshTokens.userId, user.id), isNull(refreshTokens.revokedAt))),
            getCount(db, analyses, eq(analyses.userId, user.id)),
            getCount(db, savedJobs, eq(savedJobs.userId, user.id))
          ]);

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            avatarUrl: user.avatarUrl,
            role: user.role,
            createdAt: serializeDate(user.createdAt),
            lastLogin: serializeDate(user.lastLogin),
            activeSessionCount,
            analysesCount,
            savedJobsCount
          };
        })
      );
    }
  }
};

export default resolvers;
