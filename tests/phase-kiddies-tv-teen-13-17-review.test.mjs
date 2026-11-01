import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const load=path=>JSON.parse(readFileSync(path,'utf8'));
const candidates=load('docs/kiddies-tv-teen-13-17-review-batch.json');
const publicVideos=load('data/kiddies-tv-approved.json');
const html=readFileSync('kiddies-tv.html','utf8');
const app=readFileSync('js/kiddies-tv-premium-teen-20261101.js','utf8');

test('Teen approval batch consists of 9 unique 13–17 candidates, not public approvals',()=>{
 assert.equal(candidates.length,9);
 assert.equal(new Set(candidates.map(x=>x.youtubeId)).size,candidates.length);
 assert(candidates.every(x=>x.proposedAges.join(',')==='13-17'));
 assert(candidates.every(x=>x.approvalStatus==='pending_full_media_review'));
 assert(candidates.every(x=>x.review.reviewer===null && x.review.reviewedAt===null && x.review.watchComplete===false && x.review.decision===null));
 assert(candidates.every(x=>/^[A-Za-z0-9_-]{11}$/.test(x.youtubeId)));
});
test('Only vetted, explicitly approved video records are in the public catalogue',()=>{
 assert.equal(publicVideos.length,25,'review must not expand public video count');
 assert(publicVideos.every(v=>v.approved===true));
 assert(!publicVideos.some(v=>v.ages.includes('13-17')),'no unreviewed teen videos allowed in public catalogue');
 const published=new Set(publicVideos.map(v=>v.youtubeId));
 assert(candidates.every(v=>!published.has(v.youtubeId)));
});
test('Teen collection status is honest, and ageing filter automatically supports future approved videos',()=>{
 assert(html.includes('id="teen-review-status"'));
 assert(html.includes('being reviewed for educational accuracy'));
 assert(html.includes('css/kiddies-tv-premium-teen-20261101.css'));
 assert(html.includes('js/kiddies-tv-premium-teen-20261101.js'));
 assert(app.includes("age.value==='13-17'&&!videos.some(v=>v.ages.includes('13-17'))"));
 assert(app.includes('teenStatus.hidden=!teenCollectionPending'));
 assert(app.includes('v.approved===true'));
 assert(!html.includes('AFR-31')&&!html.includes('unreviewed candidate'));
});
