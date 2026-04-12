import { axiosClient, buildNormalizedJob, getEffectiveQuery, normalizeText, withSourceExecution } from './sourceUtils.js';

function resolveTargetSite(jobType) {
  if (jobType === 'internship-onsite') {
    return 'internshala.com';
  }

  if (jobType === 'full-time') {
    return 'naukri.com';
  }

  return 'linkedin.com/jobs';
}

export async function serperSource({ query, location, jobType, role, redisService, env, logger = console }) {
  const effectiveQuery = getEffectiveQuery({ query, role });
  const targetSite = resolveTargetSite(jobType);
  const credentials = env.serperApiKeys.map((apiKey, index) => ({
    apiKey,
    slot: index + 1
  }));

  return withSourceExecution({
    source: 'serper',
    params: { query: effectiveQuery, location, jobType, targetSite, credentials },
    redisService,
    logger,
    loader: async (credential) => {
      const apiKey = credential?.apiKey || env.serperApiKey;

      if (!apiKey) {
        throw new Error('Serper credentials are not configured.');
      }

      const response = await axiosClient.post(
        env.serperApiUrl,
        {
          q: `site:${targetSite} ${effectiveQuery} ${jobType?.includes('internship') ? 'internship' : 'job'} ${location}`.trim(),
          gl: 'in'
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': apiKey
          }
        }
      );

      return (response.data?.organic || []).slice(0, 20).map((job, index) =>
        buildNormalizedJob({
          source: 'serper',
          originalId: job.position || index,
          title: job.title,
          company: normalizeText(job.source || targetSite, targetSite),
          location,
          jobType: jobType?.includes('internship') ? 'internship' : 'full-time',
          applyUrl: job.link,
          postedAt: job.date,
          description: job.snippet
        })
      );
    }
  });
}
