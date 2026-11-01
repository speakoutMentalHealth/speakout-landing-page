/* Validate the unpublished African Kiddies TV discovery queue. Run: node tests/kiddies-tv-africa-pool.cjs */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const pool = JSON.parse(fs.readFileSync(path.join(root, 'data/kiddies-tv-africa-review-pool.json'), 'utf8'));
const approved = JSON.parse(fs.readFileSync(path.join(root, 'data/kiddies-tv-approved.json'), 'utf8'));
const allowedAges = new Set(['3-5', '6-9', '10-12', '13-17']);
const categories = new Set(['English & Phonics', 'English & Grammar', 'Mathematics', 'Science & Nature', 'Life Skills', 'Coding & Digital Literacy']);
const reviewIds = new Set();
const youtubeIds = new Set();
const liveIds = new Set(approved.filter(v => v && v.approved === true).map(v => v.youtubeId));
const reviews = JSON.parse(fs.readFileSync(path.join(root, 'docs/kiddies-tv-teen-13-17-review-batch.json'),'utf8'));
const authorised = new Set(reviews.filter(v => v.ownerApproval?.decision === 'approved_for_publication' && v.ownerApproval.fullVideoReviewAttested === false).map(v => v.youtubeId));
assert.equal(authorised.size,5,'Only five explicit owner approvals may override unpublished discovery state');
assert(Array.isArray(pool) && pool.length > 0, 'Pool must be a nonempty array');
for (const [i, item] of pool.entries()) {
  const tag = item.reviewId || 'item ' + i;
  assert.match(tag, /^AFR-\d+$/, 'Invalid review ID: ' + tag);
  assert(!reviewIds.has(tag), 'Duplicate review ID: ' + tag);
  reviewIds.add(tag);
  assert.equal(item.approved, false, tag + ' must remain unapproved');
  assert.equal(item.reviewStatus, 'discovered_pending_full_review', tag + ' is not a completed review');
  assert.equal(item.reviewer, null, tag + ' must not invent a reviewer');
  assert.equal(item.reviewedAt, null, tag + ' must not invent a review date');
  for (const field of ['title', 'source', 'sourceRegion', 'category', 'sourcePage', 'notes']) {
    assert(typeof item[field] === 'string' && item[field].trim().length, tag + ' missing ' + field);
  }
  assert(categories.has(item.category), tag + ' has unrecognized subject');
  assert(/^https:\/\//.test(item.sourcePage), tag + ' requires a secure source URL');
  assert(Array.isArray(item.proposedAges) && item.proposedAges.length > 0, tag + ' has no proposed age group');
  assert(item.proposedAges.every(a => allowedAges.has(a)), tag + ' has an unsupported age band');
  if (item.youtubeId !== null) {
    assert.match(item.youtubeId, /^[a-zA-Z0-9_-]{11}$/, tag + ' invalid YouTube ID');
    assert(!youtubeIds.has(item.youtubeId), tag + ' duplicates a review video');
    if(liveIds.has(item.youtubeId)) assert(authorised.has(item.youtubeId), tag + ' is published without explicit owner approval');
    youtubeIds.add(item.youtubeId);
  }
}
const subjects = pool.reduce((acc, v) => ((acc[v.category] = (acc[v.category] || 0) + 1), acc), {});
console.log('Unpublished Kiddies TV queue: ' + pool.length + ' candidates; ' + youtubeIds.size + ' unique YouTube IDs; ' + (pool.length - youtubeIds.size) + ' without video IDs.');
console.log('Subject distribution: ' + JSON.stringify(subjects));
console.log('PASS: discovery leads stay distinct; only five explicitly owner-authorized IDs overlap the public catalogue.');
