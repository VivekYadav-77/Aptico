import crypto from 'node:crypto';
import axios from 'axios';
import { search as ddgSearch, SafeSearchType } from 'duck-duck-scrape';
import { getCachedJobs, setCachedJobs } from '../../utils/jobCache.js';
import { getCounterDefinitions, getRateLimitCooldownSeconds, isAllowed } from '../../utils/rateLimitGuard.js';

export const SOURCE_META = Symbol('job-source-meta');

export const SOURCE_CACHE_TTLS = {
  remotive: 7200,
  muse: 7200,
  reed: 7200,
  adzuna: 7200,
  jsearch: 21600,
  jooble: 7200,
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

const HTML_ENTITIES = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&ndash;': '-',
  '&mdash;': '-',
  '&bull;': '•'
};

export function normalizeText(value, fallback = '', preserveNewlines = false) {
  let str = String(value ?? fallback);

  if (!str) return fallback;

  str = str.replace(/&[a-zA-Z0-9#]+;/g, (match) => HTML_ENTITIES[match] || match);

  if (preserveNewlines) {
    str = str.replace(/<br\s*\/?>/gi, '\n');
    str = str.replace(/<\/p>/gi, '\n\n');
    str = str.replace(/<\/div>/gi, '\n');
    str = str.replace(/<\/li>/gi, '\n');
    str = str.replace(/<li>/gi, '• ');
    str = str.replace(/<[^>]+>/g, '');
    str = str.replace(/[ \t]+/g, ' ');
    str = str.replace(/\n\s*\n/g, '\n\n');
  } else {
    str = str.replace(/<[^>]+>/g, ' ');
    str = str.replace(/\s+/g, ' ');
  }

  return str.trim() || fallback;
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
      .filter(([key, value]) => key !== 'credentials' && value !== undefined)
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
  );
  const hash = crypto.createHash('sha256').update(serializedParams).digest('hex');
  return `jobs:${source}:${hash}`;
}

function buildCredentialScopeKey(credential, index) {
  if (credential?.scopeKey) {
    return credential.scopeKey;
  }

  if (credential?.slot) {
    return `slot-${credential.slot}`;
  }

  return `slot-${index + 1}`;
}

function buildCredentialCooldownKey(source, scopeKey) {
  return `jobs:${source}:${scopeKey}:cooldown`;
}

async function isCredentialCoolingDown(redisService, source, scopeKey) {
  if (!redisService) {
    return false;
  }

  try {
    return Boolean(await redisService.get(buildCredentialCooldownKey(source, scopeKey)));
  } catch {
    return false;
  }
}

async function markCredentialCoolingDown(redisService, source, scopeKey, error) {
  if (!redisService) {
    return;
  }

  const cooldownSeconds = getRateLimitCooldownSeconds(source);
  const payload = error?.status ? `status:${error.status}` : 'cooldown';

  try {
    await redisService.set(buildCredentialCooldownKey(source, scopeKey), payload, cooldownSeconds);
  } catch {
    // Fail open silently.
  }
}

async function getCredentialAttemptOrder({ source, credentials, redisService }) {
  const normalizedCredentials = (credentials || []).map((credential, index) => ({
    ...credential,
    scopeKey: buildCredentialScopeKey(credential, index)
  }));

  if (normalizedCredentials.length <= 1) {
    return normalizedCredentials;
  }

  let startIndex = Math.floor(Date.now() / 60000) % normalizedCredentials.length;

  if (redisService) {
    try {
      const cursorValue = Number(await redisService.incr(`jobs:${source}:cursor`));
      if (Number.isFinite(cursorValue) && cursorValue > 0) {
        startIndex = (cursorValue - 1) % normalizedCredentials.length;
      }
    } catch {
      // Fall back to time-based rotation.
    }
  }

  return normalizedCredentials.slice(startIndex).concat(normalizedCredentials.slice(0, startIndex));
}

function isRetriableCredentialError(error) {
  return [401, 403, 429].includes(Number(error?.response?.status || error?.status || 0));
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
    description: description ? normalizeText(description, '', true) : null,
    isScam: false
  };
}

export async function incrementSourceCounters(redisService, source, scopeKey = null) {
  if (!redisService) {
    return;
  }

  try {
    const counterDefinitions = getCounterDefinitions(source, scopeKey);

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

  const credentials = Array.isArray(params?.credentials) ? params.credentials : [];
  const attemptCredentials = credentials.length
    ? await getCredentialAttemptOrder({ source, credentials, redisService })
    : [{ scopeKey: null }];

  let sawRateLimit = false;
  let lastError = null;
  let attemptedCredential = false;

  for (const credential of attemptCredentials) {
    const scopeKey = credential.scopeKey || null;
    const isCoolingDown = scopeKey ? await isCredentialCoolingDown(redisService, source, scopeKey) : false;

    if (isCoolingDown) {
      sawRateLimit = true;
      continue;
    }

    const allowed = await isAllowed(redisService, source, scopeKey);
    if (!allowed) {
      sawRateLimit = true;
      continue;
    }

    attemptedCredential = true;

    try {
      const jobs = await loader(credential);
      await incrementSourceCounters(redisService, source, scopeKey);
      await setCachedJobs(redisService, cacheKey, jobs, SOURCE_CACHE_TTLS[source]);
      return attachSourceMeta(jobs, {
        source,
        cached: false,
        allowed: true,
        credentialPoolSize: attemptCredentials.length,
        credentialScopeKey: scopeKey
      });
    } catch (error) {
      lastError = error;
      const statusCode = Number(error?.response?.status || error?.status || 0);
      const shouldCooldownCredential = isRetriableCredentialError(error);

      if (shouldCooldownCredential && scopeKey) {
        sawRateLimit = sawRateLimit || statusCode === 429;
        await markCredentialCoolingDown(redisService, source, scopeKey, error);
      }

      logger.warn?.(
        `[${source}] credential ${scopeKey || 'default'} failed${statusCode ? ` with status ${statusCode}` : ''}: ${error.message}`
      );

      if (credentials.length && shouldCooldownCredential) {
        continue;
      }

      break;
    }
  }

  if (!attemptedCredential || sawRateLimit) {
    return attachSourceMeta([], { source, cached: false, allowed: false, rateLimited: true });
  }

  logger.warn?.(`[${source}] job source failed: ${lastError?.message || 'unknown error'}`);
  return attachSourceMeta([], { source, cached: false, allowed: true, error: true });
}

export async function runDuckDuckSearch(query) {
  return ddgSearch(query, {
    safeSearch: SafeSearchType.MODERATE
  });
}
