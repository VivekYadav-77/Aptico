import crypto from 'node:crypto';
import axios from 'axios';
import { search as ddgSearch, SafeSearchType } from 'duck-duck-scrape';
import { getCachedJobs, setCachedJobs } from '../../utils/jobCache.js';
import { getCounterDefinitions, isAllowed } from '../../utils/rateLimitGuard.js';

export const SOURCE_META = Symbol('job-source-meta');

export const SOURCE_CACHE_TTLS = {
  remotive: 7200,
  muse: 7200,
  reed: 7200,
  adzuna: 7200,
  jsearch: 21600,
  serper: 43200,
  ddgs: 3600
};

export const axiosClient = axios.create({
  timeout: 5000
});

export function sleep(durationMs) {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
}

export function normalizeText(value, fallback = '') {
  const normalizedValue = String(value ?? fallback)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return normalizedValue || fallback;
}

export function toIsoDate(value) {
  if (!value) {
    return null;
  }

  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate.toISOString();
}

export function buildCacheKey(source, params) {
  const serializedParams = JSON.stringify(
    Object.entries(params || {})
      .filter(([, value]) => value !== undefined)
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
  );
  const hash = crypto.createHash('sha256').update(serializedParams).digest('hex');
  return `jobs:${source}:${hash}`;
}

export function attachSourceMeta(jobs, meta) {
  Object.defineProperty(jobs, SOURCE_META, {
    value: meta,
    enumerable: false,
    configurable: true
  });

  return jobs;
}

export function getSourceMeta(jobs) {
  return jobs?.[SOURCE_META] || {};
}

export function getEffectiveQuery({ query, role }) {
  return normalizeText(query || role || '');
}

export function deriveJobType(rawValue, requestedJobType) {
  const normalizedValue = normalizeText(rawValue).toLowerCase();
  const normalizedRequest = normalizeText(requestedJobType).toLowerCase();
  const combinedValue = `${normalizedValue} ${normalizedRequest}`;

  if (combinedValue.includes('intern')) {
    return 'internship';
  }

  if (combinedValue.includes('hybrid')) {
    return 'hybrid';
  }

  if (combinedValue.includes('remote')) {
    return 'remote';
  }

  return 'full-time';
}

export function normalizeCompensation({ min, max, currency = '₹', monthly = false, raw = null }) {
  if (raw) {
    return normalizeText(raw);
  }

  const minValue = Number(min);
  const maxValue = Number(max);

  if (!Number.isFinite(minValue) && !Number.isFinite(maxValue)) {
    return null;
  }

  const formatAmount = (value) => `${currency}${Math.round(value).toLocaleString('en-IN')}`;
  const minText = Number.isFinite(minValue) ? formatAmount(minValue) : null;
  const maxText = Number.isFinite(maxValue) ? formatAmount(maxValue) : null;
  const suffix = monthly ? '/month' : '/year';

  if (minText && maxText) {
    return `${minText} - ${maxText}${suffix}`;
  }

  return `${minText || maxText}${suffix}`;
}

export function buildNormalizedJob({
  source,
  originalId,
  title,
  company,
  location,
  jobType,
  stipend = null,
  salary = null,
  applyUrl,
  postedAt = null,
  description = null
}) {
  return {
    id: `${source}-${normalizeText(originalId || applyUrl || title || crypto.randomUUID())}`,
    title: normalizeText(title, 'Untitled role'),
    company: normalizeText(company, 'Unknown'),
    location: normalizeText(location, 'Unknown'),
    jobType: deriveJobType(jobType, jobType),
    stipend: stipend ? normalizeText(stipend) : null,
    salary: salary ? normalizeText(salary) : null,
    applyUrl: normalizeText(applyUrl),
    postedAt: toIsoDate(postedAt),
    source,
    sourceLogo: source,
    description: description ? normalizeText(description) : null,
    isScam: false
  };
}

export async function incrementSourceCounters(redisService, source) {
  if (!redisService) {
    return;
  }

  try {
    const counterDefinitions = getCounterDefinitions(source);

    for (const definition of counterDefinitions) {
      const currentValue = await redisService.incr(definition.key);
      if (Number(currentValue) === 1 && definition.ttlSeconds) {
        await redisService.expire(definition.key, definition.ttlSeconds);
      }
    }
  } catch (error) {
    console.warn(`[jobSources] Counter update failed for ${source}.`, error?.message || error);
  }
}

export async function withSourceExecution({ source, params, redisService, loader, logger = console }) {
  const cacheKey = buildCacheKey(source, params);
  const cachedJobs = await getCachedJobs(redisService, cacheKey);

  if (cachedJobs) {
    return attachSourceMeta(cachedJobs, { source, cached: true, allowed: true });
  }

  const allowed = await isAllowed(redisService, source);
  if (!allowed) {
    return attachSourceMeta([], { source, cached: false, allowed: false, rateLimited: true });
  }

  try {
    const jobs = await loader();
    await incrementSourceCounters(redisService, source);
    await setCachedJobs(redisService, cacheKey, jobs, SOURCE_CACHE_TTLS[source]);
    return attachSourceMeta(jobs, { source, cached: false, allowed: true });
  } catch (error) {
    logger.warn?.(`[${source}] job source failed: ${error.message}`);
    return attachSourceMeta([], { source, cached: false, allowed: true, error: true });
  }
}

export async function runDuckDuckSearch(query) {
  return ddgSearch(query, {
    safeSearch: SafeSearchType.MODERATE
  });
}
