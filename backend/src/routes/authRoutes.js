import {
  forgotPasswordController,
  googleAuthController,
  loginController,
  logoutController,
  meController,
  registerController,
  requestEmailVerificationController,
  resetPasswordController,
  refreshController,
  verifyEmailController
} from '../controllers/authController.js';
import { authenticateRequest } from '../middlewares/authMiddleware.js';

const strictAuthRateLimit = {
  rateLimit: {
    max: 5,
    timeWindow: '1 minute'
  }
};

const emailDispatchRateLimit = {
  rateLimit: {
    max: 3,
    timeWindow: '15 minutes'
  }
};

const refreshRateLimit = {
  rateLimit: {
    max: 20,
    timeWindow: '1 minute'
  }
};

export default async function authRoutes(app) {
  app.post('/register', { config: strictAuthRateLimit }, registerController);
  app.post('/login', { config: strictAuthRateLimit }, loginController);
  app.post('/google', { config: strictAuthRateLimit }, googleAuthController);
  app.post('/verify-email/request', { config: emailDispatchRateLimit }, requestEmailVerificationController);
  app.post('/verify-email/confirm', { config: strictAuthRateLimit }, verifyEmailController);
  app.post('/password/forgot', { config: emailDispatchRateLimit }, forgotPasswordController);
  app.post('/password/reset', { config: strictAuthRateLimit }, resetPasswordController);
  app.post('/refresh', { config: refreshRateLimit }, refreshController);
  app.post('/logout', { config: refreshRateLimit }, logoutController);
  app.get('/me', { preHandler: authenticateRequest }, meController);
}
