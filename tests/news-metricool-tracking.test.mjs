import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const news = readFileSync(new URL('../pages/news.html', import.meta.url), 'utf8');
const privacy = readFileSync(new URL('../pages/privacy.html', import.meta.url), 'utf8');
const home = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('Metricool is enabled once on public News & Events only', () => {
  assert.equal((news.match(/tracker\.metricool\.com\/resources\/be\.js/g) || []).length, 1);
  assert.equal((news.match(/beTracker\.t\(/g) || []).length, 1);
  assert.match(news, /2958d7a3ca64457c9c960d22b5a9ba89/);
  assert.match(news, /script\.async = true/);
  assert.match(news, /speakout-metricool-news-tracker/);
  assert.doesNotMatch(home, /tracker\.metricool\.com|beTracker\.t/);
});

test('News tracking is declared in privacy notice; no private-data tracking', () => {
  assert.match(privacy, /Metricool/);
  assert.match(privacy, /News &amp; Events/);
  assert.match(privacy, /IP address/);
  assert.doesNotMatch(news, /beTracker\.t\(\{[^}]*user(?:Id|_id)|beTracker\.t\(\{[^}]*email/);
});
