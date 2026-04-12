import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { analyses, savedJobs } from '../db/schema.js';
import { searchJobs } from '../services/jobSearchService.js';
import { saveJob } from '../services/jobScraperService.js';
import { addJobsToPublicCache } from '../services/socialService.js';
import { generateFollowUpScripts } from '../utils/followUpScripts.js';

const searchQuerySchema = z.object({
  query: z.string().trim().min(1),
  location: z.string().trim().min(1).default('India'),
  jobType: z.enum(['remote', 'hybrid', 'full-time', 'internship-remote', 'internship-onsite']),
  useAnalysis: z.union([z.boolean(), z.string()]).transform((val) => val === true || val === 'true').default(false)
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

const deleteSavedJobParamsSchema = z.object({
  savedJobId: z.string().trim().min(1)
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

    if (request.auth?.userId && request.server.db) {
      addJobsToPublicCache(request.server.db, result.jobs).catch((err) =>
        request.log.warn('Public job cache update failed:', err)
      );
    }

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

export async function deleteSavedJobController(request, reply) {
  try {
    if (!request.server.db) {
      return reply.code(503).send({
        success: false,
        error: 'Database is not configured yet.'
      });
    }

    const { savedJobId } = deleteSavedJobParamsSchema.parse(request.params || {});

    const rows = await request.server.db
      .delete(savedJobs)
      .where(and(eq(savedJobs.id, savedJobId), eq(savedJobs.userId, request.auth.userId)))
      .returning({ id: savedJobs.id });

    if (!rows[0]) {
      return reply.code(404).send({
        success: false,
        error: 'Saved job was not found.'
      });
    }

    return reply.send({
      success: true,
      data: {
        id: rows[0].id
      }
    });
  } catch (error) {
    const statusCode = error.name === 'ZodError' ? 400 : error.statusCode || 500;
    return reply.code(statusCode).send({
      success: false,
      error: error.message || 'Could not delete saved job.'
    });
  }
}

export async function deleteAllSavedJobsController(request, reply) {
  try {
    if (!request.server.db) {
      return reply.code(503).send({
        success: false,
        error: 'Database is not configured yet.'
      });
    }

    if (!request.auth?.userId) {
      return reply.code(401).send({
        success: false,
        error: 'A valid user session is required to delete saved jobs.'
      });
    }

    const rows = await request.server.db
      .delete(savedJobs)
      .where(eq(savedJobs.userId, request.auth.userId))
      .returning({ id: savedJobs.id });

    return reply.send({
      success: true,
      data: {
        deletedCount: rows.length
      }
    });
  } catch (error) {
    return reply.code(error.statusCode || 500).send({
      success: false,
      error: error.message || 'Could not clear saved jobs.'
    });
  }
}
