export async function getCachedJobs(redisService, cacheKey) {
  if (!redisService) {
    return null;
  }

  try {
    const cachedValue = await redisService.get(cacheKey);

    if (!cachedValue) {
      return null;
    }

    const parsedValue = JSON.parse(cachedValue);
    return Array.isArray(parsedValue) ? parsedValue : null;
  } catch {
    return null;
  }
}

export async function setCachedJobs(redisService, cacheKey, jobs, ttlSeconds) {
  if (!redisService) {
    return;
  }

  try {
    await redisService.set(cacheKey, JSON.stringify(Array.isArray(jobs) ? jobs : []), ttlSeconds);
  } catch {
    // Fail open silently.
  }
}

