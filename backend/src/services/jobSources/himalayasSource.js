import { axiosClient, buildNormalizedJob, deriveJobType, getEffectiveQuery, normalizeCompensation, normalizeText, withSourceExecution } from './sourceUtils.js';

export async function himalayasSource({ query, location, jobType, role, redisService, env, logger = console }) {
  const effectiveQuery = getEffectiveQuery({ query, role });
  const employmentType = jobType?.includes('internship') ? 'internship' : jobType === 'remote' ? 'full-time' : undefined;

  return withSourceExecution({
    source: 'himalayas',
    params: { query: effectiveQuery, location, jobType, employmentType },
    redisService,
    logger,
    loader: async () => {
      const response = await axiosClient.get(env.himalayasApiBaseUrl, {
        params: {
          q: effectiveQuery,
          limit: 20,
          employmentType
        }
      });

      const jobs = response.data?.jobs || response.data?.data?.jobs || [];

      return jobs.map((job, index) => {
        const resolvedType = deriveJobType(job.employmentType || job.type || job.jobType, jobType);
        const compensation = job.compensation || job.salary || {};

        return buildNormalizedJob({
          source: 'himalayas',
          originalId: job.id || job.slug || index,
          title: job.title || job.position,
          company: job.companyName || job.company?.name,
          location: job.location || job.locationName || location || 'Remote',
          jobType: resolvedType,
          stipend:
            resolvedType === 'internship'
              ? normalizeCompensation({
                  min: compensation.minAmount || compensation.min,
                  max: compensation.maxAmount || compensation.max,
                  raw: compensation.shortSalary || compensation.salary
                })
              : null,
          salary:
            resolvedType === 'internship'
              ? null
              : normalizeCompensation({
                  min: compensation.minAmount || compensation.min,
                  max: compensation.maxAmount || compensation.max,
                  raw: compensation.shortSalary || compensation.salary
                }),
          applyUrl: job.applyUrl || job.url || job.publicUrl,
          postedAt: job.postedAt || job.publishedAt,
          description: normalizeText(job.description || job.snippet, null)
        });
      });
    }
  });
}
