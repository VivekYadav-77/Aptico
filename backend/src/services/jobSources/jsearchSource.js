import { axiosClient, buildNormalizedJob, deriveJobType, getEffectiveQuery, normalizeCompensation, normalizeText, withSourceExecution } from './sourceUtils.js';

export async function jsearchSource({ query, location, jobType, role, redisService, env, logger = console }) {
  const effectiveQuery = getEffectiveQuery({ query, role });
  const credentials = env.jsearchApiKeys.map((apiKey, index) => ({
    apiKey,
    slot: index + 1
  }));

  return withSourceExecution({
    source: 'jsearch',
    params: { query: effectiveQuery, location, jobType, credentials },
    redisService,
    logger,
    loader: async (credential) => {
      const apiKey = credential?.apiKey || env.jsearchRapidapiKey;

      if (!apiKey) {
        throw new Error('JSearch credentials are not configured.');
      }

      const response = await axiosClient.get(env.jsearchApiBaseUrl, {
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': env.jsearchApiHost
        },
        params: {
          query: effectiveQuery,
          page: 1,
          num_pages: 1,
          country: 'in'
        }
      });

      return (response.data?.data || []).map((job) => {
        const resolvedType = deriveJobType(job.job_employment_type, jobType);

        return buildNormalizedJob({
          source: 'jsearch',
          originalId: job.job_id,
          title: job.job_title,
          company: job.employer_name,
          location: [job.job_city, job.job_state, job.job_country].filter(Boolean).join(', ') || location,
          jobType: resolvedType,
          stipend:
            resolvedType === 'internship'
              ? normalizeCompensation({
                  min: job.job_min_salary,
                  max: job.job_max_salary,
                  raw: job.job_salary_period === 'MONTH' ? job.job_salary : null,
                  monthly: true
                })
              : null,
          salary: resolvedType === 'internship' ? null : normalizeCompensation({ min: job.job_min_salary, max: job.job_max_salary, raw: job.job_salary }),
          applyUrl: job.job_apply_link || job.job_google_link,
          postedAt: job.job_posted_at_datetime_utc,
          description: job.job_description
        });
      });
    }
  });
}
