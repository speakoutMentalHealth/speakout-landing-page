import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=filename=>readFileSync(path.join(root,filename),'utf8');
const lib=read('js/kiddies-tv-library.js'),watch=read('js/kiddies-tv-watch.js');
const page=read('kiddies-tv.html'),watchPage=read('kiddies-tv-watch.html');
const approved=JSON.parse(read('data/kiddies-tv-approved.json'));
test('Cache-safe assets protect the redesigned HTML from stale Safari CSS and JS',()=>{
 assert(page.includes('css/kiddies-tv-cinema-20261101.css'));
 assert(page.includes('js/kiddies-tv-cinema-20261101.js'));
 assert(watchPage.includes('css/kiddies-tv-watch-cinema-20261101.css'));
 assert(watchPage.includes('js/kiddies-tv-watch-cinema-20261101.js'));
 const actual=read('css/kiddies-tv-cinema-20261101.css');
 assert(actual.includes('text-size-adjust:100%'));
 assert.equal(actual,read('css/kiddies-tv.css'));
 assert.equal(read('js/kiddies-tv-cinema-20261101.js'),lib);
});


test('Streaming-style library displays approved-only YouTube lessons without external video links',()=>{
 assert(approved.length>0&&approved.every(v=>v.approved===true&&/^[A-Za-z0-9_-]{11}$/.test(v.youtubeId)));
 assert(lib.includes("v.approved===true"),'library approval validation stays mandatory');
 assert(watch.includes("v.approved===true"),'watch page approval validation stays mandatory');
 assert(lib.includes("iframe.src='https://www.youtube-nocookie.com/embed/'"));
 assert(watch.includes("iframe.src='https://www.youtube-nocookie.com/embed/'"));
 assert(!/window\.open\(|location\.href\s*=\s*['"]https?:/.test(lib),'library cannot navigate to external videos');
 assert(!/href=["']https?:\/\/(?:www\.)?youtube\.com\/(?:watch|shorts)/.test(page+watchPage),'no owner-controlled outbound YouTube watch links');
});
test('Featured-first cinema layout opens video only after a user choice',()=>{
 assert(page.includes('id="hero-image"')&&page.includes('id="hero-title"'),'featured media');
 assert(page.includes('id="player"')&&page.includes('class="watch-stage"')&&page.includes('hidden'),'player is hidden initially');
 assert(page.includes('id="close-video"'),'a discreet close control exists');
 assert(!page.includes('id="stop-video-quick"')&&!watchPage.includes('id="watch-stop"'),'no bulky Stop video actions');
 assert(lib.includes("player.hidden=false"),'selecting a lesson reveals the stage');
 assert(lib.includes("frame.replaceChildren(iframe)"),'the player is replaced, not stacked');
 assert(lib.includes("frame.replaceChildren();player.hidden=true"),'close unmounts the iframe');
 assert(read('css/kiddies-tv.css').includes('.rail-section')&&read('css/kiddies-tv.css').includes('.hero-media'));
});
test('YouTube advertising and recommendations remain transparently disclosed',()=>{
 assert(page.includes('YouTube may display advertisements'));
 assert(watchPage.includes('YouTube may display adverts'));
 assert(!/(adCountdown|skipAd\s*\(|adOverlay|adBlock)/i.test(lib+watch),'unsupported ad overlay must remain absent');
});
