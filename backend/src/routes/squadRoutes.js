import {
  getMySquadController,
  joinSquadController,
  logSquadAppController,
  pingSquadController
} from '../controllers/squadController.js';
import { authenticateRequest } from '../middlewares/authMiddleware.js';

export default async function squadRoutes(app) {
  app.post('/join', { preHandler: authenticateRequest }, joinSquadController);
  app.post('/log-app', { preHandler: authenticateRequest }, logSquadAppController);
  app.get('/my-squad', { preHandler: authenticateRequest }, getMySquadController);
  app.post('/ping', { preHandler: authenticateRequest }, pingSquadController);
}
