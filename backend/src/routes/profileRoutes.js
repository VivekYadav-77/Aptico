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
} from '../controllers/profileController.js';
import { authenticateRequest } from '../middlewares/authMiddleware.js';

export default async function profileRoutes(app) {
  app.get('/profile', { preHandler: authenticateRequest }, getProfileSettingsController);
  app.put('/profile', { preHandler: authenticateRequest }, upsertProfileSettingsController);
  app.post('/settings/experience', { preHandler: authenticateRequest }, upsertExperienceController);
  app.delete('/settings/experience/:id', { preHandler: authenticateRequest }, deleteExperienceController);
  app.get('/dashboard', { preHandler: authenticateRequest }, getDashboardSummaryController);
  app.post('/portfolio/readme', { preHandler: authenticateRequest }, generatePortfolioReadmeController);

  // Sticker system
  app.get('/stickers', { preHandler: authenticateRequest }, getStickerStatsController);
  app.post('/stickers/unlock', { preHandler: authenticateRequest }, unlockStickerController);
  app.put('/stickers/equip', { preHandler: authenticateRequest }, equipStickersController);
}
