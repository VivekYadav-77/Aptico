import { z } from 'zod';
import { analyses } from '../db/schema.js';
import { analyzeResumeWithGemini } from '../services/geminiService.js';
import { decodePdfFile, parsePdfBuffer } from '../services/pdfService.js';

const MAX_PDF_BYTES = 1 * 1024 * 1024;

const requestSchema = z.object({
  file: z.object({
    name: z.string().trim().min(1),
    type: z.string().trim().min(1),
    size: z.number().int().positive(),
    contentBase64: z.string().trim().min(1)
  }),
  jobDescription: z.string().trim().min(1)
});

export async function analyzeController(request, reply) {
  const incomingFile = request.body?.file;
  if (incomingFile?.size > MAX_PDF_BYTES) {
    return reply.code(400).send({ success: false, error: 'PDF must be under 1 MB.' });
  }

  try {
    const body = requestSchema.parse(request.body || {});
    const pdfBuffer = decodePdfFile(body.file);

    if (pdfBuffer.length > MAX_PDF_BYTES) {
      return reply.code(400).send({ success: false, error: 'PDF must be under 1 MB.' });
    }

    const parsedPdf = await parsePdfBuffer(pdfBuffer);

    if (!parsedPdf.text) {
      return reply.code(400).send({
        success: false,
        error: 'Could not extract text from the PDF.'
      });
    }

    const result = await analyzeResumeWithGemini({
      resumeText: parsedPdf.text,
      jobDescription: body.jobDescription,
      redisService: request.server.services?.redis,
      logger: request.log
    });

    let savedAnalysisId = null;

    if (request.server.db) {
      const insertedRows = await request.server.db
        .insert(analyses)
        .values({
          userId: request.auth?.userId || null,
          resumeText: parsedPdf.text,
          jdText: body.jobDescription,
          companyName: result.analysis.companyName,
          confidenceScore: result.analysis.confidenceScore,
          gapAnalysisJson: result.analysis
        })
        .returning({ id: analyses.id });

      savedAnalysisId = insertedRows[0]?.id || null;
    }

    return reply.send({
      success: true,
      data: {
        id: savedAnalysisId,
        resumeText: parsedPdf.text,
        confidenceScore: result.analysis.confidenceScore,
        summary: result.analysis.summary,
        companyName: result.analysis.companyName,
        keywordMismatches: result.analysis.keywordMismatches,
        seniorityMismatches: result.analysis.seniorityMismatches,
        rewriteSuggestions: result.analysis.rewriteSuggestions
      }
    });
  } catch (error) {
    const statusCode = error.name === 'ZodError' ? 400 : error.statusCode || 500;
    return reply.code(statusCode).send({
      success: false,
      error: error.message || 'Analysis failed.'
    });
  }
}
