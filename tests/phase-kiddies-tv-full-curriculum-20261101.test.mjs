import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const raw=p=>readFileSync(p,'utf8'),get=p=>JSON.parse(raw(p));
const cfg=get('data/kiddies-tv-curriculum.json');
const old=get('data/kiddies-tv-approved.json');
const backup=get('docs/kiddies-tv-legacy-catalogue-20261101.json');
const staged=get('docs/kiddies-tv-replacement-staging-20261101.json');
const lib=raw('js/kiddies-tv-library.js'),watch=raw('js/kiddies-tv-watch.js'),html=raw('kiddies-tv.html'),view=raw('kiddies-tv-watch.html');
test('Full learning curriculum offers sixteen strands and under-two caregiver path',()=>{
 assert.equal(cfg.subjects.length,16);
 assert.equal(new Set(cfg.subjects.map(s=>s.id)).size,16);
 assert.deepEqual(cfg.ageBands.map(x=>x.id),['0-2','3-5','6-9','10-12','13-17']);
 assert.equal(cfg.ageBands[0].allowYouTube,false);
 assert(cfg.subjects.some(s=>s.id==='Literature & Storytelling'));
 assert(cfg.subjects.some(s=>s.id==='Nigerian Languages'));
 assert(cfg.subjects.some(s=>s.id==='Nigerian History & Citizenship'));
 for(const s of cfg.subjects){
  assert(lib.includes("['"+s.id+"','"+s.id+"'"),s.id+' missing from library categories');
  assert(watch.includes("'"+s.id+"'"),s.id+' missing from watch allowlist');
 }
 assert(!lib.includes("'0-2'']"),'infant videos must remain unsupported');
 assert(html.includes('id="caregiver-status"'));
 assert(html.includes('<option value="0-2">'));
 assert(html.includes('Learning starts with you, not a screen.'));
 assert(lib.includes("const caregiverSelected=age.value==='0-2'"));
 assert(lib.includes('caregiverStatus.hidden=!caregiverSelected'));
});
test('Current approved catalogue is unchanged and archival rollback is exact',()=>{
 assert.equal(old.length,30);
 assert.deepEqual(backup.videos,old);
 assert.equal(backup.legacyCount,30);
 assert.equal(staged.newVideos.length,0);
 assert.equal(staged.reviewedNewCount,0);
 assert.equal(staged.proposedNewCount,19);
 const ids=new Set(old.map(x=>x.youtubeId));
 assert.equal(ids.size,old.length);
 assert(old.every(v=>v.ages.every(a=>a!=='0-2')));
});
test('Both views reference new cache-safe content scripts and share source',()=>{
 assert(html.includes('css/kiddies-tv-curriculum-20261101.css'));
 assert(html.includes('js/kiddies-tv-managed-20261101.js'));
 assert(view.includes('js/kiddies-tv-watch-managed-20261101.js'));
 assert.equal(raw('js/kiddies-tv-managed-20261101.js'),lib);
 assert.equal(raw('js/kiddies-tv-watch-managed-20261101.js'),watch);
});
test('Reviewed replacements cannot delete existing content prematurely',()=>{
 const before=raw('data/kiddies-tv-approved.json');
 const exec=args=>execFileSync(process.execPath,['scripts/kiddies-tv-curated-cutover.mjs',...args],{encoding:'utf8'});
 const dry=exec([]);
 assert.match(dry,/CUTOVER BLOCKED/);
 assert.match(dry,/"ready": false/);
 assert.match(dry,/Need at least 40 signed-off replacement videos/);
 const attempt=exec(['--apply','--confirm=replace-legacy-kiddies-tv']);
 assert.match(attempt,/CUTOVER BLOCKED/);
 assert.equal(raw('data/kiddies-tv-approved.json'),before);
});
