import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ignoredDirectories = new Set([
  ".firebase",
  ".git",
  "demo",
  "docs",
  "firestore-schema",
  "firestore-seed",
  "functions",
  "node_modules",
  "speakout-landing-page",
  "tests",
  "workers",
]);
const ignoredHtml = /^(?:cleanup-books|secure-assessment-migration|seed-[^/]+)\.html$/i;
const ignoredProtocols = /^(?:data:|javascript:|mailto:|tel:|https?:|\/\/|#)/i;
const localReferencePattern = /\b(?:href|poster|src)\s*=\s*["']([^"']+)["']/gi;

async function walk(directory, relative = "") {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const relativePath = path.join(relative, entry.name);
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolutePath, relativePath));
    else files.push(relativePath);
  }
  return files;
}

const repositoryFiles = await walk(root);
const htmlFiles = repositoryFiles.filter(file => file.endsWith(".html") && !ignoredHtml.test(file));

function webPath(file) {
  return file.split(path.sep).join("/");
}

async function referenceExists(sourceFile, reference) {
  if (!reference || ignoredProtocols.test(reference) || /\{\{|\$\{/.test(reference)) return true;
  const url = new URL(reference, `https://speakout.invalid/${webPath(sourceFile)}`);
  let localPath = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  if (!localPath) localPath = "index.html";
  let target = path.join(root, ...localPath.split("/"));
  try {
    const details = await stat(target);
    if (details.isDirectory()) target = path.join(target, "index.html");
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

test("deployable HTML has basic document metadata", async () => {
  const failures = [];
  for (const file of htmlFiles) {
    const source = await readFile(path.join(root, file), "utf8");
    if (!/^\s*<!doctype html>/i.test(source)) failures.push(`${webPath(file)}: missing doctype`);
    if (!/<html[^>]+lang=["'][^"']+["']/i.test(source)) failures.push(`${webPath(file)}: missing lang`);
    if (!/<meta[^>]+name=["']viewport["']/i.test(source)) failures.push(`${webPath(file)}: missing viewport`);
    if (!/<title>\s*[^<]+\s*<\/title>/i.test(source)) failures.push(`${webPath(file)}: missing title`);
    if (!/<h1(?:\s|>)/i.test(source)) failures.push(`${webPath(file)}: missing h1`);
  }
  assert.deepEqual(failures, []);
});

test("deployable HTML contains exactly one document shell", async () => {
  const failures = [];
  for (const file of htmlFiles) {
    const source = await readFile(path.join(root, file), "utf8");
    const counts = {
      doctype: (source.match(/<!doctype\s+html/gi) || []).length,
      html: (source.match(/<html(?:\s|>)/gi) || []).length,
      body: (source.match(/<body(?:\s|>)/gi) || []).length,
      closingHtml: (source.match(/<\/html>/gi) || []).length,
    };
    if (Object.values(counts).some(count => count !== 1)) {
      failures.push(`${webPath(file)}: ${JSON.stringify(counts)}`);
    }
  }
  assert.deepEqual(failures, []);
});

test("deployed pages contain no visible implementation placeholders", async () => {
  const failures = [];
  const placeholder = /Folder Ready|Move the finalized page here|Embed your latest YouTube video/i;
  for (const file of htmlFiles) {
    const source = await readFile(path.join(root, file), "utf8");
    if (placeholder.test(source)) failures.push(webPath(file));
  }
  assert.deepEqual(failures, []);
});

test("local HTML asset and route references resolve", async () => {
  const failures = [];
  for (const file of htmlFiles) {
    const source = await readFile(path.join(root, file), "utf8");
    for (const match of source.matchAll(localReferencePattern)) {
      if (!await referenceExists(file, match[1])) failures.push(`${webPath(file)} -> ${match[1]}`);
    }
  }
  assert.deepEqual([...new Set(failures)].sort(), []);
});

test("development snippets are excluded from Firebase Hosting", async () => {
  const firebase = JSON.parse(await readFile(path.join(root, "firebase.json"), "utf8"));
  assert.ok(firebase.hosting.ignore.includes("demo/**"));
  assert.ok(firebase.hosting.ignore.includes("firestore-seed/*.mjs"));
  assert.equal(firebase.hosting.ignore.includes("firestore-seed/**"), false);
  assert.equal(firebase.hosting.ignore.includes("firestore-seed/audience-guides.json"), false);
  assert.equal(firebase.hosting.ignore.includes("firestore-seed/priority-library-books.json"), false);
  assert.equal(firebase.hosting.ignore.includes("firestore-seed/priority-courses.json"), false);
});

test("publishable library packs are included in GitHub Pages", async () => {
  const config = await readFile(path.join(root, "_config.yml"), "utf8");
  assert.equal(/^\s*-\s+firestore-seed\s*$/m.test(config), false);
  assert.equal(config.includes("firestore-seed/audience-guides.json"), false);
  assert.equal(config.includes("firestore-seed/priority-library-books.json"), false);
  assert.equal(config.includes("firestore-seed/priority-courses.json"), false);
  assert.equal(config.includes("firestore-seed/build-audience-guides.mjs"), true);
  assert.equal(config.includes("firestore-seed/build-priority-library.mjs"), true);
});

test("legacy portal aliases redirect to their maintained routes", async () => {
  const firebase = JSON.parse(await readFile(path.join(root, "firebase.json"), "utf8"));
  const redirects = new Map(firebase.hosting.redirects.map(item => [item.source, item]));
  const expected = new Map([
    ["/portal/courses/**", "/my-courses.html"],
    ["/portal/library/**", "/my-library.html"],
    ["/portal/progress/**", "/progress.html"],
    ["/portal/certificates/**", "/certificates.html"],
    ["/portal/workshops/**", "/workshops.html"],
  ]);
  for (const [source, destination] of expected) {
    assert.deepEqual(redirects.get(source), { source, destination, type: 302 });
    await stat(path.join(root, destination.slice(1)));
  }
});

test("generic CMS pages use the shared authorized UI controller", async () => {
  const pages = [
    "admin-impact.html",
    "admin-media.html",
    "admin-partners.html",
    "admin-podcast.html",
    "admin-reports.html",
    "admin-videos.html",
  ];
  for (const file of pages) {
    const source = await readFile(path.join(root, file), "utf8");
    assert.match(source, /createAdminCmsController/u, file);
    assert.match(source, /css\/admin-cms\.css/u, file);
  }
  const controller = await readFile(path.join(root, "js/admin-cms-ui.js"), "utf8");
  assert.match(controller, /requireRoles\(\["admin", "super_admin"\]/u);
  assert.match(controller, /SO\.safe\(/u);
  assert.match(controller, /setBusy\(true\)/u);
});

test("public catalogues only render complete published learning content", async () => {
  const { CONTENT_THRESHOLDS, bookReadiness, countWords, courseReadiness, isPublicBook, isPublicCourse } = await import("../js/content-visibility.js");
  const lesson = { title: "Lesson one", content: "Ready learning content" };
  const course = {
    status: "active",
    title: "Ready course",
    category: "wellbeing",
    description: "lesson ".repeat(5000),
    courseType: "internal",
    modules: [{ title: "Module one", lessons: [lesson] }],
  };
  const book = {
    status: "published",
    title: "Ready guide",
    category: "wellbeing",
    description: "A complete guide",
    author: "SpeakOut",
    coverUrl: "https://example.com/cover.webp",
    chapters: [
      { title: "Chapter one", content: "guide ".repeat(900) },
      { title: "Chapter two", content: "guide ".repeat(900) },
      { title: "Chapter three", content: "guide ".repeat(900) },
    ],
  };

  assert.equal(isPublicCourse(course), true);
  assert.equal(courseReadiness(course).wordCount >= CONTENT_THRESHOLDS.internalCourseWords, true);
  assert.equal(isPublicCourse({ ...course, status: "draft" }), false);
  assert.equal(isPublicCourse({ ...course, modules: [] }), false);
  assert.equal(isPublicCourse({ ...course, courseType: "external", provider: "Partner", modules: undefined, description: "overview ".repeat(75), externalUrl: "https://example.com/course" }), true);
  assert.equal(isPublicCourse({ ...course, courseType: "external", provider: "Partner", modules: undefined, externalUrl: "javascript:alert(1)" }), false);
  assert.equal(isPublicBook(book), true);
  assert.equal(bookReadiness(book).wordCount >= CONTENT_THRESHOLDS.bookWords, true);
  assert.equal(isPublicBook({ ...book, coverUrl: "" }), false);
  assert.equal(isPublicBook({ ...book, status: "active", chapters: [] }), false);
  assert.deepEqual(CONTENT_THRESHOLDS, {
    internalCourseWords: 5000,
    externalCourseEditorialWords: 75,
    bookWords: 2500,
    audienceGuideWords: 5000,
  });
  assert.equal(countWords("<h2>Three useful words</h2>"), 3);

  const parseSeed = async file => JSON.parse((await readFile(path.join(root, file), "utf8")).replace(/^\uFEFF/, ""));
  const placeholderBooks = await parseSeed("books-seed.json");
  const audienceGuides = await parseSeed("firestore-seed/audience-guides.json");
  const priorityBooks = await parseSeed("firestore-seed/priority-library-books.json");
  const priorityCourses = await parseSeed("firestore-seed/priority-courses.json");
  assert.equal(placeholderBooks.some(isPublicBook), false);
  assert.equal(audienceGuides.length, 3);
  assert.equal(audienceGuides.every(isPublicBook), true);
  assert.equal(audienceGuides.every(guide => guide.contentWordCount >= CONTENT_THRESHOLDS.audienceGuideWords), true);
  assert.equal(audienceGuides.every(guide => bookReadiness(guide).kind === "audience-guide"), true);
  assert.deepEqual(priorityBooks.map(book => book.id).sort(), [
    "anxiety-management",
    "budgeting",
    "canva-design",
    "career-planning",
    "community-leadership",
    "computer-basics",
    "conflict-resolution",
    "cybersecurity-awareness",
    "debt-management",
    "depression-awareness",
    "leadership-foundations",
    "mental-health-foundations",
    "microsoft-excel",
    "microsoft-word",
    "personal-finance",
    "psychological-first-aid",
    "saving",
    "stress-management",
    "student-leadership",
    "team-leadership",
  ]);
  assert.equal(priorityBooks.every(isPublicBook), true);
  assert.equal(priorityBooks.every(book => book.chapters.length >= 4), true);
  assert.equal(priorityBooks.every(book => book.contentWordCount >= 5000), true);
  assert.deepEqual(priorityCourses.map(course => course.id).sort(), [
    "digital-literacy-essentials",
    "ext-cisco-intro-cybersecurity",
    "ext-freecodecamp-python-certification",
    "ext-kaggle-intro-machine-learning",
    "ext-openlearn-leadership-followership",
    "hubspot-digital-marketing-certification",
    "hubspot-sales-management-training",
    "hubspot-social-media-marketing-certification",
    "kaggle-intro-to-programming",
    "mental-health-awareness-students",
    "mental-health-club-coordinator-training",
    "microsoft-introduction-to-ai-concepts",
    "parent-communication-teen-support",
    "student-leadership-foundations",
    "teacher-mental-health-support-basics",
  ]);
  assert.equal(priorityCourses.every(isPublicCourse), true);
  const internalPriorityCourses = priorityCourses.filter(course => course.courseType === "internal");
  const externalPriorityCourses = priorityCourses.filter(course => course.courseType === "external");
  assert.equal(internalPriorityCourses.length, 6);
  assert.equal(internalPriorityCourses.every(course => course.modules.length === 6), true);
  assert.equal(internalPriorityCourses.every(course => course.lessonCount === 18), true);
  assert.equal(internalPriorityCourses.every(course => courseReadiness(course).wordCount >= CONTENT_THRESHOLDS.internalCourseWords), true);
  assert.equal(externalPriorityCourses.length, 9);
  assert.equal(externalPriorityCourses.every(course => courseReadiness(course).wordCount >= CONTENT_THRESHOLDS.externalCourseEditorialWords), true);

  for (const file of ["speakhub.html", "my-courses.html", "course-details.html", "course-player.html"]) {
    assert.match(await readFile(path.join(root, file), "utf8"), /isPublicCourse/u, file);
  }
  for (const file of ["e-library.html", "my-library.html", "book-details.html", "book-reader.html", "teacher-library.html", "student-library.html", "parent-library.html"]) {
    assert.match(await readFile(path.join(root, file), "utf8"), /isPublicBook/u, file);
  }
  const courseAdmin = await readFile(path.join(root, "admin-courses.html"), "utf8");
  const bookAdmin = await readFile(path.join(root, "admin-books.html"), "utf8");
  assert.match(courseAdmin, /courseReadiness/u);
  assert.match(courseAdmin, /Cannot publish:/u);
  assert.match(bookAdmin, /bookReadiness/u);
  assert.match(bookAdmin, /Saved as draft:/u);
  assert.match(bookAdmin, /requireRoles\(\["admin","super_admin"\]/u);
  assert.doesNotMatch(bookAdmin, /src="auth-guard\.js"/u);
  assert.doesNotMatch(bookAdmin, /function isAdmin/u);
  assert.match(bookAdmin, /id="importLibraryBtn"/u);
  assert.match(bookAdmin, /audience-guides\.json/u);
  assert.match(bookAdmin, /priority-library-books\.json/u);
  assert.match(bookAdmin, /items\.filter\(item=>!bookReadiness\(item\)\.ready\)/u);
  assert.match(bookAdmin, /setDoc\(doc\(db,"books",item\.id\)/u);
});

test("public learning catalogues provide mobile-friendly discovery and filter feedback", async () => {
  const academy = await readFile(path.join(root, "speakhub.html"), "utf8");
  const library = await readFile(path.join(root, "e-library.html"), "utf8");
  const styles = await readFile(path.join(root, "css/frontend-revamp.css"), "utf8");
  for (const source of [academy, library]) {
    assert.match(source, /class="catalog-jump"/u);
    assert.match(source, /id="resultCount" aria-live="polite"/u);
    assert.match(source, /id="resetFilters"/u);
    assert.match(source, /catalog-grid/u);
  }
  assert.match(styles, /\.catalog-jump/u);
  assert.match(styles, /\.catalog-toolbar/u);
  assert.match(styles, /@media\(max-width:760px\)/u);
});

test("shared dashboard HTML interpolation escapes untrusted values", async () => {
  const source = await readFile(path.join(root, "dashboard-shared.js"), "utf8");
  assert.match(source, /replaceAll\("&",\s*"&amp;"\)/);
  assert.match(source, /replaceAll\("<",\s*"&lt;"\)/);
  assert.match(source, /this\.safe\(raw\)/);
});
