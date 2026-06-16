import { createRequire } from 'node:module';
import { schema as graphqlSchema } from '../graphql/schema.js';
import { resolvers as graphqlResolvers } from '../graphql/resolvers.js';
import adminRoutes from '../modules/admin/admin.routes.js';
import analyticsRoutes from '../modules/analytics/analytics.routes.js';
import analyzeRoutes from '../modules/analysis/analysis.routes.js';
import activityRoutes from '../modules/activity/activity.routes.js';
import authRoutes from '../modules/auth/auth.routes.js';
import badgeRoutes from '../modules/badge/badge.routes.js';
import healthRoutes from '../modules/health/health.routes.js';
import jobRoutes from '../modules/jobs/jobs.routes.js';
import profileRoutes from '../modules/profile/profile.routes.js';
import rejectionRoutes from '../modules/rejections/rejections.routes.js';
import shadowResumeRoutes from '../modules/shadow-resume/shadow-resume.routes.js';
import socialRoutes from '../modules/social/social.routes.js';
import squadRoutes from '../modules/squads/squads.routes.js';
import supportRoutes from '../modules/support/support.routes.js';
import { authenticateAdminRequest } from '../shared/middleware/auth.middleware.js';

const require = createRequire(import.meta.url);
const mercurius = require('mercurius');

// Route registration lives here so URL prefixes remain auditable during refactors.
export function registerRoutes(app) {
  app.register(authRoutes, { prefix: '/api/auth' });
  app.register(analyticsRoutes, { prefix: '/api/analytics' });
  app.register(healthRoutes, { prefix: '/api/health' });
  app.register(analyzeRoutes, { prefix: '/api/analyze' });
  app.register(jobRoutes, { prefix: '/api/jobs' });
  app.register(profileRoutes, { prefix: '/api' });
  app.register(socialRoutes, { prefix: '/api/social' });
  app.register(activityRoutes, { prefix: '/api/users/activity' });
  app.register(rejectionRoutes, { prefix: '/api' });
  app.register(shadowResumeRoutes, { prefix: '/api/shadow-resume' });
  app.register(squadRoutes, { prefix: '/api/squads' });
  app.register(supportRoutes, { prefix: '/api/support' });
  app.register(badgeRoutes, { prefix: '/api/badge' });

  app.register(async function adminScope(adminApp) {
    adminApp.addHook('onRequest', authenticateAdminRequest);
    adminApp.register(adminRoutes, { prefix: '/api/admin' });
    adminApp.register(mercurius, {
      schema: graphqlSchema,
      resolvers: graphqlResolvers,
      prefix: '/admin/graphql',
      path: '/',
      graphiql: false,
      context: (request) => ({
        auth: request.auth,
        db: request.server.db,
        redis: request.server.services?.redis,
        logger: request.log
      })
    });
  });
}
