import { generateController } from '../controllers/generateController.js';
import { optionalAuthenticateRequest } from '../middlewares/authMiddleware.js';

export default async function generateRoutes(app) {
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
    generateController
  );
}
