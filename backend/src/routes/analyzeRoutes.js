import { analyzeController } from '../controllers/analyzeController.js';
import { optionalAuthenticateRequest } from '../middlewares/authMiddleware.js';
import { env } from '../config/env.js';

const isDev = env.nodeEnv === 'development';

export default async function analyzeRoutes(app) {
  app.post(
    '/',
    {
      preHandler: optionalAuthenticateRequest,
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
