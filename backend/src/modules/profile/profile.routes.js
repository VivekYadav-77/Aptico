import {
  deleteExperienceController,
  getDashboardSummaryController,
  getProfileSettingsController,
  generatePortfolioReadmeController,
  upsertExperienceController,
  upsertProfileSettingsController,
  unlockStickerController,
  equipStickersController,
  getStickerStatsController
} from './profile.controller.js';
import { authenticateRequest, requireFeatureAccess } from '../../shared/middleware/auth.middleware.js';

export default async function profileRoutes(app) {
  app.get('/profile', { preHandler: authenticateRequest }, getProfileSettingsController);
  app.put('/profile', { preHandler: [authenticateRequest, requireFeatureAccess('profile_visibility')] }, upsertProfileSettingsController);
  app.post('/settings/experience', { preHandler: [authenticateRequest, requireFeatureAccess('profile_visibility')] }, upsertExperienceController);
  app.delete('/settings/experience/:id', { preHandler: authenticateRequest }, deleteExperienceController);
  app.get('/dashboard', { preHandler: authenticateRequest }, getDashboardSummaryController);
  app.post('/portfolio/readme', { preHandler: authenticateRequest }, generatePortfolioReadmeController);

  // Sticker system
  app.get('/stickers', { preHandler: authenticateRequest }, getStickerStatsController);
  app.post('/stickers/unlock', { preHandler: authenticateRequest }, unlockStickerController);
  app.put('/stickers/equip', { preHandler: authenticateRequest }, equipStickersController);
}
