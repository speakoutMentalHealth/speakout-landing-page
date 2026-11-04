import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const news = read('pages/news.html');
const admin = read('admin-news.html');
const worker = read('workers/platform-api/src/index.js');
const feed = read('js/news-public-feed.js');
const article = read('pages/article.html');
const articleJs = read('js/news-article.js');
const css = read('css/news-extra.css');

test('Minimal newsroom prioritizes published stories and Instagram without repeated marketing sections', () => {
  assert.match(news, /Stories from the field\./);
  assert.match(news, /id="news-updates"/);
  assert.match(news, /id="news-live-grid"/);
  assert.match(news, /id="instagram"/);
  assert.match(news, /instagram\.com\/speaaakout\//);
  assert.match(news, /Programme photographs from the SpeakOut website/);
  assert.doesNotMatch(news, /class="news-stats"/);
  assert.doesNotMatch(news, /class="upcoming-section"/);
  assert.doesNotMatch(news, /class="news-category-grid"/);
  assert.doesNotMatch(news, /instagram\.com\/embed\.js/);
  assert.match(news, /news-metricool\.js/);
  assert.match(css, /newsroom-instagram-inner/);
  assert.match(css, /max-width:640px/);
});

test('Backend-managed full article body is length-checked and admin-editable', () => {
  assert.match(worker, /newsEvents: \["title", "description", "body"/);
  assert.match(worker, /collectionName === "newsEvents" && field === "body" \? 12000 : 2000/);
  assert.match(admin, /id="body" maxlength="12000"/);
  assert.match(admin, /fieldIds: \["title","description","body"/);
  assert.match(feed, /article\.html\?id=/);
  assert.match(feed, /id: doc\.id/);
  assert.doesNotMatch(feed, /\.innerHTML\s*=/);
});

test('Shareable stories only render public records as plain text and do not load analytics by default', () => {
  assert.match(article, /id="story-heading"/);
  assert.match(articleJs, /getDoc\(doc\(db, 'newsEvents', id\)\)/);
  assert.match(articleJs, /\['active', 'published'\]\.includes\(item\.status\)/);
  assert.match(articleJs, /textContent = paragraph/);
  assert.doesNotMatch(articleJs, /\.innerHTML\s*=/);
  assert.doesNotMatch(article, /tracker\.metricool|instagram\.com\/embed\.js/);
});
