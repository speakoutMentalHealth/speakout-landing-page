import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const root = new URL('../', import.meta.url);
const read = name => readFileSync(new URL(name, root), 'utf8');
test('premium learning stylesheet is included on all three tools', () => {
  for (const name of ['parent-learning-planner.html','teacher-learning-toolkit.html','learning-resource-catalog.html']) {
    const html = read(name);
    assert.match(html, /css\/learning-experience-v2\.css/);
    assert.match(html, /class="learning-tool"/);
    assert.match(html, /css\/learning-shared-theme\.css/);
  }
});
test('parent planner updates progress without collecting student identity', () => {
  const html = read('parent-learning-planner.html');
  assert.match(html, /Weekly progress:/);
  assert.match(html, /querySelectorAll\('input:checked'\)/);
  assert.doesNotMatch(html, /name="studentName"/);
});
test('resource catalogue supports clearing filters without changing approval status', () => {
  const html = read('learning-resource-catalog.html');
  assert.match(html, /id="resetFilters"/);
  assert.match(html, /search\.value='';level\.value='';subject\.value=''/);
  assert.match(html, /review_status==='approved'/);
});
test('premium stylesheet supports small screens and reduced motion', () => {
  const css = read('css/learning-experience-v2.css');
  assert.match(css, /max-width:650px/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});
