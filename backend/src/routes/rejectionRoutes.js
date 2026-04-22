import { createRejectionController } from '../controllers/rejectionController.js';
import { authenticateRequest } from '../middlewares/authMiddleware.js';

const strictRejectionRateLimit = {
  rateLimit: {
    max: 5,
    timeWindow: '1 minute'
  }
};

export default async function rejectionRoutes(app) {
  app.post('/rejections', { preHandler: authenticateRequest, config: strictRejectionRateLimit }, createRejectionController);
}
