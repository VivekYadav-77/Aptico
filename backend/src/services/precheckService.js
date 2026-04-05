import { z } from 'zod';
import { env } from '../config/env.js';
import { createGeminiClient } from '../utils/geminiClient.js';

const PRECHECK_TIMEOUT_MS = 20_000;

const precheckSchema = z.object({
  score: z.number().min(0).max(100),
  reason: z.string().trim().min(1),
  canProceed: z.boolean()
});

const precheckJsonSchema = {
  type: 'object',
  required: ['score', 'reason', 'canProceed'],
  properties: {
    score: { type: 'integer', minimum: 0, maximum: 100 },
    reason: { type: 'string' },
    canProceed: { type: 'boolean' }
  }
};

function buildPrecheckPrompt(resumeText, jobDescription) {
  return [
    'You are a career domain compatibility screener Aptico. Your only job is to determine whether this person has any realistic chance of being considered for this role based on their background.',
    '',
    'Scoring rules are here folows',
    '',
    '1- Score 0 to 39: The person academic stream, degree, and work history show zero overlap with the job domain. No self-taught skills are visible. Examples: hotel management graduate with no coding projects applying for software engineer, pharmacy graduate applying for cloud architect.',
    '2- Score 40 to 59: Partial overlap exists. The person comes from a different stream but shows some relevant self-taught skills, side projects, certifications, or transferable experience. Examples: BBA graduate who has built web projects and knows JavaScript, BSc Chemistry graduate with data analysis internship applying for data analyst.',
    '3- Score 60 to 79: Reasonable alignment. Stream may differ slightly but skills are largely present. Examples: BSc Mathematics applying for data science, BCA applying for frontend developer.',
    '4- Score 80 to 100: Strong alignment. Stream directly matches the job domain. Examples: BTech Computer Science applying for software engineer, MBA applying for product manager.',
    '',
    'You must weigh self-taught skills, certifications, GitHub projects, and internships heavily. A non-CS student with real projects scores higher than a CS student with no projects.',
    '',
    'Return only valid JSON. No markdown. No explanation outside the JSON. Exactly these three fields: score: integer 0 to 100,reason: one specific sentence explaining the score referencing the actual degree and job domain ,canProceed: boolean, false if score is below 40, true otherwise',
    '',
    'Resume:',
    resumeText,
    '',
    'Job Description:',
    jobDescription
  ].join('\n');
}

export async function runPrecheck({ resumeText, jobDescription, logger = console }) {
  const apiKey = env.geminiPrecheckKey;

  if (!apiKey) {
    logger?.warn?.('GEMINI_PRECHECK_API_KEY is not configured. Defaulting canProceed to true.');
    return { score: 100, reason: 'Precheck key not configured — proceeding by default.', canProceed: true };
  }

  try {
    const client = createGeminiClient(apiKey);
    const prompt = buildPrecheckPrompt(resumeText, jobDescription);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PRECHECK_TIMEOUT_MS);

    let response;
    try {
      response = await client.models.generateContent({
        model: env.geminiModel1,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseJsonSchema: precheckJsonSchema
        }
      });
    } finally {
      clearTimeout(timeout);
    }

    const rawText = typeof response.text === 'function' ? response.text() : response.text;
    const parsed = precheckSchema.parse(JSON.parse(rawText));

    return {
      score: parsed.score,
      reason: parsed.reason,
      canProceed: parsed.score >= 40
    };
  } catch (error) {
    logger?.error?.('Precheck failed, defaulting canProceed to true.', error?.message || error);
    return { score: 100, reason: 'Precheck could not be completed — proceeding by default.', canProceed: true };
  }
}
