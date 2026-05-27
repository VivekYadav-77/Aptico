import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildClearedCsrfCookie,
  buildCsrfCookie,
  createCsrfToken,
  CSRF_COOKIE_NAME
} from '../src/shared/security/csrf.js';
import { defaultJwtSecret, validateProductionEnv } from '../src/config/env.js';

describe('CSRF cookies', () => {
  it('creates non-empty tokens and scoped cookies', () => {
    const token = createCsrfToken();
    const cookie = buildCsrfCookie(token, {
      nodeEnv: 'development',
      cookieDomain: null
    });

    assert.ok(token.length >= 32);
    assert.match(cookie, new RegExp(`${CSRF_COOKIE_NAME}=`));
    assert.match(cookie, /Path=\//);
    assert.match(cookie, /SameSite=Lax/);
  });

  it('clears the CSRF cookie', () => {
    const cookie = buildClearedCsrfCookie({
      nodeEnv: 'development',
      cookieDomain: null
    });

    assert.match(cookie, /Max-Age=0/);
  });
});

describe('production env validation', () => {
  it('rejects the default JWT secret in production', () => {
    assert.throws(
      () =>
        validateProductionEnv(
          {
            NODE_ENV: 'production',
            FRONTEND_URL: 'https://example.com',
            DATABASE_URL: 'https://example.com/db',
            JWT_SECRET: defaultJwtSecret
          },
          'production'
        ),
      /JWT_SECRET must be changed/
    );
  });
});
