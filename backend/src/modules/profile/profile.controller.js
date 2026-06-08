import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { z } from 'zod';
import { analyses, applicationLogs, connections, follows, generatedContent, profileSettings, rejectionLogs, savedJobs, squads, squadMembers, squadMonthlyRewards, squadScoreEvents, userExperiences, userProfiles, users } from '../../db/schema.js';
import { env } from '../../config/env.js';
import { generatePortfolioReadme } from '../analysis/gemini.service.js';
import { ensureUserProfile } from './profile.service.js';

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

  topProjects: z.array(z.object({
    title: z.string().trim().min(1).max(80),
    description: z.string().trim().min(1).max(280),
    resumeDescription: z.string().trim().max(160).optional().default(''),
    techStack: z.array(z.string().trim().max(20)).max(4).optional().default([]),
    githubUrl: z.string().trim().max(240).optional().default(''),
    liveUrl: z.string().trim().max(240).optional().default('')
  })).max(3).optional().default([]),

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

function normalizeTopProjects(topProjects, featured = []) {
  const normalizedTopProjects = Array.isArray(topProjects)
    ? topProjects
        .map((item) => ({
          title: String(item?.title || '').trim().slice(0, 80),
          description: String(item?.description || '').replace(/\s+/g, ' ').trim().slice(0, 280),
          resumeDescription: String(item?.resumeDescription || '').replace(/\s+/g, ' ').trim().slice(0, 160),
          techStack: Array.isArray(item?.techStack)
            ? item.techStack.map((skill) => String(skill || '').trim().slice(0, 20)).filter(Boolean).slice(0, 4)
            : [],
          githubUrl: String(item?.githubUrl || '').trim().slice(0, 240),
          liveUrl: String(item?.liveUrl || '').trim().slice(0, 240)
        }))
        .filter((item) => item.title && item.description)
        .slice(0, 3)
    : [];

  if (normalizedTopProjects.length) {
    return normalizedTopProjects;
  }

  return normalizeFeaturedProjects(featured)
    .filter((item) => !item.type || item.type === 'project')
    .slice(0, 3)
    .map((item) => ({
      title: item.title.slice(0, 80),
      description: item.description.replace(/\s+/g, ' ').slice(0, 280),
      resumeDescription: '',
      techStack: [],
      githubUrl: '',
      liveUrl: item.link.slice(0, 240)
    }));
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
  const [settings, experiences, currentSquad] = await Promise.all([
    getStoredProfileSettings(db, userId),
    getStoredExperiences(db, userId),
    getCurrentSquadSummary(db, userId)
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

  const squadRewardHistory = normalizeSquadRewardHistory(settings?.squadRewardHistory);
  mergedSettings.squadRewardHistory = squadRewardHistory;
  mergedSettings.squadProofSummary = buildSquadProofSummary(squadRewardHistory, currentSquad);

  return mergedSettings;
}

async function getCurrentSquadSummary(db, userId) {
  try {
    const rows = await db
      .select({
        squadId: squads.id,
        squadName: squads.squadName,
        joinedAt: squadMembers.createdAt
      })
      .from(squadMembers)
      .innerJoin(squads, eq(squadMembers.squadId, squads.id))
      .where(eq(squadMembers.userId, userId))
      .limit(1);

    return rows[0]
      ? {
          squadId: rows[0].squadId,
          squadName: rows[0].squadName,
          joinedAt: rows[0].joinedAt
        }
      : null;
  } catch {
    return null;
  }
}

function buildSquadProofSummary(history = [], currentSquad = null) {
  const latest = history[0] || null;
  const bestRank = history.length ? Math.min(...history.map((item) => Number(item.rank || 99))) : null;
  return {
    totalClaimed: history.length,
    bestRank,
    latest,
    currentSquad: currentSquad?.squadName || latest?.squadName || null,
    currentSquadId: currentSquad?.squadId || null
  };
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
    projects: normalizeTopProjects(settingsJson.topProjects, settingsJson.featured),
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

export async function calculateMonthlySquadRewardReadiness(db, userId, rewardRank = null) {
  const rows = await db
    .select({
      rewardId: squadMonthlyRewards.id,
      squadId: squadMonthlyRewards.squadId,
      squadName: squads.squadName,
      period: squadMonthlyRewards.period,
      rank: squadMonthlyRewards.rank,
      stickerId: squadMonthlyRewards.stickerId,
      title: squadMonthlyRewards.title,
      xpBonus: squadMonthlyRewards.xpBonus,
      approvedAt: squadMonthlyRewards.approvedAt,
      eventType: squadScoreEvents.eventType,
      eligiblePoints: squadScoreEvents.eligiblePoints,
      spamStatus: squadScoreEvents.spamStatus,
      createdAt: squadScoreEvents.createdAt
    })
    .from(squadMonthlyRewards)
    .innerJoin(squads, eq(squadMonthlyRewards.squadId, squads.id))
    .innerJoin(
      squadScoreEvents,
      and(
        eq(squadScoreEvents.squadId, squadMonthlyRewards.squadId),
        eq(squadScoreEvents.period, squadMonthlyRewards.period),
        eq(squadScoreEvents.userId, userId)
      )
    )
    .where(rewardRank ? eq(squadMonthlyRewards.rank, rewardRank) : sql`true`);

  const grouped = new Map();
  for (const row of rows) {
    const key = `${row.squadId}:${row.period}:${row.rank}`;
    const current = grouped.get(key) || {
      rewardId: row.rewardId,
      squadId: row.squadId,
      squadName: row.squadName,
      period: row.period,
      rank: Number(row.rank),
      stickerId: row.stickerId,
      title: row.title,
      xpBonus: Number(row.xpBonus || 0),
      approvedAt: row.approvedAt,
      rows: []
    };
    current.rows.push(row);
    grouped.set(key, current);
  }

  return [...grouped.values()].map((group) => ({
    rewardId: group.rewardId,
    squadId: group.squadId,
    squadName: group.squadName,
    period: group.period,
    rank: group.rank,
    stickerId: group.stickerId,
    title: group.title,
    xpBonus: group.xpBonus,
    approvedAt: group.approvedAt,
    ...evaluateMonthlySquadRewardReadiness(group.rows, { hasPublishedReward: true })
  }));
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
      .select({ id: profileSettings.id, settingsJson: profileSettings.settingsJson })
      .from(profileSettings)
      .where(eq(profileSettings.userId, request.auth.userId))
      .limit(1);
    const existingSettings = existing[0]?.settingsJson || {};
    const preservedServerSettings = {
      ...(Array.isArray(existingSettings.unlockedStickers) ? { unlockedStickers: existingSettings.unlockedStickers } : {}),
      ...(Array.isArray(existingSettings.equippedStickers) ? { equippedStickers: existingSettings.equippedStickers } : {}),
      ...(existingSettings.monthlySquadReward ? { monthlySquadReward: existingSettings.monthlySquadReward } : {}),
      ...(Array.isArray(existingSettings.squadRewardHistory) ? { squadRewardHistory: normalizeSquadRewardHistory(existingSettings.squadRewardHistory) } : {})
    };
    const nextSettings = { ...sanitizedBody, ...preservedServerSettings };

    if (existing[0]) {
      await request.server.db
        .update(profileSettings)
        .set({
          settingsJson: nextSettings,
          updatedAt: new Date()
        })
        .where(eq(profileSettings.id, existing[0].id));
    } else {
      await request.server.db.insert(profileSettings).values({
        userId: request.auth.userId,
        settingsJson: nextSettings
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
  // ... any ID starting with xp_, streak_, apps_, rejections_, social_, mastery_, content_, engagement_, secret_, event_
  // For safety, we'll just allow the controller to proceed if the ID matches these patterns
]);
// Overriding the check in the controller for efficiency
const isStickerIdValid = (id) => /^(xp|streak|apps|rejections|social|mastery|content|engagement|secret|event)_/.test(id);

const STICKER_REQUIREMENTS = {
  // Milestone (XP)
  'xp_50': { type: 'xp', value: 50 }, 'xp_100': { type: 'xp', value: 100 }, 'xp_250': { type: 'xp', value: 250 }, 'xp_500': { type: 'xp', value: 500 },
  'xp_1000': { type: 'xp', value: 1000 }, 'xp_2500': { type: 'xp', value: 2500 }, 'xp_5000': { type: 'xp', value: 5000 }, 'xp_7500': { type: 'xp', value: 7500 },
  'xp_10000': { type: 'xp', value: 10000 }, 'xp_15000': { type: 'xp', value: 15000 }, 'xp_20000': { type: 'xp', value: 20000 }, 'xp_30000': { type: 'xp', value: 30000 },
  'xp_40000': { type: 'xp', value: 40000 }, 'xp_50000': { type: 'xp', value: 50000 }, 'xp_60000': { type: 'xp', value: 60000 }, 'xp_75000': { type: 'xp', value: 75000 },
  'xp_90000': { type: 'xp', value: 90000 }, 'xp_100000': { type: 'xp', value: 100000 }, 'xp_150000': { type: 'xp', value: 150000 }, 'xp_200000': { type: 'xp', value: 200000 },
  'xp_250000': { type: 'xp', value: 250000 }, 'xp_350000': { type: 'xp', value: 350000 }, 'xp_500000': { type: 'xp', value: 500000 }, 'xp_750000': { type: 'xp', value: 750000 },
  'xp_1000000': { type: 'xp', value: 1000000 },

  // Resilience (Streaks)
  'streak_3': { type: 'streak', value: 3 }, 'streak_5': { type: 'streak', value: 5 }, 'streak_7': { type: 'streak', value: 7 }, 'streak_10': { type: 'streak', value: 10 },
  'streak_14': { type: 'streak', value: 14 }, 'streak_21': { type: 'streak', value: 21 }, 'streak_30': { type: 'streak', value: 30 }, 'streak_45': { type: 'streak', value: 45 },
  'streak_60': { type: 'streak', value: 60 }, 'streak_75': { type: 'streak', value: 75 }, 'streak_90': { type: 'streak', value: 90 }, 'streak_100': { type: 'streak', value: 100 },
  'streak_120': { type: 'streak', value: 120 }, 'streak_150': { type: 'streak', value: 150 }, 'streak_180': { type: 'streak', value: 180 }, 'streak_250': { type: 'streak', value: 250 },
  'streak_300': { type: 'streak', value: 300 }, 'streak_365': { type: 'streak', value: 365 }, 'streak_500': { type: 'streak', value: 500 }, 'streak_730': { type: 'streak', value: 730 },
  'streak_1000': { type: 'streak', value: 1000 },
  // Resilience (Applications)
  'apps_25': { type: 'total_applications', value: 25 }, 'apps_50': { type: 'total_applications', value: 50 }, 'apps_75': { type: 'total_applications', value: 75 }, 'apps_100': { type: 'total_applications', value: 100 },
  'apps_150': { type: 'total_applications', value: 150 }, 'apps_200': { type: 'total_applications', value: 200 }, 'apps_250': { type: 'total_applications', value: 250 }, 'apps_300': { type: 'total_applications', value: 300 },
  'apps_400': { type: 'total_applications', value: 400 }, 'apps_500': { type: 'total_applications', value: 500 }, 'apps_600': { type: 'total_applications', value: 600 }, 'apps_750': { type: 'total_applications', value: 750 },
  'apps_900': { type: 'total_applications', value: 900 }, 'apps_1000': { type: 'total_applications', value: 1000 }, 'apps_1250': { type: 'total_applications', value: 1250 }, 'apps_1500': { type: 'total_applications', value: 1500 },
  'apps_2000': { type: 'total_applications', value: 2000 }, 'apps_3000': { type: 'total_applications', value: 3000 }, 'apps_5000': { type: 'total_applications', value: 5000 }, 'apps_10000': { type: 'total_applications', value: 10000 },

  // Resilience (Rejections)
  'rejections_10': { type: 'total_rejections', value: 10 }, 'rejections_20': { type: 'total_rejections', value: 20 }, 'rejections_30': { type: 'total_rejections', value: 30 }, 'rejections_50': { type: 'total_rejections', value: 50 },
  'rejections_75': { type: 'total_rejections', value: 75 }, 'rejections_100': { type: 'total_rejections', value: 100 }, 'rejections_125': { type: 'total_rejections', value: 125 }, 'rejections_150': { type: 'total_rejections', value: 150 },
  'rejections_200': { type: 'total_rejections', value: 200 }, 'rejections_300': { type: 'total_rejections', value: 300 }, 'rejections_500': { type: 'total_rejections', value: 500 }, 'rejections_750': { type: 'total_rejections', value: 750 },
  'rejections_1000': { type: 'total_rejections', value: 1000 }, 'rejections_1500': { type: 'total_rejections', value: 1500 }, 'rejections_2000': { type: 'total_rejections', value: 2000 },
  // Social (Followers)
  'social_followers_1': { type: 'followers', value: 1 }, 'social_followers_5': { type: 'followers', value: 5 }, 'social_followers_10': { type: 'followers', value: 10 }, 'social_followers_25': { type: 'followers', value: 25 },
  'social_followers_50': { type: 'followers', value: 50 }, 'social_followers_75': { type: 'followers', value: 75 }, 'social_followers_100': { type: 'followers', value: 100 }, 'social_followers_150': { type: 'followers', value: 150 },
  'social_followers_250': { type: 'followers', value: 250 }, 'social_followers_400': { type: 'followers', value: 400 }, 'social_followers_500': { type: 'followers', value: 500 }, 'social_followers_750': { type: 'followers', value: 750 },
  'social_followers_1000': { type: 'followers', value: 1000 }, 'social_followers_2500': { type: 'followers', value: 2500 }, 'social_followers_5000': { type: 'followers', value: 5000 },

  // Social (Connections)
  'social_connections_10': { type: 'connections', value: 10 }, 'social_connections_25': { type: 'connections', value: 25 }, 'social_connections_50': { type: 'connections', value: 50 }, 'social_connections_75': { type: 'connections', value: 75 },
  'social_connections_100': { type: 'connections', value: 100 }, 'social_connections_150': { type: 'connections', value: 150 }, 'social_connections_200': { type: 'connections', value: 200 }, 'social_connections_250': { type: 'connections', value: 250 },
  'social_connections_350': { type: 'connections', value: 350 }, 'social_connections_500': { type: 'connections', value: 500 }, 'social_connections_750': { type: 'connections', value: 750 }, 'social_connections_1000': { type: 'connections', value: 1000 },
  'social_connections_2000': { type: 'connections', value: 2000 }, 'social_connections_3500': { type: 'connections', value: 3500 }, 'social_connections_5000': { type: 'connections', value: 5000 },
  // Mastery (Skills)
  'mastery_html': { type: 'skill', value: 'HTML' }, 'mastery_css': { type: 'skill', value: 'CSS' }, 'mastery_js': { type: 'skill', value: 'Javascript' }, 'mastery_react': { type: 'skill', value: 'React' }, 'mastery_node': { type: 'skill', value: 'Node.js' },
  'mastery_python': { type: 'skill', value: 'Python' }, 'mastery_java': { type: 'skill', value: 'Java' }, 'mastery_cpp': { type: 'skill', value: 'C++' }, 'mastery_ts': { type: 'skill', value: 'Typescript' }, 'mastery_sql': { type: 'skill', value: 'SQL' },
  'mastery_nosql': { type: 'skill', value: 'NoSQL' }, 'mastery_aws': { type: 'skill', value: 'AWS' }, 'mastery_docker': { type: 'skill', value: 'Docker' }, 'mastery_git': { type: 'skill', value: 'Git' }, 'mastery_next': { type: 'skill', value: 'Next.js' },
  'mastery_tailwind': { type: 'skill', value: 'Tailwind' }, 'mastery_figma': { type: 'skill', value: 'Figma' }, 'mastery_rust': { type: 'skill', value: 'Rust' }, 'mastery_go': { type: 'skill', value: 'Go' }, 'mastery_flutter': { type: 'skill', value: 'Flutter' },
  'mastery_ai': { type: 'skill', value: 'AI' }, 'mastery_ml': { type: 'skill', value: 'ML' }, 'mastery_devops': { type: 'skill', value: 'DevOps' }, 'mastery_security': { type: 'skill', value: 'Security' }, 'mastery_testing': { type: 'skill', value: 'Testing' },
  'mastery_agile': { type: 'skill', value: 'Agile' }, 'mastery_graphql': { type: 'skill', value: 'GraphQL' }, 'mastery_kubernetes': { type: 'skill', value: 'Kubernetes' }, 'mastery_linux': { type: 'skill', value: 'Linux' }, 'mastery_firebase': { type: 'skill', value: 'Firebase' },

  // Engagement & Impact
  'content_1': { type: 'posts', value: 1 }, 'content_5': { type: 'posts', value: 5 }, 'content_10': { type: 'posts', value: 10 }, 'content_25': { type: 'posts', value: 25 },
  'content_50': { type: 'posts', value: 50 }, 'content_75': { type: 'posts', value: 75 }, 'content_100': { type: 'posts', value: 100 }, 'content_150': { type: 'posts', value: 150 },
  'content_250': { type: 'posts', value: 250 }, 'content_500': { type: 'posts', value: 500 },
  'engagement_100': { type: 'sparks_given', value: 100 }, 'engagement_250': { type: 'sparks_given', value: 250 }, 'engagement_500': { type: 'sparks_given', value: 500 }, 'engagement_1000': { type: 'sparks_given', value: 1000 },

  // Secret
  'secret_night_owl': { type: 'night_owl', value: 1 }, 'secret_early_bird': { type: 'early_bird', value: 1 }, 'secret_speed_demon': { type: 'speed_demon', value: 1 }, 'secret_coffee_addict': { type: 'weekend_warrior', value: 1 },
  'secret_zen': { type: 'streak_no_rejections', value: 30 }, 'secret_phoenix_rebirth': { type: 'hired_after_rejections', value: 100 }, 'secret_ghost_buster': { type: 'ghost_jobs_found', value: 10 },
  'secret_marathon': { type: 'hours_active', value: 12 }, 'secret_trendsetter': { type: 'post_likes', value: 100 }, 'secret_carry': { type: 'squad_contribution', value: 50 },
  'secret_ninja': { type: 'hired_silent', value: 1 }, 'secret_polyglot': { type: 'skill_count', value: 10 }, 'secret_connector': { type: 'squad_connections', value: 2 },
  'secret_beta': { type: 'join_order', value: 1000 }, 'secret_god_speed': { type: 'daily_apps', value: 50 },

  // Event
  'event_pioneer': { type: 'join_before', value: '2027-01-01' }, 'event_squad_champion': { type: 'squad_goal', value: 1 }, 'event_top_1_percent': { type: 'xp_rank', value: 1 },
  'event_bug_hunter': { type: 'bug_report', value: 1 }, 'event_contributor': { type: 'repo_contribution', value: 1 }, 'event_alpha': { type: 'test_phase', value: 'alpha' }, 'event_beta': { type: 'test_phase', value: 'beta' },
  'event_squad_monthly_gold': { type: 'monthly_squad_reward', value: 1 },
  'event_squad_monthly_silver': { type: 'monthly_squad_reward', value: 2 },
  'event_squad_monthly_bronze': { type: 'monthly_squad_reward', value: 3 },
};

const MAX_EQUIPPED = 4;

const MONTHLY_SQUAD_STICKER_XP = {
  event_squad_monthly_gold: 300,
  event_squad_monthly_silver: 200,
  event_squad_monthly_bronze: 100
};

const MONTHLY_SQUAD_STICKER_TITLE = {
  event_squad_monthly_gold: 'Apex Crown Squad',
  event_squad_monthly_silver: 'Silver Surge Squad',
  event_squad_monthly_bronze: 'Bronze Spark Squad'
};

const MONTHLY_REWARD_HIGH_PROOF_EVENTS = new Set(['application', 'weekly_goal', 'synergy_burst', 'archetype_selected']);

function formatSquadRewardPeriod(period) {
  if (!period) return '';
  const date = new Date(`${period}-01T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return period;
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function getSquadRewardKey(reward) {
  return reward?.rewardId || `${reward?.squadId || 'squad'}:${reward?.period || 'period'}:${reward?.rank || 'rank'}`;
}

function normalizeSquadRewardHistory(history = []) {
  if (!Array.isArray(history)) return [];
  const seen = new Set();
  const normalized = history
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      rewardId: item.rewardId ? String(item.rewardId) : '',
      stickerId: String(item.stickerId || ''),
      title: String(item.title || MONTHLY_SQUAD_STICKER_TITLE[item.stickerId] || 'Monthly Squad Reward'),
      rank: Number(item.rank || 0),
      period: String(item.period || ''),
      periodLabel: String(item.periodLabel || formatSquadRewardPeriod(item.period)),
      squadId: item.squadId ? String(item.squadId) : '',
      squadName: String(item.squadName || 'Winning squad'),
      claimedAt: item.claimedAt ? String(item.claimedAt) : '',
      verificationLabel: String(item.verificationLabel || 'Aptico verified clean monthly contribution'),
      xpBonus: Number(item.xpBonus || MONTHLY_SQUAD_STICKER_XP[item.stickerId] || 0)
    }))
    .filter((item) => item.stickerId && item.rank && item.period);

  return normalized
    .filter((item) => {
      const key = item.rewardId || `${item.squadId}:${item.period}:${item.rank}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => String(b.period).localeCompare(String(a.period)) || Number(a.rank) - Number(b.rank));
}

function buildSquadRewardProof(reward, stickerId) {
  return {
    rewardId: getSquadRewardKey(reward),
    stickerId,
    title: reward.title || MONTHLY_SQUAD_STICKER_TITLE[stickerId] || 'Monthly Squad Reward',
    rank: Number(reward.rank),
    period: reward.period,
    periodLabel: formatSquadRewardPeriod(reward.period),
    squadId: reward.squadId,
    squadName: reward.squadName || 'Winning squad',
    claimedAt: new Date().toISOString(),
    verificationLabel: 'Aptico verified clean monthly contribution',
    xpBonus: Number(reward.xpBonus || MONTHLY_SQUAD_STICKER_XP[stickerId] || 0)
  };
}

function getUtcWeekKey(date) {
  const weekStart = new Date(date);
  const distanceFromMonday = (weekStart.getUTCDay() + 6) % 7;
  weekStart.setUTCHours(0, 0, 0, 0);
  weekStart.setUTCDate(weekStart.getUTCDate() - distanceFromMonday);
  return weekStart.toISOString().slice(0, 10);
}

function getRewardReadinessStatus({ claimable, suspiciousEventCount, hasPublishedReward, cleanEligibleCount, highProofEventCount, readinessScore }) {
  if (!hasPublishedReward) return 'not_ready';
  if (suspiciousEventCount > 2) return 'needs_review';
  if (claimable) return 'ready_to_claim';
  if (!cleanEligibleCount || !highProofEventCount) return 'building';
  if (readinessScore >= 45) return 'almost_ready';
  return 'building';
}

function getRewardReadinessCopy(status) {
  const copy = {
    not_ready: 'Earn a published monthly squad reward first.',
    building: 'Build clean contribution across multiple days.',
    almost_ready: 'Keep showing up with proof-backed squad activity.',
    ready_to_claim: 'Ready to claim.',
    needs_review: 'Needs integrity review.'
  };
  return copy[status] || copy.building;
}

function getRewardReadinessProgress(status) {
  const progress = {
    not_ready: 0,
    building: 35,
    almost_ready: 75,
    ready_to_claim: 100,
    needs_review: 0
  };
  return progress[status] ?? 0;
}

export function evaluateMonthlySquadRewardReadiness(rows = [], { hasPublishedReward = false } = {}) {
  const cleanEligibleRows = rows.filter((row) => Number(row.eligiblePoints || 0) > 0 && row.spamStatus === 'clear');
  const activeDays = new Set();
  const activeWeeks = new Set();
  const eventTypes = new Set();
  const dailyEligiblePoints = new Map();
  const dailyEventCounts = new Map();
  let highProofEventCount = 0;
  let suspiciousEventCount = 0;

  for (const row of rows) {
    if (row.spamStatus !== 'clear') {
      suspiciousEventCount += 1;
    }
  }

  for (const row of cleanEligibleRows) {
    const createdAt = row.createdAt ? new Date(row.createdAt) : null;
    if (!createdAt || Number.isNaN(createdAt.getTime())) continue;
    const dayKey = createdAt.toISOString().slice(0, 10);
    activeDays.add(dayKey);
    activeWeeks.add(getUtcWeekKey(createdAt));
    eventTypes.add(row.eventType);
    dailyEligiblePoints.set(dayKey, Number(dailyEligiblePoints.get(dayKey) || 0) + Number(row.eligiblePoints || 0));
    dailyEventCounts.set(dayKey, Number(dailyEventCounts.get(dayKey) || 0) + 1);
    if (MONTHLY_REWARD_HIGH_PROOF_EVENTS.has(row.eventType)) {
      highProofEventCount += 1;
    }
  }

  const maxDailyEligiblePoints = Math.max(0, ...dailyEligiblePoints.values());
  const maxDailyEventCount = Math.max(0, ...dailyEventCounts.values());
  const activeDayScore = Math.min(42, activeDays.size * 14);
  const spreadScore = Math.min(18, activeWeeks.size * 9);
  const proofScore = Math.min(18, highProofEventCount * 9);
  const diversityScore = Math.min(10, eventTypes.size * 3);
  const integrityPenalty = suspiciousEventCount * 15;
  const burstPenalty = Math.max(0, maxDailyEligiblePoints - 45) * 0.35 + Math.max(0, maxDailyEventCount - 10) * 2;
  const readinessScore = Math.max(0, activeDayScore + spreadScore + proofScore + diversityScore - integrityPenalty - burstPenalty);
  const claimable = Boolean(hasPublishedReward && readinessScore >= 60 && cleanEligibleRows.length && suspiciousEventCount <= 2);
  const status = getRewardReadinessStatus({
    claimable,
    suspiciousEventCount,
    hasPublishedReward,
    cleanEligibleCount: cleanEligibleRows.length,
    highProofEventCount,
    readinessScore
  });

  return {
    claimable,
    status,
    copy: getRewardReadinessCopy(status),
    progress: getRewardReadinessProgress(status)
  };
}

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

  // Published monthly squad rewards available for consistency-based claiming.
  try {
    const readinessRows = await calculateMonthlySquadRewardReadiness(db, userId);
    const readinessByRank = new Map();
    for (const row of readinessRows) {
      const current = readinessByRank.get(row.rank);
      if (!current || (row.claimable && !current.claimable) || Number(row.progress || 0) > Number(current.progress || 0)) {
        readinessByRank.set(row.rank, row);
      }
    }
    stats.monthlySquadRewardReadiness = [...readinessByRank.values()].map(({ rank, status, copy, progress, claimable }) => ({
      rank,
      status,
      copy,
      progress,
      claimable
    }));
    stats.monthlySquadRewards = [...readinessByRank.values()].filter((row) => row.claimable).map((row) => Number(row.rank));
    stats.monthlySquadRewardOptions = [...readinessByRank.values()].map(({ rewardId, squadId, squadName, period, rank, stickerId, title, xpBonus, approvedAt, status, copy, progress, claimable }) => ({
      rewardId,
      squadId,
      squadName,
      period,
      periodLabel: formatSquadRewardPeriod(period),
      rank,
      stickerId,
      title,
      xpBonus,
      approvedAt,
      status,
      copy,
      progress,
      claimable
    }));
  } catch {
    stats.monthlySquadRewardReadiness = [];
    stats.monthlySquadRewards = [];
    stats.monthlySquadRewardOptions = [];
  }

  // Night owl / Early bird (check if any app was logged between midnight–4am or 4am–6am)
  try {
    const [nightRow] = await db.select({ count: sql`count(*)::int` }).from(applicationLogs).where(and(eq(applicationLogs.userId, userId), sql`extract(hour from ${applicationLogs.createdAt} AT TIME ZONE 'UTC') >= 0 AND extract(hour from ${applicationLogs.createdAt} AT TIME ZONE 'UTC') < 4`));
    stats.nightOwl = Number(nightRow?.count || 0) > 0 ? 1 : 0;
  } catch { stats.nightOwl = 0; }

  try {
    const [earlyRow] = await db.select({ count: sql`count(*)::int` }).from(applicationLogs).where(and(eq(applicationLogs.userId, userId), sql`extract(hour from ${applicationLogs.createdAt} AT TIME ZONE 'UTC') >= 4 AND extract(hour from ${applicationLogs.createdAt} AT TIME ZONE 'UTC') < 6`));
    stats.earlyBird = Number(earlyRow?.count || 0) > 0 ? 1 : 0;
  } catch { stats.earlyBird = 0; }

  // Weekend warrior (any app on Sat or Sun)
  try {
    const [weekendRow] = await db.select({ count: sql`count(*)::int` }).from(applicationLogs).where(and(eq(applicationLogs.userId, userId), sql`extract(dow from ${applicationLogs.createdAt} AT TIME ZONE 'UTC') IN (0, 6)`));
    stats.weekendWarrior = Number(weekendRow?.count || 0) > 0 ? 1 : 0;
  } catch { stats.weekendWarrior = 0; }

  // Speed demon (simplified: 10+ apps in a single day as a proxy for 'speed')
  try {
    const [speedRow] = await db.select({ count: sql`count(*)::int` }).from(applicationLogs).where(and(eq(applicationLogs.userId, userId))).groupBy(sql`date_trunc('day', ${applicationLogs.createdAt})`).orderBy(desc(sql`count(*)`)).limit(1);
    stats.speedDemon = Number(speedRow?.count || 0) >= 10 ? 1 : 0;
  } catch { stats.speedDemon = 0; }

  // Posts count
  try {
    const [postCount] = await db.select({ count: sql`count(*)::int` }).from(posts).where(eq(posts.userId, userId));
    stats.posts = Number(postCount?.count || 0);
  } catch { stats.posts = 0; }

  // Sparks given (this week)
  try {
    const [smRow] = await db.select({ sparksSent: squadMembers.sparksSentThisWeek }).from(squadMembers).where(eq(squadMembers.userId, userId)).limit(1);
    stats.sparksGiven = Number(smRow?.sparksSent || 0);
  } catch { stats.sparksGiven = 0; }

  // Skills
  try {
    const [profileRow] = await db.select({ skills: userProfiles.skills }).from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
    stats.skills = Array.isArray(profileRow?.skills) ? profileRow.skills : [];
  } catch { stats.skills = []; }

  // Advanced Secret Metrics
  try {
    // Post likes
    const [likesRow] = await db.select({ total: sql`sum(${posts.likesCount})::int` }).from(posts).where(eq(posts.userId, userId));
    stats.postLikes = Number(likesRow?.total || 0);
  } catch { stats.postLikes = 0; }

  try {
    // Max daily apps
    const [dailyRow] = await db.select({ count: sql`count(*)::int` }).from(applicationLogs).where(eq(applicationLogs.userId, userId)).groupBy(sql`date_trunc('day', ${applicationLogs.createdAt})`).orderBy(desc(sql`count(*)`)).limit(1);
    stats.maxDailyApps = Number(dailyRow?.count || 0);
  } catch { stats.maxDailyApps = 0; }

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
    case 'posts':              return (stats.posts || 0) >= req.value;
    case 'sparks_given':       return (stats.sparksGiven || 0) >= req.value;
    case 'skill':              return (stats.skills || []).includes(req.value);
    case 'post_likes':         return (stats.postLikes || 0) >= req.value;
    case 'daily_apps':         return (stats.maxDailyApps || 0) >= req.value;
    case 'skill_count':        return (stats.skills || []).length >= req.value;
    
    // Fallback for mocks/complex ones
    case 'streak_no_rejections': return stats.streak >= req.value; 
    case 'hired_after_rejections': return stats.totalRejections >= req.value;
    case 'ghost_jobs_found':    return stats.totalApplications >= (req.value * 5);
    case 'hours_active':        return stats.xp >= (req.value * 100);
    case 'squad_contribution':  return stats.squadGoalReached >= 1;
    case 'hired_silent':        return stats.totalApplications >= 10 && stats.posts === 0;
    case 'squad_connections':   return stats.connections >= 20;
    case 'join_order':          return true; // Simplified
    case 'xp_rank':             return stats.xp >= 10000;
    case 'bug_report':          return true;
    case 'repo_contribution':   return true;
    case 'test_phase':          return true;
    case 'monthly_squad_reward': return Array.isArray(stats.monthlySquadRewards) && stats.monthlySquadRewards.includes(req.value);
    
    case 'beta_tester':        return (stats.betaTester || 0) >= req.value;
    default:                   return false;
  }
}

export async function unlockStickerController(request, reply) {
  try {
    requireDatabase(request.server.db);
    const { stickerId } = z.object({ stickerId: z.string().min(1) }).parse(request.body || {});

    if (!isStickerIdValid(stickerId)) {
      return reply.code(400).send({ success: false, error: 'Unknown sticker format.' });
    }

    // Fetch current settings
    const existing = await getStoredProfileSettings(request.server.db, request.auth.userId);
    const settings = existing || {};
    const unlocked = Array.isArray(settings.unlockedStickers) ? [...settings.unlockedStickers] : [];
    const req = STICKER_REQUIREMENTS[stickerId];
    const isMonthlySquadSticker = req?.type === 'monthly_squad_reward';
    const history = normalizeSquadRewardHistory(settings.squadRewardHistory);

    if (unlocked.includes(stickerId) && !isMonthlySquadSticker) {
      return reply.send({ success: true, data: { alreadyUnlocked: true, unlockedStickers: unlocked } });
    }

    // Validate requirement
    const stats = await getUserStats(request.server.db, request.auth.userId);
    let squadRewardProof = null;

    if (isMonthlySquadSticker) {
      const claimedRewardIds = new Set(history.map((item) => item.rewardId || `${item.squadId}:${item.period}:${item.rank}`));
      const rewardOptions = (await calculateMonthlySquadRewardReadiness(request.server.db, request.auth.userId, req.value))
        .filter((item) => item.claimable)
        .sort((a, b) => String(a.period).localeCompare(String(b.period)));
      const nextReward = rewardOptions.find((item) => !claimedRewardIds.has(getSquadRewardKey(item)));
      if (nextReward) {
        squadRewardProof = buildSquadRewardProof(nextReward, stickerId);
      } else if (unlocked.includes(stickerId)) {
        return reply.send({
          success: true,
          data: {
            alreadyUnlocked: true,
            unlockedStickers: unlocked,
            squadRewardHistory: history
          }
        });
      }

      if (!squadRewardProof) {
        return reply.code(403).send({ success: false, error: 'You have not met the requirements for this sticker yet.' });
      }
    }

    if (!squadRewardProof && !meetsRequirement(req, stats)) {
      return reply.code(403).send({ success: false, error: 'You have not met the requirements for this sticker yet.' });
    }

    if (!unlocked.includes(stickerId)) {
      unlocked.push(stickerId);
    }
    const updatedHistory = squadRewardProof ? normalizeSquadRewardHistory([squadRewardProof, ...history]) : history;
    const updatedSettings = {
      ...settings,
      unlockedStickers: unlocked,
      ...(isMonthlySquadSticker ? { squadRewardHistory: updatedHistory } : {})
    };

    const existingRow = await request.server.db.select({ id: profileSettings.id }).from(profileSettings).where(eq(profileSettings.userId, request.auth.userId)).limit(1);

    const xpBonus = isMonthlySquadSticker ? Number(squadRewardProof?.xpBonus || 0) : MONTHLY_SQUAD_STICKER_XP[stickerId] || 0;
    if (xpBonus) {
      await request.server.db
        .update(users)
        .set({ resilienceXp: sql`${users.resilienceXp} + ${xpBonus}` })
        .where(eq(users.id, request.auth.userId));
      updatedSettings.monthlySquadReward = stickerId;
    }

    if (existingRow[0]) {
      await request.server.db.update(profileSettings).set({ settingsJson: updatedSettings, updatedAt: new Date() }).where(eq(profileSettings.id, existingRow[0].id));
    } else {
      await request.server.db.insert(profileSettings).values({ userId: request.auth.userId, settingsJson: updatedSettings });
    }

    return reply.send({
      success: true,
      data: {
        unlockedStickers: unlocked,
        newSticker: stickerId,
        squadRewardHistory: updatedHistory,
        squadRewardProof
      }
    });
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
        equippedStickers: Array.isArray(settings.equippedStickers) ? settings.equippedStickers : [],
        squadRewardHistory: normalizeSquadRewardHistory(settings.squadRewardHistory)
      }
    });
  } catch (error) {
    return reply.code(error.statusCode || 500).send({ success: false, error: error.message || 'Could not fetch sticker stats.' });
  }
}
