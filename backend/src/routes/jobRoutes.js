import { getFollowUpScriptsController, getJobsController, saveJobController } from '../controllers/jobController.js';
import { authenticateRequest, optionalAuthenticateRequest } from '../middlewares/authMiddleware.js';

export default async function jobRoutes(app) {
  app.get('/', { preHandler: optionalAuthenticateRequest }, getJobsController);
  app.post('/save', { preHandler: authenticateRequest }, saveJobController);
  app.post('/follow-up-scripts', { preHandler: optionalAuthenticateRequest }, getFollowUpScriptsController);
}
