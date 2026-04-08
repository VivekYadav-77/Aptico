import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { analyses, generatedContent, profileSettings, savedJobs } from '../db/schema.js';

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
  notificationSecurityAlerts: z.boolean()
});

function requireDatabase(db) {
  if (!db) {
    const error = new Error('Database is not configured yet.');
    error.statusCode = 503;
    throw error;
  }
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

    const settings = await getStoredProfileSettings(request.server.db, request.auth.userId);

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

    const existing = await request.server.db
      .select({ id: profileSettings.id })
      .from(profileSettings)
      .where(eq(profileSettings.userId, request.auth.userId))
      .limit(1);

    if (existing[0]) {
      await request.server.db
        .update(profileSettings)
        .set({
          settingsJson: body,
          updatedAt: new Date()
        })
        .where(eq(profileSettings.id, existing[0].id));
    } else {
      await request.server.db.insert(profileSettings).values({
        userId: request.auth.userId,
        settingsJson: body
      });
    }

    return reply.send({
      success: true,
      data: body
    });
  } catch (error) {
    const statusCode = error.name === 'ZodError' ? 400 : error.statusCode || 500;

    return reply.code(statusCode).send({
      success: false,
      error: error.message || 'Could not save profile settings.'
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
          savedAt: savedJobs.savedAt
        })
        .from(savedJobs)
        .where(eq(savedJobs.userId, userId))
        .orderBy(desc(savedJobs.savedAt))
        .limit(4),
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
