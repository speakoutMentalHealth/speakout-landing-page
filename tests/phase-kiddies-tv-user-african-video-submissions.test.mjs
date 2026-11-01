import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const batch=JSON.parse(readFileSync('docs/kiddies-tv-user-submitted-african-videos-20261101.json','utf8'));
const live=JSON.parse(readFileSync('data/kiddies-tv-approved.json','utf8'));
const ids=['tcGWl2TN4Ec','g6CVApMxmqg','X7ic17zx0gA','kB7qOJT5x1A','G0F2PiVP_FI','53K2jjPjdds'];
test('Owner-submitted YouTube videos remain review-only and unique',()=>{
 assert.equal(batch.playlist.playlistId,'PLEp6HdXIBkhrkn3esl9tsw-hhLJKkRHwB');
 assert.equal(batch.playlist.maxItemsForFirstPass,30);
 assert.equal(batch.playlist.approval,'none');
 assert.deepEqual(batch.videos.map(v=>v.youtubeId),ids);
 assert.equal(new Set(batch.videos.map(v=>v.youtubeId)).size,6);
 const liveIds=new Set(live.map(v=>v.youtubeId));
 for(const x of batch.videos){
  assert(!liveIds.has(x.youtubeId),'new unreviewed submission must stay out of public catalogue');
  assert.equal(x.publishApproved,false);
  assert.equal(x.review.decision,null);
  assert.equal(x.review.completedFullWatch,false);
  assert.deepEqual(x.proposedAges,[],'age group cannot be invented from a URL');
  assert.match(x.youtubeId,/^[A-Za-z0-9_-]{11}$/);
 }
});
test('Submission preflight never modifies publication data',()=>{
 const script=readFileSync('scripts/kiddies-tv-user-submissions-preflight.mjs','utf8');
 assert(script.includes('allUnapproved:true'));
 assert(!script.includes("writeFileSync('data/kiddies-tv-approved.json'"));
 assert(!script.includes('publishApproved=true'));
 assert(!script.includes('approved:true'));
});
