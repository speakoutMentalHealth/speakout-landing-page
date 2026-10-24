import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const pages = [
  'home-learning.html', 'learning-hub.html', 'learning-resource-catalog.html',
  'parent-learning-planner.html', 'home-learning-progress.html',
  'teacher-learning-toolkit.html', 'early-years-counting-pack.html',
  'primary-home-learning-packs.html', 'upper-primary-home-learning-packs.html',
  'junior-secondary-home-learning-packs.html', 'senior-secondary-home-learning-packs.html',
  'primary-science-home-learning-packs.html', 'secondary-science-home-learning-packs.html',
  'social-civic-home-learning-packs.html', 'educator-ai-readiness.html',
  'educator-resource-review-queue.html'
];

test('learning pages use one consistent SpeakOut brand and mobile navigation', () => {
  for (const page of pages) {
    const html = readFileSync(resolve(root, page), 'utf8');
    assert.match(html, /css\/learning-shared-theme\.css/, page);
    assert.match(html, /class="learning-site-header"/, page);
    assert.match(html, /class="learning-menu-toggle"/, page);
    assert.match(html, /aria-expanded="false"/, page);
    assert.match(html, /href="learning-hub\.html"/, page);
    assert.match(html, /href="home-learning\.html"/, page);
    assert.match(html, /href="images\/logo\.png"/, page);
    assert.match(html, /js\/account-controls\.js/, page);
  }
});

test('shared stylesheet has accessible mobile and print navigation rules', () => {
  const css = readFileSync(resolve(root, 'css/learning-shared-theme.css'), 'utf8');
  assert.match(css, /\.learning-links\.is-open/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media print/);
});
