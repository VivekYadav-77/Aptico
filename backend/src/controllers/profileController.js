import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { z } from 'zod';
import { analyses, applicationLogs, connections, follows, generatedContent, profileSettings, rejectionLogs, savedJobs, squads, squadMembers, userExperiences, userProfiles, users } from '../db/schema.js';
import { env } from '../config/env.js';
import { generatePortfolioReadme } from '../services/geminiService.js';
import { ensureUserProfile } from '../services/profileService.js';

const profileSettingsSchema = z.object({
  firstName: z.string().trim().max(100),
  lastName: z.string().trim().max(100),
  headline: z.string().trim().max(200),
  email: z.string().trim().email(),
  phone: z.string().trim().max(50),
  location: z.string().trim().max(120),
  website: z.string().trim().max(300),
  linkedin: z.string().trim().max(300),
  github: z.string().trim().max(300),
  portfolio: z.string().trim().max(300),
  bio: z.string().trim().max(2000),
  currentStatus: z.string().trim().max(50),
  currentTitle: z.string().trim().max(120),
  currentCompany: z.string().trim().max(120),
  yearsExperience: z.string().trim().max(50),
  industry: z.string().trim().max(120),
  targetRole: z.string().trim().max(200),
  employmentType: z.string().trim().max(50),
  availability: z.string().trim().max(200),
  openToWork: z.boolean(),
  preferredWorkModes: z.array(z.string().trim().max(50)).max(10),
  topSkills: z.array(z.string().trim().max(80)).max(30),
  tools: z.array(z.string().trim().max(80)).max(30),
  languages: z.array(z.string().trim().max(80)).max(20),
  achievements: z.array(z.string().trim().max(300)).max(20),
  school: z.string().trim().max(200),
  degree: z.string().trim().max(200),
  fieldOfStudy: z.string().trim().max(200),
  graduationYear: z.string().trim().max(20),
  certifications: z.string().trim().max(2000),
  learningFocus: z.string().trim().max(2000),
  publicProfile: z.boolean(),
  allowRecruiterMessages: z.boolean(),
  showEmail: z.boolean(),
  showPhone: z.boolean(),
  profileStrengthNotes: z.string().trim().max(1000),
  notificationAnalysisUpdates: z.boolean(),
  notificationOpportunityNudges: z.boolean(),
  notificationSecurityAlerts: z.boolean(),
  banner_url: z.string().optional(),
  banner_preference: z.string().optional(),

  // Section visibility map (everyone / connections / only_me)
  sectionVisibility: z.record(z.string(), z.enum(['everyone', 'connections', 'only_me'])).optional().default({}),

  // Multi-entry sections
  featured: z.array(z.object({
    title: z.string().max(200).default(''),
    description: z.string().max(1000).default(''),
    link: z.string().max(500).default(''),
    type: z.string().max(50).default('project')
  })).max(20).optional().default([]),

  experiences: z.array(z.object({
    id: z.string().uuid().optional(),
    title: z.string().max(200).default(''),
    company: z.string().max(200).default(''),
    startDate: z.string().max(50).default(''),
    endDate: z.string().max(50).default(''),
    description: z.string().max(3000).default(''),
    isCurrent: z.boolean().default(false)
  })).max(30).optional().default([]),

  educationEntries: z.array(z.object({
    school: z.string().max(200).default(''),
    degree: z.string().max(200).default(''),
    field: z.string().max(200).default(''),
    startYear: z.string().max(10).default(''),
    endYear: z.string().max(10).default(''),
    activities: z.string().max(1000).default('')
  })).max(20).optional().default([]),

  licenses: z.array(z.object({
    name: z.string().max(200).default(''),
    issuingOrg: z.string().max(200).default(''),
    issueDate: z.string().max(50).default(''),
    expiryDate: z.string().max(50).default(''),
    credentialId: z.string().max(200).default(''),
    credentialUrl: z.string().max(500).default('')
  })).max(30).optional().default([]),

  honorsAwards: z.array(z.object({
    title: z.string().max(200).default(''),
    issuer: z.string().max(200).default(''),
    date: z.string().max(50).default(''),
    description: z.string().max(1000).default('')
  })).max(30).optional().default([])
});

function requireDatabase(db) {
  if (!db) {
    const error = new Error('Database is not configured yet.');
    error.statusCode = 503;
    throw error;
  }
}

function isMissingRelationError(error, relationName) {
  return error?.code === '42P01' && String(error?.message || '').includes(`relation "${relationName}" does not exist`);
}

const isoDateField = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Dates must use YYYY-MM-DD format.')
  .optional()
  .or(z.literal(''))
  .transform((value) => (value ? value : null));

const userExperienceSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().max(200),
  company: z.string().trim().max(200),
  startDate: isoDateField,
  endDate: isoDateField,
  isCurrent: z.boolean().default(false),
  description: z.string().trim().max(3000).default('')
});

function formatExperienceRow(row) {
  return {
    id: row.id,
    title: row.role,
    company: row.company,
    startDate: row.startDate || '',
    endDate: row.endDate || '',
    description: row.description || '',
    isCurrent: Boolean(row.isCurrent)
  };
}

function sanitizeProfileSettings(settings) {
  if (!settings || typeof settings !== 'object') {
    return {};
  }

  const { experiences: _ignoredExperiences, ...rest } = settings;
  return rest;
}

function buildAbsoluteAppUrl(pathname) {
  const baseUrl = env.frontendUrl || 'http://localhost:3000';
  return new URL(pathname, `${baseUrl}/`).toString();
}

function normalizeFeaturedProjects(featured) {
  return Array.isArray(featured)
    ? featured
        .map((item) => ({
          title: String(item?.title || '').trim(),
          description: String(item?.description || '').trim(),
          link: String(item?.link || '').trim(),
          type: String(item?.type || '').trim()
        }))
        .filter((item) => item.title || item.description || item.link)
    : [];
}

async function getStoredExperiences(db, userId) {
  try {
    const rows = await db
      .select({
        id: userExperiences.id,
        company: userExperiences.company,
        role: userExperiences.role,
        startDate: userExperiences.startDate,
        endDate: userExperiences.endDate,
        isCurrent: userExperiences.isCurrent,
        description: userExperiences.description,
        createdAt: userExperiences.createdAt
      })
      .from(userExperiences)
      .where(eq(userExperiences.userId, userId))
      .orderBy(desc(userExperiences.startDate), desc(userExperiences.createdAt));

    return rows.map(formatExperienceRow);
  } catch (error) {
    if (isMissingRelationError(error, 'user_experiences')) {
      return [];
    }

    throw error;
  }
}

async function getStoredProfilePayload(db, userId) {
  const [settings, experiences] = await Promise.all([
    getStoredProfileSettings(db, userId),
    getStoredExperiences(db, userId)
  ]);

  const mergedSettings = {
    ...(settings || {})
  };

  if (experiences.length) {
    mergedSettings.experiences = experiences;
  } else if (Array.isArray(settings?.experiences)) {
    mergedSettings.experiences = settings.experiences;
  } else {
    mergedSettings.experiences = [];
  }

  return mergedSettings;
}

async function getPortfolioReadmePayload(db, userId) {
  const [userRows, publicProfileRows, settings, experiences] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        resilienceXp: users.resilienceXp
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1),
    db
      .select({
        username: userProfiles.username,
        headline: userProfiles.headline,
        location: userProfiles.location,
        skills: userProfiles.skills,
        isPublic: userProfiles.isPublic
      })
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId))
      .limit(1),
    getStoredProfileSettings(db, userId),
    getStoredExperiences(db, userId)
  ]);

  const user = userRows[0];

  if (!user) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }

  const publicProfile = publicProfileRows[0] || null;
  const username = publicProfile?.username || '';
  const badgeUrl = username ? buildAbsoluteAppUrl(`/api/badge/${username}.svg`) : '';
  const shadowResumeUrl = username ? buildAbsoluteAppUrl(`/hire/${username}`) : '';
  const settingsJson = settings || {};

  return {
    profile: {
      name: user.name || username || 'Aptico builder',
      email: user.email,
      username,
      headline: publicProfile?.headline || settingsJson.headline || '',
      location: publicProfile?.location || settingsJson.location || '',
      resilienceXp: user.resilienceXp || 0,
      isPublic: Boolean(publicProfile?.isPublic),
      bio: settingsJson.bio || '',
      currentTitle: settingsJson.currentTitle || '',
      currentCompany: settingsJson.currentCompany || '',
      targetRole: settingsJson.targetRole || '',
      industry: settingsJson.industry || '',
      topSkills: Array.isArray(settingsJson.topSkills) ? settingsJson.topSkills : [],
      tools: Array.isArray(settingsJson.tools) ? settingsJson.tools : [],
      languages: Array.isArray(settingsJson.languages) ? settingsJson.languages : [],
      achievements: Array.isArray(settingsJson.achievements) ? settingsJson.achievements : [],
      profileSkills: Array.isArray(publicProfile?.skills) ? publicProfile.skills : []
    },
    experiences,
    projects: normalizeFeaturedProjects(settingsJson.featured),
    links: {
      badgeUrl,
      shadowResumeUrl
    }
  };
}

async function getStoredProfileSettings(db, userId) {
  const rows = await db
    .select({
      settingsJson: profileSettings.settingsJson
    })
    .from(profileSettings)
    .where(eq(profileSettings.userId, userId))
    .limit(1);

  return rows[0]?.settingsJson || null;
}

export async function getProfileSettingsController(request, reply) {
  try {
    requireDatabase(request.server.db);

    const settings = await getStoredProfilePayload(request.server.db, request.auth.userId);

    return reply.send({
      success: true,
      data: settings
    });
  } catch (error) {
    return reply.code(error.statusCode || 500).send({
      success: false,
      error: error.message || 'Could not load profile settings.'
    });
  }
}

export async function upsertProfileSettingsController(request, reply) {
  try {
    requireDatabase(request.server.db);
    const body = profileSettingsSchema.parse(request.body || {});
    const sanitizedBody = sanitizeProfileSettings(body);

    const existing = await request.server.db
      .select({ id: profileSettings.id })
      .from(profileSettings)
      .where(eq(profileSettings.userId, request.auth.userId))
      .limit(1);

    if (existing[0]) {
      await request.server.db
        .update(profileSettings)
        .set({
          settingsJson: sanitizedBody,
          updatedAt: new Date()
        })
        .where(eq(profileSettings.id, existing[0].id));
    } else {
      await request.server.db.insert(profileSettings).values({
        userId: request.auth.userId,
        settingsJson: sanitizedBody
      });
    }

    const firstName = body.firstName?.trim() || '';
    const lastName = body.lastName?.trim() || '';
    const fullName = [firstName, lastName].filter(Boolean).join(' ');

    if (fullName) {
      await request.server.db
        .update(users)
        .set({ name: fullName })
        .where(eq(users.id, request.auth.userId));
    }

    const userRows = await request.server.db
      .select({
        id: users.id,
        email: users.email,
        name: users.name
      })
      .from(users)
      .where(eq(users.id, request.auth.userId))
      .limit(1);

    const currentUser = userRows[0];

    if (currentUser) {
      await ensureUserProfile(request.server.db, currentUser);

      const updatedProfiles = await request.server.db
        .update(userProfiles)
        .set({
          headline: body.headline || null,
          location: body.location || null,
          skills: Array.isArray(body.topSkills) && body.topSkills.length ? body.topSkills : null,
          isPublic: body.publicProfile,
          updatedAt: new Date()
        })
        .where(eq(userProfiles.userId, request.auth.userId))
        .returning({ username: userProfiles.username });

      const username = updatedProfiles[0]?.username;
      if (username) {
        await request.server.services?.redis?.del(`profile:username:${username}`);
      }
    }

    return reply.send({
      success: true,
      data: {
        ...sanitizedBody,
        experiences: await getStoredExperiences(request.server.db, request.auth.userId)
      }
    });
  } catch (error) {
    const statusCode = error.name === 'ZodError' ? 400 : error.statusCode || 500;

    return reply.code(statusCode).send({
      success: false,
      error: error.message || 'Could not save profile settings.'
    });
  }
}

export async function upsertExperienceController(request, reply) {
  try {
    requireDatabase(request.server.db);
    const experience = userExperienceSchema.parse(request.body || {});
    const nextValues = {
      userId: request.auth.userId,
      company: experience.company,
      role: experience.title,
      startDate: experience.startDate,
      endDate: experience.isCurrent ? null : experience.endDate,
      isCurrent: experience.isCurrent,
      description: experience.description
    };

    if (experience.id) {
      const existingRow = await request.server.db
        .select({ id: userExperiences.id, userId: userExperiences.userId })
        .from(userExperiences)
        .where(eq(userExperiences.id, experience.id))
        .limit(1);

      if (!existingRow[0] || existingRow[0].userId !== request.auth.userId) {
        return reply.code(404).send({
          success: false,
          error: 'Experience not found.'
        });
      }

      await request.server.db
        .update(userExperiences)
        .set(nextValues)
        .where(eq(userExperiences.id, experience.id));
    } else {
      await request.server.db.insert(userExperiences).values(nextValues);
    }

    return reply.send({
      success: true,
      data: await getStoredExperiences(request.server.db, request.auth.userId)
    });
  } catch (error) {
    if (isMissingRelationError(error, 'user_experiences')) {
      return reply.code(503).send({
        success: false,
        error: 'Experience storage is not available until the database schema is updated.'
      });
    }

    const statusCode = error.name === 'ZodError' ? 400 : error.statusCode || 500;

    return reply.code(statusCode).send({
      success: false,
      error: error.message || 'Could not save experience.'
    });
  }
}

export async function deleteExperienceController(request, reply) {
  try {
    requireDatabase(request.server.db);

    const params = z.object({
      id: z.string().uuid()
    }).parse(request.params || {});

    const existingRow = await request.server.db
      .select({ id: userExperiences.id, userId: userExperiences.userId })
      .from(userExperiences)
      .where(eq(userExperiences.id, params.id))
      .limit(1);

    if (!existingRow[0] || existingRow[0].userId !== request.auth.userId) {
      return reply.code(404).send({
        success: false,
        error: 'Experience not found.'
      });
    }

    await request.server.db.delete(userExperiences).where(eq(userExperiences.id, params.id));

    return reply.send({
      success: true,
      data: await getStoredExperiences(request.server.db, request.auth.userId)
    });
  } catch (error) {
    if (isMissingRelationError(error, 'user_experiences')) {
      return reply.code(503).send({
        success: false,
        error: 'Experience storage is not available until the database schema is updated.'
      });
    }

    const statusCode = error.name === 'ZodError' ? 400 : error.statusCode || 500;

    return reply.code(statusCode).send({
      success: false,
      error: error.message || 'Could not delete experience.'
    });
  }
}

export async function getDashboardSummaryController(request, reply) {
  try {
    requireDatabase(request.server.db);
    const userId = request.auth.userId;

    const [analysisRows, savedJobRows, generatedRows, storedProfile] = await Promise.all([
      request.server.db
        .select({
          id: analyses.id,
          companyName: analyses.companyName,
          confidenceScore: analyses.confidenceScore,
          createdAt: analyses.createdAt,
          gapAnalysisJson: analyses.gapAnalysisJson
        })
        .from(analyses)
        .where(eq(analyses.userId, userId))
        .orderBy(desc(analyses.createdAt))
        .limit(4),
      request.server.db
        .select({
          id: savedJobs.id,
          title: savedJobs.jobTitle,
          company: savedJobs.company,
          source: savedJobs.jobSource,
          url: savedJobs.url,
          stipend: savedJobs.stipend,
          matchPercent: savedJobs.matchPercent,
          savedAt: savedJobs.savedAt
        })
        .from(savedJobs)
        .where(eq(savedJobs.userId, userId))
        .orderBy(desc(savedJobs.savedAt)),
      request.server.db
        .select({
          id: generatedContent.id,
          contentType: generatedContent.contentType,
          createdAt: generatedContent.createdAt
        })
        .from(generatedContent)
        .innerJoin(analyses, eq(generatedContent.analysisId, analyses.id))
        .where(eq(analyses.userId, userId))
        .orderBy(desc(generatedContent.createdAt))
        .limit(4),
      getStoredProfileSettings(request.server.db, userId)
    ]);

    const recentAnalyses = analysisRows.map((row) => ({
      id: row.id,
      role: row.gapAnalysisJson?.jobTitle || row.companyName || 'Latest analysis',
      company: row.companyName || 'Aptico workspace',
      score: row.confidenceScore,
      createdAt: row.createdAt
    }));

    const savedJobsList = savedJobRows.map((row) => ({
      id: row.id,
      title: row.title,
      company: row.company,
      location: `Saved from ${row.source}`,
      source: row.source,
      url: row.url,
      stipend: row.stipend,
      matchPercent: row.matchPercent,
      savedAt: row.savedAt
    }));

    const activity = [
      ...analysisRows.map((row) => ({
        id: `analysis-${row.id}`,
        type: 'analysis',
        title: 'Analysis generated',
        subtitle: row.companyName || 'Resume-job alignment run',
        createdAt: row.createdAt
      })),
      ...savedJobRows.map((row) => ({
        id: `saved-job-${row.id}`,
        type: 'saved_job',
        title: 'Job saved',
        subtitle: `${row.title} at ${row.company}`,
        createdAt: row.savedAt
      })),
      ...generatedRows.map((row) => ({
        id: `generated-${row.id}`,
        type: 'generated',
        title: 'Application asset generated',
        subtitle: row.contentType.replace(/_/g, ' '),
        createdAt: row.createdAt
      }))
    ]
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
      .slice(0, 6);

    const recommendations = [
      storedProfile?.topSkills?.[0]
        ? `Feature '${storedProfile.topSkills[0]}' more prominently across your resume and profile headline.`
        : null,
      analysisRows[0]?.gapAnalysisJson?.keywordMismatches?.[0]?.keyword
        ? `Close the '${analysisRows[0].gapAnalysisJson.keywordMismatches[0].keyword}' gap before your next application sprint.`
        : null,
      savedJobRows.length
        ? 'Review your saved roles and generate tailored outreach for the strongest-fit posting.'
        : 'Save a few promising roles to turn the dashboard into a real follow-up queue.'
    ].filter(Boolean);

    return reply.send({
      success: true,
      data: {
        recentAnalyses,
        savedJobs: savedJobsList,
        activity,
        recommendations
      }
    });
  } catch (error) {
    return reply.code(error.statusCode || 500).send({
      success: false,
      error: error.message || 'Could not load dashboard summary.'
    });
  }
}

export async function generatePortfolioReadmeController(request, reply) {
  try {
    requireDatabase(request.server.db);
    const payload = await getPortfolioReadmePayload(request.server.db, request.auth.userId);

    if (!payload.profile.username) {
      return reply.code(400).send({
        success: false,
        error: 'Create your public username before generating a GitHub README.'
      });
    }

    const generated = await generatePortfolioReadme({
      profilePayload: payload,
      logger: request.log
    });

    const badgeMarkdown = `[![Aptico Profile](${payload.links.badgeUrl})](${payload.links.shadowResumeUrl})`;
    const markdown = `${badgeMarkdown}\n\n${String(generated.readmeMarkdown || '').trim()}`;

    return reply.send({
      success: true,
      data: {
        markdown,
        badgeMarkdown,
        badgeUrl: payload.links.badgeUrl,
        shadowResumeUrl: payload.links.shadowResumeUrl,
        username: payload.profile.username,
        isPublic: payload.profile.isPublic,
        resilienceXp: payload.profile.resilienceXp,
        suggestedTitle: generated.suggestedTitle,
        headline: generated.headline
      }
    });
  } catch (error) {
    return reply.code(error.statusCode || 500).send({
      success: false,
      error: error.message || 'Could not generate portfolio README.'
    });
  }
}

// ═══════════════════════════════════════════════════════
//  STICKER SYSTEM CONTROLLERS
// ═══════════════════════════════════════════════════════

// ── Sticker registry (server-side mirror of requirement types) ──
const VALID_STICKER_IDS = new Set([
  'xp_50','xp_100','xp_250','xp_500','xp_1000','xp_2500','xp_5000','xp_7500','xp_10000','xp_20000','xp_50000','streak_3','streak_7','streak_14','streak_30','streak_60','streak_100','streak_365','apps_25','apps_100','apps_250','apps_500','apps_1000','rejections_10','rejections_50','rejections_100','rejections_250','rejections_500','social_followers_1','social_followers_10','social_followers_50','social_followers_100','social_followers_500','social_followers_1000','social_connections_10','social_connections_50','social_connections_100','social_connections_250','social_connections_500','secret_night_owl','secret_early_bird','secret_weekend_warrior','secret_speed_demon','event_pioneer','event_squad_champion','event_beta_tester'
]);

const STICKER_REQUIREMENTS = {
  'xp_50': { type: 'xp', value: 50 },
  'xp_100': { type: 'xp', value: 100 },
  'xp_250': { type: 'xp', value: 250 },
  'xp_500': { type: 'xp', value: 500 },
  'xp_1000': { type: 'xp', value: 1000 },
  'xp_2500': { type: 'xp', value: 2500 },
  'xp_5000': { type: 'xp', value: 5000 },
  'xp_7500': { type: 'xp', value: 7500 },
  'xp_10000': { type: 'xp', value: 10000 },
  'xp_20000': { type: 'xp', value: 20000 },
  'xp_50000': { type: 'xp', value: 50000 },
  'streak_3': { type: 'streak', value: 3 },
  'streak_7': { type: 'streak', value: 7 },
  'streak_14': { type: 'streak', value: 14 },
  'streak_30': { type: 'streak', value: 30 },
  'streak_60': { type: 'streak', value: 60 },
  'streak_100': { type: 'streak', value: 100 },
  'streak_365': { type: 'streak', value: 365 },
  'apps_25': { type: 'total_applications', value: 25 },
  'apps_100': { type: 'total_applications', value: 100 },
  'apps_250': { type: 'total_applications', value: 250 },
  'apps_500': { type: 'total_applications', value: 500 },
  'apps_1000': { type: 'total_applications', value: 1000 },
  'rejections_10': { type: 'total_rejections', value: 10 },
  'rejections_50': { type: 'total_rejections', value: 50 },
  'rejections_100': { type: 'total_rejections', value: 100 },
  'rejections_250': { type: 'total_rejections', value: 250 },
  'rejections_500': { type: 'total_rejections', value: 500 },
  'social_followers_1': { type: 'followers', value: 1 },
  'social_followers_10': { type: 'followers', value: 10 },
  'social_followers_50': { type: 'followers', value: 50 },
  'social_followers_100': { type: 'followers', value: 100 },
  'social_followers_500': { type: 'followers', value: 500 },
  'social_followers_1000': { type: 'followers', value: 1000 },
  'social_connections_10': { type: 'connections', value: 10 },
  'social_connections_50': { type: 'connections', value: 50 },
  'social_connections_100': { type: 'connections', value: 100 },
  'social_connections_250': { type: 'connections', value: 250 },
  'social_connections_500': { type: 'connections', value: 500 },
  'secret_night_owl': { type: 'night_owl', value: 1 },
  'secret_early_bird': { type: 'early_bird', value: 1 },
  'secret_weekend_warrior': { type: 'weekend_warrior', value: 1 },
  'secret_speed_demon': { type: 'speed_demon', value: 1 },
  'event_pioneer': { type: 'join_before', value: '2027-01-01' },
  'event_squad_champion': { type: 'squad_goal', value: 1 },
  'event_beta_tester': { type: 'beta_tester', value: 1 },
};

const MAX_EQUIPPED = 4;

async function getUserStats(db, userId) {
  const stats = {};

  // XP
  const [userRow] = await db.select({ resilienceXp: users.resilienceXp, createdAt: users.createdAt }).from(users).where(eq(users.id, userId)).limit(1);
  stats.xp = Number(userRow?.resilienceXp || 0);
  stats.joinDate = userRow?.createdAt ? new Date(userRow.createdAt) : new Date();

  // Total applications
  try {
    const [appCount] = await db.select({ count: sql`count(*)::int` }).from(applicationLogs).where(and(eq(applicationLogs.userId, userId), eq(applicationLogs.isShadowbanned, false)));
    stats.totalApplications = Number(appCount?.count || 0);
  } catch { stats.totalApplications = 0; }

  // Total rejections
  try {
    const [rejCount] = await db.select({ count: sql`count(*)::int` }).from(rejectionLogs).where(and(eq(rejectionLogs.userId, userId), eq(rejectionLogs.isShadowbanned, false)));
    stats.totalRejections = Number(rejCount?.count || 0);
  } catch { stats.totalRejections = 0; }

  // Followers
  try {
    const [fCount] = await db.select({ count: sql`count(*)::int` }).from(follows).where(eq(follows.followingId, userId));
    stats.followers = Number(fCount?.count || 0);
  } catch { stats.followers = 0; }

  // Connections
  try {
    const [cCount] = await db.select({ count: sql`count(*)::int` }).from(connections).where(and(eq(connections.status, 'accepted'), sql`(${connections.requesterId} = ${userId} OR ${connections.recipientId} = ${userId})`));
    stats.connections = Number(cCount?.count || 0);
  } catch { stats.connections = 0; }

  // Streak (consecutive days with at least 1 non-shadowbanned app)
  try {
    const rows = await db.select({ day: sql`date_trunc('day', ${applicationLogs.createdAt} AT TIME ZONE 'UTC')::date as day` }).from(applicationLogs).where(and(eq(applicationLogs.userId, userId), eq(applicationLogs.isShadowbanned, false))).groupBy(sql`day`).orderBy(sql`day DESC`);
    let streak = 0;
    const today = new Date(); today.setUTCHours(0,0,0,0);
    let expected = new Date(today);
    for (const row of rows) {
      const d = new Date(row.day); d.setUTCHours(0,0,0,0);
      if (d.getTime() === expected.getTime()) {
        streak++;
        expected.setUTCDate(expected.getUTCDate() - 1);
      } else if (d.getTime() === expected.getTime() + 86400000) {
        // same as expected + 1 day (today might not have an entry yet)
        continue;
      } else {
        break;
      }
    }
    stats.streak = streak;
  } catch { stats.streak = 0; }

  // Squad goal reached
  try {
    const [smRow] = await db.select({ squadId: squadMembers.squadId }).from(squadMembers).where(eq(squadMembers.userId, userId)).limit(1);
    if (smRow?.squadId) {
      const [squadRow] = await db.select({ goalRewardedAt: squads.goalRewardedAt }).from(squads).where(eq(squads.id, smRow.squadId)).limit(1);
      stats.squadGoalReached = squadRow?.goalRewardedAt ? 1 : 0;
    } else {
      stats.squadGoalReached = 0;
    }
  } catch { stats.squadGoalReached = 0; }

  // Night owl / Early bird (check if any app was logged between midnight–4am or 4am–6am)
  try {
    const [nightRow] = await db.select({ count: sql`count(*)::int` }).from(applicationLogs).where(and(eq(applicationLogs.userId, userId), sql`extract(hour from ${applicationLogs.createdAt} AT TIME ZONE 'UTC') >= 0 AND extract(hour from ${applicationLogs.createdAt} AT TIME ZONE 'UTC') < 4`));
    stats.nightOwl = Number(nightRow?.count || 0) > 0 ? 1 : 0;
  } catch { stats.nightOwl = 0; }

  try {
    const [earlyRow] = await db.select({ count: sql`count(*)::int` }).from(applicationLogs).where(and(eq(applicationLogs.userId, userId), sql`extract(hour from ${applicationLogs.createdAt} AT TIME ZONE 'UTC') >= 4 AND extract(hour from ${applicationLogs.createdAt} AT TIME ZONE 'UTC') < 6`));
    stats.earlyBird = Number(earlyRow?.count || 0) > 0 ? 1 : 0;
  } catch { stats.earlyBird = 0; }

  return stats;
}

function meetsRequirement(req, stats) {
  switch (req.type) {
    case 'xp':                 return stats.xp >= req.value;
    case 'streak':             return stats.streak >= req.value;
    case 'total_applications': return stats.totalApplications >= req.value;
    case 'total_rejections':   return stats.totalRejections >= req.value;
    case 'followers':          return stats.followers >= req.value;
    case 'connections':        return stats.connections >= req.value;
    case 'night_owl':          return stats.nightOwl >= req.value;
    case 'early_bird':         return stats.earlyBird >= req.value;
    case 'join_before':        return stats.joinDate < new Date(req.value);
    case 'squad_goal':         return stats.squadGoalReached >= req.value;
    case 'weekend_warrior':    return (stats.weekendWarrior || 0) >= req.value;
    case 'speed_demon':        return (stats.speedDemon || 0) >= req.value;
    case 'beta_tester':        return (stats.betaTester || 0) >= req.value;
    default:                   return false;
  }
}

export async function unlockStickerController(request, reply) {
  try {
    requireDatabase(request.server.db);
    const { stickerId } = z.object({ stickerId: z.string().min(1) }).parse(request.body || {});

    if (!VALID_STICKER_IDS.has(stickerId)) {
      return reply.code(400).send({ success: false, error: 'Unknown sticker.' });
    }

    // Fetch current settings
    const existing = await getStoredProfileSettings(request.server.db, request.auth.userId);
    const settings = existing || {};
    const unlocked = Array.isArray(settings.unlockedStickers) ? [...settings.unlockedStickers] : [];

    if (unlocked.includes(stickerId)) {
      return reply.send({ success: true, data: { alreadyUnlocked: true, unlockedStickers: unlocked } });
    }

    // Validate requirement
    const req = STICKER_REQUIREMENTS[stickerId];
    const stats = await getUserStats(request.server.db, request.auth.userId);

    if (!meetsRequirement(req, stats)) {
      return reply.code(403).send({ success: false, error: 'You have not met the requirements for this sticker yet.' });
    }

    unlocked.push(stickerId);
    const updatedSettings = { ...settings, unlockedStickers: unlocked };

    const existingRow = await request.server.db.select({ id: profileSettings.id }).from(profileSettings).where(eq(profileSettings.userId, request.auth.userId)).limit(1);

    if (existingRow[0]) {
      await request.server.db.update(profileSettings).set({ settingsJson: updatedSettings, updatedAt: new Date() }).where(eq(profileSettings.id, existingRow[0].id));
    } else {
      await request.server.db.insert(profileSettings).values({ userId: request.auth.userId, settingsJson: updatedSettings });
    }

    return reply.send({ success: true, data: { unlockedStickers: unlocked, newSticker: stickerId } });
  } catch (error) {
    return reply.code(error.statusCode || 500).send({ success: false, error: error.message || 'Could not unlock sticker.' });
  }
}

export async function equipStickersController(request, reply) {
  try {
    requireDatabase(request.server.db);
    const { equippedStickers } = z.object({
      equippedStickers: z.array(z.string()).max(MAX_EQUIPPED)
    }).parse(request.body || {});

    const existing = await getStoredProfileSettings(request.server.db, request.auth.userId);
    const settings = existing || {};
    const unlocked = Array.isArray(settings.unlockedStickers) ? settings.unlockedStickers : [];

    // Validate all equipped stickers are actually unlocked
    for (const sid of equippedStickers) {
      if (!unlocked.includes(sid)) {
        return reply.code(400).send({ success: false, error: `Sticker "${sid}" is not unlocked yet.` });
      }
    }

    const uniqueEquipped = [...new Set(equippedStickers)];
    const updatedSettings = { ...settings, equippedStickers: uniqueEquipped };

    const existingRow = await request.server.db.select({ id: profileSettings.id }).from(profileSettings).where(eq(profileSettings.userId, request.auth.userId)).limit(1);

    if (existingRow[0]) {
      await request.server.db.update(profileSettings).set({ settingsJson: updatedSettings, updatedAt: new Date() }).where(eq(profileSettings.id, existingRow[0].id));
    } else {
      await request.server.db.insert(profileSettings).values({ userId: request.auth.userId, settingsJson: updatedSettings });
    }

    // Invalidate cache
    const profileRows = await request.server.db.select({ username: userProfiles.username }).from(userProfiles).where(eq(userProfiles.userId, request.auth.userId)).limit(1);
    const username = profileRows[0]?.username;
    if (username) {
      await request.server.services?.redis?.del(`profile:username:${username}`);
    }

    return reply.send({ success: true, data: { equippedStickers } });
  } catch (error) {
    return reply.code(error.statusCode || 500).send({ success: false, error: error.message || 'Could not equip stickers.' });
  }
}

export async function getStickerStatsController(request, reply) {
  try {
    requireDatabase(request.server.db);
    const stats = await getUserStats(request.server.db, request.auth.userId);
    const existing = await getStoredProfileSettings(request.server.db, request.auth.userId);
    const settings = existing || {};

    return reply.send({
      success: true,
      data: {
        stats,
        unlockedStickers: Array.isArray(settings.unlockedStickers) ? settings.unlockedStickers : [],
        equippedStickers: Array.isArray(settings.equippedStickers) ? settings.equippedStickers : []
      }
    });
  } catch (error) {
    return reply.code(error.statusCode || 500).send({ success: false, error: error.message || 'Could not fetch sticker stats.' });
  }
}
