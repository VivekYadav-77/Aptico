import crypto from 'node:crypto';
import { and, desc, eq, gte, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { analyses, generatedContent } from '../db/schema.js';
import { env } from '../config/env.js';
import { requestQueue } from '../utils/requestQueue.js';
import { getGeminiKeys, callGeminiWithRotation } from '../utils/geminiClient.js';

const IDEMPOTENCY_WINDOW_MS = 60 * 1000;
const inflightRequests = new Map();

const learningPathSchema = z.array(
  z.object({
    skill: z.string().trim().min(1),
    total_honest_hours: z.number().int().positive(),
    sources: z.array(
      z.object({
        type: z.enum(['youtube', 'course', 'docs', 'site', 'bootcamp']),
        title: z.string().trim().min(1),
        url: z.string().trim().url(),
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
);

const interviewQuestionsSchema = z.array(z.string().trim().min(1)).length(5);

const PROMPT_PREAMBLE = [
  'You must strictly follow the output format. Any deviation will break the system using your response.',
  'Do not include markdown, JSON, code blocks, or extra explanations.',
  '',
  'IMPORTANT:',
  'You are generating output for a system that processes multiple requests with shared context.',
  'Be concise, deterministic, and avoid unnecessary verbosity.',
  '',
  'Consistency Rule:',
  'For the same input, always produce the same structure and similar wording.',
  'Do not vary formatting, section names, or ordering.',
  '',
  'Do not generate generic advice. Every point must be tied to the provided resume, job description, or gap analysis.',
  ''
].join('\n');

function createServiceError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function getModelForContentType(contentType) {
  if (contentType === 'rejection_reasons') {
    return env.geminiModel1;
  }

  return env.geminiModel2;
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
      PROMPT_PREAMBLE,
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
      PROMPT_PREAMBLE,
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
      PROMPT_PREAMBLE,
      'Generate interview questions tailored to the provided job description.',
      'Return only a JSON array of exactly 5 strings.',
      `Job description: ${analysis.jdText}`,
      `Gap analysis JSON: ${gapSummary}`,
      'Each question must be specific to this job description and useful for interview preparation.'
    ].join('\n');
  }

  if (contentType === 'learning_path') {
    return [
      PROMPT_PREAMBLE,
      'Create a skill gap learning path from the gap analysis JSON below.',
      'Return only valid JSON matching the provided schema.',
      '',
      `Resume text: ${analysis.resumeText}`,
      `Job description: ${jobDescription}`,
      `Gap analysis JSON: ${gapSummary}`,
      '',
      'For EACH missing skill from the gap analysis:',
      '',
      '1. total_honest_hours:',
      '   - Must be realistic (no underestimation).',
      '   - If skill requires deep understanding, assign 50–120 hours.',
      '',
      '2. sources (MANDATORY COMPOSITION):',
      '   - At least 1 YouTube resource (type: "youtube").',
      '   - At least 1 official documentation link (type: "docs").',
      '   - At least 1 free course from freeCodeCamp / Coursera free / Odin Project / MDN etc. (type: "course").',
      '   - At least 1 bootcamp-style resource (type: "bootcamp").',
      '   - Correctly mark free: true or false.',
      '',
      '3. day_plan:',
      '   - Each entry MUST be a concrete task, not a topic.',
      '   - BAD: "Learn React basics"',
      '   - GOOD: "Watch React hooks video and build a counter app"',
      '   - Duration MUST be between 30 and 90 minutes.',
      '',
      '4. self_study_prompt:',
      '   - MUST include: skill name, user\'s current level (infer from resume), target level (from job description).',
      '   - MUST instruct an AI tutor to: teach step-by-step, ask questions, give exercises, adapt based on answers.'
    ].join('\n');
  }

  if (contentType === 'rejection_reasons') {
    return [
      PROMPT_PREAMBLE,
      'Simulate both an ATS (automated tracking system) scan and a human recruiter eye scan of the resume.',
      'Return ONLY plain text. NO markdown, NO JSON, NO extra commentary.',
      '',
      'The output MUST EXACTLY follow this format:',
      '',
      'ATS SCAN',
      '- <point>',
      '- <point>',
      '',
      'RECRUITER SCAN (first 10 seconds)',
      '- <point>',
      '- <point>',
      '',
      'VERDICT',
      '<single paragraph>',
      '',
      'STRICT RULES:',
      '- Do NOT add any headings other than the three above.',
      '- Do NOT add explanations before or after the sections.',
      '- Each bullet must be specific and reference exact resume issues.',
      '- You MUST quote or describe exact resume lines causing rejection.',
      '- Tone must be blunt and direct.',
      '- NEVER use phrases like "consider improving", "you may want to", or "try to".',
      '',
      `Resume text: ${analysis.resumeText}`,
      `Job description: ${jobDescription}`,
      `Gap analysis JSON: ${gapSummary}`,
      '',
      'Be specific, blunt, and name exact lines from the resume where problems occur.',
      'Do NOT sugarcoat. Say what is wrong directly.'
    ].join('\n');
  }

  if (contentType === 'salary_coach') {
    return [
      PROMPT_PREAMBLE,
      'Estimate a realistic salary/stipend range for this exact role and company based on the job description, role title, required skills, and company size signals.',
      'Return ONLY plain text. NO markdown, NO JSON, NO extra commentary.',
      '',
      'The output MUST EXACTLY follow this format:',
      '',
      'ESTIMATED RANGE',
      '₹<min>–₹<max> (or LPA format if full-time)',
      '',
      'WHY THIS RANGE',
      '<2–3 sentences>',
      '',
      'YOUR NEGOTIATION POSITION',
      '<STRONG | NEUTRAL | WEAK>: <one short explanation>',
      '',
      'EXACT PHRASES TO USE',
      '1. <email sentence>',
      '2. <call sentence>',
      '3. <counter-offer sentence>',
      '',
      'WHAT NOT TO SAY',
      '1. <bad phrase>',
      '2. <bad phrase>',
      '',
      'STRICT RULES:',
      '- Do NOT add extra sections.',
      '- Do NOT explain outside the format.',
      '- Keep phrases natural, not robotic.',
      '- Negotiation position MUST start with STRONG / NEUTRAL / WEAK in uppercase.',
      '- Base the salary range on the JD signals, not generic averages.',
      '',
      `Resume text: ${analysis.resumeText}`,
      `Target company: ${companyName}`,
      `Target role: ${roleTitle}`,
      `Job description: ${jobDescription}`,
      `Gap analysis JSON: ${gapSummary}`
    ].join('\n');
  }

  throw createServiceError('Unsupported content type.', 400);
}

function getConfigForContentType(contentType) {
  if (contentType === 'learning_path') {
    return {
      responseMimeType: 'application/json',
      responseJsonSchema: {
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
      }
    };
  }

  if (contentType === 'interview_questions') {
    return {
      responseMimeType: 'application/json',
      responseJsonSchema: {
        type: 'array',
        minItems: 5,
        maxItems: 5,
        items: {
          type: 'string'
        }
      }
    };
  }

  return undefined;
}

function parseGeneratedOutput(contentType, rawText) {
  if (contentType === 'rejection_reasons') {
    return String(rawText).trim();
  }

  if (contentType === 'salary_coach') {
    return String(rawText).trim();
  }

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
    const model = getModelForContentType(contentType);
    const config = getConfigForContentType(contentType);
    const keys = getGeminiKeys(geminiKeys);

    const rawText = await requestQueue.enqueue(() =>
      callGeminiWithRotation({
        prompt,
        model,
        keys,
        clientFactory,
        logger,
        config
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
