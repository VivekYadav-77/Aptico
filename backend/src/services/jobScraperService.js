import crypto from 'node:crypto';
import { and, desc, eq } from 'drizzle-orm';
import { apiUsage, analyses, savedJobs } from '../db/schema.js';
import { env } from '../config/env.js';
import { searchDuckDuckGoFallback } from './ddgsFallbackService.js';

const CACHE_TTL_SECONDS = 60 * 60;
const MINIMUM_PRIMARY_RESULTS = 5;

function normalizeWhitespace(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildCacheKey({ query, location }) {
  const normalizedQuery = normalizeWhitespace(query).toLowerCase();
  const normalizedLocation = normalizeWhitespace(location).toLowerCase();
  const hash = crypto.createHash('sha256').update(`${normalizedQuery}::${normalizedLocation}`).digest('hex');
  return `job_search:${hash}`;
}

function tokenizeSkills(text) {
  const matches = normalizeWhitespace(text)
    .toLowerCase()
    .match(/[a-z0-9+#.]{2,}/g);

  return [...new Set(matches || [])];
}

function normalizeJob(job) {
  return {
    id: job.id,
    title: normalizeWhitespace(job.title),
    company: normalizeWhitespace(job.company),
    location: normalizeWhitespace(job.location || 'Unknown'),
    jobType: normalizeWhitespace(job.jobType || 'Unknown'),
    stipend: job.stipend ? normalizeWhitespace(job.stipend) : null,
    description: normalizeWhitespace(job.description || ''),
    source: normalizeWhitespace(job.source),
    sourceKey: normalizeWhitespace(job.sourceKey),
    url: job.url,
    postedAt: job.postedAt || null
  };
}

async function logApiUsage(db, sourceName, { hitRateLimit = false } = {}) {
  if (!db) {
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  const existingRows = await db
    .select()
    .from(apiUsage)
    .where(and(eq(apiUsage.sourceName, sourceName), eq(apiUsage.date, today)))
    .limit(1);

  const currentRow = existingRows[0];

  if (!currentRow) {
    await db.insert(apiUsage).values({
      sourceName,
      date: today,
      requestCount: 1,
      last429At: hitRateLimit ? new Date() : null
    });
    return;
  }

  await db
    .update(apiUsage)
    .set({
      requestCount: currentRow.requestCount + 1,
      last429At: hitRateLimit ? new Date() : currentRow.last429At
    })
    .where(eq(apiUsage.id, currentRow.id));
}

async function fetchJson(url, options = {}, fetchImpl = fetch) {
  const response = await fetchImpl(url, options);

  if (!response.ok) {
    const error = new Error(`Request failed with status ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return response.json();
}

async function fetchAdzunaJobs({ query, location, fetchImpl }) {
  if (!env.adzunaAppId || !env.adzunaAppKey) {
    throw new Error('Adzuna credentials are not configured.');
  }

  const url = new URL(env.adzunaApiBaseUrl);
  url.searchParams.set('app_id', env.adzunaAppId);
  url.searchParams.set('app_key', env.adzunaAppKey);
  url.searchParams.set('results_per_page', '10');
  url.searchParams.set('what', query);
  url.searchParams.set('where', location);
  url.searchParams.set('content-type', 'application/json');

  const payload = await fetchJson(url, {}, fetchImpl);

  return (payload.results || []).map((job) =>
    normalizeJob({
      id: `adzuna-${job.id}`,
      title: job.title,
      company: job.company?.display_name || 'Unknown company',
      location: job.location?.display_name || location,
      jobType: job.contract_time || job.contract_type || 'Unknown',
      stipend:
        job.salary_min || job.salary_max
          ? `${job.salary_min || '?'} - ${job.salary_max || '?'}`
          : null,
      description: job.description || '',
      source: 'Adzuna',
      sourceKey: 'adzuna',
      url: job.redirect_url,
      postedAt: job.created
    })
  );
}

async function fetchRemotiveJobs({ query, location, fetchImpl }) {
  const url = new URL(env.remotiveApiBaseUrl);
  url.searchParams.set('search', [query, location].filter(Boolean).join(' ').trim());
  url.searchParams.set('limit', '10');

  const payload = await fetchJson(url, {}, fetchImpl);

  return (payload.jobs || []).map((job) =>
    normalizeJob({
      id: `remotive-${job.id}`,
      title: job.title,
      company: job.company_name || 'Unknown company',
      location: job.candidate_required_location || location || 'Remote',
      jobType: job.job_type || 'Unknown',
      stipend: job.salary || null,
      description: job.description || '',
      source: 'Remotive',
      sourceKey: 'remotive',
      url: job.url,
      postedAt: job.publication_date
    })
  );
}

async function fetchJSearchJobs({ query, location, fetchImpl }) {
  if (!env.jsearchApiKey) {
    throw new Error('JSearch credentials are not configured.');
  }

  const url = new URL(env.jsearchApiBaseUrl);
  url.searchParams.set('query', [query, location].filter(Boolean).join(' in '));
  url.searchParams.set('page', '1');
  url.searchParams.set('num_pages', '1');

  const payload = await fetchJson(
    url,
    {
      headers: {
        'X-RapidAPI-Key': env.jsearchApiKey,
        'X-RapidAPI-Host': env.jsearchApiHost
      }
    },
    fetchImpl
  );

  return (payload.data || []).map((job) =>
    normalizeJob({
      id: `jsearch-${job.job_id}`,
      title: job.job_title,
      company: job.employer_name || 'Unknown company',
      location: [job.job_city, job.job_state, job.job_country].filter(Boolean).join(', ') || location || 'Unknown',
      jobType: job.job_employment_type || 'Unknown',
      stipend: job.job_salary || null,
      description: job.job_description || '',
      source: 'JSearch',
      sourceKey: 'jsearch',
      url: job.job_apply_link || job.job_google_link,
      postedAt: job.job_posted_at_datetime_utc || null
    })
  );
}

async function fetchSerperJobs({ query, location, fetchImpl }) {
  if (!env.serperApiKey) {
    throw new Error('Serper credentials are not configured.');
  }

  const payload = await fetchJson(
    env.serperApiUrl,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': env.serperApiKey
      },
      body: JSON.stringify({
        q: [query, location, 'jobs'].filter(Boolean).join(' ')
      })
    },
    fetchImpl
  );

  return (payload.organic || []).slice(0, 10).map((job, index) =>
    normalizeJob({
      id: `serper-${index}-${Buffer.from(job.link || String(index)).toString('base64').slice(0, 10)}`,
      title: job.title || 'Serper result',
      company: 'Search result',
      location: location || 'Unknown',
      jobType: 'Unknown',
      stipend: null,
      description: job.snippet || '',
      source: 'Serper',
      sourceKey: 'serper',
      url: job.link,
      postedAt: null
    })
  );
}

function dedupeJobs(jobs) {
  const seen = new Set();

  return jobs.filter((job) => {
    const uniqueKey = `${job.sourceKey}:${job.url}`;

    if (seen.has(uniqueKey) || !job.url) {
      return false;
    }

    seen.add(uniqueKey);
    return true;
  });
}

async function getLatestAnalysis(db, userId) {
  if (!db || !userId) {
    return null;
  }

  const rows = await db
    .select({
      gapAnalysisJson: analyses.gapAnalysisJson
    })
    .from(analyses)
    .where(eq(analyses.userId, userId))
    .orderBy(desc(analyses.createdAt))
    .limit(1);

  return rows[0]?.gapAnalysisJson || null;
}

function attachMatchPercent(jobs, latestAnalysis) {
  if (!latestAnalysis) {
    return jobs;
  }

  const missingKeywords = new Set(
    (latestAnalysis.keywordMismatches || []).map((item) => normalizeWhitespace(item.keyword).toLowerCase()).filter(Boolean)
  );

  return jobs.map((job) => {
    const requiredSkills = tokenizeSkills(`${job.title} ${job.description}`);

    if (!requiredSkills.length) {
      return job;
    }

    const missingCount = requiredSkills.filter((skill) => missingKeywords.has(skill)).length;
    const matchPercent = Math.max(0, Math.round(((requiredSkills.length - missingCount) / requiredSkills.length) * 100));

    return {
      ...job,
      matchPercent
    };
  });
}

function stripMatchPercent(jobs) {
  return jobs.map(({ matchPercent, ...job }) => job);
}

async function executePrimarySource({ sourceName, loader, db, logger }) {
  try {
    const jobs = await loader();
    await logApiUsage(db, sourceName);
    return {
      sourceName,
      ok: true,
      jobs
    };
  } catch (error) {
    await logApiUsage(db, sourceName, { hitRateLimit: error.status === 429 });
    logger?.warn?.(`${sourceName} job source failed: ${error.message}`);
    return {
      sourceName,
      ok: false,
      jobs: [],
      error
    };
  }
}

export async function searchJobs({
  query,
  location,
  userId,
  redisService,
  db,
  logger = console,
  fetchImpl = fetch,
  ddgSearch = searchDuckDuckGoFallback
}) {
  const cacheKey = buildCacheKey({ query, location });

  if (redisService) {
    const cachedPayload = await redisService.get(cacheKey);

    if (cachedPayload) {
      try {
        const parsedPayload = JSON.parse(cachedPayload);
        const latestAnalysis = await getLatestAnalysis(db, userId);
        return {
          ...parsedPayload,
          jobs: attachMatchPercent(parsedPayload.jobs || [], latestAnalysis),
          cached: true
        };
      } catch (error) {
        logger.warn?.('Cached job payload was invalid. Falling back to live sources.');
      }
    }
  }

  const primaryResults = await Promise.all([
    executePrimarySource({
      sourceName: 'adzuna',
      loader: () => fetchAdzunaJobs({ query, location, fetchImpl }),
      db,
      logger
    }),
    executePrimarySource({
      sourceName: 'remotive',
      loader: () => fetchRemotiveJobs({ query, location, fetchImpl }),
      db,
      logger
    }),
    executePrimarySource({
      sourceName: 'jsearch',
      loader: () => fetchJSearchJobs({ query, location, fetchImpl }),
      db,
      logger
    }),
    executePrimarySource({
      sourceName: 'serper',
      loader: () => fetchSerperJobs({ query, location, fetchImpl }),
      db,
      logger
    })
  ]);

  let jobs = dedupeJobs(primaryResults.flatMap((result) => result.jobs));
  const primaryFailures = primaryResults.filter((result) => !result.ok);
  const shouldUseDdgFallback =
    primaryFailures.length === primaryResults.length || jobs.length < MINIMUM_PRIMARY_RESULTS;

  if (shouldUseDdgFallback) {
    try {
      await logApiUsage(db, 'duckduckgo');
      const fallbackJobs = await ddgSearch({ query, location, limit: 10, fetchImpl });
      jobs = dedupeJobs([...jobs, ...fallbackJobs]);
    } catch (error) {
      logger.warn?.(`DuckDuckGo fallback failed: ${error.message}`);
    }
  }

  const latestAnalysis = await getLatestAnalysis(db, userId);
  const jobsWithMatch = attachMatchPercent(jobs, latestAnalysis);

  const responsePayload = {
    cached: false,
    jobs: jobsWithMatch,
    meta: {
      usedFallback: shouldUseDdgFallback,
      sources: primaryResults.map((result) => ({
        source: result.sourceName,
        ok: result.ok,
        count: result.jobs.length
      }))
    }
  };

  if (redisService) {
    await redisService.set(
      cacheKey,
      JSON.stringify({
        ...responsePayload,
        jobs: stripMatchPercent(jobsWithMatch)
      }),
      CACHE_TTL_SECONDS
    );
  }

  return responsePayload;
}

export async function saveJob({ db, userId, job }) {
  if (!db) {
    const error = new Error('Database is not configured yet.');
    error.statusCode = 503;
    throw error;
  }

  if (!userId) {
    const error = new Error('A valid user session is required to save jobs.');
    error.statusCode = 401;
    throw error;
  }

  const inserted = await db
    .insert(savedJobs)
    .values({
      userId,
      jobSource: job.source,
      jobTitle: job.title,
      company: job.company,
      url: job.url,
      stipend: job.stipend || null,
      matchPercent: typeof job.matchPercent === 'number' ? job.matchPercent : null
    })
    .returning();

  return inserted[0];
}
