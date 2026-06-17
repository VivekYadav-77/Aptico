import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { and, eq, or, gt, isNull } from 'drizzle-orm';
import { adminRestrictions, users } from '../../db/schema.js';

const REDIS_TIMEOUT_SYMBOL = Symbol('redis-timeout');
const REVOCATION_CHECK_TIMEOUT_MS = 1500;

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

function isBlockedStatus(status) {
  return status === 'blocked' || status === 'deactivated';
}

const FEATURE_RESTRICTION_COPY = {
  posting: 'Posting is restricted on your account.',
  commenting: 'Commenting is restricted on your account.',
  squad_actions: 'Squad activity is restricted on your account.',
  analysis: 'Resume analysis is restricted on your account.',
  job_search: 'Job search is restricted on your account.',
  job_saving: 'Saving jobs is restricted on your account.',
  profile_visibility: 'Your public profile visibility is restricted by an administrator.',
  activity_logging: 'Activity logging is restricted on your account.',
  login: 'Platform access is restricted on your account.'
};

async function loadAccountControls(request, userId) {
  const db = request.server.db;
  if (!db) {
    return {
      status: 'active',
      restrictions: []
    };
  }

  const [userRow] = await db
    .select({
      status: users.status,
      role: users.role
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!userRow) {
    return null;
  }

  const restrictionRows = await db
    .select({
      feature: adminRestrictions.feature,
      reason: adminRestrictions.reason
    })
    .from(adminRestrictions)
    .where(
      and(
        eq(adminRestrictions.userId, userId),
        eq(adminRestrictions.isRestricted, true),
        or(isNull(adminRestrictions.expiresAt), gt(adminRestrictions.expiresAt, new Date()))
      )
    );

  return {
    status: userRow.status || 'active',
    role: userRow.role,
    restrictions: restrictionRows.map((row) => row.feature),
    restrictionReasons: Object.fromEntries(restrictionRows.map((row) => [row.feature, row.reason || null]))
  };
}

async function resolveAuth(request, reply, { optional, adminOnly = false }) {
  const failureStatusCode = adminOnly ? 403 : 401;
  const bearerToken = getBearerToken(request.headers.authorization);
  const allowGuestFallback = optional && !adminOnly;

  if (!bearerToken) {
    if (optional) {
      request.auth = null;
      return;
    }

    return sendAuthError(reply, 'Authorization token is required.', failureStatusCode);
  }

  let payload;

  try {
    payload = jwt.verify(bearerToken, env.jwtSecret, {
      algorithms: ['HS256'],
      issuer: env.jwtIssuer,
      audience: env.jwtAudience
    });
  } catch (error) {
    if (allowGuestFallback) {
      request.auth = null;
      return;
    }

    return sendAuthError(reply, 'Authorization token is invalid or expired.', failureStatusCode);
  }

  if (payload.type !== 'access' || !payload.jti) {
    if (allowGuestFallback) {
      request.auth = null;
      return;
    }

    return sendAuthError(reply, 'Authorization token is invalid.', failureStatusCode);
  }

  const redis = request.server.services?.redis;

  if (redis) {
    const revocationResult = await Promise.race([
      redis.get(`revoked_jwt:${payload.jti}`, { failOpen: true }),
      new Promise((resolve) => {
        setTimeout(() => resolve(REDIS_TIMEOUT_SYMBOL), REVOCATION_CHECK_TIMEOUT_MS);
      })
    ]);

    if (revocationResult === REDIS_TIMEOUT_SYMBOL) {
      request.log.warn(`Redis revocation check timed out for JWT ${payload.jti}.`);
    } else if (revocationResult) {
      if (allowGuestFallback) {
        request.auth = null;
        return;
      }

      return sendAuthError(reply, 'Authorization token has been revoked.', failureStatusCode);
    }
  }

  request.auth = {
    userId: payload.sub,
    email: payload.email,
    role: payload.role,
    tokenId: payload.jti,
    status: 'active',
    restrictions: [],
    restrictionReasons: {}
  };

  let accountControls = null;

  try {
    accountControls = await loadAccountControls(request, payload.sub);
  } catch (error) {
    request.log.error({ err: error, userId: payload.sub }, 'Failed to load account controls.');

    if (allowGuestFallback) {
      request.auth = null;
      return;
    }

    return reply.code(503).send({
      success: false,
      code: 'ACCOUNT_CONTROLS_UNAVAILABLE',
      message: 'Account controls are temporarily unavailable. Please try again shortly.'
    });
  }

  if (!accountControls) {
    if (allowGuestFallback) {
      request.auth = null;
      return;
    }

    return sendAuthError(reply, 'Authenticated account was not found.', 401);
  }

  if (isBlockedStatus(accountControls.status) || accountControls.restrictions.includes('login')) {
    return sendAuthError(reply, 'Your account is blocked from platform access.', 403);
  }

  request.auth.role = accountControls.role || request.auth.role;
  request.auth.status = accountControls.status;
  request.auth.restrictions = accountControls.restrictions;
  request.auth.restrictionReasons = accountControls.restrictionReasons || {};

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

export function requireFeatureAccess(feature) {
  return async function featureAccessHook(request, reply) {
    if (!request.auth) {
      return;
    }

    if (request.auth.restrictions?.includes(feature)) {
      const reason = request.auth.restrictionReasons?.[feature] || null;
      const baseMessage = FEATURE_RESTRICTION_COPY[feature] || `This feature is restricted on your account.`;
      return reply.code(403).send({
        success: false,
        code: 'FEATURE_RESTRICTED',
        feature,
        reason,
        error: reason
          ? `${baseMessage} Reason: ${reason}`
          : baseMessage
      });
    }
  };
}
