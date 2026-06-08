import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isAllowedAnalyticsEvent,
  sanitizeAnalyticsMetadata
} from '../src/modules/analytics/analytics.service.js';

describe('privacy-safe analytics', () => {
  it('allows only supported operational event types', () => {
    assert.equal(isAllowedAnalyticsEvent('page_view'), true);
    assert.equal(isAllowedAnalyticsEvent('admin_action'), true);
    assert.equal(isAllowedAnalyticsEvent('resume_uploaded_raw_text'), false);
  });

  it('drops sensitive metadata keys and caps stored values', () => {
    const metadata = sanitizeAnalyticsMetadata({
      source: 'jobs',
      password: 'secret',
      accessToken: 'token',
      resumeText: 'private resume body',
      requestUrl: '/api/jobs',
      longValue: 'x'.repeat(500)
    });

    assert.equal(metadata.source, 'jobs');
    assert.equal(metadata.requestUrl, '/api/jobs');
    assert.equal(metadata.password, undefined);
    assert.equal(metadata.accessToken, undefined);
    assert.equal(metadata.resumeText, undefined);
    assert.equal(metadata.longValue.length, 180);
  });
});
