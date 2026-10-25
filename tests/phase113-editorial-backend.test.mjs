import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../functions/index.js', import.meta.url), 'utf8');
const block = source.split('exports.recordHomeLearningEditorialDecision = onCall(')[1];
test('server-side editorial decision handler exists', () => {
  assert.ok(block, 'Callable must be defined');
  assert.match(block, /super_admin/);
  assert.match(block, /homeLearningReviewerAssignments/);
  assert.match(block, /homeLearningReviewSubmissions/);
  assert.match(block, /homeLearningEditorialApprovals/);
});
test('decisions are immutable, independently verified and not published', () => {
  assert.match(block, /reviewerUid === editorUid/);
  assert.match(block, /existingSnap.exists/);
  assert.match(block, /tx.create\(decisionRef/);
  assert.match(block, /published: false/);
  assert.doesNotMatch(block, /home-learning-catalog\.json/);
});
