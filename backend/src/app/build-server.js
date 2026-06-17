import { createRequire } from 'node:module';
import Fastify from 'fastify';
import { Pool } from 'pg';
import { neon } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import { drizzle as drizzleNodePg } from 'drizzle-orm/node-postgres';
import { env, hasDatabaseConfig, hasRedisConfig } from '../config/env.js';
import * as dbSchema from '../db/schema.js';
import { sendError } from '../shared/http/errors.js';
import { createRedisService } from '../shared/utils/redis-service.js';
import { registerRoutes } from './register-routes.js';

const require = createRequire(import.meta.url);
const helmet = require('@fastify/helmet');
const rateLimit = require('@fastify/rate-limit');

const CORS_HEADERS = 'authorization, content-type, x-csrf-token, x-request-id';
const CORS_METHODS = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';

function isAllowedOrigin(origin) {
  return env.allowedOrigins.includes(origin);
}

export function buildServer() {
  const app = Fastify({
    logger: true,
    bodyLimit: 5 * 1024 * 1024
  });

  // Infrastructure wiring stays in app bootstrap; domain modules only receive decorated dependencies.
  const db = hasDatabaseConfig()
    ? process.env.NODE_ENV === 'production'
      ? drizzleNeon(neon(env.databaseUrl), {
          schema: dbSchema
        })
      : (() => {
          const pool = new Pool({
            connectionString: env.databaseUrl
          });

          return drizzleNodePg(pool, {
            schema: dbSchema
          });
        })()
    : null;

  const redisService = createRedisService({
    url: env.upstashRedisRestUrl,
    token: env.upstashRedisRestToken,
    timeoutMs: env.upstashRedisTimeoutMs,
    logger: app.log
  });

  app.decorate('db', db);
  app.decorate('env', env);
  app.decorate('services', {
    redis: redisService
  });

  app.register(helmet, {
    global: true,
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' }
  });

  app.register(rateLimit, {
    global: true,
    max: env.globalRateLimitMax,
    timeWindow: env.globalRateLimitWindow,
    skipOnError: true,
    errorResponseBuilder: (request) => ({
      success: false,
      code: 'RATE_LIMITED',
      message: 'Too many requests. Please wait a moment.',
      requestId: request.id
    })
  });

  app.addHook('onRequest', async (request, reply) => {
    const requestOrigin = request.headers.origin;

    reply.header('X-Request-Id', request.id);
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    reply.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    if (requestOrigin) {
      if (!isAllowedOrigin(requestOrigin)) {
        return reply.code(403).send({
          success: false,
          code: 'CORS_ORIGIN_DENIED',
          message: 'CORS origin is not allowed.',
          requestId: request.id
        });
      }

      reply.header('Access-Control-Allow-Origin', requestOrigin);
      reply.header('Access-Control-Allow-Credentials', 'true');
      reply.header('Access-Control-Allow-Headers', CORS_HEADERS);
      reply.header('Access-Control-Allow-Methods', CORS_METHODS);
      reply.header('Vary', 'Origin');
    }

    if (request.method === 'OPTIONS') {
      return reply.code(204).send();
    }
  });

  // app.get('/api/health', async () => ({
  //   status: 'ok',
  //   timestamp: new Date().toISOString(),
  //   keysConfigured: {
  //     GEMINI_PRECHECK_API_KEY: Boolean(env.geminiPrecheckKey),
  //     GEMINI_KEY_1: Boolean(env.geminiKey1),
  //     GEMINI_KEY_2: Boolean(env.geminiKey2),
  //     GEMINI_KEY_3: Boolean(env.geminiKey3),
  //     GEMINI_KEY_FALLBACK: Boolean(env.geminiKeyFallback)
  //   }
  // }));

  registerRoutes(app);

  app.setNotFoundHandler((request, reply) => {
    return reply.code(404).send({
      success: false,
      code: 'NOT_FOUND',
      message: 'Route not found.',
      requestId: request.id
    });
  });

  app.setErrorHandler((error, request, reply) => {
    request.log.error({ err: error }, 'Unhandled request error.');
    return sendError(reply, request, error);
  });

  app.addHook('onReady', async () => {
    if (!hasDatabaseConfig()) {
      app.log.warn('DATABASE_URL is not set. Drizzle will stay uninitialized until it is provided.');
    }

    if (hasRedisConfig()) {
      await redisService.ping();
      return;
    }

    app.log.warn('Upstash Redis credentials are not set. RedisService will fail open.');
  });

  return app;
}

export async function startServer() {
  const app = buildServer();

  try {
    await app.listen({
      host: env.host,
      port: env.port
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

