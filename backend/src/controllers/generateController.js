import { z } from 'zod';
import { generateApplyKitContent } from '../services/applyKitService.js';

const requestSchema = z.object({
  analysis_id: z.string().trim().min(1),
  content_type: z.enum(['cover_letter', 'cold_email', 'interview_questions', 'learning_path', 'rejection_reasons', 'salary_coach']),
  job_id: z.string().trim().optional(),
  job_title: z.string().trim().optional(),
  company: z.string().trim().optional(),
  job_description: z.string().trim().optional(),
  url: z.string().trim().url().optional()
});

export async function generateController(request, reply) {
  try {
    const body = requestSchema.parse(request.body || {});
    const generated = await generateApplyKitContent({
      db: request.server.db,
      userId: request.auth?.userId || null,
      analysisId: body.analysis_id,
      contentType: body.content_type,
      jobContext: {
        jobId: body.job_id || null,
        jobTitle: body.job_title || '',
        company: body.company || '',
        jobDescription: body.job_description || '',
        url: body.url || ''
      },
      logger: request.log
    });

    return reply.send({
      success: true,
      data: generated
    });
  } catch (error) {
    const statusCode = error.name === 'ZodError' ? 400 : error.statusCode || 500;
    return reply.code(statusCode).send({
      success: false,
      error: error.message || 'Generation failed.'
    });
  }
}
