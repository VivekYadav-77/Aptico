import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { analyses } from '../db/schema.js';
import { searchJobs } from '../services/jobSearchService.js';
import { saveJob } from '../services/jobScraperService.js';
import { generateFollowUpScripts } from '../utils/followUpScripts.js';

const searchQuerySchema = z.object({
  query: z.string().trim().min(1),
  location: z.string().trim().min(1).default('India'),
  jobType: z.enum(['remote', 'hybrid', 'full-time', 'internship-remote', 'internship-onsite']),
  useAnalysis: z.coerce.boolean().default(false)
});

const saveJobSchema = z.object({
  title: z.string().trim().min(1),
  company: z.string().trim().min(1),
  source: z.string().trim().min(1),
  url: z.string().trim().url(),
  stipend: z.string().trim().nullable().optional(),
  matchPercent: z.number().int().min(0).max(100).optional()
});

const followUpScriptsSchema = z.object({
  jobTitle: z.string().trim().min(1),
  companyName: z.string().trim().min(1),
  appliedDate: z.string().datetime(),
  userName: z.string().trim().optional()
});

export async function getJobsController(request, reply) {
  try {
    const query = searchQuerySchema.parse({
      query: request.query?.query,
      location: request.query?.location || 'India',
      jobType: request.query?.jobType,
      useAnalysis: request.query?.useAnalysis ?? false
    });

    let analysisData = null;

    if (query.useAnalysis && request.auth?.userId && request.server.db) {
      const rows = await request.server.db
        .select({
          id: analyses.id,
          companyName: analyses.companyName,
          gapAnalysisJson: analyses.gapAnalysisJson
        })
        .from(analyses)
        .where(eq(analyses.userId, request.auth.userId))
        .orderBy(desc(analyses.createdAt))
        .limit(1);

      if (rows[0]) {
        analysisData = {
          analysisId: rows[0].id,
          companyName: rows[0].companyName,
          ...(rows[0].gapAnalysisJson || {})
        };
      }
    }

    const result = await searchJobs({
      query: query.query,
      location: query.location,
      jobType: query.jobType,
      role: query.query,
      analysisData,
      redisService: request.server.services?.redis,
      env: request.server.env || null,
      logger: request.log
    });

    return reply.send({
      success: true,
      data: result
    });
  } catch (error) {
    const statusCode = error.name === 'ZodError' ? 400 : error.statusCode || 500;
    return reply.code(statusCode).send({
      success: false,
      error: error.message || 'Job search failed.'
    });
  }
}

export async function saveJobController(request, reply) {
  try {
    const job = saveJobSchema.parse(request.body || {});
    const saved = await saveJob({
      db: request.server.db,
      userId: request.auth?.userId || null,
      job
    });

    return reply.code(201).send({
      success: true,
      data: saved
    });
  } catch (error) {
    const statusCode = error.name === 'ZodError' ? 400 : error.statusCode || 500;
    return reply.code(statusCode).send({
      success: false,
      error: error.message || 'Could not save job.'
    });
  }
}

export async function getFollowUpScriptsController(request, reply) {
  try {
    const body = followUpScriptsSchema.parse(request.body || {});
    const appliedDate = new Date(body.appliedDate);
    const scripts = generateFollowUpScripts({
      jobTitle: body.jobTitle,
      companyName: body.companyName,
      userName: body.userName,
      appliedDate
    });

    return reply.send({
      success: true,
      data: {
        scripts
      }
    });
  } catch (error) {
    const statusCode = error.name === 'ZodError' ? 400 : error.statusCode || 500;
    return reply.code(statusCode).send({
      success: false,
      error: error.message || 'Could not generate follow-up scripts.'
    });
  }
}
