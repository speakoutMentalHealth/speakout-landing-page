import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(join(root,path), 'utf8');

test('Metricool cannot load before an explicit public newsroom choice', () => {
  const script = read('js/news-metricool.js');
  const values = new Map();
  const handlers = new Map();
  const elements = Object.fromEntries([
    'news-analytics-choice','news-analytics-settings','news-analytics-allow','news-analytics-decline'
  ].map(id => [id, {
    hidden: true,
    addEventListener: (event, callback) => handlers.set(id + ':' + event, callback)
  }]));
  const appended = [];
  const events = [];
  const win = {
    location: { pathname: '/pages/news.html', reload() { events.push('reload'); } },
    beTracker: { t(info) { events.push(info); } }
  };
  const doc = {
    getElementById: id => elements[id],
    createElement: () => ({}),
    head: { appendChild(node) { appended.push(node); } }
  };
  const context = {
    document: doc, window: win,
    localStorage: { getItem: key => values.get(key) || null,
      setItem: (key,value) => values.set(key,value) }
  };
  vm.runInNewContext(script, context, { timeout: 1000 });
  assert.equal(appended.length, 0, 'Must not load tracker on page visit');
  assert.equal(elements['news-analytics-choice'].hidden, false);
  handlers.get('news-analytics-decline:click')();
  assert.equal(appended.length, 0);
  handlers.get('news-analytics-allow:click')();
  assert.equal(appended.length, 1);
  assert.equal(appended[0].src, 'https://tracker.metricool.com/resources/be.js');
  appended[0].onload();
  assert.equal(events.length, 1);
  assert.equal(events[0].hash, '2958d7a3ca64457c9c960d22b5a9ba89');
  handlers.get('news-analytics-decline:click')();
  assert.ok(events.includes('reload'), 'Withdrawal must reload existing tracker');
});

test('Metricool public news tag cannot run on account or assessment pages', () => {
  const script = read('js/news-metricool.js');
  let count = 0;
  const context = {
    document: {
      getElementById: () => ({ hidden: true, addEventListener() {} }),
      createElement: () => ({}), head: { appendChild() { count++; } }
    },
    window: { location: { pathname: '/auth/auth.html' } },
    localStorage: { getItem: () => 'allow' }
  };
  vm.runInNewContext(script, context, { timeout: 1000 });
  assert.equal(count, 0);
});

test('News publisher and API retain draft-first and published-only behavior', () => {
  const rules = read('firebase/firestore.rules');
  const worker = read('workers/platform-api/src/index.js');
  const news = read('pages/news.html');
  const editor = read('admin-news.html');
  const feed = read('js/news-public-feed.js');
  assert.match(worker, /newsEvents: \["title"/);
  assert.match(worker, /collectionName === "newsEvents" \? "draft"/);
  assert.match(worker, /\["tvEpisodes", "newsEvents"\]/);
  assert.match(rules, /match \/newsEvents\/\{eventId\} \{[\s\S]*?status in \["active", "published"\]/);
  assert.match(editor, /collectionName: "newsEvents"/);
  assert.match(editor, /value="draft"/);
  assert.match(feed, /where\('status', 'in', \['active', 'published'\]\)/);
  assert.doesNotMatch(feed, /\.innerHTML\s*=/);
  assert.match(news, /id="news-updates"/);
  assert.match(news, /news-metricool\.js/);
  assert.match(read('pages/privacy.html'), /Metricool/);
});
