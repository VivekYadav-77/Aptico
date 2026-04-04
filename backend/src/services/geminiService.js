import crypto from 'node:crypto';
import { z } from 'zod';
import { env } from '../config/env.js';
import { createGeminiClient, isRateLimitError, sleep } from '../utils/geminiClient.js';

const CACHE_TTL_SECONDS = 2 * 60 * 60;
const STAGE_TIMEOUT_MS = 20_000;

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const sharedContextSchema = z.object({
  skillsPresent: z.array(z.string()),
  skillsMissing: z.array(z.string()),
  toneAssessment: z.string(),
  seniorityLevel: z.string(),
  jobDomain: z.string(),
  companyName: z.string(),
  strongestMatch: z.string(),
  estimatedYoe: z.number()
});

const stage1Schema = z.object({
  sharedContext: sharedContextSchema,
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

const stage2Schema = z.object({
  interviewQuestions: z.array(z.string().trim().min(1)).min(5).max(5),
  rejectionReasons: z.string().trim().min(1),
  salaryCoach: z.string().trim().min(1)
});

const stage3Schema = z.object({
  learningPath: z.array(
    z.object({
      skill: z.string().trim().min(1),
      total_honest_hours: z.number().int().positive(),
      sources: z.array(
        z.object({
          type: z.enum(['youtube', 'course', 'docs', 'site', 'bootcamp']),
          title: z.string().trim().min(1),
          url: z.string().trim().min(1),
          free: z.boolean()
        })
      ).min(1),
      day_plan: z.array(
        z.object({
          day: z.number().int().positive(),
          goal: z.string().trim().min(1),
          duration_minutes: z.number().int().positive()
        })
      ).min(1),
      self_study_prompt: z.string().trim().min(1)
    })
  ),
  coldEmail: z.string().trim().min(1)
});

// ─── JSON schemas for Gemini structured output ────────────────────────────────

const stage1JsonSchema = {
  type: 'object',
  required: ['sharedContext', 'confidenceScore', 'summary', 'keywordMismatches', 'seniorityMismatches', 'rewriteSuggestions'],
  properties: {
    sharedContext: {
      type: 'object',
      required: ['skillsPresent', 'skillsMissing', 'toneAssessment', 'seniorityLevel', 'jobDomain', 'companyName', 'strongestMatch', 'estimatedYoe'],
      properties: {
        skillsPresent: { type: 'array', items: { type: 'string' } },
        skillsMissing: { type: 'array', items: { type: 'string' } },
        toneAssessment: { type: 'string' },
        seniorityLevel: { type: 'string' },
        jobDomain: { type: 'string' },
        companyName: { type: 'string' },
        strongestMatch: { type: 'string' },
        estimatedYoe: { type: 'number' }
      }
    },
    confidenceScore: { type: 'integer', minimum: 0, maximum: 100 },
    summary: { type: 'string' },
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

const stage2JsonSchema = {
  type: 'object',
  required: ['interviewQuestions', 'rejectionReasons', 'salaryCoach'],
  properties: {
    interviewQuestions: {
      type: 'array',
      minItems: 5,
      maxItems: 5,
      items: { type: 'string' }
    },
    rejectionReasons: { type: 'string' },
    salaryCoach: { type: 'string' }
  }
};

const stage3JsonSchema = {
  type: 'object',
  required: ['learningPath', 'coldEmail'],
  properties: {
    learningPath: {
      type: 'array',
      items: {
        type: 'object',
        required: ['skill', 'total_honest_hours', 'sources', 'day_plan', 'self_study_prompt'],
        properties: {
          skill: { type: 'string' },
          total_honest_hours: { type: 'integer' },
          sources: {
            type: 'array',
            items: {
              type: 'object',
              required: ['type', 'title', 'url', 'free'],
              properties: {
                type: { type: 'string', enum: ['youtube', 'course', 'docs', 'site', 'bootcamp'] },
                title: { type: 'string' },
                url: { type: 'string' },
                free: { type: 'boolean' }
              }
            }
          },
          day_plan: {
            type: 'array',
            items: {
              type: 'object',
              required: ['day', 'goal', 'duration_minutes'],
              properties: {
                day: { type: 'integer' },
                goal: { type: 'string' },
                duration_minutes: { type: 'integer' }
              }
            }
          },
          self_study_prompt: { type: 'string' }
        }
      }
    },
    coldEmail: { type: 'string' }
  }
};

// ─── Prompt builders ──────────────────────────────────────────────────────────

function buildStage1Prompt(resumeText, jobDescription) {
  return [
    'You are Aptico, an AI career analysis engine.',
    'Analyze the resume against the job description and return only valid JSON matching the provided schema.',
    '',
    'You MUST do ALL of the following in a single response:',
    '',
    '1. Extract a "sharedContext" object with these fields:',
    '   - skillsPresent: array of skills found in the resume',
    '   - skillsMissing: array of skills required by the JD but absent from the resume',
    '   - toneAssessment: brief assessment of resume tone and writing quality',
    '   - seniorityLevel: detected seniority level (e.g. "Junior", "Mid-Level", "Senior")',
    '   - jobDomain: job domain and role type (e.g. "Backend Engineering")',
    '   - companyName: company name if found in JD, otherwise "Unknown"',
    '   - strongestMatch: the single strongest skill match between resume and JD',
    '   - estimatedYoe: estimated years of experience as a number',
    '',
    '2. Produce "confidenceScore" (integer 0-100) and "summary" (paragraph).',
    '',
    '3. Produce "keywordMismatches": array of missing keyword objects with keyword, jobRequirement, resumeEvidence, importance.',
    '',
    '4. Produce "seniorityMismatches": array of level gap objects with topic, resumeLevel, targetLevel, explanation.',
    '',
    '5. Produce "rewriteSuggestions": array of bullet rewrite objects with original, rewritten, reason.',
    '',
    'Resume:',
    resumeText,
    '',
    'Job Description:',
    jobDescription
  ].join('\n');
}

function buildStage2Prompt(sharedContext) {
  const ctx = JSON.stringify(sharedContext);
  return [
    'You are Aptico, an AI career analysis engine.',
    'You are given a shared context object extracted from a prior resume + JD analysis. Use ONLY this context — do not request the raw resume or JD.',
    'Return only valid JSON matching the provided schema.',
    '',
    'Produce exactly three fields:',
    '',
    '1. "interviewQuestions": Array of exactly 5 likely interview questions specific to this role and these skill gaps.',
    '',
    '2. "rejectionReasons": A plain text string (NO markdown, NO JSON) that simulates both an ATS scan and a human recruiter eye scan. The output MUST follow this format:',
    'ATS SCAN',
    '- <point>',
    'RECRUITER SCAN (first 10 seconds)',
    '- <point>',
    'VERDICT',
    '<single paragraph>',
    'Be specific, blunt, and reference exact issues.',
    '',
    '3. "salaryCoach": A plain text string (NO markdown, NO JSON) that follows this format:',
    'ESTIMATED RANGE',
    '₹<min>–₹<max>',
    'WHY THIS RANGE',
    '<2-3 sentences>',
    'YOUR NEGOTIATION POSITION',
    '<STRONG | NEUTRAL | WEAK>: <explanation>',
    'EXACT PHRASES TO USE',
    '1. <phrase>',
    '2. <phrase>',
    '3. <phrase>',
    'WHAT NOT TO SAY',
    '1. <bad phrase>',
    '2. <bad phrase>',
    '',
    'Shared Context:',
    ctx
  ].join('\n');
}

function buildStage3Prompt(sharedContext) {
  const ctx = JSON.stringify(sharedContext);
  return [
    'You are Aptico, an AI career analysis engine.',
    'You are given a shared context object extracted from a prior resume + JD analysis. Use ONLY this context — do not request the raw resume or JD.',
    'Return only valid JSON matching the provided schema.',
    '',
    'Produce exactly two fields:',
    '',
    '1. "learningPath": For EACH missing skill in the context, produce an object with:',
    '   - skill: the missing skill name',
    '   - total_honest_hours: realistic hours needed (50-120 for deep skills)',
    '   - sources: array of resources with at least 1 YouTube, 1 docs, 1 free course, 1 bootcamp. Each has type, title, url, free.',
    '   - day_plan: array of daily tasks (concrete, not vague). Each has day, goal, duration_minutes (30-90).',
    '   - self_study_prompt: a prompt the user can paste into an AI tutor. Include skill name, current level, target level.',
    '',
    '2. "coldEmail": A plain text personalized cold email to the hiring manager. Use the company name, role domain, and strongest matching skill from the context. No markdown. No placeholders.',
    '',
    'Shared Context:',
    ctx
  ].join('\n');
}

// ─── Call helper with fallback and timeout ────────────────────────────────────

async function callGeminiStage({ apiKey, fallbackKey, model, prompt, config, logger }) {
  const keys = [apiKey, fallbackKey].filter(Boolean);

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const client = createGeminiClient(key);

    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Gemini call timed out after 20 seconds.')), STAGE_TIMEOUT_MS);
      });

      const callPromise = client.models.generateContent({ model, contents: prompt, config });
      const response = await Promise.race([callPromise, timeoutPromise]);
      return typeof response.text === 'function' ? response.text() : response.text;
    } catch (error) {
      if (i === 0 && fallbackKey && (isRateLimitError(error) || error.message?.includes('timed out'))) {
        logger?.warn?.(`Stage key failed (${error.message}). Retrying with fallback key.`);
        await sleep(200);
        continue;
      }
      throw error;
    }
  }

  throw new Error('All Gemini keys exhausted for this stage.');
}

// ─── Public staged analysis functions ────────────────────────────────────────

export async function runStage1({ resumeText, jobDescription, logger = console }) {
  const prompt = buildStage1Prompt(resumeText, jobDescription);

  const rawText = await callGeminiStage({
    apiKey: env.geminiKey1,
    fallbackKey: env.geminiKeyFallback,
    model: env.geminiModel1,
    prompt,
    config: { responseMimeType: 'application/json', responseJsonSchema: stage1JsonSchema },
    logger
  });

  try {
    return stage1Schema.parse(JSON.parse(rawText));
  } catch (error) {
    const parseError = new Error('This section could not be generated. Please try again.');
    parseError.statusCode = 500;
    throw parseError;
  }
}

export async function runStage2({ sharedContext, logger = console }) {
  const prompt = buildStage2Prompt(sharedContext);

  const rawText = await callGeminiStage({
    apiKey: env.geminiKey2,
    fallbackKey: env.geminiKeyFallback,
    model: env.geminiModel2,
    prompt,
    config: { responseMimeType: 'application/json', responseJsonSchema: stage2JsonSchema },
    logger
  });

  try {
    return stage2Schema.parse(JSON.parse(rawText));
  } catch (error) {
    const parseError = new Error('This section could not be generated. Please try again.');
    parseError.statusCode = 500;
    throw parseError;
  }
}

export async function runStage3({ sharedContext, logger = console }) {
  const prompt = buildStage3Prompt(sharedContext);

  const rawText = await callGeminiStage({
    apiKey: env.geminiKey3,
    fallbackKey: env.geminiKeyFallback,
    model: env.geminiModel3,
    prompt,
    config: { responseMimeType: 'application/json', responseJsonSchema: stage3JsonSchema },
    logger
  });

  try {
    return stage3Schema.parse(JSON.parse(rawText));
  } catch (error) {
    const parseError = new Error('This section could not be generated. Please try again.');
    parseError.statusCode = 500;
    throw parseError;
  }
}

// ─── Legacy single-shot analysis (kept for applyKitService compatibility) ────

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
    companyName: { type: 'string' },
    confidenceScore: { type: 'integer', minimum: 0, maximum: 100 },
    summary: { type: 'string' },
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

export async function analyzeResumeWithGemini({
  resumeText,
  jobDescription,
  redisService,
  geminiKeys,
  clientFactory,
  logger = console
}) {
  const { getGeminiKeys, callGeminiWithRotation } = await import('../utils/geminiClient.js');

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
    model: env.geminiModel1,
    keys: getGeminiKeys(geminiKeys),
    clientFactory,
    logger,
    config: {
      responseMimeType: 'application/json',
      responseJsonSchema
    }
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
