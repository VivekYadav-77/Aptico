import { Buffer } from 'node:buffer';
import { axiosClient, buildNormalizedJob, deriveJobType, getEffectiveQuery, normalizeCompensation, normalizeText, withSourceExecution } from './sourceUtils.js';

export async function reedSource({ query, location, jobType, role, redisService, env, logger = console }) {
  const effectiveQuery = getEffectiveQuery({ query, role });

  return withSourceExecution({
    source: 'reed',
    params: { query: effectiveQuery, location, jobType },
    redisService,
    logger,
    loader: async () => {
      const authHeader = env.reedApiKey ? `Basic ${Buffer.from(`${env.reedApiKey}:`).toString('base64')}` : undefined;
      const response = await axiosClient.get(env.reedApiBaseUrl, {
        headers: authHeader ? { Authorization: authHeader } : undefined,
        params: {
          keywords: effectiveQuery,
          locationName: location,
          resultsToTake: 20
        }
      });

      return (response.data?.results || []).map((job) => {
        const resolvedType = deriveJobType(`${job.jobType || ''} ${job.locationName || ''} ${job.jobTitle || ''}`, jobType);

        return buildNormalizedJob({
          source: 'reed',
          originalId: job.jobId,
          title: job.jobTitle,
          company: job.employerName,
          location: job.locationName || location,
          jobType: resolvedType,
          stipend: resolvedType === 'internship' ? normalizeCompensation({ min: job.minimumSalary, max: job.maximumSalary, raw: job.salary }) : null,
          salary: resolvedType === 'internship' ? null : normalizeCompensation({ min: job.minimumSalary, max: job.maximumSalary, raw: job.salary }),
          applyUrl: job.jobUrl || job.redirectUrl,
          postedAt: job.date,
          description: normalizeText(job.jobDescription, null)
        });
      });
    }
  });
}
