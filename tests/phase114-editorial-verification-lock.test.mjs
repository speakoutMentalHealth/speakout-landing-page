import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../functions/index.js', import.meta.url), 'utf8');
const editorial = source.split('exports.recordHomeLearningEditorialDecision = onCall(')[1];
test('editorial function blocks positive verification until trusted content digest checks exist', () => {
  assert.ok(editorial);
  assert.match(editorial, /\["request_changes", "reject"\]\.includes\(outcome\)/);
  assert.doesNotMatch(editorial, /verified_for_publication_review/);
  assert.match(editorial, /published: false/);
});
