import { buildNormalizedJob, getEffectiveQuery, normalizeText, runDuckDuckSearch, sleep, withSourceExecution } from './sourceUtils.js';

export async function ddgsSource({ query, location, jobType, role, redisService, env, logger = console }) {
  const effectiveQuery = getEffectiveQuery({ query, role });

  return withSourceExecution({
    source: 'ddgs',
    params: { query: effectiveQuery, location, jobType },
    redisService,
    logger,
    loader: async () => {
      await sleep(1500);
      const response = await runDuckDuckSearch(`${effectiveQuery} ${location} jobs`);

      return (response?.results || []).slice(0, 20).map((job, index) =>
        buildNormalizedJob({
          source: 'ddgs',
          originalId: job.url || index,
          title: job.title,
          company: normalizeText(job.hostname || 'DuckDuckGo', 'DuckDuckGo'),
          location,
          jobType,
          applyUrl: job.url,
          postedAt: job.published || null,
          description: normalizeText(job.description, null)
        })
      );
    }
  });
}
