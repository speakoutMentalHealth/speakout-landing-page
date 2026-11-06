import {readFileSync} from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
test("Tell My Story collection is visible in SpeakOut TV home routing",()=>{
  const home=read("tv.html");
  const controller=read("js/speakout-tv.js");
  assert.match(home,/id="tell-my-story"/);
  assert.match(home,/href="pages\/tell-my-story\.html"/);
  assert.match(home,/css\/tv\/tell-my-story\.css/);
  assert.match(controller,/home:\[[^\]]*"tell-my-story"/);
});
test("Dedicated page links to verified Tell My Story source and SHIFT",()=>{
  const page=read("pages/tell-my-story.html");
  assert.match(page,/https:\/\/www\.tellmystory\.org\//);
  assert.match(page,/https:\/\/www\.tellmystory\.org\/films\/shift/);
  assert.match(page,/SHIFT: Do What Moves You/);
  assert.match(page,/id="tmsContentGrid"/);
  assert.match(page,/images\/tell-my-story-logo\.png/);
  assert.match(page,/js\/tell-my-story-page\.js/);
  assert.doesNotMatch(page,/<iframe\b/i,"Never embed a full documentary without approved rights.");
});
test("Published Tell My Story metadata feeds collection safely",()=>{
  const content=read("js/tell-my-story-page.js");
  assert.match(content,/loadTvEpisodes/);
  assert.match(content,/tell-my-story/);
  assert.match(content,/published/);
  assert.match(content,/document\.createElement/);
  assert.match(content,/textContent/);
  assert.match(content,/encodeURIComponent\(item\.id\)/);
  assert.doesNotMatch(content,/innerHTML\s*=/);
});
test("Storytelling page includes ethical media notice",()=>{
  const page=read("pages/tell-my-story.html");
  assert.match(page,/informed consent/i);
  assert.match(page,/private support conversations are never recorded/i);
});
