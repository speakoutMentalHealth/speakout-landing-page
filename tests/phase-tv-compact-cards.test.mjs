import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("video cards remain compact and use a consistent responsive 16:9 grid",()=>{
  const css=read("css/tv/video-first.css");
  for(const id of ["for-you","fresh","courses","books","regional-learning","shelf","series"])
    assert.ok(css.includes("#"+id),id);
  assert.match(css,/grid-auto-rows:max-content/);
  assert.match(css,/height:max-content!important/);
  assert.match(css,/align-self:flex-start!important/);
  assert.match(css,/aspect-ratio:16\/9/);
  assert.match(css,/-webkit-line-clamp:2/);
  assert.match(css,/@media\(max-width:900px\)/);
  assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  const channel=read("css/tv/tell-my-story-channel.css");
  const subpages=read("css/tv/video-subpages.css");
  assert.match(channel,/grid-auto-rows:max-content/);
  assert.match(subpages,/grid-auto-rows:max-content/);
});

test("TV doesn't float a platform-switcher over the video cards and refreshes its styling",()=>{
  const page=read("tv.html");
  assert.doesNotMatch(page,/speakout-platform-switcher\.js/);
  assert.match(page,/css\/tv\/video-first\.css\?v=17/);
  assert.match(page,/serviceWorker\.register\("tv-sw\.js",\{updateViaCache:"none"\}\)/);
  for(const path of ["tv-search.html","watch.html","show.html","radio.html"])
    assert.match(read(path),/css\/tv\/video-subpages\.css\?v=17/);
  assert.match(read("pages/tell-my-story.html"),/css\/tv\/tell-my-story-channel\.css\?v=17/);
});

test("TV service worker does not intercept unrelated SpeakOut pages or delete other app caches",async()=>{
  const source=read("tv-sw.js"),handlers={},deletions=[];
  const self={
    registration:{scope:"https://speakoutmentalhealth.org/"},
    clients:{claim:async()=>{}},
    skipWaiting:async()=>{},
    addEventListener:(name,callback)=>{handlers[name]=callback}
  };
  const caches={
    keys:async()=>["mindcheck-v3","speakout-academy-v2","speakout-tv-v16","speakout-tv-v17","speakout-tv-v18","speakout-tv-v19"],
    delete:async key=>{deletions.push(key);return true},
    open:async()=>({addAll:async()=>{},put:async()=>{}}),
    match:async()=>undefined
  };
  vm.runInNewContext(source,{self,caches,URL,location:{origin:"https://speakoutmentalhealth.org"},fetch:async()=>({ok:false}),Response,Promise});
  const makeRequest=path=>{
    let handled=false;
    const request={method:"GET",url:"https://speakoutmentalhealth.org"+path,mode:"navigate",destination:"document"};
    handlers.fetch({request,respondWith:()=>{handled=true}});
    return handled;
  };
  assert.equal(makeRequest("/pages/schools.html"),false);
  assert.equal(makeRequest("/pages/news.html"),false);
  assert.equal(makeRequest("/tv.html"),true);
  assert.equal(makeRequest("/pages/tell-my-story.html"),true);
  let activation;
  handlers.activate({waitUntil:promise=>{activation=promise}});
  await activation;
  assert.equal(JSON.stringify(deletions),JSON.stringify(["speakout-tv-v16","speakout-tv-v17","speakout-tv-v18"]));
  assert.match(source,/speakout-tv-v19/);
});
