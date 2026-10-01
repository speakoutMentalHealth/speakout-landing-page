import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { curatorDiscoveryInput, curatorSourceInput, matchesAfricaLearningRelevance } from "../workers/platform-api/src/tv-curator.js";

const root=new URL("../",import.meta.url);
const read=path=>readFileSync(new URL(path,root),"utf8");

test("Africa learning discovery defaults are bounded and region-aware",()=>{
  const course=curatorDiscoveryInput({learningType:"course",regionFocus:"nigeria",query:"public health course"});
  const book=curatorSourceInput({channelRef:"@EducationAfrica",learningType:"audiobook",regionFocus:"africa"});
  assert.equal(course.learningType,"course");
  assert.equal(course.regionFocus,"nigeria");
  assert.equal(book.learningType,"audiobook");
  assert.equal(book.regionFocus,"africa");
  assert.equal(matchesAfricaLearningRelevance({title:"Public Health in Nigeria",description:"lecture"} ,course),true);
  assert.equal(matchesAfricaLearningRelevance({title:"Generic lecture",description:"unrelated geography"} ,course),false);
});

test("YouTube learning searches stay embeddable and Nigeria-viewable",()=>{
  const helper=read("workers/platform-api/src/tv-curator.js");
  assert.match(helper,/videoEmbeddable:"true"/u);
  assert.match(helper,/regionCode:"NG"/u);
  assert.match(helper,/learningType\(rule\.learningType\)==="audiobook"\?\{videoDuration:"long"\}/u);
  assert.match(helper,/matchesAfricaLearningRelevance/u);
});

test("Worker seeds Nigeria and Africa learning discovery rules and preserves metadata",()=>{
  const worker=read("workers/platform-api/src/index.js");
  assert.match(worker,/AFRICA_LEARNING_DISCOVERIES/u);
  assert.match(worker,/Nigeria & Africa Crash Courses/u);
  assert.match(worker,/Africa Educational Audiobooks/u);
  assert.match(worker,/africaLearningDiscoveryBootstrap/u);
  assert.match(worker,/learningType/u);
  assert.match(worker,/regionFocus/u);
  assert.match(worker,/ensureAfricaLearningDiscoveries/u);
  assert.match(worker,/ensureAfricaLearningDiscoveryTuningV2/u);
  assert.match(worker,/africaLearningDiscoveryTuningV2/u);
  assert.match(worker,/Nigeria education tutorial lecture students/u);
  assert.match(worker,/Africa audiobook history education/u);
  assert.match(worker,/maxResults: 25/u);
});

test("TV Studio and Curator expose learning type and regional focus controls",()=>{
  const studio=read("admin-tv.html");
  const curator=read("admin-tv-curator.html");
  const admin=read("js/tv-curator-admin.js");
  for(const id of ["learningType","regionFocus"]) assert.match(studio,new RegExp(`id="${id}"`,"u"),id);
  for(const id of ["sourceLearningType","sourceRegionFocus","discoveryLearningType","discoveryRegionFocus"]) {
    assert.match(curator,new RegExp(`id="${id}"`,"u"),id);
  }
  assert.match(admin,/learningType/u);
  assert.match(admin,/regionFocus/u);
});

test("SpeakOut TV exposes Africa-focused crash course and audiobook rails",()=>{
  const page=read("tv.html");
  const home=read("js/speakout-tv.js");
  const search=read("js/tv-search.js");
  assert.match(page,/id="courses"/u);
  assert.match(page,/id="coursesRail"/u);
  assert.match(page,/id="books"/u);
  assert.match(page,/id="booksRail"/u);
  assert.match(page,/LEARN · NIGERIA & AFRICA/u);
  assert.match(page,/LISTEN & LEARN · AFRICA/u);
  assert.match(home,/function renderLearningSections/u);
  assert.match(home,/learningType/u);
  assert.match(home,/CRASH COURSE/u);
  assert.match(home,/BOOK \/ AUDIOBOOK/u);
  assert.match(search,/x\.learningType/u);
  assert.match(search,/x\.regionFocus/u);
});
