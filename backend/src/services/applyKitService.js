import crypto from 'node:crypto';
import { and, desc, eq, gte, isNull } from 'drizzle-orm';
import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { analyses, generatedContent } from '../db/schema.js';
import { env } from '../config/env.js';
import { requestQueue } from '../utils/requestQueue.js';

const IDEMPOTENCY_WINDOW_MS = 60 * 1000;
const BACKOFF_BASE_MS = 200;
const inflightRequests = new Map();
let nextKeyIndex = 0;

const learningPathSchema = z.array(
  z.object({
    skill: z.string().trim().min(1),
    resource_url: z.string().trim().url(),
    estimated_hours: z.number().int().positive()
  })
);

const interviewQuestionsSchema = z.array(z.string().trim().min(1)).length(5);

function sleep(durationMs) {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
}

function createServiceError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function getGeminiKeys(keys = env.geminiKeys) {
  const availableKeys = (keys || []).filter(Boolean);

  if (!availableKeys.length) {
    throw createServiceError('Gemini keys are not configured yet.', 503);
  }

  return availableKeys;
}

function createGeminiClient(apiKey, clientFactory) {
  if (clientFactory) {
    return clientFactory(apiKey);
  }

  return new GoogleGenAI({ apiKey });
}

function isRateLimitError(error) {
  return error?.status === 429 || error?.code === 429 || error?.response?.status === 429;
}

function buildIdempotencyKey(userId, analysisId, contentType) {
  return crypto
    .createHash('sha256')
    .update(`${userId || 'guest'}:${analysisId}:${contentType}`)
    .digest('hex');
}

function normalizeContentRow(row) {
  if (!row) {
    return null;
  }

  let content = row.contentText;

  if (row.contentType === 'learning_path' || row.contentType === 'interview_questions') {
    try {
      content = JSON.parse(row.contentText);
    } catch (error) {
      content = row.contentText;
    }
  }

  return {
    id: row.id,
    analysisId: row.analysisId,
    contentType: row.contentType,
    content,
    jobId: row.jobId,
    createdAt: row.createdAt
  };
}

async function findAnalysis(db, analysisId) {
  const rows = await db.select().from(analyses).where(eq(analyses.id, analysisId)).limit(1);
  return rows[0] || null;
}

async function findExistingGeneratedContent(db, { analysisId, contentType, userId }) {
  const cutoff = new Date(Date.now() - IDEMPOTENCY_WINDOW_MS);
  const rows = await db
    .select({
      id: generatedContent.id,
      analysisId: generatedContent.analysisId,
      contentType: generatedContent.contentType,
      contentText: generatedContent.contentText,
      jobId: generatedContent.jobId,
      createdAt: generatedContent.createdAt
    })
    .from(generatedContent)
    .innerJoin(analyses, eq(generatedContent.analysisId, analyses.id))
    .where(
      and(
        eq(generatedContent.analysisId, analysisId),
        eq(generatedContent.contentType, contentType),
        gte(generatedContent.createdAt, cutoff),
        userId ? eq(analyses.userId, userId) : isNull(analyses.userId)
      )
    )
    .orderBy(desc(generatedContent.createdAt))
    .limit(1);

  return normalizeContentRow(rows[0] || null);
}

function buildPrompt({ analysis, contentType, jobContext }) {
  const gapSummary = JSON.stringify(analysis.gapAnalysisJson || {});
  const companyName = jobContext.company || analysis.companyName || 'the company';
  const roleTitle = jobContext.jobTitle || 'the role';
  const jobDescription = jobContext.jobDescription || analysis.jdText;

  if (contentType === 'cover_letter') {
    return [
      'You are writing a tailored cover letter for Aptico.',
      'Return only the final cover letter text. No markdown. No placeholders.',
      `Target company: ${companyName}`,
      `Target role: ${roleTitle}`,
      `Job description: ${jobDescription}`,
      `Resume summary: ${analysis.resumeText}`,
      `Gap analysis JSON: ${gapSummary}`,
      'Use the gap analysis to address strengths, close gaps honestly, and keep the letter context-aware.'
    ].join('\n');
  }

  if (contentType === 'cold_email') {
    return [
      'You are writing a concise, personalized cold email for a job application.',
      'Return only the final email body text. No subject line. No markdown. No placeholders.',
      `Target company: ${companyName}`,
      `Target role: ${roleTitle}`,
      `Job description: ${jobDescription}`,
      `Resume summary: ${analysis.resumeText}`,
      `Gap analysis JSON: ${gapSummary}`,
      'Keep it direct, polished, and clearly tied to the provided role context.'
    ].join('\n');
  }

  if (contentType === 'interview_questions') {
    return [
      'Generate interview questions tailored to the provided job description.',
      'Return only a JSON array of exactly 5 strings.',
      `Job description: ${analysis.jdText}`,
      `Gap analysis JSON: ${gapSummary}`,
      'Each question must be specific to this job description and useful for interview preparation.'
    ].join('\n');
  }

  if (contentType === 'learning_path') {
    return [
      'Create a skill gap learning path from the gap analysis JSON.',
      'Return only valid JSON with this exact structure: [{ "skill": string, "resource_url": string, "estimated_hours": number }]',
      `Gap analysis JSON: ${gapSummary}`,
      'Focus on the missing skills implied by the analysis and give realistic public resource URLs.'
    ].join('\n');
  }

  throw createServiceError('Unsupported content type.', 400);
}

async function callGemini({ prompt, contentType, geminiKeys, clientFactory, logger }) {
  const keys = getGeminiKeys(geminiKeys);
  const startIndex = nextKeyIndex % keys.length;
  let lastError = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const keyIndex = (startIndex + attempt) % keys.length;
    const client = createGeminiClient(keys[keyIndex], clientFactory);

    try {
      const config =
        contentType === 'learning_path'
          ? {
              responseMimeType: 'application/json',
              responseJsonSchema: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['skill', 'resource_url', 'estimated_hours'],
                  properties: {
                    skill: { type: 'string' },
                    resource_url: { type: 'string' },
                    estimated_hours: { type: 'integer' }
                  }
                }
              }
            }
          : contentType === 'interview_questions'
            ? {
                responseMimeType: 'application/json',
                responseJsonSchema: {
                  type: 'array',
                  minItems: 5,
                  maxItems: 5,
                  items: {
                    type: 'string'
                  }
                }
              }
            : undefined;

      const response = await client.models.generateContent({
        model: env.geminiModel,
        contents: prompt,
        config
      });

      nextKeyIndex = (keyIndex + 1) % keys.length;
      return response.text;
    } catch (error) {
      lastError = error;

      if (!isRateLimitError(error) || attempt === 2) {
        throw error;
      }

      logger?.warn?.(`Apply Kit Gemini key ${keyIndex + 1} hit 429. Rotating to the next key.`);
      await sleep(BACKOFF_BASE_MS * 2 ** attempt);
    }
  }

  throw lastError;
}

function parseGeneratedOutput(contentType, rawText) {
  if (contentType === 'interview_questions') {
    try {
      return interviewQuestionsSchema.parse(JSON.parse(rawText));
    } catch (error) {
      throw createServiceError('Gemini returned invalid interview questions.', 500);
    }
  }

  if (contentType === 'learning_path') {
    try {
      return learningPathSchema.parse(JSON.parse(rawText));
    } catch (error) {
      throw createServiceError('Gemini returned invalid learning path JSON.', 500);
    }
  }

  const normalizedText = String(rawText || '').trim();

  if (!normalizedText || normalizedText.toLowerCase().includes('placeholder')) {
    throw createServiceError('Gemini returned invalid generated content.', 500);
  }

  return normalizedText;
}

function serializeGeneratedOutput(contentType, content) {
  if (contentType === 'interview_questions' || contentType === 'learning_path') {
    return JSON.stringify(content);
  }

  return content;
}

async function saveGeneratedContent(db, { analysisId, contentType, jobId, content }) {
  const insertedRows = await db
    .insert(generatedContent)
    .values({
      analysisId,
      contentType,
      contentText: serializeGeneratedOutput(contentType, content),
      jobId: jobId || null
    })
    .returning({
      id: generatedContent.id,
      analysisId: generatedContent.analysisId,
      contentType: generatedContent.contentType,
      contentText: generatedContent.contentText,
      jobId: generatedContent.jobId,
      createdAt: generatedContent.createdAt
    });

  return normalizeContentRow(insertedRows[0]);
}

export async function generateApplyKitContent({
  db,
  userId,
  analysisId,
  contentType,
  jobContext,
  geminiKeys,
  clientFactory,
  logger = console
}) {
  if (!db) {
    throw createServiceError('Database is not configured yet.', 503);
  }

  const analysis = await findAnalysis(db, analysisId);

  if (!analysis) {
    throw createServiceError('Analysis was not found.', 404);
  }

  if (analysis.userId && analysis.userId !== userId) {
    throw createServiceError('You do not have access to this analysis.', 403);
  }

  const idempotencyKey = buildIdempotencyKey(userId, analysisId, contentType);
  const existing = await findExistingGeneratedContent(db, {
    analysisId,
    contentType,
    userId: analysis.userId || null
  });

  if (existing) {
    return existing;
  }

  if (inflightRequests.has(idempotencyKey)) {
    return inflightRequests.get(idempotencyKey);
  }

  const task = (async () => {
    const prompt = buildPrompt({ analysis, contentType, jobContext });
    const rawText = await requestQueue.enqueue(() =>
      callGemini({
        prompt,
        contentType,
        geminiKeys,
        clientFactory,
        logger
      })
    );

    const parsedContent = parseGeneratedOutput(contentType, rawText);
    return saveGeneratedContent(db, {
      analysisId,
      contentType,
      jobId: jobContext.jobId,
      content: parsedContent
    });
  })();

  inflightRequests.set(idempotencyKey, task);

  try {
    return await task;
  } finally {
    inflightRequests.delete(idempotencyKey);
  }
}
