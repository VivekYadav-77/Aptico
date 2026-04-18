import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { env } from '../config/env.js';
import { authTokens, refreshTokens, users } from '../db/schema.js';
import { ensureUserProfile } from './profileService.js';

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
const EMAIL_VERIFICATION_TTL_SECONDS = 24 * 60 * 60;
const PASSWORD_RESET_TTL_SECONDS = 30 * 60;
const PASSWORD_KEY_LENGTH = 64;
const PASSWORD_SCRYPT_COST = 16384;
const PASSWORD_SCRYPT_BLOCK_SIZE = 8;
const PASSWORD_SCRYPT_PARALLELIZATION = 1;

const AUTH_TOKEN_TYPES = {
  emailVerification: 'email_verification',
  passwordReset: 'password_reset'
};

const AUTH_USER_FIELDS = {
  id: users.id,
  email: users.email,
  name: users.name,
  avatarUrl: users.avatarUrl,
  authProvider: users.authProvider,
  passwordHash: users.passwordHash,
  googleSubject: users.googleSubject,
  role: users.role,
  emailVerifiedAt: users.emailVerifiedAt,
  createdAt: users.createdAt,
  lastLogin: users.lastLogin
};

export const REFRESH_COOKIE_NAME = 'aptico_refresh_token';

function createAuthError(message, statusCode, code = null) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
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

function createOpaqueToken() {
  return crypto.randomBytes(32).toString('hex');
}

function createPasswordHash(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto
    .scryptSync(password, salt, PASSWORD_KEY_LENGTH, {
      N: PASSWORD_SCRYPT_COST,
      r: PASSWORD_SCRYPT_BLOCK_SIZE,
      p: PASSWORD_SCRYPT_PARALLELIZATION
    })
    .toString('hex');

  return `scrypt$${PASSWORD_SCRYPT_COST}$${PASSWORD_SCRYPT_BLOCK_SIZE}$${PASSWORD_SCRYPT_PARALLELIZATION}$${salt}$${derivedKey}`;
}

function verifyPasswordHash(password, storedHash) {
  if (!storedHash) {
    return false;
  }

  const [algorithm, cost, blockSize, parallelization, salt, derivedKeyHex] = storedHash.split('$');

  if (algorithm !== 'scrypt' || !cost || !blockSize || !parallelization || !salt || !derivedKeyHex) {
    return false;
  }

  const derivedKey = crypto.scryptSync(password, salt, Buffer.from(derivedKeyHex, 'hex').length, {
    N: Number(cost),
    r: Number(blockSize),
    p: Number(parallelization)
  });

  return crypto.timingSafeEqual(derivedKey, Buffer.from(derivedKeyHex, 'hex'));
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

async function findUserByEmail(db, email) {
  const existingUsers = await db.select(AUTH_USER_FIELDS).from(users).where(eq(users.email, email)).limit(1);
  return existingUsers[0] || null;
}

async function findUserById(db, userId) {
  const existingUsers = await db.select(AUTH_USER_FIELDS).from(users).where(eq(users.id, userId)).limit(1);
  return existingUsers[0] || null;
}

function resolveAuthProvider(existingUser, nextProvider) {
  if (!existingUser?.authProvider) {
    return nextProvider;
  }

  if (existingUser.authProvider === nextProvider || existingUser.authProvider === 'hybrid') {
    return existingUser.authProvider;
  }

  return 'hybrid';
}

async function upsertGoogleUser(db, payload) {
  const now = new Date();
  const existingUser = await findUserByEmail(db, payload.email);

  if (existingUser) {
    const updatedUsers = await db
      .update(users)
      .set({
        name: existingUser.name || payload.name,
        avatarUrl: existingUser.avatarUrl || payload.avatarUrl,
        googleSubject: payload.googleSubject ?? existingUser.googleSubject,
        emailVerifiedAt: existingUser.emailVerifiedAt || now,
        authProvider: resolveAuthProvider(existingUser, 'google'),
        lastLogin: now
      })
      .where(eq(users.id, existingUser.id))
      .returning(AUTH_USER_FIELDS);

    return updatedUsers[0];
  }

  const createdUsers = await db
    .insert(users)
    .values({
      email: payload.email,
      name: payload.name || null,
      avatarUrl: payload.avatarUrl || null,
      googleSubject: payload.googleSubject || null,
      authProvider: 'google',
      role: 'user',
      emailVerifiedAt: now,
      lastLogin: now
    })
    .returning(AUTH_USER_FIELDS);

  return createdUsers[0];
}

async function createPasswordUser(db, { email, password, name }) {
  const createdUsers = await db
    .insert(users)
    .values({
      email,
      name: name || null,
      authProvider: 'password',
      passwordHash: createPasswordHash(password),
      role: 'user'
    })
    .returning(AUTH_USER_FIELDS);

  return createdUsers[0];
}

async function updatePasswordUser(db, user, password) {
  const updatedUsers = await db
    .update(users)
    .set({
      passwordHash: createPasswordHash(password),
      authProvider: resolveAuthProvider(user, 'password')
    })
    .where(eq(users.id, user.id))
    .returning(AUTH_USER_FIELDS);

  return updatedUsers[0];
}

async function markUserVerified(db, userId) {
  const now = new Date();
  const updatedUsers = await db
    .update(users)
    .set({
      emailVerifiedAt: now
    })
    .where(eq(users.id, userId))
    .returning(AUTH_USER_FIELDS);

  return updatedUsers[0] || null;
}

async function touchLastLogin(db, userId) {
  await db
    .update(users)
    .set({
      lastLogin: new Date()
    })
    .where(eq(users.id, userId));
}

async function storeRefreshToken(db, { userId, accessTokenJti, refreshTokenJti, token, expiresAt, request }) {
  await db.insert(refreshTokens).values({
    userId,
    accessTokenJti,
    refreshTokenJti,
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

async function revokeAllRefreshTokensForUser(db, userId) {
  await db
    .update(refreshTokens)
    .set({
      revokedAt: new Date()
    })
    .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
}

function normalizeUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    authProvider: user.authProvider,
    role: user.role,
    resilienceXp: user.resilienceXp || 0,
    emailVerified: Boolean(user.emailVerifiedAt)
  };
}

async function issueSession(db, user, request) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  await storeRefreshToken(db, {
    userId: user.id,
    accessTokenJti: accessToken.tokenId,
    refreshTokenJti: refreshToken.tokenId,
    token: refreshToken.token,
    expiresAt: refreshToken.expiresAt,
    request
  });

  await touchLastLogin(db, user.id);

  // Auto-create a user_profiles row so the user is discoverable in People Search
  ensureUserProfile(db, user).catch(() => {});

  return {
    user: normalizeUser(user),
    accessToken: accessToken.token,
    accessTokenExpiresIn: accessToken.expiresIn,
    refreshToken: refreshToken.token,
    refreshTokenExpiresIn: refreshToken.expiresIn,
    accessTokenId: accessToken.tokenId
  };
}

function buildFrontendActionUrl(mode, token) {
  const url = new URL('/auth', env.frontendUrl);
  url.searchParams.set('mode', mode);
  url.searchParams.set('token', token);
  return url.toString();
}

async function sendEmailDispatch({ url, payload }) {
  if (!url) {
    throw createAuthError('Email delivery is not configured yet.', 503, 'EMAIL_NOT_CONFIGURED');
  }

  const headers = {
    'Content-Type': 'application/json'
  };

  if (env.gasEmailDispatchToken) {
    headers.Authorization = `Bearer ${env.gasEmailDispatchToken}`;
    headers['X-Aptico-Email-Token'] = env.gasEmailDispatchToken;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  }).catch(() => null);

  if (response?.ok) {
    return true;
  }

  throw createAuthError('Email delivery failed.', 502, 'EMAIL_SEND_FAILED');
}

async function deleteOutstandingAuthTokens(db, userId, tokenType) {
  await db
    .delete(authTokens)
    .where(and(eq(authTokens.userId, userId), eq(authTokens.tokenType, tokenType), isNull(authTokens.consumedAt)));
}

async function createOneTimeToken(db, { userId, tokenType, ttlSeconds }) {
  const rawToken = createOpaqueToken();
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

  await deleteOutstandingAuthTokens(db, userId, tokenType);
  await db.insert(authTokens).values({
    userId,
    tokenType,
    tokenHash: hashToken(rawToken),
    expiresAt
  });

  return {
    rawToken,
    expiresAt
  };
}

async function consumeOneTimeToken(db, { rawToken, tokenType }) {
  const tokenHash = hashToken(rawToken);
  const matchingTokens = await db
    .select()
    .from(authTokens)
    .where(
      and(
        eq(authTokens.tokenHash, tokenHash),
        eq(authTokens.tokenType, tokenType),
        isNull(authTokens.consumedAt),
        gt(authTokens.expiresAt, new Date())
      )
    )
    .limit(1);

  const storedToken = matchingTokens[0];

  if (!storedToken) {
    throw createAuthError('Token is invalid or expired.', 401, 'TOKEN_INVALID');
  }

  await db
    .update(authTokens)
    .set({
      consumedAt: new Date()
    })
    .where(eq(authTokens.id, storedToken.id));

  return storedToken;
}

function isGoogleIssuer(payload) {
  return payload.iss === 'https://accounts.google.com' || payload.iss === 'accounts.google.com';
}

function requireVerifiedEmail(user) {
  if (!user.emailVerifiedAt) {
    throw createAuthError(
      'Please verify your email before signing in.',
      403,
      'EMAIL_VERIFICATION_REQUIRED'
    );
  }
}

export async function registerWithPassword({ db, email, password, name }) {
  requireDatabase(db);

  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await findUserByEmail(db, normalizedEmail);

  if (existingUser?.passwordHash) {
    throw createAuthError('An account with this email already exists.', 409, 'EMAIL_ALREADY_EXISTS');
  }

  const user =
    existingUser && !existingUser.passwordHash
      ? await updatePasswordUser(db, existingUser, password)
      : await createPasswordUser(db, {
          email: normalizedEmail,
          password,
          name
        });

  const verificationResult = await sendEmailVerification({ db, user });

  return {
    user: normalizeUser(user),
    requiresEmailVerification: !user.emailVerifiedAt,
    verification: verificationResult
  };
}

export async function loginWithPassword({ db, email, password, request }) {
  requireDatabase(db);

  const user = await findUserByEmail(db, email.trim().toLowerCase());

  if (!user?.passwordHash || !verifyPasswordHash(password, user.passwordHash)) {
    throw createAuthError('Email or password is incorrect.', 401, 'INVALID_CREDENTIALS');
  }

  requireVerifiedEmail(user);
  return issueSession(db, user, request);
}

export async function loginWithGoogle({ db, credential, request }) {
  requireDatabase(db);

  if (!credential) {
    throw createAuthError('Google credential is required.', 400, 'GOOGLE_CREDENTIAL_REQUIRED');
  }

  const tokenInfoUrl = new URL(env.googleTokenInfoUrl);
  tokenInfoUrl.searchParams.set('id_token', credential);
  const response = await fetch(tokenInfoUrl);

  if (!response.ok) {
    throw createAuthError('Google credential could not be verified.', 401, 'GOOGLE_CREDENTIAL_INVALID');
  }

  const payload = await response.json();

  if (payload.email_verified !== 'true' || !payload.email || !isGoogleIssuer(payload)) {
    throw createAuthError('Google account email could not be verified.', 401, 'GOOGLE_EMAIL_NOT_VERIFIED');
  }

  if (env.googleClientId && payload.aud !== env.googleClientId) {
    throw createAuthError('Google credential audience is invalid.', 401, 'GOOGLE_AUDIENCE_INVALID');
  }

  const user = await upsertGoogleUser(db, {
    email: payload.email.toLowerCase(),
    name: payload.name || null,
    avatarUrl: payload.picture || null,
    googleSubject: payload.sub || null
  });

  return issueSession(db, user, request);
}

export async function sendEmailVerification({ db, email = null, user = null }) {
  requireDatabase(db);

  const targetUser = user || (email ? await findUserByEmail(db, email.trim().toLowerCase()) : null);

  if (!targetUser) {
    return {
      sent: true
    };
  }

  if (targetUser.emailVerifiedAt) {
    return {
      sent: true,
      alreadyVerified: true
    };
  }

  const token = await createOneTimeToken(db, {
    userId: targetUser.id,
    tokenType: AUTH_TOKEN_TYPES.emailVerification,
    ttlSeconds: EMAIL_VERIFICATION_TTL_SECONDS
  });

  await sendEmailDispatch({
    url: env.gasEmailVerifyUrl || env.gasEmailDispatchUrl || env.gasMagicLinkUrl,
    payload: {
      type: 'email_verification',
      email: targetUser.email,
      name: targetUser.name,
      token: token.rawToken,
      link: buildFrontendActionUrl('verify-email', token.rawToken),
      expiresAt: token.expiresAt.toISOString(),
      appName: 'Aptico'
    }
  });

  return {
    sent: true
  };
}

export async function verifyEmailToken({ db, token, request }) {
  requireDatabase(db);

  if (!token) {
    throw createAuthError('Verification token is required.', 400, 'TOKEN_REQUIRED');
  }

  const storedToken = await consumeOneTimeToken(db, {
    rawToken: token,
    tokenType: AUTH_TOKEN_TYPES.emailVerification
  });

  const user = await markUserVerified(db, storedToken.userId);

  if (!user) {
    throw createAuthError('User for verification token was not found.', 404, 'USER_NOT_FOUND');
  }

  return issueSession(db, user, request);
}

export async function requestPasswordReset({ db, email }) {
  requireDatabase(db);

  const user = await findUserByEmail(db, email.trim().toLowerCase());

  if (!user?.passwordHash) {
    return {
      sent: true
    };
  }

  const token = await createOneTimeToken(db, {
    userId: user.id,
    tokenType: AUTH_TOKEN_TYPES.passwordReset,
    ttlSeconds: PASSWORD_RESET_TTL_SECONDS
  });

  await sendEmailDispatch({
    url: env.gasPasswordResetUrl || env.gasEmailDispatchUrl,
    payload: {
      type: 'password_reset',
      email: user.email,
      name: user.name,
      token: token.rawToken,
      link: buildFrontendActionUrl('reset-password', token.rawToken),
      expiresAt: token.expiresAt.toISOString(),
      appName: 'Aptico'
    }
  });

  return {
    sent: true
  };
}

export async function resetPassword({ db, token, password }) {
  requireDatabase(db);

  const storedToken = await consumeOneTimeToken(db, {
    rawToken: token,
    tokenType: AUTH_TOKEN_TYPES.passwordReset
  });

  const user = await findUserById(db, storedToken.userId);

  if (!user) {
    throw createAuthError('User for reset token was not found.', 404, 'USER_NOT_FOUND');
  }

  await db
    .update(users)
    .set({
      passwordHash: createPasswordHash(password),
      authProvider: resolveAuthProvider(user, 'password')
    })
    .where(eq(users.id, user.id));

  await revokeAllRefreshTokensForUser(db, user.id);

  return {
    success: true
  };
}

export async function refreshSession({ db, refreshToken, request }) {
  requireDatabase(db);

  if (!refreshToken) {
    throw createAuthError('Refresh token is required.', 401, 'REFRESH_TOKEN_REQUIRED');
  }

  let payload;

  try {
    payload = jwt.verify(refreshToken, env.jwtSecret);
  } catch (error) {
    throw createAuthError('Refresh token is invalid or expired.', 401, 'REFRESH_TOKEN_INVALID');
  }

  if (payload.type !== 'refresh' || !payload.sub || !payload.jti) {
    throw createAuthError('Refresh token is invalid.', 401, 'REFRESH_TOKEN_INVALID');
  }

  const activeRefreshTokens = await db
    .select()
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.tokenHash, hashToken(refreshToken)),
        eq(refreshTokens.refreshTokenJti, payload.jti),
        isNull(refreshTokens.revokedAt),
        gt(refreshTokens.expiresAt, new Date())
      )
    )
    .limit(1);

  const storedRefreshToken = activeRefreshTokens[0];

  if (!storedRefreshToken) {
    throw createAuthError('Refresh token is no longer active.', 401, 'REFRESH_TOKEN_REVOKED');
  }

  const user = await findUserById(db, payload.sub);

  if (!user) {
    throw createAuthError('User for refresh token was not found.', 401, 'USER_NOT_FOUND');
  }

  await revokeRefreshTokenRecord(db, refreshToken);
  return issueSession(db, user, request);
}

export async function logoutSession({ db, refreshToken }) {
  requireDatabase(db);

  if (!refreshToken) {
    return {
      success: true
    };
  }

  await revokeRefreshTokenRecord(db, refreshToken);

  return {
    success: true
  };
}

export async function getCurrentUser({ db, userId }) {
  requireDatabase(db);
  const user = await findUserById(db, userId);

  if (!user) {
    throw createAuthError('Authenticated user was not found.', 404, 'USER_NOT_FOUND');
  }

  return normalizeUser(user);
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

export function buildClearedRefreshCookie() {
  return buildRefreshCookie('', 0);
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
