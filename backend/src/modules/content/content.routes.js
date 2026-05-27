import { generateController } from './content.controller.js';
import { authenticateRequest, optionalAuthenticateRequest } from '../../shared/middleware/auth.middleware.js';
import { env } from '../../config/env.js';
import { createQuotaHook } from '../../shared/security/ai-quota.js';

const isDev = env.nodeEnv === 'development';
const generateQuota = createQuotaHook({
  prefix: 'generate',
  guestLimit: isDev ? 5 : 0,
  userLimit: isDev ? 20 : 8,
  windowMs: 60 * 60 * 1000
});

export default async function generateRoutes(app) {
  const authHandler = env.requireAuthForAi ? authenticateRequest : optionalAuthenticateRequest;

  app.post(
    '/',
    {
      preHandler: [authHandler, generateQuota],
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
    generateController
  );
}
