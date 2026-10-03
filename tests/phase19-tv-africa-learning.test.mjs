import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { curatorDiscoveryInput, curatorSourceInput, matchesLearningRegion } from "../workers/platform-api/src/tv-curator.js";

const root=new URL("../",import.meta.url);
const read=path=>readFileSync(new URL(path,root),"utf8");

test("learning discovery is global by default while regional rules remain enforceable",()=>{
  const globalCourse=curatorDiscoveryInput({learningType:"course",learningCategory:"ai_ml",query:"AI course"});
  const nigeriaCourse=curatorDiscoveryInput({learningType:"course",learningCategory:"medicine_health",regionFocus:"nigeria",query:"medical course"});
  const book=curatorSourceInput({channelRef:"@Publisher",learningType:"audiobook",learningCategory:"personal_development"});
  assert.equal(globalCourse.regionFocus,"global");
  assert.equal(globalCourse.learningCategory,"ai_ml");
  assert.equal(globalCourse.searchOrder,"relevance");
  assert.equal(book.regionFocus,"global");
  assert.equal(book.bookRights,"review_required");
  assert.equal(matchesLearningRegion({title:"Generic global AI course",description:"lecture"},globalCourse),true);
  assert.equal(matchesLearningRegion({title:"Medical lecture for Nigerian students",description:"Nigeria"},nigeriaCourse),true);
  assert.equal(matchesLearningRegion({title:"Generic medical lecture",description:"unrelated geography"},nigeriaCourse),false);
});

test("learning searches support evergreen relevance while regional Nigeria searches keep NG context",()=>{
  const helper=read("workers/platform-api/src/tv-curator.js");
  assert.match(helper,/lookbackDays>0\?/u);
  assert.match(helper,/searchOrder\(rule\.searchOrder/u);
  assert.match(helper,/region==="nigeria"\?\{regionCode:"NG"\}/u);
  assert.match(helper,/type==="audiobook"\?\{videoDuration:"long"\}/u);
  assert.match(helper,/videoEmbeddable:"true"/u);
  assert.match(helper,/matchesLearningRegion/u);
});

test("Worker seeds a global multi-field learning library and keeps Africa picks separate",()=>{
  const worker=read("workers/platform-api/src/index.js");
  assert.match(worker,/GLOBAL_LEARNING_DISCOVERIES/u);
  for(const label of [
    "Medicine & Health Sciences","Nursing & Public Health","AI & Machine Learning",
    "ICT, Programming & Cybersecurity","Business & Entrepreneurship","Research & Academic Skills",
    "Career, Leadership & Communication","Motivational & Personal Development Audiobooks"
  ]) assert.ok(worker.includes(label),label);
  assert.match(worker,/AFRICA_LEARNING_DISCOVERIES/u);
  assert.match(worker,/globalLearningDiscoveryBootstrap/u);
  assert.match(worker,/learningDiscoveryArchitectureV3/u);
  assert.match(worker,/learningDiscoveryQualityV4/u);
  assert.match(worker,/MAX_ACTIVE_DISCOVERIES = 16/u);
  assert.match(worker,/lookbackDays: 0/u);
  assert.match(worker,/searchOrder: "relevance"/u);
});

test("learning discovery quality V4 suppresses noisy course and audiobook results",()=>{
  const worker=read("workers/platform-api/src/index.js");
  const helper=read("workers/platform-api/src/tv-curator.js");
  assert.match(worker,/learningDiscoveryQualityV4/u);
  assert.match(worker,/qualityVersion: 4/u);
  assert.match(worker,/public health nursing lecture tutorial course community health/u);
  assert.match(worker,/day in the life/u);
  assert.match(worker,/leadership communication skills training course students/u);
  assert.match(worker,/resume/u);
  assert.match(worker,/official audiobook author publisher public domain personal development/u);
  assert.match(worker,/audiobook rise/u);
  assert.match(worker,/leadership mastery/u);
  assert.match(worker,/Africa public domain audiobook history biography LibriVox/u);
  assert.match(worker,/golden library/u);
  assert.match(helper,/video\.channelTitle/u);
});

test("TV publishing requires explicit rights verification for full audiobooks",()=>{
  const worker=read("workers/platform-api/src/index.js");
  assert.match(worker,/bookRights/u);
  assert.match(worker,/official_author/u);
  assert.match(worker,/official_publisher/u);
  assert.match(worker,/public_domain/u);
  assert.match(worker,/licensed/u);
  assert.match(worker,/Publishing a full audiobook requires a verified official, licensed or public-domain source/u);
  assert.match(worker,/fullAudiobookTitle/u);
  assert.match(worker,/Content labeled as a full audiobook must use Audiobook \/ listen & learn so rights verification cannot be bypassed/u);
  assert.match(worker,/learningCategory/u);
});

test("TV Studio and Curator expose learning categories global region and audiobook rights",()=>{
  const studio=read("admin-tv.html");
  const curator=read("admin-tv-curator.html");
  const admin=read("js/tv-curator-admin.js");
  for(const id of ["learningType","learningCategory","regionFocus","bookRights"]) assert.match(studio,new RegExp(`id="${id}"`,"u"),id);
  for(const id of [
    "sourceLearningType","sourceLearningCategory","sourceRegionFocus","sourceBookRights",
    "discoveryLearningType","discoveryLearningCategory","discoveryRegionFocus","discoveryBookRights","discoverySearchOrder"
  ]) assert.match(curator,new RegExp(`id="${id}"`,"u"),id);
  assert.match(admin,/learningCategory/u);
  assert.match(admin,/bookRights/u);
  assert.match(admin,/searchOrder/u);
});

test("TV Studio explains audiobook Go Live blockers before submission",()=>{
  const studio=read("admin-tv.html");
  const script=read("js/tv-admin-live.js");
  const styles=read("css/tv-admin-premium.css");
  assert.match(studio,/id="bookRightsField" hidden/u);
  assert.match(studio,/data-readiness="rights"/u);
  assert.match(studio,/id="audiobookReadinessHelp"/u);
  assert.match(script,/const audiobook = learningType\?\.value === "audiobook"/u);
  assert.match(script,/const rightsOk = !audiobook \|\| verifiedBookRights/u);
  assert.match(script,/\["official_author","official_publisher","public_domain","licensed"\]/u);
  assert.match(script,/Audiobook needs source verification/u);
  assert.match(script,/Cannot publish audiobook yet/u);
  assert.match(script,/bookRights\?\.focus\(\)/u);
  assert.match(script,/bookRightsField\.hidden = !state\.audiobook/u);
  assert.match(script,/learningType\.value !== "audiobook"/u);
  assert.match(script,/bookRights\.value = "not_applicable"/u);
  assert.match(styles,/\.tv-admin label\.publishing-blocker/u);
  assert.match(styles,/\.audiobook-readiness-help/u);
});

test("SpeakOut TV presents global courses books and a separate Nigeria Africa collection",()=>{
  const page=read("tv.html");
  const home=read("js/speakout-tv.js");
  const searchPage=read("tv-search.html");
  const search=read("js/tv-search.js");
  assert.match(page,/id="courses"/u);
  assert.match(page,/LEARN ON YOUTUBE/u);
  assert.match(page,/Medicine & Health/u);
  assert.match(page,/AI & Machine Learning/u);
  assert.match(page,/ICT & Coding/u);
  assert.match(page,/id="books"/u);
  assert.match(page,/LISTEN & LEARN/u);
  assert.match(page,/id="regional-learning"/u);
  assert.match(page,/Nigeria & Africa Picks/u);
  assert.match(home,/function renderLearningSections/u);
  assert.match(home,/learningCategoryLabel/u);
  assert.match(home,/regionalLearningRail/u);
  assert.match(searchPage,/data-topic="medicine health"/u);
  assert.match(searchPage,/data-topic="artificial intelligence machine learning"/u);
  assert.match(search,/x\.learningCategory/u);
  assert.match(search,/x\.bookRights/u);
});
