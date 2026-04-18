import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { profileSettings, userEducations, userExperiences, userProfiles, users } from '../db/schema.js';
import { env } from '../config/env.js';
import { callGeminiWithRotation, getGeminiKeys } from '../utils/geminiClient.js';

const chatBodySchema = z.object({
  message: z.string().trim().min(1).max(2000)
});

function serviceError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeProjects(settingsJson) {
  const featured = Array.isArray(settingsJson?.featured) ? settingsJson.featured : [];

  return featured
    .filter((item) => {
      const type = String(item?.type || '').trim().toLowerCase();
      return !type || type === 'project';
    })
    .map((item) => ({
      title: String(item?.title || '').trim(),
      description: String(item?.description || '').trim(),
      link: String(item?.link || '').trim(),
      type: String(item?.type || 'project').trim()
    }))
    .filter((item) => item.title || item.description || item.link);
}

async function getShadowResumePayload(db, username) {
  const profileRows = await db
    .select({
      userId: userProfiles.userId,
      username: userProfiles.username,
      headline: userProfiles.headline,
      location: userProfiles.location,
      skills: userProfiles.skills,
      isPublic: userProfiles.isPublic,
      avatarUrl: users.avatarUrl,
      name: users.name
    })
    .from(userProfiles)
    .innerJoin(users, eq(userProfiles.userId, users.id))
    .where(and(eq(userProfiles.username, username), eq(userProfiles.isPublic, true)))
    .limit(1);

  const profile = profileRows[0];

  if (!profile) {
    throw serviceError('Profile not found', 404);
  }

  const [experienceRows, educationRows, settingsRows] = await Promise.all([
    db
      .select({
        id: userExperiences.id,
        company: userExperiences.company,
        role: userExperiences.role,
        startDate: userExperiences.startDate,
        endDate: userExperiences.endDate,
        isCurrent: userExperiences.isCurrent,
        description: userExperiences.description
      })
      .from(userExperiences)
      .where(eq(userExperiences.userId, profile.userId))
      .orderBy(desc(userExperiences.startDate), desc(userExperiences.createdAt)),
    db
      .select({
        id: userEducations.id,
        institution: userEducations.institution,
        degree: userEducations.degree,
        fieldOfStudy: userEducations.fieldOfStudy,
        graduationYear: userEducations.graduationYear
      })
      .from(userEducations)
      .where(eq(userEducations.userId, profile.userId))
      .orderBy(desc(userEducations.graduationYear), desc(userEducations.createdAt)),
    db
      .select({ settingsJson: profileSettings.settingsJson })
      .from(profileSettings)
      .where(eq(profileSettings.userId, profile.userId))
      .limit(1)
  ]);

  const settingsJson = settingsRows[0]?.settingsJson || {};
  const projects = normalizeProjects(settingsJson);

  return {
    profile: {
      username: profile.username,
      name: profile.name || profile.username,
      headline: profile.headline || '',
      location: profile.location || '',
      avatarUrl: profile.avatarUrl || '',
      skills: Array.isArray(profile.skills) ? profile.skills : [],
      bio: String(settingsJson?.bio || '').trim(),
      currentTitle: String(settingsJson?.currentTitle || '').trim(),
      currentCompany: String(settingsJson?.currentCompany || '').trim(),
      industry: String(settingsJson?.industry || '').trim(),
      topSkills: Array.isArray(settingsJson?.topSkills) ? settingsJson.topSkills : [],
      tools: Array.isArray(settingsJson?.tools) ? settingsJson.tools : [],
      languages: Array.isArray(settingsJson?.languages) ? settingsJson.languages : [],
      achievements: Array.isArray(settingsJson?.achievements) ? settingsJson.achievements : []
    },
    experiences: experienceRows,
    educations: educationRows,
    projects,
    metadata: {
      projectSource: projects.length ? 'profile_settings.featured' : 'none'
    }
  };
}

export async function shadowResumeChatController(request, reply) {
  try {
    const db = request.server.db;

    if (!db) {
      throw serviceError('Database is not configured yet.', 503);
    }

    const username = String(request.params?.username || '').trim();
    const body = chatBodySchema.parse(request.body || {});
    const payload = await getShadowResumePayload(db, username);

    const systemPrompt = [
      `You are the representative AI for ${payload.profile.username}.`,
      'A recruiter is asking you a question about them.',
      'Answer based ONLY on the following data.',
      'If the answer is not present in the data, say that the information is not available in the profile data.',
      'Do not invent experience, education, projects, companies, dates, achievements, or skills.',
      'Be concise, highly professional, and advocate for their skills.',
      '',
      JSON.stringify(payload, null, 2)
    ].join('\n');

    // Use dedicated shadow resume key if available, otherwise fall back to shared pool
    const dedicatedKey = env.geminiShadowResumeKey;
    const chatModel = env.geminiShadowResumeModel || env.geminiModel2 || env.geminiModel1;
    const chatKeys = dedicatedKey ? [dedicatedKey] : getGeminiKeys(env.geminiKeys);

    const responseText = await callGeminiWithRotation({
      prompt: `${systemPrompt}\n\nRecruiter question: ${body.message}`,
      model: chatModel,
      keys: chatKeys,
      logger: request.log,
      config: {
        temperature: 0.2,
        topP: 0.9
      }
    });

    return reply.send({
      success: true,
      response: String(responseText || '').trim(),
      profile: {
        username: payload.profile.username,
        name: payload.profile.name,
        headline: payload.profile.headline,
        avatarUrl: payload.profile.avatarUrl
      }
    });
  } catch (error) {
    const statusCode = error.name === 'ZodError' ? 400 : error.statusCode || 500;

    return reply.code(statusCode).send({
      success: false,
      error: error.message || 'Could not generate shadow resume response.'
    });
  }
}
