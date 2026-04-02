import { z } from 'zod';
import {
  buildRefreshCookie,
  loginWithGoogle,
  readRefreshTokenFromCookie,
  refreshSession,
  sendMagicLink,
  verifyMagicLink
} from '../services/authService.js';

const googleSchema = z.object({
  credential: z.string().trim().min(1)
});

const magicLinkSchema = z.object({
  email: z.string().trim().email()
});

const verifySchema = z.object({
  token: z.string().trim().min(1)
});

function sendError(reply, error) {
  reply.code(error.statusCode || 500).send({
    success: false,
    message: error.message || 'Internal server error.'
  });
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

export async function magicLinkController(request, reply) {
  try {
    const body = magicLinkSchema.parse(request.body || {});
    const result = await sendMagicLink(body);

    reply.code(202).send({
      success: true,
      data: result
    });
  } catch (error) {
    sendError(reply, error);
  }
}

export async function verifyMagicLinkController(request, reply) {
  try {
    const body = verifySchema.parse(request.body || {});
    const session = await verifyMagicLink({
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
