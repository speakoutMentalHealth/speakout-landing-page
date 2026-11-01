import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const load=path=>JSON.parse(readFileSync(path,'utf8'));
const candidates=load('docs/kiddies-tv-teen-13-17-review-batch.json');
const publicVideos=load('data/kiddies-tv-approved.json');
const html=readFileSync('kiddies-tv.html','utf8');
const app=readFileSync('js/kiddies-tv-teen-launch-20261101.js','utf8');
const ownerApproved=['AFR-31','AFR-32','AFR-33','AFR-23','AFR-24'];
test('Only the five explicitly owner-approved 13–17 videos may enter public catalogue',()=>{
 assert.equal(candidates.length,9);
 assert.equal(new Set(candidates.map(x=>x.youtubeId)).size,9);
 assert(candidates.every(x=>x.proposedAges.join(',')==='13-17'));
 const approved=candidates.filter(x=>x.ownerApproval?.decision==='approved_for_publication');
 assert.deepEqual(approved.map(x=>x.reviewId).sort(),[...ownerApproved].sort());
 for(const x of approved){
  assert(x.ownerApproval.evidence.includes("Approved… continue"));
  assert(x.ownerApproval.fullVideoReviewAttested===false);
  assert(x.ownerApproval.fullVideoReviewVerifiedByAssistant===false);
  assert(x.ownerApproval.devicePlaybackVerifiedByAssistant===false);
  assert(x.review.watchComplete===false && x.review.decision===null,'do not fabricate a completed safety review');
 }
 assert.equal(publicVideos.length,30);
 assert.equal(publicVideos.filter(x=>x.ages.includes('13-17')).length,5);
 assert(publicVideos.every(x=>x.approved===true));
 const ids=new Set(publicVideos.map(x=>x.youtubeId));
 assert.equal(ids.size,publicVideos.length,'no duplicates');
 for(const c of candidates){
  assert.equal(ids.has(c.youtubeId),ownerApproved.includes(c.reviewId),c.reviewId+' authorisation mismatch');
 }
});
test('Teen catalogue displays a discoverable secondary-school shelf and age filter',()=>{
 assert(html.includes('id="teen-review-status"'));
 assert(html.includes('css/kiddies-tv-teen-launch-20261101.css'));
 assert(html.includes('js/kiddies-tv-geography-20261101.js'));
 assert(app.includes("age.value==='13-17'&&!videos.some(v=>v.ages.includes('13-17'))"),'pending state only when no approved teens');
 assert(app.includes('rail-section--teen'));
 assert(app.includes('Secondary School · Ages 13–17'));
 assert(app.includes('v.approved===true'));
});
test('Strict full-review promotion script remains a dry-run no-op for incomplete checks',()=>{
 const original=readFileSync('data/kiddies-tv-approved.json','utf8');
 const report=execFileSync(process.execPath,['scripts/kiddies-tv-promote-reviewed-teen.mjs'],{encoding:'utf8'});
 assert.match(report,/Passed complete review gates: 0 of 9 candidates/);
 assert.match(report,/Dry run: no files changed/);
 assert.equal(readFileSync('data/kiddies-tv-approved.json','utf8'),original);
});
