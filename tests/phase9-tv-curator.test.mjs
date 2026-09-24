import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { curatorSourceInput, matchesCuratorSource, normalizeKeywordList } from "../workers/platform-api/src/tv-curator.js";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("curator keyword filters are bounded deterministic and case-insensitive",()=>{
  assert.deepEqual(normalizeKeywordList(" Motivation, resilience, motivation "),["Motivation","resilience"]);
  assert.equal(matchesCuratorSource({title:"Build confidence when life feels hard",description:""},{
    includeKeywords:["confidence","purpose"],excludeKeywords:["giveaway"]
  }),true);
  assert.equal(matchesCuratorSource({title:"Confidence giveaway",description:""},{
    includeKeywords:["confidence"],excludeKeywords:["giveaway"]
  }),false);
});

test("curator source input defaults to review-only and normalizes safe settings",()=>{
  const source=curatorSourceInput({channelRef:" @Creator ",includeKeywords:"motivation, resilience"});
  assert.equal(source.channelRef,"@Creator");
  assert.equal(source.mode,"review");
  assert.equal(source.status,"active");
  assert.equal(source.show,"SpeakOut Picks");
  assert.equal(source.contentPillar,"motivation");
  assert.deepEqual(source.includeKeywords,["motivation","resilience"]);
});

test("YouTube curator is server-side and never exposes the API key to browser code",()=>{
  const worker=read("workers/platform-api/src/index.js");
  const client=read("js/platform-api.js");
  const admin=read("js/tv-curator-admin.js");
  const config=JSON.parse(read("workers/platform-api/wrangler.production.jsonc"));
  assert.ok(!config.secrets.required.includes("YOUTUBE_API_KEY"));
  assert.match(worker,/configured: Boolean\(clean\(env\.YOUTUBE_API_KEY\)\)/u);
  assert.match(worker,/env\.YOUTUBE_API_KEY/u);
  assert.match(worker,/\/v1\/admin\/tv-curator\/sync/u);
  assert.match(worker,/scheduled\(_controller, env, ctx\)/u);
  assert.doesNotMatch(client,/YOUTUBE_API_KEY/u);
  assert.doesNotMatch(admin,/YOUTUBE_API_KEY\s*[:=]/u);
});

test("curator automation creates drafts only and preserves creator attribution",()=>{
  const worker=read("workers/platform-api/src/index.js");
  assert.match(worker,/status: "draft"/u);
  assert.match(worker,/homePlacement: "library_only"/u);
  assert.match(worker,/editorialReview: "pending"/u);
  assert.match(worker,/sourceType: "youtube-curated"/u);
  assert.match(worker,/sourceAttribution: "YouTube · "/u);
  assert.doesNotMatch(worker,/sourceType: "youtube-curated"[\s\S]{0,900}status: "published"/u);
});

test("curator excludes made-for-kids and non-embeddable YouTube videos",()=>{
  const helper=read("workers/platform-api/src/tv-curator.js");
  const worker=read("workers/platform-api/src/index.js");
  assert.match(helper,/status\.privacyStatus==="public"/u);
  assert.match(helper,/status\.embeddable!==false/u);
  assert.match(helper,/status\.madeForKids!==true/u);
  assert.match(worker,/Made-for-kids channels are not supported/u);
});

test("curator admin exposes source registry candidate inbox and draft review actions",()=>{
  const page=read("admin-tv-curator.html");
  const script=read("js/tv-curator-admin.js");
  assert.match(page,/id="sourceForm"/u);
  assert.match(page,/id="candidateInbox"/u);
  assert.match(page,/Automatically create a draft/u);
  assert.match(page,/Nothing from an external creator is published automatically/u);
  assert.match(script,/adminApi\.syncTvCurator/u);
  assert.match(script,/reviewTvCuratorCandidate\(id,decision\)/u);
  assert.match(script,/Send to drafts/u);
});

test("public TV surfaces visibly identify curated YouTube creators",()=>{
  const worker=read("workers/platform-api/src/index.js");
  const home=read("js/speakout-tv.js");
  const search=read("js/tv-search.js");
  const watch=read("js/tv-watch.js");
  assert.match(worker,/sourceChannelTitle/u);
  assert.match(home,/YouTube · /u);
  assert.match(search,/tv-source-attribution/u);
  assert.match(watch,/Curated by SpeakOut/u);
});


test("curator refreshes stored YouTube metadata before the 30-day policy window",()=>{
  const worker=read("workers/platform-api/src/index.js");
  const helper=read("workers/platform-api/src/tv-curator.js");
  const production=JSON.parse(read("workers/platform-api/wrangler.production.jsonc"));
  assert.match(helper,/export async function fetchYouTubeVideosByIds/u);
  assert.match(worker,/Date\.now\(\) - 20\*24\*60\*60\*1000/u);
  assert.match(worker,/refreshStoredYouTubeMetadata/u);
  assert.match(worker,/youtubeMetadataRefreshedAt/u);
  assert.match(worker,/metadataExpired[^\n]+30\*24\*60\*60\*1000/u);
  assert.match(worker,/status: "unavailable"/u);
  assert.match(worker,/status: "hidden"/u);
  assert.deepEqual(production.triggers.crons,["17 */6 * * *"]);
});

test("curator refresh preserves editor-owned display metadata after TV Studio edits",()=>{
  const worker=read("workers/platform-api/src/index.js");
  assert.match(worker,/curatorManagedMetadata: false/u);
  assert.match(worker,/const managed = op\.item\.curatorManagedMetadata !== false/u);
  assert.match(worker,/sourceTitle: video\.title/u);
  assert.match(worker,/sourceDescription: video\.description/u);
  assert.match(worker,/sourceThumbnailUrl: video\.thumbnailUrl/u);
});

test("SpeakOut TV publishes a YouTube services and privacy disclosure",()=>{
  const privacy=read("tv-privacy.html");
  assert.match(privacy,/YouTube API Services/u);
  assert.match(privacy,/YouTube Terms of Service/u);
  assert.match(privacy,/Google Privacy Policy/u);
  assert.match(privacy,/does not download or re-upload/u);
  for(const page of ["tv.html","radio.html","tv-search.html","watch.html","show.html"]){
    assert.match(read(page),/href="tv-privacy\.html"/u,page);
  }
});
