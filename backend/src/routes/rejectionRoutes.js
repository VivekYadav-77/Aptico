import { createRejectionController } from '../controllers/rejectionController.js';
import { authenticateRequest } from '../middlewares/authMiddleware.js';

export default async function rejectionRoutes(app) {
  app.post('/rejections', { preHandler: authenticateRequest }, createRejectionController);
}
