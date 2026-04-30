import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import { Pool } from 'pg';
import { neon } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import { drizzle as drizzleNodePg } from 'drizzle-orm/node-postgres';
import { env, hasDatabaseConfig, hasRedisConfig } from './config/env.js';
import * as dbSchema from './db/schema.js';
import analyzeRoutes from './routes/analyzeRoutes.js';
import { schema as graphqlSchema } from './graphql/schema.js';
import { resolvers as graphqlResolvers } from './graphql/resolvers.js';
import authRoutes from './routes/authRoutes.js';
import generateRoutes from './routes/generateRoutes.js';
import jobRoutes from './routes/jobRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import socialRoutes from './routes/social.js';
import rejectionRoutes from './routes/rejectionRoutes.js';
import shadowResumeRoutes from './routes/shadowResumeRoutes.js';
import squadRoutes from './routes/squadRoutes.js';
import badgeRoutes from './routes/badgeRoutes.js';
import { authenticateAdminRequest } from './middlewares/authMiddleware.js';
import { createRedisService } from './utils/redisService.js';

const require = createRequire(import.meta.url);
const mercurius = require('mercurius');
const helmet = require('@fastify/helmet');
const rateLimit = require('@fastify/rate-limit');

const CORS_HEADERS = 'authorization, content-type';
const CORS_METHODS = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';

export function buildServer() {
  const app = Fastify({
    logger: true,
    bodyLimit: 5 * 1024 * 1024
  });

  const db = hasDatabaseConfig()
    ? process.env.NODE_ENV === "production"
      ?drizzleNeon(neon(env.databaseUrl), { 
          schema: dbSchema 
        })
      : (() => {
        const pool = new Pool({
          connectionString: env.databaseUrl,
        });

       return drizzleNodePg(pool, { 
            schema: dbSchema 
          });
      })()
    : null;

  const redisService = createRedisService({
    url: env.upstashRedisRestUrl,
    token: env.upstashRedisRestToken,
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
    max: 20,
    timeWindow: '1 minute'
  });

  app.addHook('onRequest', async (request, reply) => {
    const requestOrigin = request.headers.origin;

    if (requestOrigin) {
      if (requestOrigin !== env.frontendUrl) {
        return reply.code(403).send({
          success: false,
          error: 'CORS origin is not allowed.'
        });
      }

      reply.header('Access-Control-Allow-Origin', env.frontendUrl);
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

  app.register(authRoutes, { prefix: '/api/auth' });
  app.register(analyzeRoutes, { prefix: '/api/analyze' });
  app.register(generateRoutes, { prefix: '/api/generate' });
  app.register(jobRoutes, { prefix: '/api/jobs' });
  app.register(profileRoutes, { prefix: '/api' });
  app.register(socialRoutes, { prefix: '/api/social' });
  app.register(rejectionRoutes, { prefix: '/api' });
  app.register(shadowResumeRoutes, { prefix: '/api/shadow-resume' });
  app.register(squadRoutes, { prefix: '/api/squads' });
  app.register(badgeRoutes, { prefix: '/api/badge' });
  app.register(async function adminScope(adminApp) {
    adminApp.addHook('onRequest', authenticateAdminRequest);
    adminApp.register(adminRoutes, { prefix: '/api/admin' });
    adminApp.register(mercurius, {
      schema: graphqlSchema,
      resolvers: graphqlResolvers,
      prefix: '/admin/graphql',
      path: '/',
      graphiql: false,
      context: (request) => ({
        auth: request.auth,
        db: request.server.db,
        redis: request.server.services?.redis,
        logger: request.log
      })
    });
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

const currentFilePath = fileURLToPath(import.meta.url);
const entryFilePath = process.argv[1] ? resolve(process.argv[1]) : null;

if (entryFilePath === currentFilePath) {
  startServer();
}
