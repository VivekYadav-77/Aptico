const memoryCounters = new Map();

function getClientKey(request) {
  const userId = request.auth?.userId;
  const forwardedFor = String(request.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const ip = forwardedFor || request.ip || 'unknown';

  return userId ? `user:${userId}` : `guest:${ip}`;
}

function getWindowKey(prefix, request, windowMs) {
  return `${prefix}:${getClientKey(request)}:${Math.floor(Date.now() / windowMs)}`;
}

async function incrementMemory(key, windowMs) {
  const now = Date.now();
  const existing = memoryCounters.get(key);

  if (!existing || existing.expiresAt <= now) {
    memoryCounters.set(key, {
      count: 1,
      expiresAt: now + windowMs
    });
    return 1;
  }

  existing.count += 1;
  return existing.count;
}

export function createQuotaHook({ prefix, guestLimit, userLimit, windowMs }) {
  return async function enforceQuota(request, reply) {
    const limit = request.auth?.userId ? userLimit : guestLimit;
    const key = getWindowKey(prefix, request, windowMs);
    const redis = request.server.services?.redis;
    let count;

    if (redis?.isConfigured?.()) {
      count = Number(await redis.incr(key));

      if (count === 1) {
        await redis.expire(key, Math.ceil(windowMs / 1000));
      }
    } else {
      count = await incrementMemory(key, windowMs);
    }

    if (count > limit) {
      return reply.code(429).send({
        success: false,
        code: 'RATE_LIMITED',
        message: 'Too many requests. Please wait a moment.',
        requestId: request.id
      });
    }
  };
}
