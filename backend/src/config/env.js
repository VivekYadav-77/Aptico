import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const runtimeEnvFilePaths = [resolve(currentDirectory, '../../.env.local'), resolve(currentDirectory, '../../.env')];

for (const envFilePath of runtimeEnvFilePaths) {
  if (existsSync(envFilePath) && typeof process.loadEnvFile === 'function') {
    process.loadEnvFile(envFilePath);
  }
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().trim().min(1).default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(5000),
  DATABASE_URL: z.string().trim().url().optional(),
  MUSE_API_KEY: z.string().trim().min(1).optional(),
  REED_API_KEY: z.string().trim().min(1).optional(),
  ADZUNA_APP_ID: z.string().trim().min(1).optional(),
  ADZUNA_APP_KEY: z.string().trim().min(1).optional(),
  ADZUNA_API_BASE_URL: z.string().trim().url().default('https://api.adzuna.com/v1/api/jobs/in/search/1'),
  DUCKDUCKGO_HTML_URL: z.string().trim().url().default('https://html.duckduckgo.com/html/'),
  FRONTEND_URL: z.string().trim().url().default('http://localhost:3000'),
  GAS_EMAIL_DISPATCH_URL: z.string().trim().url().optional(),
  GAS_EMAIL_DISPATCH_TOKEN: z.string().trim().min(1).optional(),
  GAS_EMAIL_VERIFY_URL: z.string().trim().url().optional(),
  GAS_PASSWORD_RESET_URL: z.string().trim().url().optional(),
  GAS_MAGIC_LINK_URL: z.string().trim().url().optional(),
  GEMINI_MODEL_1: z.string().trim().min(1).default('gemini-3.1-flash-lite'),
  GEMINI_MODEL_2: z.string().trim().min(1).default('gemini-3.1-flash-lite'),
  GEMINI_MODEL_3: z.string().trim().min(1).default('gemini-3.1-flash-lite'),
  GEMINI_MODEL_FALLBACK: z.string().trim().min(1).default('gemini-3.1-flash-lite'),
  GEMINI_PRECHECK_API_KEY: z.string().trim().min(1).optional(),
  GEMINI_KEY_1: z.string().trim().min(1).optional(),
  GEMINI_KEY_2: z.string().trim().min(1).optional(),
  GEMINI_KEY_3: z.string().trim().min(1).optional(),
  GEMINI_KEY_FALLBACK: z.string().trim().min(1).optional(),
  GOOGLE_CLIENT_ID: z.string().trim().min(1).optional(),
  GOOGLE_TOKENINFO_URL: z.string().trim().url().default('https://oauth2.googleapis.com/tokeninfo'),
  JSEARCH_API_BASE_URL: z.string().trim().url().default('https://jsearch.p.rapidapi.com/search'),
  JSEARCH_API_HOST: z.string().trim().min(1).default('jsearch.p.rapidapi.com'),
  JSEARCH_API_KEY: z.string().trim().min(1).optional(),
  JSEARCH_RAPIDAPI_KEY: z.string().trim().min(1).optional(),
  MUSE_API_BASE_URL: z.string().trim().url().default('https://www.themuse.com/api/public/v2/jobs'),
  REED_API_BASE_URL: z.string().trim().url().default('https://www.reed.co.uk/api/1.0/search'),
  REMOTIVE_API_BASE_URL: z.string().trim().url().default('https://remotive.com/api/remote-jobs'),
  SERPER_API_URL: z.string().trim().url().default('https://google.serper.dev/search'),
  JWT_SECRET: z.string().trim().min(32).default('development-only-jwt-secret-change-me-123'),
  SERPER_API_KEY: z.string().trim().min(1).optional(),
  UPSTASH_REDIS_REST_URL: z.string().trim().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().trim().min(1).optional()
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  throw new Error(`Invalid environment configuration: ${parsedEnv.error.message}`);
}

// Startup key-presence warnings
const KEY_NAMES = ['GEMINI_PRECHECK_API_KEY', 'GEMINI_KEY_1', 'GEMINI_KEY_2', 'GEMINI_KEY_3', 'GEMINI_KEY_FALLBACK'];
for (const keyName of KEY_NAMES) {
  if (!parsedEnv.data[keyName]) {
    console.warn(`[env] WARNING: ${keyName} is not set. Features relying on it will be unavailable.`);
  }
}

export const env = {
  nodeEnv: parsedEnv.data.NODE_ENV,
  host: parsedEnv.data.HOST,
  port: parsedEnv.data.PORT,
  adzunaAppId: parsedEnv.data.ADZUNA_APP_ID || null,
  adzunaAppKey: parsedEnv.data.ADZUNA_APP_KEY || null,
  adzunaApiBaseUrl: parsedEnv.data.ADZUNA_API_BASE_URL,
  databaseUrl: parsedEnv.data.DATABASE_URL || null,
  duckDuckGoHtmlUrl: parsedEnv.data.DUCKDUCKGO_HTML_URL,
  frontendUrl: parsedEnv.data.FRONTEND_URL,
  gasEmailDispatchUrl: parsedEnv.data.GAS_EMAIL_DISPATCH_URL || null,
  gasEmailDispatchToken: parsedEnv.data.GAS_EMAIL_DISPATCH_TOKEN || null,
  gasEmailVerifyUrl: parsedEnv.data.GAS_EMAIL_VERIFY_URL || null,
  gasMagicLinkUrl: parsedEnv.data.GAS_MAGIC_LINK_URL || null,
  gasPasswordResetUrl: parsedEnv.data.GAS_PASSWORD_RESET_URL || null,
  geminiModel1: parsedEnv.data.GEMINI_MODEL_1,
  geminiModel2: parsedEnv.data.GEMINI_MODEL_2,
  geminiModel3: parsedEnv.data.GEMINI_MODEL_3,
  geminiModelFallback: parsedEnv.data.GEMINI_MODEL_FALLBACK,
  geminiPrecheckKey: parsedEnv.data.GEMINI_PRECHECK_API_KEY || null,
  geminiKey1: parsedEnv.data.GEMINI_KEY_1 || null,
  geminiKey2: parsedEnv.data.GEMINI_KEY_2 || null,
  geminiKey3: parsedEnv.data.GEMINI_KEY_3 || null,
  geminiKeyFallback: parsedEnv.data.GEMINI_KEY_FALLBACK || null,
  geminiKeys: [parsedEnv.data.GEMINI_KEY_1, parsedEnv.data.GEMINI_KEY_2, parsedEnv.data.GEMINI_KEY_3, parsedEnv.data.GEMINI_KEY_FALLBACK].filter(Boolean),
  googleClientId: parsedEnv.data.GOOGLE_CLIENT_ID || null,
  googleTokenInfoUrl: parsedEnv.data.GOOGLE_TOKENINFO_URL,
  jsearchApiBaseUrl: parsedEnv.data.JSEARCH_API_BASE_URL,
  jsearchApiHost: parsedEnv.data.JSEARCH_API_HOST,
  jsearchApiKey: parsedEnv.data.JSEARCH_API_KEY || parsedEnv.data.JSEARCH_RAPIDAPI_KEY || null,
  jsearchRapidapiKey: parsedEnv.data.JSEARCH_RAPIDAPI_KEY || parsedEnv.data.JSEARCH_API_KEY || null,
  museApiBaseUrl: parsedEnv.data.MUSE_API_BASE_URL,
  museApiKey: parsedEnv.data.MUSE_API_KEY || null,
  reedApiBaseUrl: parsedEnv.data.REED_API_BASE_URL,
  reedApiKey: parsedEnv.data.REED_API_KEY || null,
  remotiveApiBaseUrl: parsedEnv.data.REMOTIVE_API_BASE_URL,
  jwtSecret: parsedEnv.data.JWT_SECRET,
  serperApiUrl: parsedEnv.data.SERPER_API_URL,
  serperApiKey: parsedEnv.data.SERPER_API_KEY || null,
  upstashRedisRestUrl: parsedEnv.data.UPSTASH_REDIS_REST_URL || null,
  upstashRedisRestToken: parsedEnv.data.UPSTASH_REDIS_REST_TOKEN || null
};

export function hasDatabaseConfig() {
  return Boolean(env.databaseUrl);
}

export function hasRedisConfig() {
  return Boolean(env.upstashRedisRestUrl && env.upstashRedisRestToken);
}
