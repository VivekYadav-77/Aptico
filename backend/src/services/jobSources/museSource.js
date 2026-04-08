import { axiosClient, buildNormalizedJob, deriveJobType, getEffectiveQuery, normalizeText, withSourceExecution } from './sourceUtils.js';

function resolveMuseCategory(query) {
  const normalizedQuery = normalizeText(query).toLowerCase();
  if (normalizedQuery.includes('data')) return 'Data Science';
  if (normalizedQuery.includes('design')) return 'Design';
  if (normalizedQuery.includes('product')) return 'Product';
  if (normalizedQuery.includes('marketing')) return 'Marketing';
  return 'Software Engineering';
}

export async function museSource({ query, location, jobType, role, redisService, env, logger = console }) {
  const effectiveQuery = getEffectiveQuery({ query, role });

  return withSourceExecution({
    source: 'muse',
    params: { query: effectiveQuery, location, jobType },
    redisService,
    logger,
    loader: async () => {
      const response = await axiosClient.get(env.museApiBaseUrl, {
        params: {
          category: resolveMuseCategory(effectiveQuery),
          level: jobType?.includes('internship') ? 'Internship' : undefined,
          page: 1,
          api_key: env.museApiKey || undefined
        }
      });

      return (response.data?.results || []).map((job) => {
        const levels = (job.levels || []).map((level) => level?.name).filter(Boolean).join(' ');
        const locations = (job.locations || []).map((item) => item?.name).filter(Boolean).join(', ');
        const resolvedType = deriveJobType(levels || job.type || job.name, jobType);

        return buildNormalizedJob({
          source: 'muse',
          originalId: job.id,
          title: job.name,
          company: job.company?.name,
          location: locations || location,
          jobType: resolvedType,
          stipend: resolvedType === 'internship' ? job.salary : null,
          salary: resolvedType === 'internship' ? null : job.salary,
          applyUrl: job.refs?.landing_page || job.refs?.apply || job.refs?.external,
          postedAt: job.publication_date,
          description: normalizeText(job.contents, null)
        });
      });
    }
  });
}
