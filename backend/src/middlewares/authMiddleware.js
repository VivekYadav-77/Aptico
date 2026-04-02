import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const REDIS_TIMEOUT_SYMBOL = Symbol('redis-timeout');

function getBearerToken(headerValue) {
  if (!headerValue || !headerValue.startsWith('Bearer ')) {
    return null;
  }

  return headerValue.slice('Bearer '.length).trim();
}

function sendAuthError(reply, message, statusCode) {
  return reply.code(statusCode).send({
    success: false,
    message
  });
}

async function resolveAuth(request, reply, { optional, adminOnly = false }) {
  const failureStatusCode = adminOnly ? 403 : 401;
  const bearerToken = getBearerToken(request.headers.authorization);

  if (!bearerToken) {
    if (optional) {
      request.auth = null;
      return;
    }

    return sendAuthError(reply, 'Authorization token is required.', failureStatusCode);
  }

  let payload;

  try {
    payload = jwt.verify(bearerToken, env.jwtSecret);
  } catch (error) {
    return sendAuthError(reply, 'Authorization token is invalid or expired.', failureStatusCode);
  }

  if (payload.type !== 'access' || !payload.jti) {
    return sendAuthError(reply, 'Authorization token is invalid.', failureStatusCode);
  }

  const redis = request.server.services?.redis;

  if (redis) {
    const revocationResult = await Promise.race([
      redis.get(`revoked_jwt:${payload.jti}`),
      new Promise((resolve) => {
        setTimeout(() => resolve(REDIS_TIMEOUT_SYMBOL), 300);
      })
    ]);

    if (revocationResult === REDIS_TIMEOUT_SYMBOL) {
      request.log.warn(`Redis revocation check timed out for JWT ${payload.jti}. Allowing request.`);
    } else if (revocationResult) {
      return sendAuthError(reply, 'Authorization token has been revoked.', failureStatusCode);
    }
  }

  request.auth = {
    userId: payload.sub,
    email: payload.email,
    role: payload.role,
    tokenId: payload.jti
  };

  if (adminOnly && request.auth.role !== 'admin') {
    return sendAuthError(reply, 'Admin access is required.', 403);
  }
}

export async function authenticateRequest(request, reply) {
  return resolveAuth(request, reply, { optional: false });
}

export async function optionalAuthenticateRequest(request, reply) {
  return resolveAuth(request, reply, { optional: true });
}

export async function authenticateAdminRequest(request, reply) {
  return resolveAuth(request, reply, { optional: false, adminOnly: true });
}
