import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const news = readFileSync(new URL('../pages/news.html', import.meta.url), 'utf8');
const script = readFileSync(new URL('../js/news-metricool.js', import.meta.url), 'utf8');
const privacy = readFileSync(new URL('../pages/privacy.html', import.meta.url), 'utf8');
const home = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('Metricool loads only through one consent-gated News & Events script', () => {
  assert.equal((news.match(/src="\.\.\/js\/news-metricool\.js"/g) || []).length, 1);
  assert.doesNotMatch(news, /tracker\.metricool\.com\/resources\/be\.js|beTracker\.t\(/);
  assert.equal((script.match(/tracker\.metricool\.com\/resources\/be\.js/g) || []).length, 1);
  assert.match(script, /2958d7a3ca64457c9c960d22b5a9ba89/);
  assert.match(script, /currentChoice\(\) === 'allow'/);
  assert.match(script, /script\.async = true/);
  assert.match(news, /news-analytics-allow/);
  assert.match(news, /news-analytics-decline/);
  assert.doesNotMatch(home, /tracker\.metricool\.com|beTracker\.t|news-metricool/);
});

test('Public news tracking is disclosed and must not send user or health records', () => {
  assert.match(privacy, /Metricool/);
  assert.match(privacy, /News &amp; Events/);
  assert.match(privacy, /IP address/);
  assert.doesNotMatch(script, /(?:userId|patientId|email|mood|screeningAnswers)\s*:/);
});
