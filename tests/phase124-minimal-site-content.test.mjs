import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

const pageRules = [
  ['index.html', 7, ['about-preview', 'programs-showcase', 'academy-preview', 'tv-home-feature', 'home-newsroom-teaser', 'donation-banner'], ['ecosystem-section', 'media-preview', 'movement-section']],
  ['pages/about.html', 10, ['about-story-section', 'mission-vision-section', 'approach-section', 'founder-section', 'team-section', 'values-section'], ['challenge-section','difference-section','vision-2030-section']],
  ['pages/programs.html', 5, ['programs-hero', 'how-it-works-section', 'program-list-section', 'program-faq-section', 'program-final-cta'], ['programs-stats','program-story-section']],
  ['pages/schools.html', 7, ['schools-hero','school-receives-section','journey-section','school-dashboard-section','school-faq-section'], ['schools-section','school-stats']]
];

test('Main public pages are concise while essential programs and working routes stay available', () => {
  for (const [path, count, keep, remove] of pageRules) {
    const html = read(path);
    assert.equal((html.match(/<section\b/g) || []).length, count, path);
    assert.match(html, /<main\b/);
    assert.match(html, /account-controls\.js/);
    for (const cls of keep) assert.ok(html.includes(cls), path + ' missing ' + cls);
    for (const cls of remove) assert.ok(!html.includes('class="' + cls + '"'), path + ' retains duplicate ' + cls);
  }
});

test('Homepage visibly links to the public newsroom and verified Instagram handle', () => {
  const home = read('index.html');
  assert.match(home, /id="home-newsroom-title"/);
  assert.match(home, /href="pages\/news\.html"/);
  assert.match(home, /instagram\.com\/speaaakout\//);
  assert.match(read('css/home-v4.css'), /home-newsroom-inner/);
});

test('School and programme registration links are retained', () => {
  assert.match(read('pages/schools.html'), /id="journey"/);
  assert.match(read('pages/programs.html'), /id="program-list"/);
  assert.match(read('pages/programs.html'), /id="school-clubs"/);
  assert.match(read('index.html'), /href="pages\/donate\.html"/);
});
