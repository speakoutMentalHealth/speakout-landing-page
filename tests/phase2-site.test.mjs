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

test("shared dashboard HTML interpolation escapes untrusted values", async () => {
  const source = await readFile(path.join(root, "dashboard-shared.js"), "utf8");
  assert.match(source, /replaceAll\("&",\s*"&amp;"\)/);
  assert.match(source, /replaceAll\("<",\s*"&lt;"\)/);
  assert.match(source, /this\.safe\(raw\)/);
});
