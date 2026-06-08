import {
  getMySquadLeaderboardRankController,
  getMySquadRewardHistoryController,
  getMySquadController,
  getSquadLeaderboardController,
  getSquadRewardHistoryController,
  joinSquadController,
  logSquadAppController,
  pingSquadController
} from './squads.controller.js';
import {
  getCommsController,
  postMessageController,
  setArchetypeController
} from './squad-comms.controller.js';
import { authenticateRequest, optionalAuthenticateRequest, requireFeatureAccess } from '../../shared/middleware/auth.middleware.js';

const strictSquadRateLimit = {
  rateLimit: {
    max: 5,
    timeWindow: '1 minute'
  }
};

export default async function squadRoutes(app) {
  app.post('/join', { preHandler: [authenticateRequest, requireFeatureAccess('squad_actions')] }, joinSquadController);
  app.post('/log-app', { preHandler: [authenticateRequest, requireFeatureAccess('squad_actions')], config: strictSquadRateLimit }, logSquadAppController);
  app.get('/my-squad', { preHandler: authenticateRequest }, getMySquadController);
  app.get('/leaderboard', { preHandler: optionalAuthenticateRequest }, getSquadLeaderboardController);
  app.get('/leaderboard/my-rank', { preHandler: authenticateRequest }, getMySquadLeaderboardRankController);
  app.get('/rewards/my-history', { preHandler: authenticateRequest }, getMySquadRewardHistoryController);
  app.get('/:squadId/reward-history', getSquadRewardHistoryController);
  app.post('/ping', { preHandler: [authenticateRequest, requireFeatureAccess('squad_actions')], config: strictSquadRateLimit }, pingSquadController);
  app.get('/comms', {
    preHandler: authenticateRequest,
    config: {
      rateLimit: {
        max: 30,
        timeWindow: '1 minute'
      }
    }
  }, getCommsController);
  app.post('/comms/message', { preHandler: [authenticateRequest, requireFeatureAccess('squad_actions')], config: strictSquadRateLimit }, postMessageController);
  app.post('/comms/archetype', { preHandler: [authenticateRequest, requireFeatureAccess('squad_actions')] }, setArchetypeController);
}
