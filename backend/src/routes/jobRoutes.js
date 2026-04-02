import { getJobsController, saveJobController } from '../controllers/jobController.js';
import { authenticateRequest, optionalAuthenticateRequest } from '../middlewares/authMiddleware.js';

export default async function jobRoutes(app) {
  app.get('/', { preHandler: optionalAuthenticateRequest }, getJobsController);
  app.post('/save', { preHandler: authenticateRequest }, saveJobController);
}
