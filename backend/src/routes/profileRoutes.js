import {
  getDashboardSummaryController,
  getProfileSettingsController,
  upsertProfileSettingsController
} from '../controllers/profileController.js';
import { authenticateRequest } from '../middlewares/authMiddleware.js';

export default async function profileRoutes(app) {
  app.get('/profile', { preHandler: authenticateRequest }, getProfileSettingsController);
  app.put('/profile', { preHandler: authenticateRequest }, upsertProfileSettingsController);
  app.get('/dashboard', { preHandler: authenticateRequest }, getDashboardSummaryController);
}
