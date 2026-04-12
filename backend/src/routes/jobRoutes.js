import {
  deleteAllSavedJobsController,
  deleteSavedJobController,
  getFollowUpScriptsController,
  getJobsController,
  saveJobController
} from '../controllers/jobController.js';
import { authenticateRequest, optionalAuthenticateRequest } from '../middlewares/authMiddleware.js';

export default async function jobRoutes(app) {
  app.get('/', { preHandler: optionalAuthenticateRequest }, getJobsController);
  app.post('/save', { preHandler: authenticateRequest }, saveJobController);
  app.delete('/save', { preHandler: authenticateRequest }, deleteAllSavedJobsController);
  app.delete('/save/:savedJobId', { preHandler: authenticateRequest }, deleteSavedJobController);
  app.post('/follow-up-scripts', { preHandler: optionalAuthenticateRequest }, getFollowUpScriptsController);
}
