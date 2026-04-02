import crypto from 'node:crypto';
import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { env } from '../config/env.js';

const CACHE_TTL_SECONDS = 2 * 60 * 60;
const BACKOFF_BASE_MS = 200;

const analysisSchema = z.object({
  companyName: z.string().trim(),
  confidenceScore: z.number().int().min(0).max(100),
  summary: z.string().trim().min(1),
  keywordMismatches: z.array(
    z.object({
      keyword: z.string().trim().min(1),
      jobRequirement: z.string().trim().min(1),
      resumeEvidence: z.string().trim().min(1),
      importance: z.string().trim().min(1)
    })
  ),
  seniorityMismatches: z.array(
    z.object({
      topic: z.string().trim().min(1),
      resumeLevel: z.string().trim().min(1),
      targetLevel: z.string().trim().min(1),
      explanation: z.string().trim().min(1)
    })
  ),
  rewriteSuggestions: z.array(
    z.object({
      original: z.string().trim().min(1),
      rewritten: z.string().trim().min(1),
      reason: z.string().trim().min(1)
    })
  )
});

const responseJsonSchema = {
  type: 'object',
  required: ['companyName', 'confidenceScore', 'summary', 'keywordMismatches', 'seniorityMismatches', 'rewriteSuggestions'],
  properties: {
    companyName: {
      type: 'string'
    },
    confidenceScore: {
      type: 'integer',
      minimum: 0,
      maximum: 100
    },
    summary: {
      type: 'string'
    },
    keywordMismatches: {
      type: 'array',
      items: {
        type: 'object',
        required: ['keyword', 'jobRequirement', 'resumeEvidence', 'importance'],
        properties: {
          keyword: { type: 'string' },
          jobRequirement: { type: 'string' },
          resumeEvidence: { type: 'string' },
          importance: { type: 'string' }
        }
      }
    },
    seniorityMismatches: {
      type: 'array',
      items: {
        type: 'object',
        required: ['topic', 'resumeLevel', 'targetLevel', 'explanation'],
        properties: {
          topic: { type: 'string' },
          resumeLevel: { type: 'string' },
          targetLevel: { type: 'string' },
          explanation: { type: 'string' }
        }
      }
    },
    rewriteSuggestions: {
      type: 'array',
      items: {
        type: 'object',
        required: ['original', 'rewritten', 'reason'],
        properties: {
          original: { type: 'string' },
          rewritten: { type: 'string' },
          reason: { type: 'string' }
        }
      }
    }
  }
};

let nextKeyIndex = 0;

function sleep(durationMs) {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
}

function buildPrompt({ resumeText, jobDescription }) {
  return [
    'You are Aptico, an AI career analysis engine.',
    'Analyze the resume against the job description and return only valid JSON matching the provided schema.',
    'Focus on keyword mismatches, seniority mismatches, and bullet rewrite improvements.',
    'Confidence score must be an integer between 0 and 100.',
    '',
    'Resume:',
    resumeText,
    '',
    'Job Description:',
    jobDescription
  ].join('\n');
}

function createPromptHash(prompt) {
  return crypto.createHash('sha256').update(prompt).digest('hex');
}

function getGeminiKeys(keys = env.geminiKeys) {
  const availableKeys = (keys || []).filter(Boolean);

  if (!availableKeys.length) {
    const error = new Error('Gemini keys are not configured yet.');
    error.statusCode = 503;
    throw error;
  }

  return availableKeys;
}

function createClient(apiKey, clientFactory) {
  if (clientFactory) {
    return clientFactory(apiKey);
  }

  return new GoogleGenAI({ apiKey });
}

function isRateLimitError(error) {
  return error?.status === 429 || error?.code === 429 || error?.response?.status === 429;
}

async function callGeminiWithRotation({ prompt, keys, clientFactory, logger }) {
  const totalKeys = keys.length;
  const startingIndex = nextKeyIndex % totalKeys;
  let lastError = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const keyIndex = (startingIndex + attempt) % totalKeys;
    const apiKey = keys[keyIndex];
    const client = createClient(apiKey, clientFactory);

    try {
      const response = await client.models.generateContent({
        model: env.geminiModel,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseJsonSchema
        }
      });

      nextKeyIndex = (keyIndex + 1) % totalKeys;

      return response.text;
    } catch (error) {
      lastError = error;

      if (!isRateLimitError(error) || attempt === 2) {
        throw error;
      }

      logger?.warn?.(`Gemini key ${keyIndex + 1} hit 429. Rotating to the next key.`);
      await sleep(BACKOFF_BASE_MS * 2 ** attempt);
    }
  }

  throw lastError;
}

export async function analyzeResumeWithGemini({
  resumeText,
  jobDescription,
  redisService,
  geminiKeys,
  clientFactory,
  logger = console
}) {
  const prompt = buildPrompt({ resumeText, jobDescription });
  const promptHash = createPromptHash(prompt);
  const cacheKey = `gemini_analysis:${promptHash}`;

  if (redisService) {
    const cachedResult = await redisService.get(cacheKey);

    if (cachedResult) {
      try {
        const parsedCachedResult = analysisSchema.safeParse(JSON.parse(cachedResult));

        if (parsedCachedResult.success) {
          return {
            analysis: {
              ...parsedCachedResult.data,
              companyName: parsedCachedResult.data.companyName || null
            },
            cached: true,
            promptHash
          };
        }
      } catch (error) {
        logger?.warn?.('Cached Gemini response could not be parsed. Falling back to a live call.');
      }
    }
  }

  const geminiResponseText = await callGeminiWithRotation({
    prompt,
    keys: getGeminiKeys(geminiKeys),
    clientFactory,
    logger
  });

  let parsedAnalysis;

  try {
    parsedAnalysis = analysisSchema.parse(JSON.parse(geminiResponseText));
  } catch (error) {
    const parseError = new Error('Gemini returned invalid structured JSON.');
    parseError.statusCode = 500;
    throw parseError;
  }

  if (redisService) {
    await redisService.set(cacheKey, JSON.stringify(parsedAnalysis), CACHE_TTL_SECONDS);
  }

  return {
    analysis: {
      ...parsedAnalysis,
      companyName: parsedAnalysis.companyName || null
    },
    cached: false,
    promptHash
  };
}
