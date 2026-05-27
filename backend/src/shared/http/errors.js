import { z } from 'zod';

export function createHttpError(message, statusCode = 500, code = null) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code || (statusCode >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR');
  return error;
}

export function requireDatabase(db) {
  if (!db) {
    throw createHttpError('Database is not configured yet.', 503, 'DATABASE_UNAVAILABLE');
  }
}

export function getRequestId(request) {
  return request?.id || request?.headers?.['x-request-id'] || null;
}

export function toPublicError(error, fallbackMessage = 'Internal server error.', { exposeInternal = false } = {}) {
  if (error instanceof z.ZodError) {
    return {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: error.errors[0]?.message || 'Invalid input data.'
    };
  }

  const statusCode = error?.statusCode || 500;
  const code = error?.code || (statusCode >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR');
  const message = statusCode >= 500 && !exposeInternal ? fallbackMessage : error?.message || fallbackMessage;

  return {
    statusCode,
    code,
    message
  };
}

export function sendError(reply, request, error, fallbackMessage = 'Internal server error.') {
  const exposeInternal = request?.server?.env?.nodeEnv !== 'production';
  const publicError = toPublicError(error, fallbackMessage, { exposeInternal });
  const payload = {
    success: false,
    code: publicError.code,
    message: publicError.message
  };
  const requestId = getRequestId(request);

  if (requestId) {
    payload.requestId = requestId;
  }

  return reply.code(publicError.statusCode).send(payload);
}
