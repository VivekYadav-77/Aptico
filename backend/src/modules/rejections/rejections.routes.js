import { createRejectionController } from './rejections.controller.js';
import { authenticateRequest, requireFeatureAccess } from '../../shared/middleware/auth.middleware.js';

const strictRejectionRateLimit = {
  rateLimit: {
    max: 5,
    timeWindow: '1 minute'
  }
};

export default async function rejectionRoutes(app) {
  app.post('/rejections', { preHandler: [authenticateRequest, requireFeatureAccess('activity_logging')], config: strictRejectionRateLimit }, createRejectionController);
}
