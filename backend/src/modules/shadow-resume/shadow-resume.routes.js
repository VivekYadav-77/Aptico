import { shadowResumeChatController } from './shadow-resume.controller.js';

export default async function shadowResumeRoutes(app) {
  app.post('/:username/chat', shadowResumeChatController);
}
