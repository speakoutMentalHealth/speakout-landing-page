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
  assert.match(page, /pages\/resources\.html/u);
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
  const styles = read("css/speakout-tv.css");
  const sw = read("tv-sw.js");

  assert.match(home, /href="radio\.html"><span>◉<\/span><small>Listen<\/small>/u);
  for (const page of [show, watch, search]) assert.match(page, /href="radio\.html"/u);

  assert.match(script, /\$\$\("\.ios-episode-card,\.youth-content-card"\)\.forEach/u);
  assert.doesNotMatch(script, /(?<!\$)\$\("\.ios-episode-card,\.youth-content-card"\)\.forEach/u);
  assert.match(script, /closest\("\.youth-nav a\[data-view\]"\)/u);
  assert.match(script, /preferredScrollBehavior/u);
  assert.match(radio, /preferredScrollBehavior/u);
  assert.match(discovery, /preferredScrollBehavior/u);

  assert.match(styles, /:focus-visible/u);
  assert.match(styles, /prefers-reduced-motion:reduce/u);
  assert.match(sw, /speakout-tv-v3/u);
});


test("SpeakOut TV browser modules pass JavaScript syntax checks", () => {
  for (const file of [
    "js/speakout-tv.js",
    "js/speakout-radio.js",
    "js/tv-search.js",
    "js/tv-show.js",
    "js/tv-watch.js"
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
  assert.match(page, /TV STUDIO · EDITORIAL 2\.0/u);
  assert.match(page, /<option value="draft" selected>/u);
  for (const id of ["homePlacement","contentPillar","audience","editorialReview","readinessPanel"]) {
    assert.match(page, new RegExp(`id="${id}"`, "u"), id);
  }
  assert.match(script, /function readinessState/u);
  assert.match(script, /status\?\.value !== "published"/u);
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
  assert.match(script, /placementOf\(x\)==="daily"/u);
  assert.match(script, /placementOf\(x\)==="featured"/u);
  assert.match(script, /placementOf\(x\)!=="library_only"/u);
});

test("TV Studio helper script passes JavaScript syntax checks", () => {
  const path=fileURLToPath(new URL("../js/tv-admin-live.js", import.meta.url));
  assert.doesNotThrow(() => execFileSync(process.execPath, ["--check", path], { stdio: "pipe" }));
});


test("TV Studio Editorial Control 2.0 surfaces library quality and placement health", () => {
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
  assert.match(script,/homePlacement\?\.value === "featured"/u);
  assert.match(styles,/\.editorial-summary-grid/u);
  assert.match(styles,/\.attention-list/u);
});

test("TV Studio publishing readiness matches secure backend expectations", () => {
  const script=read("js/tv-admin-live.js");
  assert.match(script,/title\?\.value\.trim\(\)\.length >= 8/u);
  assert.match(script,/description\?\.value\.trim\(\)\.length >= 50/u);
  assert.match(script,/tagCount >= 2/u);
  assert.match(script,/editorialReview\?\.value === "complete"/u);
  assert.match(script,/minorInvolved\?\.value !== "yes" \|\| consentConfirmed\?\.value === "yes"/u);
});

test("TV discovery searches editorial pillar and audience and updates every filter tab", () => {
  const script=read("js/tv-search.js");
  assert.match(script,/x\.contentPillar,x\.audience/u);
  assert.ok((script.match(/\$\$\("\[data-filter\]"\)\.forEach/gu)||[]).length >= 2);
  assert.doesNotMatch(script,/(?<!\$)\$\("\[data-filter\]"\)\.forEach/u);
});
