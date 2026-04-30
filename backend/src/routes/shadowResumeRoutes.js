import { shadowResumeChatController } from '../controllers/shadowResumeController.js';

export default async function shadowResumeRoutes(app) {
  app.post('/:username/chat', shadowResumeChatController);
}
