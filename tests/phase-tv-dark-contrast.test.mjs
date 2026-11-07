import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
function relativeLuminance(hex){
  const values=hex.match(/[a-f\d]{2}/gi).map(n=>parseInt(n,16)/255);
  return values.map(v=>v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4))
    .reduce((sum,n,i)=>sum+n*[.2126,.7152,.0722][i],0);
}
function contrast(a,b){
  const l1=relativeLuminance(a),l2=relativeLuminance(b);
  return (Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);
}
test("TV dark theme keeps headings and descriptions WCAG AA readable",()=>{
  const page="#0c121d",heading="#f3f7fd",body="#bdc9da",card="#15202f";
  assert.ok(contrast(heading,page)>=7);
  assert.ok(contrast(body,page)>=7);
  assert.ok(contrast(body,card)>=4.5);
  const css=read("css/tv/dark-readable.css");
  for(const color of [page,heading,body,card])assert.ok(css.includes(color),color);
  for(const selector of ["body.tv-clean","body.tv-video-subpage","body.tms-page",
    ".tv-clean .youth-content-open>strong",".tms-page .tms-card-copy h3",
    ".tv-video-subpage .discovery-media-copy strong"]){
    assert.ok(css.includes(selector),selector);
  }
  assert.match(css,/focus-visible/);
});
test("all SpeakOut TV pages ship the dark theme after existing design CSS",()=>{
  for(const page of ["tv.html","tv-search.html","watch.html","show.html","radio.html"]){
    const html=read(page);
    assert.match(html,/css\/tv\/dark-readable\.css\?v=18/);
    const dark=html.indexOf("dark-readable.css"),previous=html.indexOf("video-first.css");
    assert.ok(previous>0 && dark>previous,page);
    assert.match(html,/meta name="theme-color" content="#0c121d"/);
  }
  const partner=read("pages/tell-my-story.html");
  assert.match(partner,/css\/tv\/dark-readable\.css\?v=18/);
  assert.ok(partner.indexOf("dark-readable.css")>partner.indexOf("tell-my-story-channel.css"));
  assert.match(partner,/meta name="theme-color" content="#0c121d"/);
});
test("dark theme maintains compact media layout and refreshes the TV PWA",()=>{
  const grid=read("css/tv/video-first.css"),sw=read("tv-sw.js"),manifest=JSON.parse(read("tv.webmanifest"));
  assert.match(grid,/grid-auto-rows:max-content/);
  assert.match(grid,/aspect-ratio:16\/9/);
  assert.match(sw,/speakout-tv-v18/);
  assert.match(sw,/\.\/css\/tv\/dark-readable\.css/);
  assert.equal(manifest.background_color,"#0c121d");
  assert.equal(manifest.theme_color,"#0c121d");
});
