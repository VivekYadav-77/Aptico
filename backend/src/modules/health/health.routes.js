export default async function healthRoutes(app) {
  app.get('/', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString()
  }));

  app.get('/live', async () => ({
    success: true,
    data: {
      status: 'live',
      timestamp: new Date().toISOString()
    }
  }));

  app.get('/ready', async (request, reply) => {
    const checks = {
      database: Boolean(request.server.db),
      redis: request.server.services?.redis?.isConfigured?.() ? 'configured' : 'not_configured'
    };

    if (!checks.database && request.server.env.nodeEnv === 'production') {
      return reply.code(503).send({
        success: false,
        data: {
          status: 'not_ready',
          checks
        }
      });
    }

    return {
      success: true,
      data: {
        status: 'ready',
        checks
      }
    };
  });
}
