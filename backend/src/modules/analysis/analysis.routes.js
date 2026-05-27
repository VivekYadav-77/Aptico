import { analyzeController } from './analysis.controller.js';
import { optionalAuthenticateRequest } from '../../shared/middleware/auth.middleware.js';
import { env } from '../../config/env.js';
import { createQuotaHook } from '../../shared/security/ai-quota.js';

const isDev = env.nodeEnv === 'development';
const analysisQuota = createQuotaHook({
  prefix: 'analysis',
  guestLimit: isDev ? 10 : 2,
  userLimit: isDev ? 20 : 6,
  windowMs: 60 * 60 * 1000
});

export default async function analyzeRoutes(app) {
  app.post(
    '/',
    {
      preHandler: [optionalAuthenticateRequest, analysisQuota],
      config: {
        rateLimit: {
          max: isDev ? 10 : 3,
          timeWindow: '1 minute',
          errorResponseBuilder: () => ({
            success: false,
            error: 'Too many requests. Please wait a moment.'
          })
        }
      }
    },
    analyzeController
  );
}
