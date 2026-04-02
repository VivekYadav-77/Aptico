import { z } from 'zod';
import { saveJob, searchJobs } from '../services/jobScraperService.js';

const searchQuerySchema = z.object({
  q: z.string().trim().min(1).default('software engineer'),
  location: z.string().trim().min(1).default('remote')
});

const saveJobSchema = z.object({
  title: z.string().trim().min(1),
  company: z.string().trim().min(1),
  source: z.string().trim().min(1),
  url: z.string().trim().url(),
  stipend: z.string().trim().nullable().optional(),
  matchPercent: z.number().int().min(0).max(100).optional()
});

export async function getJobsController(request, reply) {
  try {
    const query = searchQuerySchema.parse({
      q: request.query?.q || 'software engineer',
      location: request.query?.location || 'remote'
    });

    const result = await searchJobs({
      query: query.q,
      location: query.location,
      userId: request.auth?.userId || null,
      redisService: request.server.services?.redis,
      db: request.server.db,
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
