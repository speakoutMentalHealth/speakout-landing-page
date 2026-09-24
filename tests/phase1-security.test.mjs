import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("ordinary profile updates cannot change protected authorization fields", () => {
  const rules = read("firebase/firestore.rules");
  const editableBlock = rules.match(/function onlyEditableProfileFieldsChanged\(\)[\s\S]*?\n    \}/u)?.[0] || "";
  for (const protectedField of ["role", "status", "approved", "schoolId", "schoolCode", "email"]) {
    assert.equal(editableBlock.includes(`"${protectedField}"`), false, `${protectedField} must remain protected`);
  }
  assert.match(rules, /request\.auth\.uid == userId &&\s*onlyEditableProfileFieldsChanged\(\)/u);
});

test("new browser accounts must be pending and non-admin", () => {
  const rules = read("firebase/firestore.rules");
  assert.match(rules, /request\.resource\.data\.status == "pending"/u);
  assert.match(rules, /request\.resource\.data\.approved == false/u);
  assert.doesNotMatch(rules.match(/function isPublicRole[\s\S]*?\n    \}/u)?.[0] || "", /"admin"|"super_admin"/u);
});

test("authoritative progress and certificates reject learner writes", () => {
  const rules = read("firebase/firestore.rules");
  const progress = rules.match(/match \/userProgress[\s\S]*?match \/readingProgress/u)?.[0] || "";
  const certificates = rules.match(/match \/certificates[\s\S]*?match \/publicCertificateVerifications/u)?.[0] || "";
  assert.match(progress, /allow write: if isSuperAdmin\(\)/u);
  assert.match(certificates, /allow create, update, delete: if isSuperAdmin\(\)/u);
});

test("primary course player contains no browser-side grading or certificate writes", () => {
  const player = read("course-player.html");
  assert.doesNotMatch(player, /q\.answer|correctAnswer/u);
  assert.doesNotMatch(player, /setDoc\(doc\(db,"(?:userProgress|certificates)"/u);
  assert.match(player, /learningApi\.submitAssessment/u);
  assert.match(player, /learningApi\.completeLesson/u);
});

test("Firebase deployment config does not deploy Cloud Functions", () => {
  const config = JSON.parse(read("firebase.json"));
  assert.equal("functions" in config, false);
  assert.equal(config.hosting.public, ".");
  assert.ok(config.hosting.ignore.includes("functions/**"));
  assert.ok(config.hosting.ignore.includes("workers/**"));
});

test("privileged Worker writes use Firestore transactions", () => {
  const worker = read("workers/platform-api/src/index.js");
  assert.doesNotMatch(worker, /method:\s*["']PATCH["']/u);
  assert.doesNotMatch(worker, /setDocument/u);
  assert.match(worker, /documents:beginTransaction/u);
  assert.match(worker, /documents:commit/u);
  assert.match(worker, /firestoreStatus !== "ABORTED"/u);
  assert.match(worker, /name: `\$\{databaseName\(env\)\}\/documents\/\$\{path\}`/u);
  assert.ok((worker.match(/return runTransaction\(/gu) || []).length >= 4);
});

test("protected evidence is authenticated and proxied without exposing a signed URL", () => {
  const worker = read("workers/platform-api/src/index.js");
  const client = read("js/platform-api.js");
  assert.match(worker, /type=authenticated/u);
  assert.match(worker, /\$\{resourceType\}\/authenticated\/s--\$\{signature\}--/u);
  assert.match(worker, /cache-control": "private, no-store/u);
  assert.doesNotMatch(worker, /return\s+\{[^}]*signedUrl/u);
  assert.match(client, /\/v1\/admin\/media\/evidence/u);
  assert.match(client, /return response\.blob\(\)/u);
  const reviewPage = read("admin-external-certificates.html");
  assert.doesNotMatch(reviewPage, /src="\$\{item\.proofData\}"/u);
  assert.match(reviewPage, /Legacy evidence is blocked from direct display/u);
});

test("staging Worker declares every required secret", () => {
  const config = JSON.parse(read("workers/platform-api/wrangler.staging.jsonc"));
  assert.deepEqual(config.secrets.required.sort(), [
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
    "CLOUDINARY_CLOUD_NAME",
    "FIREBASE_CLIENT_EMAIL",
    "FIREBASE_PRIVATE_KEY",
    "RESEND_API_KEY"
  ]);
  assert.equal(config.vars.FIREBASE_PROJECT_ID, "speakout-portal-staging");
});

test("homepage CMS writes use the whitelisted admin Worker API", () => {
  const worker = read("workers/platform-api/src/index.js");
  const client = read("js/platform-api.js");
  const controller = read("js/admin-cms-ui.js");
  const pages = [
    "admin-impact.html",
    "admin-media.html",
    "admin-partners.html",
    "admin-podcast.html",
    "admin-reports.html",
    "admin-videos.html"
  ];
  for (const collectionName of [
    "homepageStats",
    "homepageMedia",
    "homepagePartners",
    "homepagePodcasts",
    "homepageReports",
    "homepageVideos"
  ]) assert.match(worker, new RegExp(`${collectionName}: \\[`, "u"));
  assert.match(worker, /Object\.hasOwn\(CMS_COLLECTION_FIELDS, collectionName\)/u);
  assert.match(worker, /\/v1\/admin\/content\/upsert/u);
  assert.match(worker, /\/v1\/admin\/content\/status/u);
  assert.match(worker, /\/v1\/admin\/content\/delete/u);
  assert.match(worker, /delete: path => writes\.push\(documentDelete\(env, path\)\)/u);
  assert.match(client, /upsertContent:/u);
  assert.match(client, /setContentStatus:/u);
  assert.match(client, /deleteContent:/u);
  assert.match(controller, /adminApi\.upsertContent\(collectionName, editingId, payload\)/u);
  assert.match(controller, /adminApi\.setContentStatus\(collectionName, button\.dataset\.hide, "hidden"\)/u);
  assert.match(controller, /adminApi\.deleteContent\(collectionName, button\.dataset\.del\)/u);
  for (const file of pages) {
    const page = read(file);
    assert.match(page, /import \{ createAdminCmsController \} from "\.\/js\/admin-cms-ui\.js"/u, file);
    assert.match(page, /createAdminCmsController\(\{ collectionName:/u, file);
    assert.doesNotMatch(page, /\b(?:addDoc|updateDoc|deleteDoc|serverTimestamp)\b/u, file);
  }
});

test("homepage CMS provides accessible responsive editing feedback", () => {
  const controller = read("js/admin-cms-ui.js");
  const styles = read("css/admin-cms.css");
  assert.match(controller, /setAttribute\("aria-live", "polite"\)/u);
  assert.match(controller, /recordCount/u);
  assert.match(controller, /Cancel edit/u);
  assert.match(controller, /aria-label="Edit/u);
  assert.match(controller, /This cannot be undone/u);
  assert.match(controller, /setAttribute\("aria-busy"/u);
  assert.match(styles, /@media\(max-width:900px\)/u);
  assert.match(styles, /\.table thead\{display:none\}/u);
  for (const file of ["admin-impact.html", "admin-media.html", "admin-partners.html", "admin-podcast.html", "admin-reports.html", "admin-videos.html"]) {
    assert.match(read(file), /css\/admin-cms\.css/u, file);
  }
});


test("TV and Radio CMS collections are allowed by the secure Worker", () => {
  const worker = read("workers/platform-api/src/index.js");
  for (const collectionName of ["tvEpisodes", "tvAudio", "tvShows"]) {
    assert.match(worker, new RegExp(`${collectionName}: \\[`, "u"));
  }
  assert.match(worker, /"published"/u);
  const tvAdmin = read("admin-tv.html");
  assert.match(tvAdmin, /collectionName:"tvEpisodes"/u);
  assert.doesNotMatch(tvAdmin, /css\/portal-ui\.css/u);
  assert.doesNotMatch(tvAdmin, /css\/production-ready\.css/u);
});

test("TV Studio supports common YouTube share and live URLs", () => {
  const script = read("js/tv-admin-live.js");
  assert.match(script, /youtu\.be/u);
  assert.match(script, /youtube\.com/u);
  assert.match(script, /live\|embed\|shorts/u);
  assert.match(script, /youtube-nocookie\.com\/embed/u);
  assert.match(script, /oembed/u);
});


test("TV CMS validates media providers and minor publication safeguards", () => {
  const worker = read("workers/platform-api/src/index.js");
  assert.match(worker, /Use a supported YouTube, Vimeo or Twitch URL/u);
  assert.match(worker, /Published TV content requires completed editorial review/u);
  assert.match(worker, /Published content involving a minor requires confirmed consent/u);
  assert.match(worker, /collectionName === "tvAudio"/u);
});


test("SpeakOut TV offline fallback only returns the TV document for navigation requests", () => {
  const sw = read("tv-sw.js");
  assert.match(sw, /event\.request\.mode==="navigate"/u);
  assert.match(sw, /return caches\.match\("\.\/tv\.html"\)/u);
  assert.match(sw, /return Response\.error\(\)/u);
  assert.doesNotMatch(sw, /r\|\|caches\.match\("\.\/tv\.html"\)/u);
});

test("episode watch page supports contextual discovery and on-device My List", () => {
  const page = read("watch.html");
  const script = read("js/tv-watch.js");
  assert.match(page, /id="watchPlayer"/u);
  assert.match(page, /id="saveEpisode"/u);
  assert.match(page, /id="relatedRail"/u);
  assert.match(page, /id="upNextSection"/u);
  assert.match(script, /speakout-tv-shelf-v1/u);
  assert.match(script, /navigator\.share/u);
  assert.match(script, /youtube-nocookie\.com\/embed/u);
  assert.match(script, /relevance\(current,candidate\)/u);
  assert.match(script, /VideoObject/u);
});

test("series archive episodes use the dedicated episode page", () => {
  const script = read("js/tv-show.js");
  assert.match(script, /const watchHref=x=>"watch\.html\?id="/u);
  assert.doesNotMatch(script, /archive-"\)\?"tv\.html\?episode=/u);
});


test("SpeakOut TV final viewer journey keeps navigation and interactions consistent", () => {
  const home = read("tv.html");
  const show = read("show.html");
  const watch = read("watch.html");
  const search = read("tv-search.html");
  const script = read("js/speakout-tv.js");
  const radio = read("js/speakout-radio.js");
  const discovery = read("js/tv-search.js");
  const styles = read("css/tv/base.css");
  const sw = read("tv-sw.js");

  assert.match(home, /href="radio\.html"/u);
  for (const page of [show, watch, search]) assert.match(page, /href="radio\.html"/u);
  assert.match(home, /data-view="home"/u);
  assert.match(home, /data-view="watch"/u);
  assert.match(home, /data-view="live"/u);

  assert.match(script, /\$\$\("\.ios-episode-card,\.youth-content-card"\)\.forEach/u);
  assert.match(script, /closest\("\.youth-nav a\[data-view\]"\)/u);
  assert.match(script, /preferredScrollBehavior/u);
  assert.match(radio, /preferredScrollBehavior/u);
  assert.match(discovery, /preferredScrollBehavior/u);

  assert.match(styles, /:focus-visible/u);
  assert.match(styles, /prefers-reduced-motion:reduce/u);
  assert.match(sw, /speakout-tv-v9/u);
});

test("SpeakOut TV browser modules pass JavaScript syntax checks", () => {
  for (const file of [
    "js/speakout-tv.js",
    "js/speakout-radio.js",
    "js/tv-search.js",
    "js/tv-show.js",
    "js/tv-watch.js",
    "js/tv-art.js",
    "js/tv-data.js"
  ]) {
    const path=fileURLToPath(new URL(`../${file}`, import.meta.url));
    assert.doesNotThrow(() => execFileSync(process.execPath, ["--check", path], { stdio: "pipe" }), file);
  }
});

test("SpeakOut TV discovery preserves selected audio and live destinations", () => {
  const search = read("js/tv-search.js");
  const tv = read("js/speakout-tv.js");
  assert.match(search, /radio\.html\?audio=/u);
  assert.match(search, /tv\.html\?live=/u);
  assert.match(tv, /new URLSearchParams\(location\.search\)\.get\("live"\)/u);
  assert.match(tv, /status\.textContent="Replay"/u);
});

test("SpeakOut TV discovery filters expose current tab state", () => {
  const page = read("tv-search.html");
  const script = read("js/tv-search.js");
  assert.match(page, /role="tab" aria-selected="true" data-filter="all"/u);
  assert.ok((page.match(/role="tab"/gu) || []).length >= 5);
  assert.match(script, /setAttribute\("aria-selected",String\(active\)\)/u);
});

test("SpeakOut TV defers heavy media on the home experience", () => {
  const page = read("tv.html");
  const script = read("js/speakout-tv.js");
  assert.doesNotMatch(page, /id="audioPlayer"><iframe/u);
  assert.match(page, /tv-audio-placeholder/u);
  assert.match(script, /renderEpisodePreview/u);
  assert.match(script, /currentEpisode=first/u);
  assert.match(script, /chosen==="watch"/u);
});

test("SpeakOut TV direct-entry pages share metadata and PWA setup", () => {
  for (const file of ["watch.html", "show.html", "tv-search.html", "radio.html"]) {
    const page = read(file);
    assert.match(page, /rel="canonical"/u, file);
    assert.match(page, /serviceWorker\.register\("tv-sw\.js"\)/u, file);
  }
  for (const file of ["watch.html", "show.html", "tv-search.html"]) {
    const page = read(file);
    assert.match(page, /rel="manifest" href="tv\.webmanifest"/u, file);
    assert.match(page, /rel="apple-touch-icon" href="images\/logo\.png"/u, file);
  }
});

test("SpeakOut TV service worker pre-caches local interaction scripts", () => {
  const sw=read("tv-sw.js");
  for (const asset of [
    "./js/speakout-tv.js",
    "./js/speakout-radio.js",
    "./js/tv-search.js",
    "./js/tv-show.js",
    "./js/tv-watch.js",
    "./firebase-config.js"
  ]) assert.ok(sw.includes(asset), asset);
  assert.match(sw, /event\.request\.mode==="navigate"/u);
  assert.match(sw, /return Response\.error\(\)/u);
});


test("SpeakOut TV bottom navigation updates every tab safely", () => {
  const script=read("js/speakout-tv.js");
  assert.match(script, /\$\$\("\.youth-nav a"\)\.forEach/u);
  assert.doesNotMatch(script, /(?<!\$)\$\("\.youth-nav a"\)\.forEach/u);
});


test("SpeakOut TV daily content engine stays privacy-respecting and editorially driven", () => {
  const page=read("tv.html");
  const script=read("js/speakout-tv.js");
  assert.match(page, /id="today-focus"/u);
  assert.match(page, /id="topic-journeys"/u);
  assert.match(page, /id="fresh"/u);
  assert.match(page, /Pick something for me/u);
  assert.match(script, /const dailyProgramming=/u);
  assert.match(script, /function diverseItems/u);
  assert.match(script, /function renderDailyProgramming/u);
  assert.match(script, /function renderFresh/u);
  assert.match(script, /function pickFeatured/u);
  assert.match(script, /featured===true/u);
  assert.match(script, /localStorage\.getItem\(shelfKey\)/u);
  assert.doesNotMatch(script, /localStorage\.setItem\([^)]*(?:mood|topic|stress|adhd)/iu);
});

test("SpeakOut TV content engine preserves safe multi-tab navigation", () => {
  const script=read("js/speakout-tv.js");
  assert.match(script, /\$\$\("\.youth-nav a"\)\.forEach/u);
  assert.doesNotMatch(script, /(?<!\$)\$\("\.youth-nav a"\)\.forEach/u);
  assert.match(script, /today-focus/u);
  assert.match(script, /topic-journeys/u);
});


test("TV Studio Editorial Control 2.0 is draft-first and exposes placement controls", () => {
  const page=read("admin-tv.html");
  const script=read("js/tv-admin-live.js");
  const styles=read("css/tv-admin-premium.css");
  assert.match(page, /TV STUDIO · EDITORIAL \+ INTELLIGENCE/u);
  assert.match(page, /<option value="draft" selected>/u);
  for (const id of ["homePlacement","contentPillar","audience","editorialReview","readinessPanel"]) {
    assert.match(page, new RegExp(`id="${id}"`, "u"), id);
  }
  assert.match(script, /function readinessState/u);
  assert.match(script, /\["published","active"\]\.includes\(status\?\.value\)/u);
  assert.match(script, /event\.stopImmediatePropagation\(\)/u);
  assert.match(styles, /\.readiness-panel/u);
});

test("secure TV CMS validates editorial metadata and review before publishing", () => {
  const worker=read("workers/platform-api/src/index.js");
  for (const field of ["homePlacement","contentPillar","audience"]) assert.match(worker, new RegExp(field, "u"));
  assert.match(worker, /\["auto", "featured", "daily", "library_only"\]/u);
  assert.match(worker, /Published TV content requires completed editorial review/u);
  assert.match(worker, /Published content involving a minor requires confirmed consent/u);
});

test("SpeakOut TV discovery honors editorial homepage placement", () => {
  const script=read("js/speakout-tv.js");
  assert.match(script, /const placementOf=/u);
  assert.match(script, /const discoveryEligible=/u);
  assert.match(script, /activePlacement\(x,"daily"\)/u);
  assert.match(script, /activePlacement\(x,"featured"\)/u);
  assert.match(script, /placementOf\(x\)!=="library_only"/u);
});

test("TV Studio helper script passes JavaScript syntax checks", () => {
  const path=fileURLToPath(new URL("../js/tv-admin-live.js", import.meta.url));
  assert.doesNotThrow(() => execFileSync(process.execPath, ["--check", path], { stdio: "pipe" }));
});


test("TV Studio editorial dashboard surfaces publishing quality metrics", () => {
  const page=read("admin-tv.html");
  const script=read("js/tv-admin-live.js");
  const styles=read("css/tv-admin-premium.css");
  for (const id of ["editorialDesk","featuredCount","reviewCount","readyEditorialCount","attentionEditorialCount","scheduledEditorialCount"]) {
    assert.match(page,new RegExp(`id="${id}"`,"u"),id);
  }
  assert.match(page,/type="module" src="js\/tv-admin-live\.js"/u);
  assert.match(script,/collection\(db,"tvEpisodes"\)/u);
  assert.match(script,/function recordIssues/u);
  assert.match(script,/function refreshEditorialDashboard/u);
  assert.match(styles,/\.editorial-summary-grid/u);
  assert.match(styles,/\.attention-list/u);
});

test("TV Studio client readiness requires useful publishing metadata", () => {
  const script=read("js/tv-admin-live.js");
  assert.match(script,/title\?\.value\.trim\(\)\.length >= 8/u);
  assert.match(script,/description\?\.value\.trim\(\)\.length >= 50/u);
  assert.match(script,/tagCount >= 2/u);
  assert.match(script,/editorialReview\?\.value === "complete"/u);
  assert.match(script,/minorInvolved\?\.value !== "yes" \|\| consentConfirmed\?\.value === "yes"/u);
});

test("TV Studio Programming Schedule 3.0 exposes bounded day and date controls", () => {
  const page=read("admin-tv.html");
  const script=read("js/tv-admin-live.js");
  const worker=read("workers/platform-api/src/index.js");
  for (const id of ["programmingDays","placementPriority","placementStart","placementEnd"]) {
    assert.match(page,new RegExp(`id="${id}"`,"u"),id);
    assert.match(worker,new RegExp(id,"u"),id);
  }
  assert.match(page,/data-readiness="schedule"/u);
  assert.match(script,/function scheduleInputState/u);
  assert.match(script,/function scheduleState/u);
  assert.match(script,/function scheduleLabel/u);
  assert.match(script,/programmingSort/u);
  assert.match(worker,/Invalid TV programming day pattern/u);
  assert.match(worker,/TV placement priority must be a whole number from 0 to 999/u);
  assert.match(worker,/TV placement end date cannot be before the start date/u);
});

test("SpeakOut TV only activates scheduled featured and daily placements in their window", () => {
  const script=read("js/speakout-tv.js");
  assert.match(script,/const programmingDayMatches=/u);
  assert.match(script,/const placementScheduleActive=/u);
  assert.match(script,/const activePlacement=/u);
  assert.match(script,/const editorialPlacementSort=/u);
  assert.match(script,/activePlacement\(x,"daily"\)/u);
  assert.match(script,/activePlacement\(x,"featured"\)/u);
  assert.match(script,/placementPriority\(a\)-placementPriority\(b\)/u);
  assert.match(script,/today<start/u);
  assert.match(script,/today>end/u);
});

test("TV discovery searches editorial metadata and updates all filter tabs safely", () => {
  const script=read("js/tv-search.js");
  assert.match(script,/x\.contentPillar,x\.audience/u);
  assert.ok((script.match(/\$\$\("\[data-filter\]"\)\.forEach/gu)||[]).length >= 2);
  assert.doesNotMatch(script,/(?<!\$)\$\("\[data-filter\]"\)\.forEach/u);
});


test("TV Studio programming preview mirrors editorial homepage controls", () => {
  const page=read("admin-tv.html");
  const script=read("js/tv-admin-live.js");
  const styles=read("css/tv-admin-premium.css");
  for (const id of ["programmingControl","programmingHealth","programmingFeaturedTitle","programmingDailyTitle","programmingLibraryCount","programmingWarnings"]) {
    assert.match(page,new RegExp(`id="${id}"`,"u"),id);
  }
  for (const readiness of ["placement","pillar","audience"]) {
    assert.match(page,new RegExp(`data-readiness="${readiness}"`,"u"),readiness);
  }
  assert.match(script,/const programmingWarnings = \[\]/u);
  assert.match(script,/programmingFeaturedTitle/u);
  assert.match(script,/programmingDailyTitle/u);
  assert.match(script,/programmingLibraryCount/u);
  assert.match(styles,/\.programming-preview-grid/u);
  assert.match(styles,/\.programming-warning-list/u);
});

test("TV Studio keeps Main Stage legacy flag synchronized with placement", () => {
  const script=read("js/tv-admin-live.js");
  assert.match(script,/function syncPlacement\(source = "placement"\)/u);
  assert.match(script,/featured\.value = homePlacement\.value === "featured" \? "true" : "false"/u);
  assert.match(script,/else if \(homePlacement\.value === "featured"\) homePlacement\.value = "auto"/u);
});

test("secure TV publishing enforces the same quality gates as Studio", () => {
  const worker=read("workers/platform-api/src/index.js");
  assert.match(worker,/clear title of at least 8 characters/u);
  assert.match(worker,/useful description of at least 50 characters/u);
  assert.match(worker,/at least two discovery tags/u);
  assert.match(worker,/valid artwork URL/u);
  assert.match(worker,/Live broadcasts use the Live channel and cannot use Main Stage or Today’s Focus placement/u);
});

test("public TV status changes cannot bypass editorial validation", () => {
  const worker=read("workers/platform-api/src/index.js");
  const studio=read("admin-tv.html");
  const script=read("js/tv-admin-live.js");
  assert.match(worker,/const publicTvStatus = \["active", "published"\]\.includes\(status\)/u);
  assert.match(worker,/cmsRecord\(collectionName, \{ \.\.\.existing, status \}\)/u);
  assert.match(studio,/<option value="active">Active — legacy public<\/option>/u);
  assert.match(script,/\["published","active"\]\.includes\(status\?\.value\)/u);
});

test("library-only TV records stay out of Home discovery but remain available in Watch", () => {
  const script=read("js/speakout-tv.js");
  assert.match(script,/const homeEpisodes=regularEpisodes\.filter\(discoveryEligible\)/u);
  assert.match(script,/\$\("#latestRail"\)\.innerHTML=regularEpisodes\.map\(episodeCard\)/u);
  assert.match(script,/\$\("#storiesRail"\)\.innerHTML=homeEpisodes\.filter/u);
  assert.match(script,/const pool=dailyFocusItems\.length\?dailyFocusItems:homePool/u);
  assert.doesNotMatch(script,/homePool\.length\?homePool:regularEpisodes/u);
});


test("SpeakOut TV keeps editorial home content separate from Watch Listen and Live", () => {
  const page=read("tv.html");
  const script=read("js/speakout-tv.js");
  const homeGroup=script.match(/home:\[([^\]]+)\]/u)?.[1] || "";
  for (const id of ["featured","today-focus","for-you","topic-journeys","fresh","shelf","reset","series","stories"]) {
    assert.match(homeGroup,new RegExp(`"${id}"`,"u"),id);
  }
  for (const id of ["episodes","audio","live"]) {
    assert.doesNotMatch(homeGroup,new RegExp(`"${id}"`,"u"),id);
  }
  assert.match(script,/watch:\["episodes"\]/u);
  assert.match(script,/listen:\["audio"\]/u);
  assert.match(script,/live:\["live"\]/u);
  assert.match(page,/href="tv-search\.html"/u);
  assert.doesNotMatch(page,/data-view="discover"/u);
});

test("TV detail pages route Discover to the dedicated discovery page", () => {
  for (const file of ["show.html","watch.html","radio.html"]) {
    const page=read(file);
    assert.match(page,/href="tv-search\.html"/u,file);
    assert.doesNotMatch(page,/href="tv\.html#discover"/u,file);
  }
});


test("SpeakOut TV Series Studio manages published show identity safely", () => {
  const page=read("admin-tv-series.html");
  const script=read("js/tv-series-admin.js");
  const worker=read("workers/platform-api/src/index.js");
  assert.match(page,/collectionName:"tvShows"/u);
  for(const id of ["title","slug","category","description","imageUrl","status","order"]) {
    assert.match(page,new RegExp(`id="${id}"`,"u"),id);
  }
  assert.match(script,/function quality\(\)/u);
  assert.match(script,/Unique slug/u);
  assert.match(script,/status\.value==="published"/u);
  assert.match(worker,/function validatePublicTvShow/u);
  assert.match(worker,/Published TV series requires a valid lowercase URL slug/u);
  assert.match(worker,/Published TV series requires a useful description of at least 40 characters/u);
  assert.match(worker,/Published TV series requires a valid artwork URL/u);
});

test("TV Studio and Audio Studio link to the Series Studio", () => {
  assert.match(read("admin-tv.html"),/href="admin-tv-series\.html"/u);
  assert.match(read("admin-radio.html"),/href="admin-tv-series\.html"/u);
});

test("SpeakOut TV homepage and Discover use managed series ordering", () => {
  const home=read("js/speakout-tv.js");
  const search=read("js/tv-search.js");
  const data=read("js/tv-data.js");
  assert.match(home,/loadTvShows/u);
  assert.match(data,/export async function loadTvShows/u);
  assert.match(home,/defaultSeries/u);
  assert.match(home,/x\.imageUrl\|\|imageFor\(episode\)/u);
  assert.match(search,/shows\.sort/u);
  assert.match(search,/orderValue/u);
});

test("Series Studio browser module passes JavaScript syntax check", () => {
  const path=fileURLToPath(new URL("../js/tv-series-admin.js",import.meta.url));
  assert.doesNotThrow(()=>execFileSync(process.execPath,["--check",path],{stdio:"pipe"}));
});

test("specialized CMS studios receive the latest collection state", () => {
  const controller=read("js/admin-cms-ui.js");
  assert.match(controller,/new CustomEvent\("cms:render"/u);
  assert.match(controller,/collectionName, items: items\.map/u);
  assert.match(controller,/\.side a,\.studio-side a/u);
});


test("SpeakOut TV section tabs switch every matching section and keep media views focused", () => {
  const page=read("tv.html");
  const script=read("js/speakout-tv.js");
  const radio=read("radio.html");
  const base=read("css/tv/base.css");
  const media=read("css/tv/media.css");
  assert.match(script, /\$\$\("\.youth-welcome,\.youth-feature,\.youth-section,\.youth-closing"\)\.forEach/u);
  assert.match(script, /document\.body\.dataset\.tvView=chosen/u);
  assert.match(page, /id="episodes"[\s\S]*?<h2>Watch<\/h2>/u);
  assert.match(page, /id="audio"[\s\S]*?<h2>Audio<\/h2>/u);
  assert.match(page, /id="live"[\s\S]*?<h2>Live<\/h2>/u);
  assert.match(radio, /listen-hero-compact/u);
  assert.match(base, /html\[data-tv-route="watch"\]/u);
  assert.match(base, /html\[data-tv-route="live"\]/u);
  assert.match(media, /live-cinema-shell/u);
});

test("SpeakOut TV visual system uses a readable youth-first type hierarchy", () => {
  const tokens=read("css/tv/tokens.css");
  const base=read("css/tv/base.css");
  const home=read("css/tv/home.css");
  for (const page of ["tv.html","show.html","watch.html","tv-search.html","radio.html"]) {
    const html=read(page);
    assert.match(html, /family=Manrope/u, page);
    assert.match(html, /family=Space\+Grotesk/u, page);
    assert.match(html, /meta name="theme-color" content="#071225"/u, page);
    assert.match(html, /css\/tv\/tokens\.css/u, page);
    assert.match(html, /css\/tv\/base\.css/u, page);
  }
  assert.match(tokens, /--tv-text:#f5f8fb/u);
  assert.match(tokens, /--tv-muted:#91a4b8/u);
  assert.match(base, /font-family:Manrope/u);
  assert.match(base, /font-family:"Space Grotesk"/u);
  assert.match(home, /feature-copy h2/u);
  assert.doesNotMatch(home, /!important/u);
});

test("SpeakOut TV cache refreshes for the new visual system", () => {
  const sw=read("tv-sw.js");
  assert.match(sw, /speakout-tv-v9/u);
  for(const asset of ["./css/tv/tokens.css","./css/tv/base.css","./css/tv/art.css","./css/tv/home.css","./css/tv/media.css","./css/tv/discover.css","./js/tv-art.js","./js/tv-data.js","./js/platform-config.js"]) {
    assert.ok(sw.includes(asset),asset);
  }
});

test("SpeakOut TV keeps Featured exclusively on the home experience", () => {
  const home=read("tv.html");
  const show=read("show.html");
  const showScript=read("js/tv-show.js");
  assert.match(home,/id="featured"/u);
  assert.match(home,/class="feature-badge">FEATURED<\/span>/u);
  assert.doesNotMatch(show,/featuredEpisode|id="startHere"/u);
  assert.doesNotMatch(showScript,/featuredCard|FEATURED EPISODE/u);
});

test("Watch remains a video-only viewing surface", () => {
  const home=read("tv.html");
  const watch=read("watch.html");
  assert.match(home,/class="tv-container youth-section watch-section media-only-view watch-only"/u);
  assert.match(home,/class="watch-cinema-shell"/u);
  assert.match(home,/id="latestRail"/u);
  assert.doesNotMatch(watch,/pages\/resources\.html/u);
  assert.match(watch,/id="watchPlayer"/u);
  assert.match(watch,/id="upNextSection"/u);
  assert.match(watch,/id="relatedRail"/u);
});

test("Live is a single cinematic standby stage with only next-session information", () => {
  const page=read("tv.html");
  const script=read("js/speakout-tv.js");
  const styles=read("css/tv/media.css");
  assert.match(page,/class="live-cinema-shell"/u);
  assert.match(page,/class="live-signal"/u);
  assert.match(page,/No live session right now\./u);
  assert.doesNotMatch(page,/id="liveScheduleSection"|id="livePreviousSection"/u);
  assert.doesNotMatch(script,/scheduleSection\.hidden|previousSection\.hidden/u);
  assert.match(script,/status\.textContent=nextLive\?"Upcoming":"Standby"/u);
  assert.match(styles,/\.live-v2-player\{aspect-ratio:16\/9\}/u);
  assert.doesNotMatch(styles,/70vh/u);
});

test("Night Signal v5 uses one explicit high-contrast dark palette", () => {
  const tokens=read("css/tv/tokens.css");
  const base=read("css/tv/base.css");
  const media=read("css/tv/media.css");
  const discover=read("css/tv/discover.css");
  assert.match(tokens,/--tv-bg:#05101d/u);
  assert.match(tokens,/--tv-text:#f5f8fb/u);
  assert.match(tokens,/--tv-muted:#91a4b8/u);
  assert.match(base,/background:[\s\S]*var\(--tv-bg\)/u);
  assert.match(media,/listen-card/u);
  assert.match(discover,/discovery-search-box input/u);
});

test("TV Studio Editorial Operations 4.0 exposes a searchable work queue and library", () => {
  const page=read("admin-tv.html");
  const script=read("js/tv-admin-live.js");
  const styles=read("css/tv-admin-premium.css");
  for (const id of [
    "operationsDesk","operationsHealth","readyDraftCount","blockedDraftCount",
    "expiringPlacementCount","duplicateMediaCount","operationsQueue",
    "librarySearch","libraryStatusFilter","libraryFormatFilter",
    "libraryPlacementFilter","libraryQualityFilter","libraryReset","libraryVisibleCount"
  ]) assert.match(page,new RegExp(`id="${id}"`,"u"),id);
  assert.match(page,/data-library-preset="draft"/u);
  assert.match(page,/data-library-preset="attention"/u);
  assert.match(page,/data-library-preset="scheduled"/u);
  assert.match(page,/data-library-preset="duplicate"/u);
  assert.match(script,/function qualityIssues/u);
  assert.match(script,/function duplicateIdSet/u);
  assert.match(script,/function applyLibraryFilters/u);
  assert.match(script,/function renderOperationsQueue/u);
  assert.match(script,/function refreshOperations/u);
  assert.match(styles,/\.operations-metrics/u);
  assert.match(styles,/\.library-controls/u);
});

test("specialized CMS libraries support extra columns thumbnails and edit lifecycle events", () => {
  const page=read("admin-tv.html");
  const controller=read("js/admin-cms-ui.js");
  assert.match(page,/libraryFields:\["format","homePlacement"\]/u);
  assert.match(page,/thumbnailField:"imageUrl"/u);
  assert.match(page,/<th>Title<\/th><th>Type<\/th><th>Placement<\/th><th>Status<\/th><th>Order<\/th><th>Action<\/th>/u);
  assert.match(controller,/libraryFields = \[\], thumbnailField = ""/u);
  assert.match(controller,/data-record-id/u);
  assert.match(controller,/cms-row-thumb/u);
  assert.match(controller,/new CustomEvent\("cms:edit-start"/u);
  assert.match(controller,/new CustomEvent\("cms:edit-reset"/u);
});

test("TV Studio operations preserve viewer links and record filtering hooks", () => {
  const script=read("js/tv-admin-live.js");
  assert.match(script,/watch\.html\?id=/u);
  assert.match(script,/tv\.html\?live=/u);
  assert.match(script,/cms:render/u);
  assert.match(script,/cms:edit-start/u);
  assert.match(script,/data-queue-edit/u);
  assert.match(script,/CSS\.escape/u);
});

test("TV Studio operations browser modules pass syntax checks", () => {
  for (const file of ["js/admin-cms-ui.js","js/tv-admin-live.js"]) {
    const path=fileURLToPath(new URL(`../${file}`,import.meta.url));
    assert.doesNotThrow(()=>execFileSync(process.execPath,["--check",path],{stdio:"pipe"}),file);
  }
});


test("SpeakOut TV keeps Featured and mixed discovery content home-only", () => {
  const page=read("tv.html");
  const script=read("js/speakout-tv.js");
  assert.match(page,/class="tv-container youth-feature home-only feature-empty" id="featured"/u);
  assert.match(page,/document\.documentElement\.dataset\.tvRoute/u);
  assert.match(script,/document\.documentElement\.dataset\.tvRoute=chosen/u);
  assert.match(script,/if\(hash==="listen"\|\|hash==="audio"\)\{location\.replace\("radio\.html"\)/u);
  assert.match(script,/home:\["home","featured","today-focus","for-you","topic-journeys","fresh","shelf","reset","series","stories"\]/u);
  assert.match(script,/watch:\["episodes"\]/u);
  assert.match(script,/live:\["live"\]/u);
});

test("SpeakOut TV hierarchy sweep restrains oversized Featured Watch Live Audio and Discover typography", () => {
  const home=read("css/tv/home.css");
  const media=read("css/tv/media.css");
  const discover=read("css/tv/discover.css");
  assert.match(home,/\.youth-feature/u);
  assert.match(home,/min-height:300px/u);
  assert.match(home,/feature-copy h2/u);
  assert.match(media,/\.live-info-card h3/u);
  assert.match(media,/\.listen-hero h1/u);
  assert.match(discover,/\.search-discovery-hero h1/u);
  assert.doesNotMatch(home,/!important/u);
  assert.doesNotMatch(media,/!important/u);
});

test("SpeakOut TV initial route CSS prevents home content flashing into media-only views", () => {
  const page=read("tv.html");
  const styles=read("css/tv/base.css");
  assert.match(page,/dataset\.tvRoute=h==="live"\?"live":\(h==="watch"\|\|h==="episodes"\?"watch":"home"\)/u);
  assert.match(styles,/html\[data-tv-route="watch"\] \.home-only/u);
  assert.match(styles,/html\[data-tv-route="live"\] \.home-only/u);
  assert.match(styles,/html\[data-tv-route="home"\] \.media-only-view/u);
});

test("SpeakOut TV Featured requires explicit editorial configuration", () => {
  const page=read("tv.html");
  const script=read("js/speakout-tv.js");
  const styles=read("css/tv/base.css");
  assert.match(page,/youth-feature home-only feature-empty/u);
  assert.match(script,/return editorial\[0\]\|\|null/u);
  assert.match(script,/classList\.remove\("feature-empty"\)/u);
  assert.match(styles,/\.youth-feature\.feature-empty\{display:none\}/u);
});



test("SpeakOut TV art direction gives core series distinct branded identities", () => {
  const art=read("js/tv-art.js");
  const styles=read("css/tv/art.css");
  for(const skin of ["move","podcast","checkin","youth","campus","expert","stories","special","live"]) {
    assert.match(styles,new RegExp("\\.tv-art-"+skin+"\\{","u"),skin);
  }
  for(const name of ["on the move","podcast","how are you really","youth voices","campus connect","expert corner","speakout stories","speakout special"]) {
    assert.ok(art.includes(name),name);
  }
  assert.match(art,/export function artFallback/u);
  assert.match(art,/export function artOverlay/u);
});

test("SpeakOut TV uses one art system across Home Discover Series Watch and Listen", () => {
  for(const file of ["tv.html","show.html","watch.html","tv-search.html","radio.html"]) {
    assert.match(read(file),/css\/tv\/art\.css/u,file);
  }
  for(const file of ["js/speakout-tv.js","js/tv-search.js","js/tv-show.js","js/tv-watch.js","js/speakout-radio.js"]) {
    assert.match(read(file),/from "\.\/tv-art\.js"/u,file);
  }
  const main=read("js/speakout-tv.js");
  assert.match(main,/artOverlay\(x\)/u);
  assert.match(main,/artFallback\(item,"series"\)/u);
  assert.match(main,/artClass\(x,"audio"\)/u);
});

test("TV art fallbacks remain text-led and do not require fabricated imagery", () => {
  const styles=read("css/tv/art.css");
  const art=read("js/tv-art.js");
  assert.match(styles,/tv-art-fallback/u);
  assert.match(styles,/linear-gradient/u);
  assert.doesNotMatch(art,/https?:\/\//u);
  assert.doesNotMatch(art,/fetch\(/u);
});


test("TV Studio Content Intelligence 1.0 exposes coverage series freshness and artwork signals", () => {
  const page=read("admin-tv.html");
  const script=read("js/tv-admin-live.js");
  const styles=read("css/tv-admin-premium.css");
  for(const id of [
    "contentIntelligence","intelligenceHealth","fresh30Count","coverageGapCount",
    "seriesGapCount","artworkSignalCount","coverageMap","seriesBalance",
    "contentOpportunities","artworkWatch"
  ]) assert.match(page,new RegExp(`id="${id}"`,"u"),id);
  assert.match(script,/const intelligencePillars = \[/u);
  assert.match(script,/function renderContentIntelligence/u);
  assert.match(script,/const coverageGaps = coverage\.filter/u);
  assert.match(script,/const seriesGaps = seriesEntries\.filter/u);
  assert.match(script,/const artSignals = new Map\(\)/u);
  assert.match(styles,/\.intelligence-metrics/u);
  assert.match(styles,/\.coverage-map/u);
  assert.match(styles,/\.series-balance/u);
  assert.match(styles,/\.opportunity-list/u);
});

test("TV content intelligence uses objective recency and exact artwork reuse signals", () => {
  const script=read("js/tv-admin-live.js");
  assert.match(script,/30\*dayMs/u);
  assert.match(script,/90\*dayMs/u);
  assert.match(script,/age===null\|\|age>120/u);
  assert.match(script,/host === "i\.ytimg\.com"/u);
  assert.match(script,/if \(group\.length > 1\) group\.forEach/u);
  assert.match(script,/Exact artwork reused/u);
  assert.doesNotMatch(script,/AI score|engagement score|mental health score/iu);
});

test("TV content intelligence planning actions never auto-publish content", () => {
  const script=read("js/tv-admin-live.js");
  assert.match(script,/data-intelligence-plan-pillar/u);
  assert.match(script,/data-intelligence-plan-show/u);
  assert.match(script,/if \(status\) status\.value = "draft"/u);
  assert.match(script,/if \(editorialReview\) editorialReview\.value = "pending"/u);
  assert.match(script,/Finish or cancel the record you are editing/u);
  assert.doesNotMatch(script,/data-intelligence-plan-[^\n]+status\.value = "published"/u);
});

test("TV content intelligence reads managed series and refreshes after CMS changes", () => {
  const script=read("js/tv-admin-live.js");
  assert.match(script,/getDocs\(collection\(db,"tvShows"\)\)/u);
  assert.match(script,/studioShows = \[\]/u);
  assert.match(script,/renderContentIntelligence\(items,studioShows\)/u);
  assert.match(script,/renderContentIntelligence\(studioItems,studioShows\)/u);
});

test("TV content intelligence browser module remains syntactically valid", () => {
  const path=fileURLToPath(new URL("../js/tv-admin-live.js",import.meta.url));
  assert.doesNotThrow(()=>execFileSync(process.execPath,["--check",path],{stdio:"pipe"}));
});


test("Quick Reset unfolds beneath the selected card and tracks only this visit", () => {
  const page=read("tv.html");
  const script=read("js/speakout-tv.js");
  const styles=read("css/tv/home.css");
  for(const id of ["breathe","ground","focus"]) {
    assert.match(page,new RegExp(`data-reset-card="${id}"`,"u"),id);
    assert.match(page,new RegExp(`data-reset-reveal="${id}"`,"u"),id);
  }
  assert.match(page,/id="resetProgressCount">0\/3/u);
  assert.match(script,/const resetFlows=/u);
  assert.match(script,/function renderResetStep/u);
  assert.match(script,/function advanceReset/u);
  assert.match(script,/completed:new Set\(\)/u);
  assert.doesNotMatch(script,/localStorage[^\n]*(?:reset|breathe|ground|focus)/iu);
  assert.match(styles,/\.reset-reveal/u);
  assert.match(styles,/@keyframes resetUnfold/u);
});

test("TV media surfaces load backend-published content through one resilient public loader", () => {
  const data=read("js/tv-data.js");
  for(const file of ["js/speakout-tv.js","js/speakout-radio.js","js/tv-search.js","js/tv-watch.js","js/tv-show.js"]) {
    assert.match(read(file),/from "\.\/tv-data\.js"/u,file);
  }
  assert.match(data,/\/v1\/media\/tv/u);
  assert.match(data,/\/v1\/media\/audio/u);
  assert.match(data,/where\("status","==","published"\)/u);
  assert.match(data,/where\("status","==","active"\)/u);
  assert.doesNotMatch(data,/where\("status","in"/u);
});

test("Platform API exposes only public TV media and restores legacy published YouTube entries", () => {
  const worker=read("workers/platform-api/src/index.js");
  assert.match(worker,/path === "\/v1\/media\/tv"/u);
  assert.match(worker,/path === "\/v1\/media\/audio"/u);
  assert.match(worker,/queryAllDocuments\(env, "tvEpisodes"\)/u);
  assert.match(worker,/queryAllDocuments\(env, "homepageVideos"\)/u);
  assert.match(worker,/source: "legacy-homepage-video"/u);
  assert.match(worker,/filter\(publicMediaStatus\)/u);
  assert.match(worker,/publicGetPaths = new Set/u);
});

test("Spotify show sync merges new podcast episodes without duplicating manual audio", () => {
  const worker=read("workers/platform-api/src/index.js");
  const config=read("workers/platform-api/wrangler.production.jsonc");
  assert.match(worker,/async function spotifyClientToken/u);
  assert.match(worker,/async function spotifyShowEpisodes/u);
  assert.match(worker,/api\.spotify\.com\/v1\/shows\//u);
  assert.match(worker,/spotifyEpisodeId/u);
  assert.match(worker,/spotifyConfigured/u);
  assert.match(config,/"SPOTIFY_SHOW_ID": "4Z8Ua9vAYLT5YJEWYV1gfx"/u);
  assert.match(config,/"SPOTIFY_MARKET": "US"/u);
  assert.doesNotMatch(config,/SPOTIFY_CLIENT_SECRET/u);
});

test("Radio keeps Spotify source attribution and does not brand over Spotify artwork", () => {
  const script=read("js/speakout-radio.js");
  const main=read("js/speakout-tv.js");
  const styles=read("css/tv/media.css");
  assert.match(script,/spotify-attribution/u);
  assert.match(script,/spotify\?'':artOverlay/u);
  assert.match(main,/spotify\?'':artOverlay/u);
  assert.match(styles,/\.listen-card\.is-spotify \.listen-card-art img/u);
});


test("automatic Spotify sync excludes episodes marked explicit", () => {
  const worker=read("workers/platform-api/src/index.js");
  assert.match(worker,/if \(!id \|\| episode\?\.explicit === true\) continue;/u);
});


test("Quick Reset mobile layout keeps the reveal below its selected card", () => {
  const styles=read("css/tv/home.css");
  assert.match(styles,/@media\(max-width:620px\)[\s\S]*?\.reset-card\{display:block;min-width:0\}/u);
  assert.match(styles,/\.reset-card-top\{[\s\S]*?grid-template-columns:36px minmax\(0,1fr\) auto/u);
  assert.doesNotMatch(styles,/grid-template-areas:"icon title button"/u);
});
