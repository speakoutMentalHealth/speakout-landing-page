import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root=new URL("../",import.meta.url);
const read=path=>readFileSync(new URL(path,root),"utf8");

test("public entry scripts load the shared marketing foundation",()=>{
  for(const path of ["js/main.js","js/home-v4.js"]){
    const source=read(path);
    assert.match(source,/marketing-foundation\.js/u,path);
    assert.match(source,/__speakoutMarketingLoader/u,path);
  }
});

test("marketing foundation collects only safe campaign and conversion metadata",()=>{
  const source=read("js/marketing-foundation.js");
  for(const key of ["utm_source","utm_medium","utm_campaign","utm_content","utm_term"]){
    assert.match(source,new RegExp(key),key);
  }
  for(const eventName of [
    "school_registration_start","donation_start","volunteer_interest","contact_start",
    "whatsapp_contact","email_contact","academy_interest","tv_open","portal_open","form_submit_intent"
  ]){
    assert.match(source,new RegExp(eventName),eventName);
  }
  assert.doesNotMatch(source,/localStorage|sessionStorage|document\.cookie|fetch\(|XMLHttpRequest|sendBeacon/u);
  assert.doesNotMatch(source,/FormData|\.value\b/u);
  assert.match(source,/window\.dataLayer/u);
  assert.match(source,/speakout:marketing-event/u);
});

test("existing AdSense inventory explicitly disables ad personalization",()=>{
  for(const path of ["watch.html","radio.html","course-viewer.html","book-reader.html","course-player.html"]){
    const source=read(path);
    assert.match(source,/requestNonPersonalizedAds\s*=\s*1/u,path);
    assert.match(source,/data-privacy-treatments="disablePersonalization"/u,path);
    assert.match(source,/ca-pub-9014764551074349/u,path);
  }
});

test("AdSense publisher declaration and privacy notice match the hardened configuration",()=>{
  assert.equal(read("ads.txt").trim(),"google.com, pub-9014764551074349, DIRECT, f08c47fec0942fa0");
  const privacy=read("pages/privacy.html");
  assert.match(privacy,/request non-personalized ads/u);
  assert.match(privacy,/does not remove consent requirements/u);
  assert.match(privacy,/Last updated:<\/strong> 27 September 2026/u);
});


test("public SpeakOut TV surfaces load the marketing foundation",()=>{
  for(const path of ["tv.html","tv-search.html","watch.html","show.html","radio.html"]){
    assert.match(read(path),/src="js\/marketing-foundation\.js"/u,path);
  }
});

test("school registration redirect remains noindex and routes into the unified gateway",()=>{
  const source=read("school-register.html");
  assert.match(source,/name="robots" content="noindex,follow"/u);
  assert.match(source,/auth\.html#school/u);
});
