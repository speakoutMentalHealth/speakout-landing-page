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

test('Kiddies TV tiles remain approved-only YouTube videos in an on-page player',()=>{
  assert(approved.every(v=>v.approved===true&&/^[A-Za-z0-9_-]{11}$/.test(v.youtubeId)));
  assert(lib.includes("v.approved===true"),'approved-only library validation must remain intact');
  assert(watch.includes("v.approved===true"),'approved-only watch validation must remain intact');
  assert(lib.includes("iframe.src='https://www.youtube-nocookie.com/embed/'"),'library must use an embedded YouTube player');
  assert(watch.includes("iframe.src='https://www.youtube-nocookie.com/embed/'"),'watch page must use an embedded YouTube player');
  assert(!/window\.open\(|location\.href\s*=\s*['"]https?:/.test(lib),'lesson tiles must not navigate to external destinations');
  assert(!/href=["']https?:\/\/(?:www\.)?youtube\.com\/(?:watch|shorts)/.test(page+watchPage),'no owner-controlled outbound YouTube watch links');
});

test('Both learning views offer a manual Stop video action that clears the iframe',()=>{
  assert(page.includes('id="stop-video-quick"')&&page.includes('id="close-video"'));
  assert(watchPage.includes('id="watch-stop"'));
  assert(lib.includes("stopQuick.addEventListener('click',close)"));
  assert(lib.includes("frame.replaceChildren(placeholder)"),'library close must remove iframe and stop playback');
  assert(watch.includes("stop.addEventListener('click'"));
  assert(watch.includes('box.replaceChildren(placeholder)'), 'watch stop must remove iframe and stop playback');
  assert(read('css/kiddies-tv-watch.css').includes('#watch-stop[hidden]{display:none}'));
});

test('Do not misrepresent YouTube adverts or implement a simulated ad shield',()=>{
  assert(page.includes('cannot control or hide'));
  assert(watchPage.includes('cannot automatically hide or skip'));
  assert(!/ad[-_]?block|skipAd\s*\(|adCountdown|adOverlay/i.test(lib+watch),'no unsupported YouTube advert manipulation');
});
