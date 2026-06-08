import { z } from 'zod';
import { optionalAuthenticateRequest } from '../../shared/middleware/auth.middleware.js';
import { isAllowedAnalyticsEvent, recordAnalyticsEvent } from './analytics.service.js';

const eventSchema = z.object({
  eventType: z.string().trim().min(1).max(60),
  visitorId: z.string().trim().min(8).max(80).optional(),
  sessionKey: z.string().trim().min(8).max(80).optional(),
  path: z.string().trim().max(500).optional(),
  referrer: z.string().trim().max(500).nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
  analyticsOptOut: z.boolean().optional()
});

function sendError(reply, error, fallbackMessage) {
  const statusCode = error.name === 'ZodError' ? 400 : error.statusCode || 500;
  return reply.code(statusCode).send({
    success: false,
    error: error.message || fallbackMessage
  });
}

export default async function analyticsRoutes(app) {
  app.post('/event', { preHandler: optionalAuthenticateRequest }, async (request, reply) => {
    try {
      const body = eventSchema.parse(request.body || {});

      if (!isAllowedAnalyticsEvent(body.eventType)) {
        return reply.code(400).send({
          success: false,
          error: 'Unsupported analytics event type.'
        });
      }

      const result = await recordAnalyticsEvent({
        db: request.server.db,
        request,
        eventType: body.eventType,
        userId: request.auth?.userId || null,
        visitorId: body.visitorId,
        sessionKey: body.sessionKey,
        path: body.path,
        referrer: body.referrer,
        metadata: body.metadata,
        analyticsOptOut: Boolean(body.analyticsOptOut)
      });

      return reply.send({
        success: true,
        data: result
      });
    } catch (error) {
      return sendError(reply, error, 'Could not record analytics event.');
    }
  });
}
