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

const publicRouteModules = [
  { routes: healthRoutes, prefix: '/health' },
  { routes: authRoutes, prefix: '/api/auth' },
  { routes: analyticsRoutes, prefix: '/api/analytics' },
  { routes: healthRoutes, prefix: '/api/health' },
  { routes: analyzeRoutes, prefix: '/api/analyze' },
  { routes: jobRoutes, prefix: '/api/jobs' },
  { routes: profileRoutes, prefix: '/api' },
  { routes: socialRoutes, prefix: '/api/social' },
  { routes: activityRoutes, prefix: '/api/users/activity' },
  { routes: rejectionRoutes, prefix: '/api' },
  { routes: shadowResumeRoutes, prefix: '/api/shadow-resume' },
  { routes: squadRoutes, prefix: '/api/squads' },
  { routes: supportRoutes, prefix: '/api/support' },
  { routes: badgeRoutes, prefix: '/api/badge' }
];

// Route registration lives here so URL prefixes remain auditable during refactors.
export function registerRoutes(app) {
  for (const routeModule of publicRouteModules) {
    app.register(routeModule.routes, { prefix: routeModule.prefix });
  }

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
