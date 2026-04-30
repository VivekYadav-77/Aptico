import { getBadgeSvgController } from '../controllers/badgeController.js';

export default async function badgeRoutes(app) {
  app.get('/:username.svg', getBadgeSvgController);
}
