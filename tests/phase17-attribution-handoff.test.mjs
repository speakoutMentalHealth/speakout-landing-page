import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root=new URL("../",import.meta.url);
const read=path=>readFileSync(new URL(path,root),"utf8");

test("marketing layer forwards only approved UTM fields on high-intent same-site links",()=>{
  const source=read("js/marketing-foundation.js");
  assert.match(source,/const campaignParams/u);
  assert.match(source,/const carryCampaignToLink/u);
  assert.match(source,/url\.origin !== window\.location\.origin/u);
  assert.match(source,/school_registration/u);
  assert.match(source,/donation_page/u);
  assert.match(source,/academy/u);
  assert.match(source,/portal/u);
  assert.match(source,/if \(!url\.searchParams\.has\(key\)\) url\.searchParams\.set\(key, value\)/u);
  assert.doesNotMatch(source,/localStorage|sessionStorage|document\.cookie/u);
});

test("school registration redirect preserves allow-listed UTM attribution and drops everything else",()=>{
  const source=read("school-register.html");
  assert.match(source,/name="robots" content="noindex,follow"/u);
  assert.match(source,/href="https:\/\/speakoutmentalhealth\.org\/auth\.html"/u);
  assert.doesNotMatch(source,/canonical[^>]+#school/u);
  assert.doesNotMatch(source,/http-equiv="refresh"/u);
  for(const key of ["utm_source","utm_medium","utm_campaign","utm_content","utm_term"]){
    assert.match(source,new RegExp(key),key);
  }
  assert.match(source,/target\.hash = "school"/u);
  assert.match(source,/window\.location\.replace\(target\.href\)/u);
});
