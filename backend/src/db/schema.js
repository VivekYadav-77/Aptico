import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  authProvider: text('auth_provider').notNull(),
  passwordHash: text('password_hash'),
  googleSubject: text('google_subject'),
  role: text('role').notNull().default('user'),
  resilienceXp: integer('resilience_xp').notNull().default(0),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
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
    accessTokenJti: text('access_token_jti').notNull(),
    refreshTokenJti: text('refresh_token_jti').notNull(),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent')
  },
  (table) => ({
    userIdIdx: index('refresh_tokens_user_id_idx').on(table.userId),
    tokenHashIdx: uniqueIndex('refresh_tokens_token_hash_idx').on(table.tokenHash),
    accessTokenJtiIdx: uniqueIndex('refresh_tokens_access_token_jti_idx').on(table.accessTokenJti),
    refreshTokenJtiIdx: uniqueIndex('refresh_tokens_refresh_token_jti_idx').on(table.refreshTokenJti)
  })
);

export const authTokens = pgTable(
  'auth_tokens',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenType: text('token_type').notNull(),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    userIdTypeIdx: index('auth_tokens_user_id_token_type_idx').on(table.userId, table.tokenType),
    tokenHashIdx: uniqueIndex('auth_tokens_token_hash_idx').on(table.tokenHash)
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

export const rejectionLogs = pgTable(
  'rejection_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    companyName: text('company_name').notNull(),
    roleTitle: text('role_title').notNull(),
    stageRejected: text('stage_rejected').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    userIdIdx: index('rejection_logs_user_id_idx').on(table.userId),
    stageCheck: check(
      'rejection_logs_stage_rejected_check',
      sql`${table.stageRejected} in ('resume', 'first_round', 'hiring_manager', 'final')`
    )
  })
);

export const profileSettings = pgTable(
  'profile_settings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    settingsJson: jsonb('settings_json').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    userIdIdx: uniqueIndex('profile_settings_user_id_idx').on(table.userId)
  })
);

export const userExperiences = pgTable(
  'user_experiences',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    company: text('company').notNull(),
    role: text('role').notNull(),
    startDate: date('start_date'),
    endDate: date('end_date'),
    isCurrent: boolean('is_current').notNull().default(false),
    description: text('description').notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    userIdIdx: index('user_experiences_user_id_idx').on(table.userId),
    userIdStartDateIdx: index('user_experiences_user_id_start_date_idx').on(table.userId, table.startDate)
  })
);

export const userEducations = pgTable(
  'user_educations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    institution: text('institution').notNull(),
    degree: text('degree').notNull(),
    fieldOfStudy: text('field_of_study').notNull(),
    graduationYear: integer('graduation_year'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    userIdIdx: index('user_educations_user_id_idx').on(table.userId)
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

export const userProfiles = pgTable(
  'user_profiles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    username: varchar('username', { length: 50 }).notNull(),
    headline: varchar('headline', { length: 120 }),
    location: varchar('location', { length: 100 }),
    skills: text('skills').array(),
    isPublic: boolean('is_public').default(true),
    followerCount: integer('follower_count').default(0),
    followingCount: integer('following_count').default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
  },
  (table) => ({
    userIdIdx: uniqueIndex('user_profiles_user_id_idx').on(table.userId),
    usernameIdx: uniqueIndex('user_profiles_username_idx').on(table.username)
  })
);

export const follows = pgTable(
  'follows',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    followerId: uuid('follower_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    followingId: uuid('following_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
  },
  (table) => ({
    followerFollowingIdx: uniqueIndex('follows_follower_id_following_id_idx').on(table.followerId, table.followingId),
    noSelfFollowCheck: check('follows_no_self_follow_check', sql`${table.followerId} <> ${table.followingId}`)
  })
);

export const communityWins = pgTable(
  'community_wins',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    roleTitle: varchar('role_title', { length: 100 }).notNull(),
    companyName: varchar('company_name', { length: 100 }),
    searchDurationWeeks: integer('search_duration_weeks'),
    message: text('message'),
    likesCount: integer('likes_count').default(0),
    isVisible: boolean('is_visible').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
  },
  (table) => ({
    visibleCreatedAtIdx: index('community_wins_is_visible_created_at_idx').on(table.isVisible, table.createdAt),
    userIdIdx: index('community_wins_user_id_idx').on(table.userId)
  })
);

export const publicJobCache = pgTable(
  'public_job_cache',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    jobId: varchar('job_id', { length: 200 }).notNull(),
    title: varchar('title', { length: 200 }).notNull(),
    company: varchar('company', { length: 200 }).notNull(),
    location: varchar('location', { length: 200 }),
    jobType: varchar('job_type', { length: 50 }),
    stipend: varchar('stipend', { length: 100 }),
    salary: varchar('salary', { length: 100 }),
    applyUrl: text('apply_url').notNull(),
    source: varchar('source', { length: 100 }).notNull(),
    ghostScore: integer('ghost_score'),
    postedAt: timestamp('posted_at', { withTimezone: true }),
    cachedAt: timestamp('cached_at', { withTimezone: true }).defaultNow(),
    searchCount: integer('search_count').default(1)
  },
  (table) => ({
    jobIdIdx: uniqueIndex('public_job_cache_job_id_idx').on(table.jobId),
    publicFeedIdx: index('public_job_cache_search_count_cached_at_idx').on(table.searchCount, table.cachedAt)
  })
);

export const posts = pgTable(
  'posts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    postType: varchar('post_type', { length: 30 }).notNull(),
    content: text('content').notNull(),
    analysisId: uuid('analysis_id').references(() => analyses.id, { onDelete: 'set null' }),
    jobData: jsonb('job_data'),
    careerUpdateType: varchar('career_update_type', { length: 30 }),
    likesCount: integer('likes_count').default(0),
    commentsCount: integer('comments_count').default(0),
    isVisible: boolean('is_visible').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
  },
  (table) => ({
    userCreatedAtIdx: index('posts_user_id_created_at_idx').on(table.userId, table.createdAt),
    visibleCreatedAtIdx: index('posts_is_visible_created_at_idx').on(table.isVisible, table.createdAt),
    postTypeCheck: check(
      'posts_post_type_check',
      sql`${table.postType} in ('career_update', 'job_tip', 'job_share', 'analysis_share', 'question')`
    ),
    careerUpdateTypeCheck: check(
      'posts_career_update_type_check',
      sql`${table.careerUpdateType} is null or ${table.careerUpdateType} in ('got_hired', 'got_promoted', 'started_learning', 'completed_course', 'new_project')`
    )
  })
);

export const postComments = pgTable(
  'post_comments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
  },
  (table) => ({
    postCreatedAtIdx: index('post_comments_post_id_created_at_idx').on(table.postId, table.createdAt)
  })
);

export const connections = pgTable(
  'connections',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    requesterId: uuid('requester_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    recipientId: uuid('recipient_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    requesterNote: text('requester_note'),
    requesterRole: varchar('requester_role', { length: 100 }),
    requesterLearning: varchar('requester_learning', { length: 100 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
  },
  (table) => ({
    requesterRecipientIdx: uniqueIndex('connections_requester_id_recipient_id_idx').on(table.requesterId, table.recipientId),
    recipientStatusIdx: index('connections_recipient_id_status_idx').on(table.recipientId, table.status),
    statusCheck: check('connections_status_check', sql`${table.status} in ('pending', 'accepted', 'declined')`),
    noSelfConnectionCheck: check('connections_no_self_connection_check', sql`${table.requesterId} <> ${table.recipientId}`)
  })
);

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 40 }).notNull(),
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
    entityId: uuid('entity_id'),
    entityType: varchar('entity_type', { length: 30 }),
    message: text('message').notNull(),
    isRead: boolean('is_read').default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
  },
  (table) => ({
    userReadCreatedAtIdx: index('notifications_user_id_is_read_created_at_idx').on(table.userId, table.isRead, table.createdAt),
    typeCheck: check(
      'notifications_type_check',
      sql`${table.type} in ('new_follower', 'new_connection_request', 'connection_accepted', 'post_like', 'post_comment', 'job_match_alert', 'squad_ping', 'squad_goal_reached')`
    )
  })
);

export const squads = pgTable('squads', {
  id: uuid('id').defaultRandom().primaryKey(),
  squadName: text('squad_name').notNull(),
  weeklyGoal: integer('weekly_goal').notNull().default(40),
  weekOf: date('week_of').notNull(),
  goalRewardedAt: timestamp('goal_rewarded_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export const squadMembers = pgTable(
  'squad_members',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    squadId: uuid('squad_id')
      .notNull()
      .references(() => squads.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    anonymousAlias: text('anonymous_alias').notNull(),
    appsSentThisWeek: integer('apps_sent_this_week').notNull().default(0),
    interviewsThisWeek: integer('interviews_this_week').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    squadIdIdx: index('squad_members_squad_id_idx').on(table.squadId),
    userIdIdx: uniqueIndex('squad_members_user_id_idx').on(table.userId),
    squadUserIdx: uniqueIndex('squad_members_squad_id_user_id_idx').on(table.squadId, table.userId),
    squadAliasIdx: uniqueIndex('squad_members_squad_id_alias_idx').on(table.squadId, table.anonymousAlias)
  })
);

export const usersRelations = relations(users, ({ many }) => ({
  refreshTokens: many(refreshTokens),
  authTokens: many(authTokens),
  analyses: many(analyses),
  rejectionLogs: many(rejectionLogs),
  savedJobs: many(savedJobs),
  profileSettings: many(profileSettings),
  userExperiences: many(userExperiences),
  userEducations: many(userEducations),
  squadMemberships: many(squadMembers)
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id]
  })
}));

export const authTokensRelations = relations(authTokens, ({ one }) => ({
  user: one(users, {
    fields: [authTokens.userId],
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

export const rejectionLogsRelations = relations(rejectionLogs, ({ one }) => ({
  user: one(users, {
    fields: [rejectionLogs.userId],
    references: [users.id]
  })
}));

export const profileSettingsRelations = relations(profileSettings, ({ one }) => ({
  user: one(users, {
    fields: [profileSettings.userId],
    references: [users.id]
  })
}));

export const userExperiencesRelations = relations(userExperiences, ({ one }) => ({
  user: one(users, {
    fields: [userExperiences.userId],
    references: [users.id]
  })
}));

export const userEducationsRelations = relations(userEducations, ({ one }) => ({
  user: one(users, {
    fields: [userEducations.userId],
    references: [users.id]
  })
}));

export const squadsRelations = relations(squads, ({ many }) => ({
  members: many(squadMembers)
}));

export const squadMembersRelations = relations(squadMembers, ({ one }) => ({
  squad: one(squads, {
    fields: [squadMembers.squadId],
    references: [squads.id]
  }),
  user: one(users, {
    fields: [squadMembers.userId],
    references: [users.id]
  })
}));
