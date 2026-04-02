import { analyzeController } from '../controllers/analyzeController.js';
import { optionalAuthenticateRequest } from '../middlewares/authMiddleware.js';

export default async function analyzeRoutes(app) {
  app.post(
    '/',
    {
      preHandler: optionalAuthenticateRequest,
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '1 minute'
        }
      }
    },
    analyzeController
  );
}
