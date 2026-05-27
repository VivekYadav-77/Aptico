import crypto from 'node:crypto';

export const CSRF_COOKIE_NAME = 'aptico_csrf_token';
export const CSRF_HEADER_NAME = 'x-csrf-token';

export function createCsrfToken() {
  return crypto.randomBytes(32).toString('base64url');
}

export function readCookie(cookieHeader, cookieName) {
  if (!cookieHeader) {
    return null;
  }

  for (const part of String(cookieHeader).split(';')) {
    const [name, ...valueParts] = part.trim().split('=');

    if (name === cookieName) {
      return decodeURIComponent(valueParts.join('='));
    }
  }

  return null;
}

export function buildCsrfCookie(token, env, maxAgeSeconds = 7 * 24 * 60 * 60) {
  const cookieParts = [
    `${CSRF_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    `Max-Age=${maxAgeSeconds}`,
    env.nodeEnv === 'production' ? 'SameSite=None' : 'SameSite=Lax'
  ];

  if (env.cookieDomain) {
    cookieParts.push(`Domain=${env.cookieDomain}`);
  }

  if (env.nodeEnv === 'production') {
    cookieParts.push('Secure');
  }

  return cookieParts.join('; ');
}

export function buildClearedCsrfCookie(env) {
  return buildCsrfCookie('', env, 0);
}

export function verifyCsrfRequest(request) {
  const cookieToken = readCookie(request.headers.cookie || '', CSRF_COOKIE_NAME);
  const headerToken = String(request.headers[CSRF_HEADER_NAME] || '').trim();

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    const error = new Error('CSRF token is missing or invalid.');
    error.statusCode = 403;
    error.code = 'CSRF_INVALID';
    throw error;
  }
}
