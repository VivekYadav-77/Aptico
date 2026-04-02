import { relations } from 'drizzle-orm';
import {
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  authProvider: text('auth_provider').notNull(),
  role: text('role').notNull().default('user'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  lastLogin: timestamp('last_login', { withTimezone: true })
});

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    jti: text('jti').notNull(),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent')
  },
  (table) => ({
    userIdIdx: index('refresh_tokens_user_id_idx').on(table.userId),
    tokenHashIdx: uniqueIndex('refresh_tokens_token_hash_idx').on(table.tokenHash)
  })
);

export const analyses = pgTable(
  'analyses',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    resumeText: text('resume_text').notNull(),
    jdText: text('jd_text').notNull(),
    companyName: text('company_name'),
    confidenceScore: integer('confidence_score').notNull(),
    gapAnalysisJson: jsonb('gap_analysis_json').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    userIdIdx: index('analyses_user_id_idx').on(table.userId)
  })
);

export const generatedContent = pgTable(
  'generated_content',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    analysisId: uuid('analysis_id')
      .notNull()
      .references(() => analyses.id, { onDelete: 'cascade' }),
    contentType: text('content_type').notNull(),
    contentText: text('content_text').notNull(),
    jobId: text('job_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    analysisIdIdx: index('generated_content_analysis_id_idx').on(table.analysisId)
  })
);

export const savedJobs = pgTable(
  'saved_jobs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    jobSource: text('job_source').notNull(),
    jobTitle: text('job_title').notNull(),
    company: text('company').notNull(),
    url: text('url').notNull(),
    stipend: text('stipend'),
    matchPercent: integer('match_percent'),
    savedAt: timestamp('saved_at', { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    userIdIdx: index('saved_jobs_user_id_idx').on(table.userId)
  })
);

export const apiUsage = pgTable(
  'api_usage',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sourceName: text('source_name').notNull(),
    date: date('date').notNull(),
    requestCount: integer('request_count').notNull().default(0),
    last429At: timestamp('last_429_at', { withTimezone: true })
  },
  (table) => ({
    sourceDateIdx: uniqueIndex('api_usage_source_name_date_idx').on(table.sourceName, table.date)
  })
);

export const usersRelations = relations(users, ({ many }) => ({
  refreshTokens: many(refreshTokens),
  analyses: many(analyses),
  savedJobs: many(savedJobs)
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id]
  })
}));

export const analysesRelations = relations(analyses, ({ many, one }) => ({
  user: one(users, {
    fields: [analyses.userId],
    references: [users.id]
  }),
  generatedContent: many(generatedContent)
}));

export const generatedContentRelations = relations(generatedContent, ({ one }) => ({
  analysis: one(analyses, {
    fields: [generatedContent.analysisId],
    references: [analyses.id]
  })
}));

export const savedJobsRelations = relations(savedJobs, ({ one }) => ({
  user: one(users, {
    fields: [savedJobs.userId],
    references: [users.id]
  })
}));
