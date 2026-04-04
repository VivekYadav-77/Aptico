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
    'You are a compatibility screener. Analyze this resume and job description.',
    'Determine if this person\'s academic background, degree stream, and work experience are fundamentally incompatible with what the job requires.',
    'A hotel management graduate applying for a software engineering role with no coding background is low compatibility.',
    'A BCA or BSc Computer Science graduate applying for a software role is high compatibility.',
    'Any stream where the person has clearly shown self-taught relevant skills should score higher.',
    'Return only valid JSON with no markdown and no code fences.',
    'The JSON must have exactly these three fields: score which is a number from 0 to 100, reason which is one sentence explaining the score, canProceed which is a boolean that is false if score is below 40 and true otherwise.',
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
