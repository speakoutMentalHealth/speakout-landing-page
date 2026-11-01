import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const load=f=>JSON.parse(readFileSync(f,'utf8'));
const batch=load('docs/kiddies-tv-geography-coding-age-curation-20261101.json');
const live=load('data/kiddies-tv-approved.json');
const original=load('docs/kiddies-tv-user-submitted-african-videos-20261101.json');
const library=readFileSync('js/kiddies-tv-library.js','utf8');
const watch=readFileSync('js/kiddies-tv-watch.js','utf8');
const html=readFileSync('kiddies-tv.html','utf8'),watchHtml=readFileSync('kiddies-tv-watch.html','utf8');
test('Curated selection includes Africa, Nigerian states, world capitals and age-graded coding',()=>{
 assert.equal(batch.candidates.length,19);
 const ids=new Set(batch.candidates.map(c=>c.youtubeId));
 assert.equal(ids.size,batch.candidates.length,'all curated IDs unique');
 assert(batch.candidates.some(c=>c.category==='Geography & Culture'&&c.proposedAges.includes('6-9')));
 assert(batch.candidates.some(c=>c.category==='Geography & Culture'&&c.proposedAges.includes('13-17')));
 assert(batch.candidates.some(c=>c.category==='Coding & Digital Literacy'&&c.proposedAges.includes('6-9')));
 assert(batch.candidates.some(c=>c.category==='Coding & Digital Literacy'&&c.proposedAges.includes('13-17')));
 assert(batch.candidates.every(c=>c.approved===false&&c.verification.fullWatch===false&&c.verification.decision==='pending_full_video_review'));
 assert(batch.candidates.every(c=>c.proposedAges.length>0&&c.proposedAges.every(a=>['3-5','6-9','10-12','13-17'].includes(a))));
 const liveIds=new Set(live.map(c=>c.youtubeId));
 assert(batch.candidates.every(c=>!liveIds.has(c.youtubeId)),'unreviewed candidates cannot be inserted into public catalogue');
});
test('Playlist contains bounded review leads, not mutable public playlist',()=>{
 assert.equal(original.playlist.playlistId,'PLEp6HdXIBkhrkn3esl9tsw-hhLJKkRHwB');
 assert.equal(original.playlist.maxItemsForFirstPass,30);
 assert.equal(original.playlist.approval,'none');
 assert.equal(original.videos.length,6);
});
test('Geography & Culture is supported by both live views without publishing unreviewed lessons',()=>{
 assert(library.includes("['Geography & Culture','Geography & Culture'"));
 assert(watch.includes("'Geography & Culture'"));
 assert(library.includes("v.approved===true")&&watch.includes("v.approved===true"));
 assert(html.includes('js/kiddies-tv-geography-20261101.js'));
 assert(watchHtml.includes('js/kiddies-tv-watch-geography-20261101.js'));
 assert.equal(readFileSync('js/kiddies-tv-geography-20261101.js','utf8'),library);
 assert.equal(readFileSync('js/kiddies-tv-watch-geography-20261101.js','utf8'),watch);
});
