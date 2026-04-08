const DEFAULT_TIMEOUT_MS = 500;

export class RedisService {
  constructor({ url, token, timeoutMs = DEFAULT_TIMEOUT_MS, logger = console } = {}) {
    this.url = url ? url.replace(/\/$/, '') : null;
    this.token = token || null;
    this.timeoutMs = timeoutMs;
    this.logger = logger;
  }

  isConfigured() {
    return Boolean(this.url && this.token);
  }

  async request(commandSegments, { query } = {}) {
    const commandName = commandSegments[0];

    if (!this.isConfigured()) {
      this.logger.warn(`[RedisService] ${commandName} skipped because Upstash credentials are missing. Failing open.`);
      return null;
    }

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const commandPath = commandSegments.map((segment) => encodeURIComponent(String(segment))).join('/');
      const requestUrl = new URL(`${this.url}/${commandPath}`);

      if (query) {
        for (const [key, value] of Object.entries(query)) {
          if (value !== undefined && value !== null) {
            requestUrl.searchParams.set(key, String(value));
          }
        }
      }

      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`
        },
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`Upstash request failed with status ${response.status}`);
      }

      const payload = await response.json();

      this.logger.info(`[RedisService] ${commandName} succeeded.`, payload.result ?? null);

      return payload.result ?? null;
    } catch (error) {
      this.logger.error(`[RedisService] ${commandName} failed open.`, error);
      return null;
    } finally {
      clearTimeout(timeoutHandle);
    }
  }

  async ping() {
    return this.request(['PING']);
  }

  async get(key) {
    return this.request(['GET', key]);
  }

  async set(key, value, ttlSeconds) {
    const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
    const query = ttlSeconds ? { EX: ttlSeconds } : undefined;

    return this.request(['SET', key, serializedValue], { query });
  }

  async incr(key) {
    return this.request(['INCR', key]);
  }

  async expire(key, ttlSeconds) {
    return this.request(['EXPIRE', key, ttlSeconds]);
  }

  async del(key) {
    return this.request(['DEL', key]);
  }
}

export function createRedisService(config) {
  return new RedisService(config);
}
