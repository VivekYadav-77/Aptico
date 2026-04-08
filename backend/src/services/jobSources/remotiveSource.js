import { axiosClient, buildNormalizedJob, deriveJobType, getEffectiveQuery, normalizeText, withSourceExecution } from './sourceUtils.js';

export async function remotiveSource({ query, location, jobType, role, redisService, env, logger = console }) {
  const effectiveQuery = getEffectiveQuery({ query, role });

  return withSourceExecution({
    source: 'remotive',
    params: { query: effectiveQuery, location, jobType },
    redisService,
    logger,
    loader: async () => {
      const response = await axiosClient.get(env.remotiveApiBaseUrl, {
        params: {
          search: [effectiveQuery, location].filter(Boolean).join(' ').trim(),
          limit: 20
        }
      });

      return (response.data?.jobs || []).map((job) => {
        const resolvedType = deriveJobType(job.job_type, jobType);
        return buildNormalizedJob({
          source: 'remotive',
          originalId: job.id,
          title: job.title,
          company: job.company_name,
          location: job.candidate_required_location || location || 'Remote',
          jobType: resolvedType,
          stipend: resolvedType === 'internship' ? job.salary : null,
          salary: resolvedType === 'internship' ? null : job.salary,
          applyUrl: job.url,
          postedAt: job.publication_date,
          description: normalizeText(job.description, null)
        });
      });
    }
  });
}
