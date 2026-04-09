import { adzunaSource } from './jobSources/adzunaSource.js';
import { searchDuckDuckGoFallback } from './ddgsFallbackService.js';
import { ddgsSource } from './jobSources/ddgsSource.js';
import { jsearchSource } from './jobSources/jsearchSource.js';
import { museSource } from './jobSources/museSource.js';
import { reedSource } from './jobSources/reedSource.js';
import { remotiveSource } from './jobSources/remotiveSource.js';
import { serperSource } from './jobSources/serperSource.js';
import { flagScamJobs } from '../utils/scamDetector.js';
import { computeDashboardStats, enrichJob } from '../utils/jobIntelligence.js';
import { buildNormalizedJob, getSourceMeta, normalizeText } from './jobSources/sourceUtils.js';

function extractMatchedSkills(analysisData) {
  const skills = Array.isArray(analysisData?.skillsPresent)
    ? analysisData.skillsPresent
    : Array.isArray(analysisData?.matchedSkills)
      ? analysisData.matchedSkills
      : [];

  return skills
    .map((skill) => normalizeText(skill))
    .filter(Boolean)
    .slice(0, 3);
}

function buildSearchQuery({ query, analysisData }) {
  const matchedSkills = extractMatchedSkills(analysisData);
  const baseQuery = normalizeText(query);

  return {
    query: [baseQuery, ...matchedSkills].filter(Boolean).join(' ') || baseQuery,
    matchedSkills
  };
}

function isIndiaSearch(location) {
  const normalizedLocation = normalizeText(location).toLowerCase();
  const indiaTerms = [
    'india',
    'bangalore',
    'bengaluru',
    'mumbai',
    'delhi',
    'new delhi',
    'pune',
    'hyderabad',
    'chennai',
    'gurgaon',
    'gurugram',
    'noida',
    'kolkata',
    'ahmedabad'
  ];

  return indiaTerms.some((term) => normalizedLocation.includes(term));
}

function dedupeJobs(jobs) {
  const seen = new Set();

  return jobs.filter((job) => {
    const dedupeKey = `${normalizeText(job.title).toLowerCase()}::${normalizeText(job.company).toLowerCase()}`;

    if (seen.has(dedupeKey)) {
      return false;
    }

    seen.add(dedupeKey);
    return true;
  });
}

function sortJobs(jobs) {
  return [...jobs].sort((left, right) => {
    if (left.isScam !== right.isScam) {
      return left.isScam ? 1 : -1;
    }

    if (left.postedAt && right.postedAt) {
      return new Date(right.postedAt).getTime() - new Date(left.postedAt).getTime();
    }

    if (left.postedAt) {
      return -1;
    }

    if (right.postedAt) {
      return 1;
    }

    return 0;
  });
}

async function runSource(sourceName, sourceFn, sharedArgs, sourceState) {
  sourceState.sourcesUsed.push(sourceName);
  const jobs = await sourceFn(sharedArgs);
  const meta = getSourceMeta(jobs);

  if (meta.cached) {
    sourceState.cachedSources.push(sourceName);
  }

  if (meta.rateLimited) {
    sourceState.rateLimited = true;
  }

  return Array.isArray(jobs) ? jobs : [];
}

async function runDuckDuckGoFallbackSearch({ query, location, jobType, sourceState, logger = console }) {
  sourceState.sourcesUsed.push('duckduckgo-fallback');

  try {
    const fallbackJobs = await searchDuckDuckGoFallback({
      query,
      location,
      limit: 10
    });

    return fallbackJobs.map((job, index) =>
      buildNormalizedJob({
        source: 'ddgs',
        originalId: job.id || job.url || index,
        title: job.title,
        company: job.company,
        location: job.location || location,
        jobType,
        applyUrl: job.url,
        postedAt: job.postedAt,
        description: job.description
      })
    );
  } catch (error) {
    logger.warn?.(`[duckduckgo-fallback] job source failed: ${error.message}`);
    return [];
  }
}

export async function searchJobs({ query, location, jobType, role, analysisData, redisService, env, logger = console }) {
  const { query: enhancedQuery, matchedSkills } = buildSearchQuery({ query, analysisData });
  const indiaSearch = isIndiaSearch(location);
  const sharedArgs = {
    query: enhancedQuery,
    location,
    jobType,
    role: role || query,
    redisService,
    env,
    logger
  };
  const sourceState = {
    sourcesUsed: [],
    cachedSources: [],
    rateLimited: false
  };

  let resultBuckets = [];

  if (jobType === 'remote') {
    resultBuckets = await Promise.all([
      runSource('remotive', remotiveSource, sharedArgs, sourceState),
      runSource('ddgs', ddgsSource, sharedArgs, sourceState)
    ]);

    let combinedJobs = resultBuckets.flat();

    if (combinedJobs.length < 10) {
      combinedJobs = combinedJobs.concat(await runSource('muse', museSource, sharedArgs, sourceState));
    }

    if (combinedJobs.length < 10) {
      combinedJobs = combinedJobs.concat(await runSource('reed', reedSource, sharedArgs, sourceState));
    }

    resultBuckets = [combinedJobs];
  } else if (jobType === 'internship-onsite') {
    const adzunaJobs = indiaSearch ? await runSource('adzuna', adzunaSource, sharedArgs, sourceState) : [];
    const jsearchJobs = indiaSearch && adzunaJobs.length < 5 ? await runSource('jsearch', jsearchSource, sharedArgs, sourceState) : [];
    const [museJobs, serperJobs] = await Promise.all([
      runSource('muse', museSource, sharedArgs, sourceState),
      indiaSearch ? runSource('serper', serperSource, sharedArgs, sourceState) : Promise.resolve([])
    ]);

    resultBuckets = [adzunaJobs, jsearchJobs, museJobs, serperJobs];
  } else if (jobType === 'internship-remote') {
    const [remotiveJobs, ddgsJobs, museJobs] = await Promise.all([
      runSource('remotive', remotiveSource, sharedArgs, sourceState),
      runSource('ddgs', ddgsSource, sharedArgs, sourceState),
      runSource('muse', museSource, sharedArgs, sourceState)
    ]);

    let combinedJobs = [...remotiveJobs, ...ddgsJobs, ...museJobs];

    if (combinedJobs.length < 5) {
      combinedJobs = combinedJobs.concat(await runSource('jsearch', jsearchSource, sharedArgs, sourceState));
    }

    resultBuckets = [combinedJobs];
  } else if (jobType === 'full-time') {
    const adzunaJobs = indiaSearch ? await runSource('adzuna', adzunaSource, sharedArgs, sourceState) : [];
    const [museJobs, reedJobs] = await Promise.all([
      runSource('muse', museSource, sharedArgs, sourceState),
      runSource('reed', reedSource, sharedArgs, sourceState)
    ]);

    let combinedJobs = [...adzunaJobs, ...museJobs, ...reedJobs];

    if (indiaSearch && combinedJobs.length < 8) {
      combinedJobs = combinedJobs.concat(await runSource('serper', serperSource, sharedArgs, sourceState));
    }

    resultBuckets = [combinedJobs];
  } else if (jobType === 'hybrid') {
    const [museJobs, reedJobs] = await Promise.all([
      runSource('muse', museSource, sharedArgs, sourceState),
      runSource('reed', reedSource, sharedArgs, sourceState)
    ]);

    let combinedJobs = [...museJobs, ...reedJobs];

    if (indiaSearch && combinedJobs.length < 8) {
      combinedJobs = combinedJobs.concat(await runSource('adzuna', adzunaSource, sharedArgs, sourceState));
    }

    const [remotiveJobs, ddgsJobs] = await Promise.all([
      runSource('remotive', remotiveSource, sharedArgs, sourceState),
      runSource('ddgs', ddgsSource, sharedArgs, sourceState)
    ]);

    resultBuckets = [combinedJobs, remotiveJobs, ddgsJobs];
  } else {
    resultBuckets = await Promise.all([
      runSource('remotive', remotiveSource, sharedArgs, sourceState),
      runSource('ddgs', ddgsSource, sharedArgs, sourceState),
      runSource('muse', museSource, sharedArgs, sourceState),
      runSource('reed', reedSource, sharedArgs, sourceState)
    ]);

    const primaryJobs = resultBuckets.flat();
  }

  let jobs = sortJobs(flagScamJobs(dedupeJobs(resultBuckets.flat())));

  if (!jobs.length) {
    const ddgsJobs = await runSource('ddgs', ddgsSource, sharedArgs, sourceState);
    jobs = sortJobs(flagScamJobs(dedupeJobs(ddgsJobs)));
  }

  if (!jobs.length) {
    const fallbackJobs = await runDuckDuckGoFallbackSearch({
      query: enhancedQuery,
      location,
      jobType,
      sourceState,
      logger
    });

    jobs = sortJobs(flagScamJobs(dedupeJobs(fallbackJobs)));
  }

  if (!jobs.length) {
    return {
      jobs: [],
      exhausted: true,
      message: 'All job sources are currently at their rate limits. Please try again in a few minutes.',
      sourcesUsed: [...new Set(sourceState.sourcesUsed)],
      cachedSources: [...new Set(sourceState.cachedSources)],
      matchedSkills
    };
  }

  const enrichedJobs = jobs.map((job) => enrichJob(job, analysisData || null));
  const dashboardStats = computeDashboardStats(enrichedJobs);

  return {
    jobs: enrichedJobs,
    exhausted: sourceState.rateLimited,
    message: sourceState.rateLimited
      ? 'Some sources are temporarily limited. Showing available results. Try again in a few minutes.'
      : null,
    sourcesUsed: [...new Set(sourceState.sourcesUsed)],
    cachedSources: [...new Set(sourceState.cachedSources)],
    dashboardStats,
    matchedSkills
  };
}
