import {
  deleteAllSavedJobsController,
  deleteSavedJobController,
  getFollowUpScriptsController,
  getJobsController,
  saveJobController
} from './jobs.controller.js';
import { authenticateRequest, optionalAuthenticateRequest, requireFeatureAccess } from '../../shared/middleware/auth.middleware.js';

export default async function jobRoutes(app) {
  app.get('/', { preHandler: [optionalAuthenticateRequest, requireFeatureAccess('job_search')] }, getJobsController);
  app.post('/save', { preHandler: [authenticateRequest, requireFeatureAccess('job_saving')] }, saveJobController);
  app.delete('/save', { preHandler: authenticateRequest }, deleteAllSavedJobsController);
  app.delete('/save/:savedJobId', { preHandler: authenticateRequest }, deleteSavedJobController);
  app.post('/follow-up-scripts', { preHandler: optionalAuthenticateRequest }, getFollowUpScriptsController);
}
