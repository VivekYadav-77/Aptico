import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  assertConfirmationMatches,
  assertNotSelfTarget,
  normalizeRestrictionFeature,
  requireReason
} from '../src/modules/admin/admin-controls.service.js';

describe('admin control guardrails', () => {
  it('requires a clear reason for admin actions', () => {
    assert.throws(() => requireReason('no'), /reason/i);
    assert.equal(requireReason('Policy violation'), 'Policy violation');
  });

  it('requires typed target confirmation for dangerous actions', () => {
    assert.throws(() => assertConfirmationMatches('user@example.com', 'wrong@example.com'), /confirmation/i);
    assert.doesNotThrow(() => assertConfirmationMatches('user@example.com', 'user@example.com'));
  });

  it('prevents self-targeted destructive account changes', () => {
    assert.throws(
      () => assertNotSelfTarget({ adminUserId: 'u-1', targetUserId: 'u-1', action: 'block' }),
      /themselves/i
    );
    assert.doesNotThrow(() => assertNotSelfTarget({ adminUserId: 'u-1', targetUserId: 'u-2', action: 'block' }));
  });

  it('only allows known restriction features', () => {
    assert.equal(normalizeRestrictionFeature('posting'), 'posting');
    assert.throws(() => normalizeRestrictionFeature('raw_database_access'), /not supported/i);
  });
});
