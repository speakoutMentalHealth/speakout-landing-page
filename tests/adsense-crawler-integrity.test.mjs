import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = path => readFileSync(resolve(root, path), "utf8");

test("AdSense publisher declaration remains exact", () => {
  assert.equal(read("ads.txt").trim(), "google.com, pub-9014764551074349, DIRECT, f08c47fec0942fa0");
});
test("robots policy permits public content and advert declaration", () => {
  const robots = read("robots.txt");
  assert.match(robots, /^User-agent: \*\r?\nAllow: \/$/m);
  assert.doesNotMatch(robots, /^Disallow: \/$/m);
  for (const forbidden of ["/ads.txt", "/sitemap.xml", "/speakhub.html", "/pages/"]) {
    assert.doesNotMatch(robots, new RegExp("^Disallow: " + forbidden.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?:\\s|$)", "m"));
  }
  assert.match(robots, /Sitemap: https:\/\/speakoutmentalhealth\.org\/sitemap\.xml/);
});
test("sitemap references repository-backed public pages only", () => {
  const sitemap = read("sitemap.xml");
  const links = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  assert.ok(links.length >= 10, "expected a useful public sitemap");
  assert.equal(new Set(links).size, links.length, "sitemap must not duplicate URLs");
  for (const link of links) {
    const url = new URL(link);
    assert.equal(url.origin, "https://speakoutmentalhealth.org");
    const local = decodeURIComponent(url.pathname).replace(/^\//, "") || "index.html";
    assert.ok(!local.includes(".."), "no path traversal");
    assert.ok(existsSync(resolve(root, local)), "missing sitemap file: " + local);
    assert.doesNotMatch(local, /^(?:admin|auth|login|register|student-|teacher-|school-dashboard)/);
  }
});
test("SpeakHub ads remain disabled while account approval is pending", () => {
  assert.match(read("js/speakhub-ad-placement.js"), /const ADS_ENABLED = false;/);
});
