import { z } from 'zod';
import {
  buildClearedRefreshCookie,
  buildRefreshCookie,
  getCurrentUser,
  loginWithPassword,
  loginWithGoogle,
  logoutSession,
  readRefreshTokenFromCookie,
  refreshSession,
  registerWithPassword,
  requestPasswordReset,
  resetPassword,
  sendEmailVerification,
  verifyEmailToken
} from './auth.service.js';
import { applyXpDecayIfNeeded } from '../../shared/services/xp-engine.service.js';
import {
  buildClearedCsrfCookie,
  buildCsrfCookie,
  createCsrfToken,
  verifyCsrfRequest
} from '../../shared/security/csrf.js';
import { recordAnalyticsEvent } from '../analytics/analytics.service.js';

const googleSchema = z.object({
  credential: z.string().trim().min(1)
});

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long.')
  .max(128, 'Password must be at most 128 characters long.')
  .refine((value) => /[A-Z]/.test(value), 'Password must include at least one uppercase letter.')
  .refine((value) => /[a-z]/.test(value), 'Password must include at least one lowercase letter.')
  .refine((value) => /[0-9]/.test(value), 'Password must include at least one number.');

const registerSchema = z.object({
  email: z.string().trim().email()
    .transform((value) => value.toLowerCase()),
  password: passwordSchema,
  name: z.string().trim().min(2).max(80).optional()
});

const loginSchema = z.object({
  email: z.string().trim().email()
    .transform((value) => value.toLowerCase()),
  password: z.string().min(1)
});

const tokenSchema = z.object({
  token: z.string().trim().min(1)
});

const emailSchema = z.object({
  email: z.string().trim().email()
    .transform((value) => value.toLowerCase())
});

const resetPasswordSchema = z.object({
  token: z.string().trim().min(1),
  password: passwordSchema
});

function sendError(reply, error) {
  let message = error.message || 'Internal server error.';
  let statusCode = error.statusCode || 500;
  let code = error.code || 'INTERNAL_ERROR';

  if (error instanceof z.ZodError) {
    message = error.errors[0]?.message || 'Invalid input data.';
    statusCode = 400;
    code = 'VALIDATION_ERROR';
  }

  reply.code(statusCode).send({
    success: false,
    message,
    code
  });
}

async function sendSessionReply(request, reply, session) {
  await applyXpDecayIfNeeded(request.server.db, session.user.id);
  const user = await getCurrentUser({
    db: request.server.db,
    userId: session.user.id
  });
  const csrfToken = createCsrfToken();

  reply.header('Set-Cookie', [
    buildRefreshCookie(session.refreshToken, session.refreshTokenExpiresIn),
    buildCsrfCookie(csrfToken, request.server.env, session.refreshTokenExpiresIn)
  ]).send({
    success: true,
    data: {
      user,
      accessToken: session.accessToken,
      expiresIn: session.accessTokenExpiresIn,
      csrfToken
    }
  });
}

export async function registerController(request, reply) {
  try {
    const body = registerSchema.parse(request.body || {});
    const result = await registerWithPassword({
      db: request.server.db,
      email: body.email,
      password: body.password,
      name: body.name
    });

    await recordAnalyticsEvent({
      db: request.server.db,
      request,
      eventType: 'signup',
      userId: result.user?.id || null,
      metadata: { method: 'password' },
      force: true
    });

    reply.code(201).send({
      success: true,
      data: result
    });
  } catch (error) {
    sendError(reply, error);
  }
}

export async function loginController(request, reply) {
  try {
    const body = loginSchema.parse(request.body || {});
    const session = await loginWithPassword({
      db: request.server.db,
      email: body.email,
      password: body.password,
      request
    });

    await recordAnalyticsEvent({
      db: request.server.db,
      request,
      eventType: 'login',
      userId: session.user.id,
      metadata: { method: 'password' },
      force: true
    });

    await sendSessionReply(request, reply, session);
  } catch (error) {
    sendError(reply, error);
  }
}

export async function googleAuthController(request, reply) {
  try {
    const body = googleSchema.parse(request.body || {});
    const session = await loginWithGoogle({
      db: request.server.db,
      credential: body.credential,
      request
    });

    await recordAnalyticsEvent({
      db: request.server.db,
      request,
      eventType: 'login',
      userId: session.user.id,
      metadata: { method: 'google' },
      force: true
    });

    await sendSessionReply(request, reply, session);
  } catch (error) {
    sendError(reply, error);
  }
}

export async function requestEmailVerificationController(request, reply) {
  try {
    const body = emailSchema.parse(request.body || {});
    const result = await sendEmailVerification({
      db: request.server.db,
      email: body.email
    });

    reply.code(202).send({
      success: true,
      data: result
    });
  } catch (error) {
    sendError(reply, error);
  }
}

export async function verifyEmailController(request, reply) {
  try {
    const body = tokenSchema.parse(request.body || {});
    const session = await verifyEmailToken({
      db: request.server.db,
      token: body.token,
      request
    });

    await recordAnalyticsEvent({
      db: request.server.db,
      request,
      eventType: 'login',
      userId: session.user.id,
      metadata: { method: 'email_verification' },
      force: true
    });

    await sendSessionReply(request, reply, session);
  } catch (error) {
    sendError(reply, error);
  }
}

export async function forgotPasswordController(request, reply) {
  try {
    const body = emailSchema.parse(request.body || {});
    const result = await requestPasswordReset({
      db: request.server.db,
      email: body.email
    });

    reply.code(202).send({
      success: true,
      data: result
    });
  } catch (error) {
    sendError(reply, error);
  }
}

export async function resetPasswordController(request, reply) {
  try {
    const body = resetPasswordSchema.parse(request.body || {});
    const result = await resetPassword({
      db: request.server.db,
      token: body.token,
      password: body.password
    });

    reply.send({
      success: true,
      data: result
    });
  } catch (error) {
    sendError(reply, error);
  }
}

export async function refreshController(request, reply) {
  try {
    verifyCsrfRequest(request);
    const refreshToken = readRefreshTokenFromCookie(request.headers.cookie || '');
    const session = await refreshSession({
      db: request.server.db,
      refreshToken,
      request
    });
    const csrfToken = createCsrfToken();

    reply.header('Set-Cookie', [
      buildRefreshCookie(session.refreshToken, session.refreshTokenExpiresIn),
      buildCsrfCookie(csrfToken, request.server.env, session.refreshTokenExpiresIn)
    ]).send({
      success: true,
      data: {
        user: session.user,
        accessToken: session.accessToken,
        expiresIn: session.accessTokenExpiresIn,
        csrfToken
      }
    });
  } catch (error) {
    sendError(reply, error);
  }
}

export async function logoutController(request, reply) {
  try {
    verifyCsrfRequest(request);
    const refreshToken = readRefreshTokenFromCookie(request.headers.cookie || '');
    const result = await logoutSession({
      db: request.server.db,
      refreshToken
    });

    if (result.revoked?.accessTokenJti) {
      await request.server.services?.redis?.set(
        `revoked_jwt:${result.revoked.accessTokenJti}`,
        result.revoked.userId,
        15 * 60
      );
    }

    await recordAnalyticsEvent({
      db: request.server.db,
      request,
      eventType: 'logout',
      userId: result.revoked?.userId || null,
      metadata: { method: 'session' },
      force: true
    });

    reply.header('Set-Cookie', [
      buildClearedRefreshCookie(),
      buildClearedCsrfCookie(request.server.env)
    ]).send({
      success: true,
      data: {
        success: true
      }
    });
  } catch (error) {
    sendError(reply, error);
  }
}

export async function meController(request, reply) {
  try {
    const user = await getCurrentUser({
      db: request.server.db,
      userId: request.auth.userId
    });

    reply.send({
      success: true,
      data: {
        user
      }
    });
  } catch (error) {
    sendError(reply, error);
  }
}
