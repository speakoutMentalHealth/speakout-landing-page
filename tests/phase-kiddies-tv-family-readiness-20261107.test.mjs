import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("family-first age shortcuts and reset are present and accessible",()=>{
 const html=read("kiddies-tv.html");
 for(const age of ["","3-5","6-9","10-12","13-17","0-2"]){
  assert.ok(html.includes('data-age-choice="'+age+'"'),age);
 }
 assert.match(html,/id="age-shortcuts"[^>]*role="group"/);
 assert.match(html,/id="clear-filters"/);
 assert.match(html,/id="caregiver-status"/);
 assert.match(html,/id="parent-guide"/);
 assert.match(html,/aria-pressed="true"/);
 assert.match(html,/og:description/);
});
test("the public catalogue and managed runtime remain byte-identical",()=>{
 const source=read("js/kiddies-tv-library.js");
 assert.equal(source,read("js/kiddies-tv-managed-20261101.js"));
 assert.match(source,/ageShortcuts\.addEventListener\('click'/);
 assert.match(source,/syncAgeChoices\(\)/);
 assert.match(source,/clearFilters\.addEventListener\('click'/);
 assert.match(source,/videos\.some\(v=>v\.category===group\[0\]\)/);
 assert.match(source,/v\.approved===true/);
 assert.match(source,/loadKiddiesTvCatalogue/);
 assert.doesNotMatch(source,/autoplay=1/);
});
test("only available subjects are offered; empty ages have a caregiver-friendly path",()=>{
 const app=read("js/kiddies-tv-library.js");
 assert.match(app,/renderChips\(\);draw\(\)/);
 assert.match(app,/age\.value==='0-2'/);
 assert.match(app,/const teenCollectionPending=/);
 assert.match(app,/subjectStatus\.hidden=!pendingSubject/);
 assert.match(app,/target\.scrollIntoView/);
});
test("visual layout provides distinct cards, good tap targets and reduced motion",()=>{
 const css=read("css/kiddies-tv-family-20261107.css");
 assert.match(css,/\.tile\{[\s\S]*?border:1px solid #527181/);
 assert.match(css,/\.tile-copy strong\{[\s\S]*?-webkit-line-clamp:2/);
 assert.match(css,/\.tile-footer \.video-report\{[\s\S]*?min-height:41px/);
 assert.match(css,/\.age-choice\{[\s\S]*?min-height:47px/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/@media\(max-width:450px\)/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 const home=read("kiddies-tv.html");
 const watch=read("kiddies-tv-watch.html");
 assert.match(home,/css\/kiddies-tv-family-20261107\.css\?v=1/);
 assert.match(watch,/css\/kiddies-tv-family-20261107\.css\?v=1/);
 assert.match(watch,/watch-family-tip/);
});
test("marketing language is truthful about external playback and parent oversight",()=>{
 const html=read("kiddies-tv.html");
 assert.match(html,/YouTube may show advertisements, recommendations or links/);
 assert.match(html,/not a guaranteed ad-free or risk-free service/);
 assert.match(html,/Use the Report control/);
 assert.match(html,/An adult must review and send it/);
 assert.doesNotMatch(html,/100% safe|ad-free YouTube|zero ads/i);
 const publicVideos=JSON.parse(read("data/kiddies-tv-approved.json"));
 assert.equal(publicVideos.length,30);
 assert.equal(new Set(publicVideos.map(v=>v.youtubeId)).size,30);
 assert.equal(publicVideos.filter(v=>v.ages.includes("13-17")).length,5);
 assert.ok(publicVideos.every(v=>v.approved===true));
});
