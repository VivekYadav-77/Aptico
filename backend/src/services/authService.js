import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { env } from '../config/env.js';
import { refreshTokens, users } from '../db/schema.js';

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
const MAGIC_LINK_TTL_SECONDS = 15 * 60;
export const REFRESH_COOKIE_NAME = 'aptico_refresh_token';

function createAuthError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function requireDatabase(db) {
  if (!db) {
    throw createAuthError('Database is not configured yet.', 503);
  }
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function signAccessToken(user) {
  const tokenId = crypto.randomUUID();
  const token = jwt.sign(
    {
      type: 'access',
      sub: user.id,
      email: user.email,
      role: user.role,
      jti: tokenId
    },
    env.jwtSecret,
    {
      expiresIn: ACCESS_TOKEN_TTL_SECONDS
    }
  );

  return {
    token,
    tokenId,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS
  };
}

function signRefreshToken(user) {
  const tokenId = crypto.randomUUID();
  const token = jwt.sign(
    {
      type: 'refresh',
      sub: user.id,
      jti: tokenId
    },
    env.jwtSecret,
    {
      expiresIn: REFRESH_TOKEN_TTL_SECONDS
    }
  );

  return {
    token,
    tokenId,
    expiresIn: REFRESH_TOKEN_TTL_SECONDS,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000)
  };
}

function signMagicLinkToken(email) {
  return jwt.sign(
    {
      type: 'magic_link',
      email
    },
    env.jwtSecret,
    {
      expiresIn: MAGIC_LINK_TTL_SECONDS
    }
  );
}

async function findUserByEmail(db, email) {
  const existingUsers = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return existingUsers[0] || null;
}

async function findUserById(db, userId) {
  const existingUsers = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return existingUsers[0] || null;
}

async function upsertUser(db, { email, name, avatarUrl, authProvider }) {
  const now = new Date();
  const existingUser = await findUserByEmail(db, email);

  if (existingUser) {
    const updatedUsers = await db
      .update(users)
      .set({
        name: name ?? existingUser.name,
        avatarUrl: avatarUrl ?? existingUser.avatarUrl,
        authProvider,
        lastLogin: now
      })
      .where(eq(users.id, existingUser.id))
      .returning();

    return updatedUsers[0];
  }

  const createdUsers = await db
    .insert(users)
    .values({
      email,
      name: name || null,
      avatarUrl: avatarUrl || null,
      authProvider,
      role: 'user',
      lastLogin: now
    })
    .returning();

  return createdUsers[0];
}

async function storeRefreshToken(db, { userId, jti, token, expiresAt, request }) {
  await db.insert(refreshTokens).values({
    userId,
    jti,
    tokenHash: hashToken(token),
    expiresAt,
    ipAddress: request.ip || null,
    userAgent: request.headers['user-agent'] || null
  });
}

async function revokeRefreshTokenRecord(db, token) {
  await db
    .update(refreshTokens)
    .set({
      revokedAt: new Date()
    })
    .where(eq(refreshTokens.tokenHash, hashToken(token)));
}

function normalizeUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    authProvider: user.authProvider,
    role: user.role
  };
}

async function issueSession(db, user, request) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  await storeRefreshToken(db, {
    userId: user.id,
    jti: accessToken.tokenId,
    token: refreshToken.token,
    expiresAt: refreshToken.expiresAt,
    request
  });

  return {
    user: normalizeUser(user),
    accessToken: accessToken.token,
    accessTokenExpiresIn: accessToken.expiresIn,
    refreshToken: refreshToken.token,
    refreshTokenExpiresIn: refreshToken.expiresIn,
    accessTokenId: accessToken.tokenId
  };
}

export async function loginWithGoogle({ db, credential, request }) {
  requireDatabase(db);

  if (!credential) {
    throw createAuthError('Google credential is required.', 400);
  }

  const tokenInfoUrl = new URL(env.googleTokenInfoUrl);
  tokenInfoUrl.searchParams.set('id_token', credential);
  const response = await fetch(tokenInfoUrl);

  if (!response.ok) {
    throw createAuthError('Google credential could not be verified.', 401);
  }

  const payload = await response.json();

  if (payload.email_verified !== 'true') {
    throw createAuthError('Google account email is not verified.', 401);
  }

  if (env.googleClientId && payload.aud !== env.googleClientId) {
    throw createAuthError('Google credential audience is invalid.', 401);
  }

  const user = await upsertUser(db, {
    email: payload.email,
    name: payload.name || null,
    avatarUrl: payload.picture || null,
    authProvider: 'google'
  });

  return issueSession(db, user, request);
}

export async function sendMagicLink({ email }) {
  if (!email) {
    throw createAuthError('Email is required.', 400);
  }

  if (!env.gasMagicLinkUrl) {
    throw createAuthError('GAS_MAGIC_LINK_URL is not configured yet.', 503);
  }

  const magicToken = signMagicLinkToken(email);
  const magicLinkUrl = new URL('/auth', env.frontendUrl);
  magicLinkUrl.searchParams.set('magicToken', magicToken);

  const payload = {
    email,
    link: magicLinkUrl.toString()
  };

  const postResponse = await fetch(env.gasMagicLinkUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  }).catch(() => null);

  if (postResponse && postResponse.ok) {
    return {
      email,
      sent: true
    };
  }

  const fallbackUrl = new URL(env.gasMagicLinkUrl);
  fallbackUrl.searchParams.set('email', payload.email);
  fallbackUrl.searchParams.set('link', payload.link);

  const getResponse = await fetch(fallbackUrl).catch(() => null);

  if (getResponse && getResponse.ok) {
    return {
      email,
      sent: true
    };
  }

  throw createAuthError('Magic link email could not be sent.', 502);
}

export async function verifyMagicLink({ db, token, request }) {
  requireDatabase(db);

  if (!token) {
    throw createAuthError('Magic link token is required.', 400);
  }

  let payload;

  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch (error) {
    throw createAuthError('Magic link token is invalid or expired.', 401);
  }

  if (payload.type !== 'magic_link' || !payload.email) {
    throw createAuthError('Magic link token is invalid.', 401);
  }

  const user = await upsertUser(db, {
    email: payload.email,
    name: null,
    avatarUrl: null,
    authProvider: 'magic_link'
  });

  return issueSession(db, user, request);
}

export async function refreshSession({ db, refreshToken, request }) {
  requireDatabase(db);

  if (!refreshToken) {
    throw createAuthError('Refresh token is required.', 401);
  }

  let payload;

  try {
    payload = jwt.verify(refreshToken, env.jwtSecret);
  } catch (error) {
    throw createAuthError('Refresh token is invalid or expired.', 401);
  }

  if (payload.type !== 'refresh' || !payload.sub) {
    throw createAuthError('Refresh token is invalid.', 401);
  }

  const activeRefreshTokens = await db
    .select()
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.tokenHash, hashToken(refreshToken)),
        isNull(refreshTokens.revokedAt),
        gt(refreshTokens.expiresAt, new Date())
      )
    )
    .limit(1);

  const storedRefreshToken = activeRefreshTokens[0];

  if (!storedRefreshToken) {
    throw createAuthError('Refresh token is no longer active.', 401);
  }

  const user = await findUserById(db, payload.sub);

  if (!user) {
    throw createAuthError('User for refresh token was not found.', 401);
  }

  await revokeRefreshTokenRecord(db, refreshToken);

  return issueSession(db, user, request);
}

export function buildRefreshCookie(token, maxAgeSeconds) {
  const cookieParts = [
    `${REFRESH_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'HttpOnly',
    'Path=/api/auth',
    `Max-Age=${maxAgeSeconds}`,
    env.nodeEnv === 'production' ? 'SameSite=None' : 'SameSite=Lax'
  ];

  if (env.nodeEnv === 'production') {
    cookieParts.push('Secure');
  }

  return cookieParts.join('; ');
}

export function readRefreshTokenFromCookie(cookieHeader) {
  if (!cookieHeader) {
    return null;
  }

  const parts = cookieHeader.split(';').map((part) => part.trim());

  for (const part of parts) {
    const [name, ...valueParts] = part.split('=');

    if (name === REFRESH_COOKIE_NAME) {
      return decodeURIComponent(valueParts.join('='));
    }
  }

  return null;
}
