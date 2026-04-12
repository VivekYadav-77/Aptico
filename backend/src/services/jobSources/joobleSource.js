import { axiosClient, buildNormalizedJob, deriveJobType, getEffectiveQuery, normalizeCompensation, normalizeText, withSourceExecution } from './sourceUtils.js';

export async function joobleSource({ query, location, jobType, role, redisService, env, logger = console }) {
  const effectiveQuery = getEffectiveQuery({ query, role });
  const credentials = env.joobleApiKeys.map((apiKey, index) => ({
    apiKey,
    slot: index + 1
  }));

  return withSourceExecution({
    source: 'jooble',
    params: { query: effectiveQuery, location, jobType, credentials },
    redisService,
    logger,
    loader: async (credential) => {
      const apiKey = credential?.apiKey || env.joobleApiKey;

      if (!apiKey) {
        throw new Error('Jooble credentials are not configured.');
      }

      const response = await axiosClient.post(`${env.joobleApiBaseUrl.replace(/\/$/, '')}/${apiKey}`, {
        keywords: effectiveQuery,
        location: location || 'India',
        page: '1'
      });

      return (response.data?.jobs || []).slice(0, 20).map((job, index) => {
        const resolvedType = deriveJobType(`${job.type || ''} ${job.title || ''}`, jobType);

        return buildNormalizedJob({
          source: 'jooble',
          originalId: job.id || job.link || index,
          title: job.title,
          company: job.company,
          location: job.location || location,
          jobType: resolvedType,
          stipend: resolvedType === 'internship' ? normalizeCompensation({ raw: job.salary, monthly: true }) : null,
          salary: resolvedType === 'internship' ? null : normalizeCompensation({ raw: job.salary }),
          applyUrl: job.link,
          postedAt: job.updated || job.created || null,
          description: job.snippet || job.salary || null
        });
      });
    }
  });
}
