import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root=new URL("../",import.meta.url);
const read=path=>readFileSync(new URL(path,root),"utf8");

const publicPages=[
  "pages/about.html","pages/academy.html","pages/programs.html","pages/schools.html",
  "pages/resources.html","pages/news.html","pages/contact.html","pages/impact.html",
  "pages/partners.html","pages/donate.html","pages/volunteer.html","pages/research.html"
];

test("public navigation treats SpeakOut TV as the media destination",()=>{
  for(const page of publicPages){
    const source=read(page);
    assert.doesNotMatch(source,/Media Centre/u,page);
    assert.doesNotMatch(source,/href="\.\.\/pages\/media\.html"/u,page);
    assert.match(source,/href="\.\.\/tv\.html">SpeakOut TV<\/a>/u,page);
  }
});

test("marketing counters contain meaningful non-JavaScript fallback values",()=>{
  for(const page of publicPages){
    const source=read(page);
    assert.doesNotMatch(source,/<strong data-count="\d+">0<\/strong>/u,page);
  }
  const academy=read("pages/academy.html");
  assert.match(academy,/<strong>2030<\/strong><span>Growth Vision<\/span>/u);
  assert.doesNotMatch(academy,/data-count="2030"/u);
});

test("skip links resolve to the actual public main region",()=>{
  for(const page of publicPages){
    const source=read(page);
    if(source.includes('href="#main-content"')){
      assert.match(source,/<main id="main-content">/u,page);
    }
  }
});

test("public animation scripts remain usable without IntersectionObserver and with reduced motion",()=>{
  for(const path of ["js/main.js","js/home-v4.js"]){
    const source=read(path);
    assert.match(source,/prefers-reduced-motion: reduce/u,path);
    assert.match(source,/IntersectionObserver" in window/u,path);
    assert.match(source,/finalCounterText/u,path);
    assert.match(source,/unobserve/u,path);
  }
});

test("legacy media URL remains a noindex canonical redirect",()=>{
  const source=read("pages/media.html");
  assert.match(source,/name="robots" content="noindex,follow"/u);
  assert.match(source,/rel="canonical" href="https:\/\/speakoutmentalhealth\.org\/tv\.html"/u);
  assert.match(source,/location\.replace\("\.\.\/tv\.html#library"\)/u);
});
