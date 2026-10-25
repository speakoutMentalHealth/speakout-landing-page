import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source = readFileSync(new URL('../functions/index.js', import.meta.url), 'utf8');
const fn = source.split('exports.recordHomeLearningEditorialDecision = onCall(')[1];
test('editorial decisions require submitted findings within accepted bounds', () => {
  assert.ok(fn);
  assert.match(fn, /submission\.findings\.trim\(\)\.length < 10/);
  assert.match(fn, /submission\.findings\.length > 4000/);
  assert.match(fn, /typeof submission\.findings !== "string"/);
});
test('editorial callable cannot positively verify or publish resources', () => {
  assert.match(fn, /\["request_changes", "reject"\]\.includes\(outcome\)/);
  assert.match(fn, /published: false/);
});
