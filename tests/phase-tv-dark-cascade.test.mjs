import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

function luminance(hex){
  const rgb=hex.slice(1).match(/.{2}/g).map(n=>parseInt(n,16)/255);
  return rgb.map(v=>v<=0.04045?v/12.92:Math.pow((v+0.055)/1.055,2.4))
    .reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
}
const ratio=(a,b)=>{
  const first=luminance(a),second=luminance(b);
  return (Math.max(first,second)+.05)/(Math.min(first,second)+.05);
};

test("TV dark theme is loaded after all light subpage stylesheets",()=>{
  for(const path of ["tv-search.html","watch.html","show.html","radio.html"]){
    const html=read(path);
    assert.ok(html.indexOf("dark-readable.css")>html.indexOf("video-subpages.css"),
      path+" must load dark styles last");
    assert.match(html,/dark-readable\.css\?v=19/);
    assert.match(html,/css\/account-controls\.css\?v=19/);
  }
  const tv=read("tv.html");
  assert.ok(tv.indexOf("dark-readable.css")>tv.indexOf("video-first.css"));
  const partner=read("pages/tell-my-story.html");
  assert.ok(partner.indexOf("dark-readable.css")>partner.indexOf("tell-my-story-channel.css"));
});

test("search headings and filter chips override low-contrast light styles",()=>{
  const css=read("css/tv/dark-readable.css");
  for(const selector of [
    "body.tv-video-subpage .search-discovery-hero h1",
    "body.tv-video-subpage .discovery-results-head h2",
    "body.tv-video-subpage #resultTitle",
    "body.tv-video-subpage .discovery-search-box input",
    "body.tv-video-subpage #resultCount",
    "body.tv-video-subpage :is(.search-topic-rail,.search-kind-tabs,.listen-filter-rail) button"
  ])assert.ok(css.includes(selector),selector);
  assert.ok(ratio("#f8fafc","#0c121d")>=7);
  assert.ok(ratio("#cbd6e4","#182435")>=7);
  assert.ok(ratio("#f0f5fc","#202d3d")>=7);
  assert.ok(ratio("#142238","#dce9ff")>=7);
});

test("TV live metadata cards are dark, distinct and legible",()=>{
  const css=read("css/tv/dark-readable.css");
  assert.match(css,/body\.tv-clean #live #liveCinemaShell:not\(\.tv-immersive\) \.live-info-card/);
  assert.match(css,/body\.tv-clean #live \.live-next-panel/);
  assert.match(css,/background:#182435!important/);
  assert.match(css,/body\.tv-clean #live \.live-info-card h3/);
  assert.match(css,/body\.tv-clean #live \.live-info-card p/);
  assert.match(css,/body\.tv-clean #live \.live-action:not\(\.primary\)/);
  assert.match(css,/body\.tv-clean #live \.live-expand-primary/);
});

test("injected account controls are TV-scoped and do not create a light bar",()=>{
  const css=read("css/account-controls.css");
  assert.match(css,/body\.tv-ios \.speakout-account/);
  assert.match(css,/body\.tms-page \.speakout-account/);
  assert.match(css,/background:#121b29/);
  assert.match(css,/color:#f7faff/);
  const html=read("tv.html");
  assert.match(html,/css\/account-controls\.css\?v=19/);
  assert.match(html,/src="js\/account-controls\.js"/);
});

test("PWA refresh doesn't intercept unrelated app pages or regress card dimensions",()=>{
  const sw=read("tv-sw.js"),css=read("css/tv/video-first.css");
  assert.match(sw,/speakout-tv-v20/);
  assert.match(sw,/key\.startsWith\("speakout-tv-"\)/);
  assert.match(sw,/TV_PATHS\.has\(url\.pathname\)/);
  assert.doesNotMatch(sw,/"\.\/css\/account-controls\.css"/);
  assert.match(css,/grid-auto-rows:max-content/);
  assert.match(css,/aspect-ratio:16\/9/);
});
