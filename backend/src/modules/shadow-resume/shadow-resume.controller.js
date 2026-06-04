import { z } from 'zod';
import { env } from '../../config/env.js';
import { getPublicProfile } from '../profile/profile.service.js';
import { callGeminiWithRotation, getGeminiKeys } from '../../shared/utils/gemini-client.js';

const chatBodySchema = z.object({
  message: z.string().trim().min(1).max(2000)
});

function serviceError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function isMeaningfulValue(value) {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === 'object') {
    return Object.keys(value).length > 0;
  }

  return true;
}

function compactValue(value) {
  if (Array.isArray(value)) {
    const items = value
      .map((item) => compactValue(item))
      .filter(isMeaningfulValue);

    return items.length ? items : undefined;
  }

  if (value && typeof value === 'object') {
    const compacted = Object.entries(value).reduce((accumulator, [key, entryValue]) => {
      const nextValue = compactValue(entryValue);

      if (isMeaningfulValue(nextValue)) {
        accumulator[key] = nextValue;
      }

      return accumulator;
    }, {});

    return Object.keys(compacted).length ? compacted : undefined;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || undefined;
  }

  return isMeaningfulValue(value) ? value : undefined;
}

function toArray(value) {
  return Array.isArray(value) ? value.filter(isMeaningfulValue) : [];
}

function normalizeFeaturedItems(items) {
  return toArray(items).map((item) => ({
    title: item?.title || '',
    description: item?.description || '',
    link: item?.link || '',
    type: item?.type || ''
  }));
}

function normalizeTopProjects(items) {
  return toArray(items).map((item) => ({
    title: item?.title || '',
    description: item?.description || '',
    resumeDescription: item?.resumeDescription || '',
    techStack: toArray(item?.techStack),
    githubUrl: item?.githubUrl || '',
    liveUrl: item?.liveUrl || ''
  }));
}

function normalizeExperiences(items) {
  return toArray(items).map((item) => ({
    title: item?.title || item?.role || '',
    company: item?.company || '',
    startDate: item?.startDate || '',
    endDate: item?.endDate || '',
    isCurrent: Boolean(item?.isCurrent),
    description: item?.description || ''
  }));
}

function normalizeEducation(items) {
  return toArray(items).map((item) => ({
    school: item?.school || item?.institution || '',
    degree: item?.degree || '',
    field: item?.field || item?.fieldOfStudy || '',
    startYear: item?.startYear || '',
    endYear: item?.endYear || item?.graduationYear || '',
    activities: item?.activities || ''
  }));
}

function normalizeLicenses(items) {
  return toArray(items).map((item) => ({
    name: item?.name || '',
    issuingOrg: item?.issuingOrg || '',
    issueDate: item?.issueDate || '',
    expiryDate: item?.expiryDate || '',
    credentialUrl: item?.credentialUrl || ''
  }));
}

function normalizeHonorsAwards(items) {
  return toArray(items).map((item) => ({
    title: item?.title || '',
    issuer: item?.issuer || '',
    date: item?.date || '',
    description: item?.description || ''
  }));
}

function compactLatestAnalysis(latestAnalysis) {
  if (!latestAnalysis) {
    return null;
  }

  return {
    targetRole: latestAnalysis.target_role || latestAnalysis.targetRole || '',
    confidenceScore: latestAnalysis.confidence_score ?? latestAnalysis.confidenceScore ?? null,
    topSkillGaps: toArray(latestAnalysis.top_skill_gaps || latestAnalysis.topSkillGaps).slice(0, 3)
  };
}

function compactResiliencePortfolio(resiliencePortfolio) {
  if (!resiliencePortfolio) {
    return null;
  }

  return {
    stats: resiliencePortfolio.stats || null,
    recentApplications: toArray(resiliencePortfolio.applicationHistory).slice(0, 5),
    rejectionJourney: toArray(resiliencePortfolio.rejectionJourney).slice(0, 5)
  };
}

export function compactPublicProfileForRecruiter(profile) {
  const enrichedSettings = profile?.enriched_settings || {};
  const payload = {
    profile: {
      username: profile?.username || '',
      name: profile?.name || profile?.username || '',
      headline: profile?.headline || '',
      location: profile?.location || '',
      avatarUrl: profile?.avatar_url || profile?.avatarUrl || '',
      skills: toArray(profile?.skills),
      followerCount: profile?.follower_count ?? null,
      connectionCount: profile?.connection_count ?? null,
      about: {
        bio: enrichedSettings.bio || '',
        currentTitle: enrichedSettings.currentTitle || '',
        currentCompany: enrichedSettings.currentCompany || '',
        yearsExperience: enrichedSettings.yearsExperience || '',
        currentStatus: enrichedSettings.currentStatus || '',
        employmentType: enrichedSettings.employmentType || '',
        industry: enrichedSettings.industry || '',
        availability: enrichedSettings.availability || '',
        openToWork: enrichedSettings.openToWork
      },
      links: {
        linkedin: enrichedSettings.linkedin || '',
        github: enrichedSettings.github || '',
        portfolio: enrichedSettings.portfolio || '',
        website: enrichedSettings.website || ''
      },
      skillsDetail: {
        topSkills: toArray(enrichedSettings.topSkills),
        tools: toArray(enrichedSettings.tools),
        languages: toArray(enrichedSettings.languages)
      }
    },
    experience: normalizeExperiences(enrichedSettings.experiences),
    education: normalizeEducation(enrichedSettings.educationEntries),
    projects: normalizeTopProjects(enrichedSettings.topProjects),
    featured: normalizeFeaturedItems(enrichedSettings.featured),
    licenses: normalizeLicenses(enrichedSettings.licenses),
    honorsAwards: normalizeHonorsAwards(enrichedSettings.honorsAwards),
    resiliencePortfolio: compactResiliencePortfolio(profile?.resilience_portfolio),
    latestAnalysis: compactLatestAnalysis(profile?.latest_analysis)
  };

  return compactValue(payload) || {};
}

export function buildRecruiterShadowResumePrompt(payload, message) {
  const candidateName = payload?.profile?.name || payload?.profile?.username || 'this candidate';

  return [
    `You are Recruiter Shadow Resume, a public-facing AI representative for ${candidateName}.`,
    'A recruiter is asking a screening question about this candidate.',
    '',
    'Grounding and privacy rules:',
    '- Answer using ONLY the public candidate data supplied below.',
    '- Treat the supplied data as already visibility-filtered public profile data.',
    '- Never reveal, infer, or mention hidden/private platform data, internal notes, raw resumes, raw job descriptions, private contact details, or fields that are not present.',
    '- Do not invent experience, education, projects, companies, dates, achievements, links, certifications, metrics, or skills.',
    '- If the answer is not present in the supplied data, say: "That information is not available in the public profile data."',
    '',
    'Recruiter-friendly response style:',
    '- Be concise, polished, factual, supportive, and easy to scan.',
    '- Prefer short paragraphs or bullets when that helps a recruiter evaluate fit quickly.',
    '- Highlight evidence-backed strengths and relevant context from the profile.',
    '- Distinguish confirmed facts from unavailable details.',
    '- Keep the candidate professional and credible; do not exaggerate.',
    '',
    'Public candidate data:',
    JSON.stringify(payload, null, 2),
    '',
    `Recruiter question: ${message}`
  ].join('\n');
}

export function createShadowResumeChatController({
  getPublicProfileFn = getPublicProfile,
  callGeminiFn = callGeminiWithRotation,
  getGeminiKeysFn = getGeminiKeys,
  envConfig = env
} = {}) {
  return async function shadowResumeChatController(request, reply) {
    try {
      const db = request.server.db;

      if (!db) {
        throw serviceError('Database is not configured yet.', 503);
      }

      const username = String(request.params?.username || '').trim();
      const body = chatBodySchema.parse(request.body || {});
      const publicProfile = await getPublicProfileFn(db, username, null);
      const payload = compactPublicProfileForRecruiter(publicProfile);
      const prompt = buildRecruiterShadowResumePrompt(payload, body.message);

      const dedicatedKey = envConfig.geminiShadowResumeKey;
      const chatModel = envConfig.geminiShadowResumeModel || envConfig.geminiModel2 || envConfig.geminiModel1;
      const chatKeys = dedicatedKey ? [dedicatedKey] : getGeminiKeysFn(envConfig.geminiKeys);

      const responseText = await callGeminiFn({
        prompt,
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
          username: payload.profile?.username,
          name: payload.profile?.name,
          headline: payload.profile?.headline,
          avatarUrl: payload.profile?.avatarUrl
        }
      });
    } catch (error) {
      const statusCode = error.name === 'ZodError' ? 400 : error.statusCode || 500;

      return reply.code(statusCode).send({
        success: false,
        error: error.message || 'Could not generate shadow resume response.'
      });
    }
  };
}

export const shadowResumeChatController = createShadowResumeChatController();
