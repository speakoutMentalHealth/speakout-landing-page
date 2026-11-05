import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cmsErrorMessage, isQuotaError } from '../js/cms-error-guidance.js';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('quota conditions are classified without exposing provider text or pretending changes saved', () => {
  assert.equal(isQuotaError({ status: 429 }), true);
  assert.equal(isQuotaError({ code: 'resource-exhausted' }), true);
  assert.equal(isQuotaError({ message: 'Quota exceeded.' }), true);
  assert.equal(isQuotaError({ code: 'permission-denied' }), false);
  assert.match(cmsErrorMessage({ status: 429 }, 'save'), /NOT been confirmed/);
  assert.match(cmsErrorMessage({ code: 'resource-exhausted' }, 'load'), /quota limit/);
  assert.match(cmsErrorMessage({ status: 403 }, 'save'), /administrator account/);
  assert.doesNotMatch(cmsErrorMessage({ status: 429, message: 'password token PRIVATE' }, 'save'), /PRIVATE/);
});

test('News editor loads pages on demand and does not re-read entire collection after each mutation', () => {
  const ui = read('js/admin-cms-ui.js');
  const page = read('admin-news.html');
  assert.match(page, /pageSize:\s*25/);
  assert.match(ui, /limit\(pageSize \+ 1\)/);
  assert.match(ui, /startAfter\(lastDoc\)/);
  assert.match(ui, /loadMoreButton\.onclick/);
  assert.match(ui, /items = items\.map\(item => item\.id === button\.dataset\.hide/);
  assert.match(ui, /items = items\.filter\(item => item\.id !== button\.dataset\.del/);
  assert.match(ui, /cmsErrorMessage\(error, "save"\)/);
  assert.match(ui, /const result = await adminApi\.upsertContent/);
  assert.doesNotMatch(ui, /if \(await load\(\)\) show/);
});

test('A quota failure cannot sign out an existing administrator by impersonating a missing profile', () => {
  const guard = read('launch-role-guard.js');
  assert.match(guard, /getCurrentProfile\(user, \{ propagateErrors: true \}\)/);
  assert.match(guard, /if \(propagateErrors\) throw error/);
  assert.match(guard, /access is paused/);
  assert.match(guard, /if\(!profile\)/);
});

test('Worker sends safe 429 capacity response and public feed bounds reads', () => {
  const worker = read('workers/platform-api/src/index.js');
  const feed = read('js/news-public-feed.js');
  assert.match(worker, /error\.firestoreStatus === "RESOURCE_EXHAUSTED"/);
  assert.match(worker, /"retry-after": "300"/);
  assert.match(worker, /"DATABASE_CAPACITY"/);
  assert.match(feed, /limit\(30\)/);
  assert.match(feed, /where\('status', 'in', \['active', 'published'\]\)/);
  assert.match(feed, /database has reached a usage limit/);
});

test('News administration has a restrained mobile hierarchy without changing editor inputs', () => {
  const page = read('admin-news.html');
  const ui = read('js/admin-cms-ui.js');
  for(const id of ['title','description','body','category','date','imageUrl','url','status']) {
    assert.ok(page.includes('id="' + id + '"'), id + ' field was removed');
  }
  assert.match(page, /class="news-admin-page"/);
  assert.match(page, /class="news-editor-help"/);
  assert.match(page, /cms-load-more\[hidden\]/);
  assert.match(page, /@media \(max-width:720px\)/);
  assert.match(ui, /cms-field-\$\{id\}/);
});
