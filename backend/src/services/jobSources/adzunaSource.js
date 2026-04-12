import { axiosClient, buildNormalizedJob, deriveJobType, getEffectiveQuery, normalizeCompensation, normalizeText, withSourceExecution } from './sourceUtils.js';

export async function adzunaSource({ query, location, jobType, role, redisService, env, logger = console }) {
  const effectiveQuery = getEffectiveQuery({ query, role });
  const country = location?.toLowerCase().includes('india') || !location ? 'in' : 'gb';
  const credentials = env.adzunaCredentials || [];

  return withSourceExecution({
    source: 'adzuna',
    params: { query: effectiveQuery, location, jobType, country, credentials },
    redisService,
    logger,
    loader: async (credential) => {
      const appId = credential?.appId || env.adzunaAppId;
      const appKey = credential?.appKey || env.adzunaAppKey;

      if (!appId || !appKey) {
        throw new Error('Adzuna credentials are not configured.');
      }

      const endpoint = env.adzunaApiBaseUrl.replace('/jobs/in/search/1', `/jobs/${country}/search/1`);
      const response = await axiosClient.get(endpoint, {
        params: {
          app_id: appId,
          app_key: appKey,
          results_per_page: 20,
          what: effectiveQuery,
          where: location,
          what_and: effectiveQuery
        }
      });

      return (response.data?.results || []).map((job) => {
        const resolvedType = deriveJobType(`${job.contract_time || ''} ${job.contract_type || ''} ${job.title || ''}`, jobType);

        return buildNormalizedJob({
          source: 'adzuna',
          originalId: job.id,
          title: job.title,
          company: job.company?.display_name,
          location: job.location?.display_name || location,
          jobType: resolvedType,
          stipend: resolvedType === 'internship' ? normalizeCompensation({ min: job.salary_min, max: job.salary_max, monthly: true }) : null,
          salary: resolvedType === 'internship' ? null : normalizeCompensation({ min: job.salary_min, max: job.salary_max }),
          applyUrl: job.redirect_url,
          postedAt: job.created,
          description: job.description
        });
      });
    }
  });
}
