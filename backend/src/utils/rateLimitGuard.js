const DAILY_TTL_SECONDS = 86400;
const MINUTE_TTL_SECONDS = 120;

function getDateKey() {
  return new Date().toISOString().slice(0, 10);
}

function getMinuteKey() {
  return Math.floor(Date.now() / 60000);
}

function buildRuleKey(source, scopeKey, suffix) {
  return scopeKey ? `${source}:${scopeKey}:${suffix}` : `${source}:${suffix}`;
}

function getSourceRules(source, scopeKey = null) {
  const dateKey = getDateKey();
  const minuteKey = getMinuteKey();

  return {
    remotive: [],
    muse: [{ key: buildRuleKey('muse', scopeKey, `rpm:${minuteKey}`), limit: 58 }],
    reed: [{ key: buildRuleKey('reed', scopeKey, `rpm:${minuteKey}`), limit: 32 }],
    adzuna: [
      { key: buildRuleKey('adzuna', scopeKey, `daily:${dateKey}`), limit: 220 },
      { key: buildRuleKey('adzuna', scopeKey, `rpm:${minuteKey}`), limit: 22 }
    ],
    jsearch: [{ key: buildRuleKey('jsearch', scopeKey, `daily:${dateKey}`), limit: 8 }],
    serper: [{ key: buildRuleKey('serper', scopeKey, 'lifetime:used'), limit: 2400 }],
    jooble: [],
    ddgs: [{ key: buildRuleKey('ddgs', scopeKey, `daily:${dateKey}`), limit: 45 }]
  }[source] || [];
}

export function getCounterDefinitions(source, scopeKey = null) {
  return getSourceRules(source, scopeKey).map((rule) => ({
    ...rule,
    ttlSeconds: rule.key.includes(':daily:') ? DAILY_TTL_SECONDS : rule.key.includes(':rpm:') ? MINUTE_TTL_SECONDS : null
  }));
}

export function getRateLimitCooldownSeconds(source) {
  return (
    {
      adzuna: 120,
      jsearch: 3600,
      jooble: 1800,
      serper: 3600
    }[source] || 600
  );
}

export async function isAllowed(redisService, source, scopeKey = null) {
  if (!redisService) {
    return true;
  }

  try {
    const rules = getSourceRules(source, scopeKey);

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
    console.warn(`[rateLimitGuard] Redis check failed for ${source}${scopeKey ? `:${scopeKey}` : ''}. Failing open.`, error?.message || error);
    return true;
  }
}
