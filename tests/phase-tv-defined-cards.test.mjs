import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";

const read = path=>readFileSync(new URL("../"+path, import.meta.url), "utf8");

test("cards have visible individual backgrounds, borders, padding and separation",()=>{
  const css=read("css/tv/card-clarity.css");
  assert.match(css,/--tv-card-bg:#172336/);
  assert.match(css,/--tv-card-border:#435672/);
  assert.match(css,/--tv-card-gap:18px/);
  assert.match(css,/--tv-card-gap:14px/);
  assert.match(css,/row-gap:24px!important/);
  assert.match(css,/row-gap:20px!important/);
  assert.match(css,/border:1px solid var\(--tv-card-border\)!important/);
  assert.match(css,/padding:10px!important/);
  for(const name of [".youth-content-card",".original-card",".discovery-media-card",".tms-card"])
    assert.ok(css.includes(name),name);
});

test("card structure preserves 16:9 imagery and short, consistently positioned text",()=>{
  const css=read("css/tv/card-clarity.css");
  assert.match(css,/aspect-ratio:16\/9/);
  assert.match(css,/min-height:2\.7em!important/);
  assert.match(css,/-webkit-line-clamp:2/);
  assert.match(css,/-webkit-line-clamp:1/);
  assert.match(css,/height:max-content!important/);
  assert.match(css,/min-height:190px!important/); // absolutely positioned series copy must have space
  assert.match(read("js/speakout-tv.js"),/youth-content-card/);
});

test("thumbnail attribution and save control do not cover one another",()=>{
  const css=read("css/tv/card-clarity.css");
  assert.match(css,/:has\(\.tv-source-attribution\) \.tv-art-bug/);
  assert.match(css,/left:8px!important/);
  assert.match(css,/right:auto!important/);
  assert.match(css,/min-width:40px/);
  assert.match(css,/min-height:40px/);
  assert.match(css,/:focus-within/);
  assert.match(css,/prefers-reduced-motion:reduce/);
});

test("all video routes load card clarity after the base and dark theme",()=>{
  const paths=["tv.html","tv-search.html","watch.html","show.html","radio.html","pages/tell-my-story.html"];
  for(const path of paths){
    const html=read(path);
    assert.match(html,/card-clarity\.css\?v=20/);
    assert.ok(html.indexOf("card-clarity.css")>html.indexOf("dark-readable.css"),path);
    assert.match(html,/account-controls\.js/);
  }
});

test("TV service worker caches card stylesheet without claiming other applications",()=>{
  const sw=read("tv-sw.js");
  assert.match(sw,/speakout-tv-v20/);
  assert.match(sw,/\.\/css\/tv\/card-clarity\.css/);
  assert.match(sw,/TV_PATHS\.has\(url\.pathname\)/);
  assert.match(sw,/key\.startsWith\("speakout-tv-"\)/);
});
