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
      `You are writing a tailored, professional cover letter that will be read by a real hiring manager at ${companyName}.`,
      'Return only the final letter text. No markdown. No placeholders. No "Dear Hiring Manager" if you can infer a specific name from the job description.',
      'Structure the letter in three paragraphs:',
      'Paragraph 1: Open with a specific observation about the company or role that shows genuine research. State the role you are applying for. Do not open with "I am writing to apply".',
      'Paragraph 2: Connect the candidate strongest relevant experience directly to the top skill requirement in the job description. Use one concrete example with a result if possible. Use the gap analysis to identify and briefly address the most important gap honestly — do not hide it, reframe it as a growth trajectory.',
      'Paragraph 3: Express specific enthusiasm for this role at this company. End with a direct, confident call to action for an interview.',
      'Tone: professional, confident, specific. Not generic. Not sycophantic.',
      `Target company: ${companyName}`,
      `Target role: ${roleTitle}`,
      `Job description: ${jobDescription}`,
      `Resume summary: ${analysis.resumeText}`,
      `Gap analysis: ${gapSummary}`,
      '',
      // 'You are writing a tailored cover letter for Aptico.',
      // 'Return only the final cover letter text. No markdown. No placeholders.',
      // `Target company: ${companyName}`,
      // `Target role: ${roleTitle}`,
      // `Job description: ${jobDescription}`,
      // `Resume summary: ${analysis.resumeText}`,
      // `Gap analysis JSON: ${gapSummary}`,
      // 'Use the gap analysis to address strengths, close gaps honestly, and keep the letter context-aware.'
    ].join('\n');
  }

  if (contentType === 'cold_email') {
    return [
      PROMPT_PREAMBLE,
      `You are writing a concise cold email to the hiring manager or recruiter at ${companyName}.`,
      'Return only the email body. No subject line. No markdown. No placeholders.Under 150 words. Every sentence must earn its place.',
      'Structure: one opening sentence that references the specific role or a signal from the JD showing you read it carefully, one sentence stating your strongest relevant skill with a concrete example, one sentence that proactively addresses your biggest gap and what you are actively doing about it, one direct ask — a 15-minute call or an interview — with a specific time offer.',
      'Do not use phrases like "I hope this email finds you well" or "I am very passionate about".',
      'Tone: confident, direct, human.',
      `Target company: ${companyName}`,
      `Target role: ${roleTitle}`,
      `Job description: ${jobDescription}`,
      `Resume summary: ${analysis.resumeText}`,
      `Gap analysis: ${gapSummary}`,
      '',
      // 'You are writing a concise, personalized cold email for a job application.',
      // 'Return only the final email body text. No subject line. No markdown. No placeholders.',
      // `Target company: ${companyName}`,
      // `Target role: ${roleTitle}`,
      // `Job description: ${jobDescription}`,
      // `Resume summary: ${analysis.resumeText}`,
      // `Gap analysis JSON: ${gapSummary}`,
      // 'Keep it direct, polished, and clearly tied to the provided role context.'
    ].join('\n');
  }

  if (contentType === 'interview_questions') {
    return [
      PROMPT_PREAMBLE,
      'Generate exactly 5 interview questions for a candidate applying for this specific role.',
      'Return only a JSON array of exactly 5 strings.',
      'Rules for question quality:',
      '- At least 2 questions must be technical and probe the specific skills listed in the job description',
      '- At least 1 question must be behavioral and reference a gap identified in the gap analysis',
      '- At least 1 question must be about system thinking or decision-making relevant to this role domain',
      '- No generic questions. "Tell me about yourself" or "What is your greatest weakness" are not acceptable.',
      '- Each question must be something a real senior interviewer at this company would ask.',
      `Job description: ${jobDescription}`,
      `Gap analysis: ${gapSummary}`,
      '',
      // 'Generate interview questions tailored to the provided job description.',
      // 'Return only a JSON array of exactly 5 strings.',
      // `Job description: ${analysis.jdText}`,
      // `Gap analysis JSON: ${gapSummary}`,
      // 'Each question must be specific to this job description and useful for interview preparation.'
    ].join('\n');
  }

  if (contentType === 'learning_path') {
    return [
      PROMPT_PREAMBLE,
      'Create a realistic skill gap learning path based on the gap analysis.Return only valid JSON matching the provided schema.',
      'For each missing skill from the gap analysis apply these rules:',
      'total_honest_hours: Be genuinely honest. Do not round down to seem encouraging. Assign 50 to 120 hours for languages, frameworks, and deep technical concepts. Assign 10 to 30 hours for tools and platforms.',
      'sources: Provide only real, specific resources with working URLs.',
      '- At least 1 YouTube playlist or specific video, not a channel homepage',
      '- At least 1 official documentation URL',
      '- At least 1 free course from freeCodeCamp, The Odin Project, CS50, Coursera free audit, or equivalent',
      '- At least 1 structured bootcamp-style resource',
      'day_plan: Every entry must be a concrete task describing what to build, watch, or practice. Never a topic. Duration between 30 and 90 minutes.',
      'BAD: "Learn SQL basics" GOOD: "Complete SQLZoo SELECT exercises sections 1 to 4 and write 5 custom queries against a sample dataset (60 minutes)"',
      'self_study_prompt: A complete prompt ready to paste into an AI tutor including skill name, current level inferred from resume, target level from JD, and instructions to teach step by step, ask questions, give exercises, and adapt difficulty.',
      `Resume text: ${analysis.resumeText}`,
      `Job description: ${jobDescription}`,
      `Gap analysis: ${gapSummary}`,
      '',
      // 'Create a skill gap learning path from the gap analysis JSON below.',
      // 'Return only valid JSON matching the provided schema.',
      // '',
      // `Resume text: ${analysis.resumeText}`,
      // `Job description: ${jobDescription}`,
      // `Gap analysis JSON: ${gapSummary}`,
      // '',
      // 'For EACH missing skill from the gap analysis:',
      // '',
      // '1. total_honest_hours:',
      // '   - Must be realistic (no underestimation).',
      // '   - If skill requires deep understanding, assign 50–120 hours.',
      // '',
      // '2. sources (MANDATORY COMPOSITION):',
      // '   - At least 1 YouTube resource (type: "youtube").',
      // '   - At least 1 official documentation link (type: "docs").',
      // '   - At least 1 free course from freeCodeCamp / Coursera free / Odin Project / MDN etc. (type: "course").',
      // '   - At least 1 bootcamp-style resource (type: "bootcamp").',
      // '   - Correctly mark free: true or false.',
      // '',
      // '3. day_plan:',
      // '   - Each entry MUST be a concrete task, not a topic.',
      // '   - BAD: "Learn React basics"',
      // '   - GOOD: "Watch React hooks video and build a counter app"',
      // '   - Duration MUST be between 30 and 90 minutes.',
      // '',
      // '4. self_study_prompt:',
      // '   - MUST include: skill name, user\'s current level (infer from resume), target level (from job description).',
      // '   - MUST instruct an AI tutor to: teach step-by-step, ask questions, give exercises, adapt based on answers.'
    ].join('\n');
  }

  if (contentType === 'rejection_reasons') {
    return [
      PROMPT_PREAMBLE,
      'Simulate an ATS scan and a human recruiter eye scan of this exact resume for this exact role.',
      'Return only plain text. No markdown. No JSON. No commentary outside the format.The output must follow exactly this structure with no additions or changes to section headers:',
      '',
      'ATS SCAN',
      '- [point referencing a specific missing keyword, formatting issue, or structural problem]',
      '- [point]',
      '- [point]',
      '',
      'RECRUITER SCAN (first 10 seconds)',
      '- [point referencing something immediately visible — visual hierarchy, bullet quality, role relevance, length]',
      '- [point]',
      '- [point]',
      '',
      'VERDICT',
      '[One paragraph. Name the single most damaging issue. State exactly what must change before this resume is resubmitted. Be direct. No softening language. Do not use "consider", "may want to", or "try to".]',
      '',
      'Resume text: [resumeText]',
      'Job description: [jobDescription]',
      'Gap analysis: [gapSummary]',
      '',
      'For salary_coach:',
      'Estimate a realistic salary range for this exact role, company size signals, and candidate profile.',
      'Return only plain text. No markdown. No JSON. No commentary outside the format.Output must follow exactly this structure:',
      '',
      '',

      // 'Simulate both an ATS (automated tracking system) scan and a human recruiter eye scan of the resume.',
      // 'Return ONLY plain text. NO markdown, NO JSON, NO extra commentary.',
      // '',
      // 'The output MUST EXACTLY follow this format:',
      // '',
      // 'ATS SCAN',
      // '- <point>',
      // '- <point>',
      // '',
      // 'RECRUITER SCAN (first 10 seconds)',
      // '- <point>',
      // '- <point>',
      // '',
      // 'VERDICT',
      // '<single paragraph>',
      // '',
      // 'STRICT RULES:',
      // '- Do NOT add any headings other than the three above.',
      // '- Do NOT add explanations before or after the sections.',
      // '- Each bullet must be specific and reference exact resume issues.',
      // '- You MUST quote or describe exact resume lines causing rejection.',
      // '- Tone must be blunt and direct.',
      // '- NEVER use phrases like "consider improving", "you may want to", or "try to".',
      // '',
      // `Resume text: ${analysis.resumeText}`,
      // `Job description: ${jobDescription}`,
      // `Gap analysis JSON: ${gapSummary}`,
      // '',
      // 'Be specific, blunt, and name exact lines from the resume where problems occur.',
      // 'Do NOT sugarcoat. Say what is wrong directly.'
    ].join('\n');
  }

  if (contentType === 'salary_coach') {
    return [
      PROMPT_PREAMBLE,
      'Estimate a realistic salary range for this exact role, company size signals, and candidate profile.',
      'Return only plain text. No markdown. No JSON. No commentary outside the format.Output must follow exactly this structure:',
      '',
      'ESTIMATED RANGE :₹[min]–₹[max] per month (or [X]–[Y] LPA if annual full-time)',
      '',
      'WHY THIS RANGE:[2 to 3 sentences. Base this on the role domain, required skills, seniority level, and company signals from the JD. Do not cite generic industry averages.]',
      '',
      'YOUR NEGOTIATION POSITION[STRONG | NEUTRAL | WEAK]: [One sentence. Reference the candidate strongest skill or most critical gap as the reason.]',
      '',
      'EXACT PHRASES TO USE',
      '1. [Email opening sentence for salary discussion]',
      '2. [Spoken sentence for a call]',
      '3. [Counter-offer sentence if they go below range]',
      '',
      'WHAT NOT TO SAY',
      '1. [Phrase that signals desperation]',
      '2. [Phrase that weakens negotiating position]',
      '',
      `Resume text: ${resumeText}`,
      `Target company: ${companyName}`,
      `Target role: ${roleTitle}`,
      `Job description: ${jobDescription}`,
      `Gap analysis: ${gapSummary}`,
      '',


      // 'Estimate a realistic salary/stipend range for this exact role and company based on the job description, role title, required skills, and company size signals.',
      // 'Return ONLY plain text. NO markdown, NO JSON, NO extra commentary.',
      // '',
      // 'The output MUST EXACTLY follow this format:',
      // '',
      // 'ESTIMATED RANGE',
      // '₹<min>–₹<max> (or LPA format if full-time)',
      // '',
      // 'WHY THIS RANGE',
      // '<2–3 sentences>',
      // '',
      // 'YOUR NEGOTIATION POSITION',
      // '<STRONG | NEUTRAL | WEAK>: <one short explanation>',
      // '',
      // 'EXACT PHRASES TO USE',
      // '1. <email sentence>',
      // '2. <call sentence>',
      // '3. <counter-offer sentence>',
      // '',
      // 'WHAT NOT TO SAY',
      // '1. <bad phrase>',
      // '2. <bad phrase>',
      // '',
      // 'STRICT RULES:',
      // '- Do NOT add extra sections.',
      // '- Do NOT explain outside the format.',
      // '- Keep phrases natural, not robotic.',
      // '- Negotiation position MUST start with STRONG / NEUTRAL / WEAK in uppercase.',
      // '- Base the salary range on the JD signals, not generic averages.',
      // '',
      // `Resume text: ${analysis.resumeText}`,
      // `Target company: ${companyName}`,
      // `Target role: ${roleTitle}`,
      // `Job description: ${jobDescription}`,
      // `Gap analysis JSON: ${gapSummary}`
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
