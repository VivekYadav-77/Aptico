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
} from '../services/authService.js';

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
  reply.code(error.statusCode || 500).send({
    success: false,
    message: error.message || 'Internal server error.',
    code: error.code || 'INTERNAL_ERROR'
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

    reply.header('Set-Cookie', buildRefreshCookie(session.refreshToken, session.refreshTokenExpiresIn)).send({
      success: true,
      data: {
        user: session.user,
        accessToken: session.accessToken,
        expiresIn: session.accessTokenExpiresIn
      }
    });
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

    reply.header('Set-Cookie', buildRefreshCookie(session.refreshToken, session.refreshTokenExpiresIn)).send({
      success: true,
      data: {
        user: session.user,
        accessToken: session.accessToken,
        expiresIn: session.accessTokenExpiresIn
      }
    });
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

    reply.header('Set-Cookie', buildRefreshCookie(session.refreshToken, session.refreshTokenExpiresIn)).send({
      success: true,
      data: {
        user: session.user,
        accessToken: session.accessToken,
        expiresIn: session.accessTokenExpiresIn
      }
    });
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
    const refreshToken = readRefreshTokenFromCookie(request.headers.cookie || '');
    const session = await refreshSession({
      db: request.server.db,
      refreshToken,
      request
    });

    reply.header('Set-Cookie', buildRefreshCookie(session.refreshToken, session.refreshTokenExpiresIn)).send({
      success: true,
      data: {
        user: session.user,
        accessToken: session.accessToken,
        expiresIn: session.accessTokenExpiresIn
      }
    });
  } catch (error) {
    sendError(reply, error);
  }
}

export async function logoutController(request, reply) {
  try {
    const refreshToken = readRefreshTokenFromCookie(request.headers.cookie || '');
    await logoutSession({
      db: request.server.db,
      refreshToken
    });

    reply.header('Set-Cookie', buildClearedRefreshCookie()).send({
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
