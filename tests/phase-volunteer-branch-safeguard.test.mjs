import test from 'node:test';
import assert from 'node:assert/strict';
import { assessBranch } from '../scripts/check-volunteer-branch-safeguard.mjs';

test('unprotected main fails closed, even if ordinary CI has passed', () => {
  const state = assessBranch({
    protected: false,
    protection: { enabled: false, required_status_checks: { enforcement_level: 'off', contexts: [], checks: [] } },
    commit: { sha: 'a'.repeat(40) }
  });
  assert.equal(state.ok, false);
  assert.equal(state.protected, false);
  assert.deepEqual(state.visibleRequiredChecks, []);
});

test('missing or malformed metadata fails closed', () => {
  assert.equal(assessBranch(null).ok, false);
  assert.equal(assessBranch({ protected: 'true' }).ok, false);
  assert.equal(assessBranch({}).ok, false);
});

test('protected branch reports visible checks without asserting complete release readiness', () => {
  const state = assessBranch({
    protected: true,
    commit: { sha: 'b'.repeat(40) },
    protection: { required_status_checks: { contexts: ['Node tests'], checks: [{ context: 'Firestore security rules' }, { context: 'Node tests' }] } }
  });
  assert.equal(state.ok, true);
  assert.deepEqual(state.visibleRequiredChecks, ['Firestore security rules', 'Node tests']);
  assert.match(state.note, /admin must separately verify/);
});
