import {
  getMySquadController,
  joinSquadController,
  logSquadAppController,
  pingSquadController
} from '../controllers/squadController.js';
import { authenticateRequest } from '../middlewares/authMiddleware.js';

const strictSquadRateLimit = {
  rateLimit: {
    max: 5,
    timeWindow: '1 minute'
  }
};

export default async function squadRoutes(app) {
  app.post('/join', { preHandler: authenticateRequest }, joinSquadController);
  app.post('/log-app', { preHandler: authenticateRequest, config: strictSquadRateLimit }, logSquadAppController);
  app.get('/my-squad', { preHandler: authenticateRequest }, getMySquadController);
  app.post('/ping', { preHandler: authenticateRequest, config: strictSquadRateLimit }, pingSquadController);
}
