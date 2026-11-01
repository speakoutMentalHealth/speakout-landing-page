/* Regression gate: coding becomes a supported subject, not auto-published content. */
'use strict';
const { readFileSync } = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const library = readFileSync(path.join(root, 'js/kiddies-tv-library.js'), 'utf8');
const watch = readFileSync(path.join(root, 'js/kiddies-tv-watch.js'), 'utf8');
const approved = JSON.parse(readFileSync(path.join(root, 'data/kiddies-tv-approved.json'), 'utf8'));
assert(library.includes("['Coding & Digital Literacy','Coding & Digital Literacy'"), 'Library needs coding rail');
assert(watch.includes("'Life Skills','Coding & Digital Literacy'"), 'Watch page needs coding in approved-category allowlist');
assert(library.includes("v.approved===true") && watch.includes("v.approved===true"), 'Approval gates must remain present');
assert(Array.isArray(approved), 'Approved catalogue must be an array');
assert(!approved.some(v => v && v.category === 'Coding & Digital Literacy' && v.approved === true), 'Do not publish unreviewed coding content');
console.log('PASS: coding supported by both views; approved-only gates intact; no coding videos auto-published.');
