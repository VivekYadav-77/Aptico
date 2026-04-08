import { z } from 'zod';
import { analyses } from '../db/schema.js';
import { runStage1, runStage2, runStage3 } from '../services/geminiService.js';
import { runPrecheck } from '../services/precheckService.js';
import { decodePdfFile, parsePdfBuffer } from '../services/pdfService.js';
import { env } from '../config/env.js';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_JD_LENGTH = 10_000;
const requestSchema = z.object({
  file: z.object({
    name: z.string().trim().min(1),
    type: z.string().trim().min(1),
    size: z.number().int().positive(),
    contentBase64: z.string().trim().min(1)
  }),
  jobDescription: z.string().trim().min(1)
});

function stripHtml(text) {
  return text.replace(/<[^>]*>/g, '').trim();
}

function writeSSE(raw, event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  try {
    raw.write(payload);
  } catch (error) {
    // Client disconnected — swallow
  }
}

export async function analyzeController(request, reply) {
  const incomingFile = request.body?.file;
  console.log("in the analyze controller")

  // ── Input validation ────────────────────────────────────────────────────────
  if (incomingFile?.size > MAX_FILE_BYTES) {
    return reply.code(400).send({ success: false, error: 'File must be under 5 MB.' });
  }

  const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (incomingFile?.type && !allowedTypes.includes(incomingFile.type)) {
    return reply.code(400).send({ success: false, error: 'Only PDF and DOCX formats are accepted.' });
  }

  let body;
  try {
    body = requestSchema.parse(request.body || {});
  } catch (error) {
    return reply.code(400).send({ success: false, error: error.message || 'Invalid request body.' });
  }

  // Strip HTML from JD and enforce max length
  body.jobDescription = stripHtml(body.jobDescription);
  if (body.jobDescription.length > MAX_JD_LENGTH) {
    return reply.code(400).send({ success: false, error: `Job description must be under ${MAX_JD_LENGTH} characters.` });
  }

  let pdfBuffer;
  try {
    pdfBuffer = decodePdfFile(body.file);
  } catch (error) {
    return reply.code(400).send({ success: false, error: error.message || 'Invalid file.' });
  }

  if (pdfBuffer.length > MAX_FILE_BYTES) {
    return reply.code(400).send({ success: false, error: 'File must be under 5 MB.' });
  }

  let parsedPdf;
  try {
    parsedPdf = await parsePdfBuffer(pdfBuffer);
  } catch (error) {
    return reply.code(400).send({ success: false, error: 'Could not extract text from the file.' });
  }

  if (!parsedPdf.text) {
    return reply.code(400).send({ success: false, error: 'Could not extract text from the file.' });
  }

  // ── Set up SSE stream ─────────────────────────────────────────────────────
  const raw = reply.raw;
  raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': env.frontendUrl,
    'Access-Control-Allow-Credentials': 'true'
  });

  const resumeText = parsedPdf.text;
  const jobDescription = body.jobDescription;

  // ── Stage 0: Precheck ─────────────────────────────────────────────────────
  try {
    const precheck = await runPrecheck({ resumeText, jobDescription, logger: request.log });
    writeSSE(raw, 'precheck', { score: precheck.score, reason: precheck.reason, canProceed: precheck.canProceed });

    if (!precheck.canProceed) {
      writeSSE(raw, 'done', { totalFeatures: 0 });
      raw.end();
      return reply.hijack();
    }
  } catch (error) {
    request.log?.error?.('Precheck error:', error?.message);
    writeSSE(raw, 'precheck', { score: 100, reason: 'Precheck skipped.', canProceed: true });
  }

  // ── Stage 1: KEY_1 — sharedContext + Features 1, 2, 3 ────────────────────
  let sharedContext = null;
  try {
    const stage1 = await runStage1({ resumeText, jobDescription, logger: request.log });
    sharedContext = stage1.sharedContext;

    writeSSE(raw, 'stage1', {
      companyName: sharedContext.companyName,
      skillsPresent: sharedContext.skillsPresent,
      confidenceScore: stage1.confidenceScore,
      summary: stage1.summary,
      keywordMismatches: stage1.keywordMismatches,
      seniorityMismatches: stage1.seniorityMismatches,
      rewriteSuggestions: stage1.rewriteSuggestions
    });

    // Persist analysis to DB
    if (request.server.db) {
      try {
        const insertedRows = await request.server.db
          .insert(analyses)
          .values({
            userId: request.auth?.userId || null,
            resumeText,
            jdText: jobDescription,
            companyName: sharedContext.companyName,
            confidenceScore: stage1.confidenceScore,
            gapAnalysisJson: {
              confidenceScore: stage1.confidenceScore,
              summary: stage1.summary,
              companyName: sharedContext.companyName,
              skillsPresent: sharedContext.skillsPresent,
              keywordMismatches: stage1.keywordMismatches,
              seniorityMismatches: stage1.seniorityMismatches,
              rewriteSuggestions: stage1.rewriteSuggestions
            }
          })
          .returning({ id: analyses.id });

        const savedId = insertedRows[0]?.id || null;
        writeSSE(raw, 'analysisId', { id: savedId });
      } catch (dbError) {
        request.log?.error?.('DB insert failed:', dbError?.message);
      }
    }
  } catch (error) {
    request.log?.error?.('Stage 1 failed:', error?.message);
    writeSSE(raw, 'stage1_error', { error: 'This section could not be generated. Please try again.' });
    writeSSE(raw, 'done', { totalFeatures: 0 });
    raw.end();
    return reply.hijack();
  }

  // ── Stage 2 & 3 in parallel ───────────────────────────────────────────────
  const stage2Promise = runStage2({ sharedContext, logger: request.log })
    .then((result) => {
      writeSSE(raw, 'stage2', {
        interviewQuestions: result.interviewQuestions,
        rejectionReasons: result.rejectionReasons,
        salaryCoach: result.salaryCoach
      });
    })
    .catch((error) => {
      request.log?.error?.('Stage 2 failed:', error?.message);
      writeSSE(raw, 'stage2_error', { error: 'Features 4-6 could not be generated. Please try again.' });
    });

  const stage3Promise = runStage3({ sharedContext, logger: request.log })
    .then((result) => {
      writeSSE(raw, 'stage3', {
        learningPath: result.learningPath,
        coldEmail: result.coldEmail
      });
    })
    .catch((error) => {
      request.log?.error?.('Stage 3 failed:', error?.message);
      writeSSE(raw, 'stage3_error', { error: 'Features 7-8 could not be generated. Please try again.' });
    });

  await Promise.allSettled([stage2Promise, stage3Promise]);

  writeSSE(raw, 'done', { totalFeatures: 8 });
  raw.end();
  return reply.hijack();
}
