import {
  googleAuthController,
  magicLinkController,
  refreshController,
  verifyMagicLinkController
} from '../controllers/authController.js';

export default async function authRoutes(app) {
  app.post('/google', googleAuthController);
  app.post('/magic-link', magicLinkController);
  app.post('/verify', verifyMagicLinkController);
  app.post('/refresh', refreshController);
}
