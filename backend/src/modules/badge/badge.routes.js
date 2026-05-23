import { getBadgeSvgController } from './badge.controller.js';

export default async function badgeRoutes(app) {
  app.get('/:username.svg', getBadgeSvgController);
}
