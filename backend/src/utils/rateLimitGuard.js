const DAILY_TTL_SECONDS = 86400;
const MINUTE_TTL_SECONDS = 120;

function getDateKey() {
  return new Date().toISOString().slice(0, 10);
}

function getMinuteKey() {
  return Math.floor(Date.now() / 60000);
}

function getSourceRules(source) {
  const dateKey = getDateKey();
  const minuteKey = getMinuteKey();

  return {
    remotive: [],
    muse: [{ key: `muse:rpm:${minuteKey}`, limit: 58 }],
    reed: [{ key: `reed:rpm:${minuteKey}`, limit: 32 }],
    adzuna: [
      { key: `adzuna:daily:${dateKey}`, limit: 220 },
      { key: `adzuna:rpm:${minuteKey}`, limit: 22 }
    ],
    jsearch: [{ key: `jsearch:daily:${dateKey}`, limit: 8 }],
    serper: [{ key: 'serper:lifetime:used', limit: 2400 }],
    ddgs: [{ key: `ddgs:daily:${dateKey}`, limit: 45 }]
  }[source] || [];
}

export function getCounterDefinitions(source) {
  return getSourceRules(source).map((rule) => ({
    ...rule,
    ttlSeconds: rule.key.includes(':daily:') ? DAILY_TTL_SECONDS : rule.key.includes(':rpm:') ? MINUTE_TTL_SECONDS : null
  }));
}

export async function isAllowed(redisService, source) {
  if (!redisService) {
    return true;
  }

  try {
    const rules = getSourceRules(source);

    if (!rules.length) {
      return true;
    }

    const values = await Promise.all(
      rules.map(async (rule) => {
        const rawValue = await redisService.get(rule.key);
        const numericValue = Number.parseInt(rawValue ?? '0', 10);
        return Number.isFinite(numericValue) ? numericValue : 0;
      })
    );

    return values.every((value, index) => value < rules[index].limit);
  } catch (error) {
    console.warn(`[rateLimitGuard] Redis check failed for ${source}. Failing open.`, error?.message || error);
    return true;
  }
}
