import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const publicPages = [
  "index.html",
  "pages/about.html", "pages/programs.html", "pages/schools.html",
  "pages/academy.html", "pages/resources.html", "pages/news.html",
  "pages/research.html", "pages/impact.html", "pages/contact.html",
  "pages/donate.html", "pages/partners.html", "pages/volunteer.html",
  "pages/join-us.html"
];

for (const page of publicPages) {
  test("public navigation paths remain valid: " + page, () => {
    const source = readFileSync(resolve(root, page), "utf8");
    const match = source.match(/<nav class="links" aria-label="Main navigation">([\s\S]*?)<\/nav>/);
    assert.ok(match, "Expected a main navigation element");
    const nav = match[1];

    for (const label of ["Home", "About", "Programs", "Schools", "Get Support", "Get Involved"]) {
      assert.ok(nav.includes(label), "Missing navigation label: " + label);
    }
    assert.equal((nav.match(/class="drop-toggle"/g) || []).length, 3);
    assert.equal((nav.match(/aria-expanded="false"/g) || []).length, 3);

    const expectedVolunteer = page === "index.html"
      ? "pages/volunteer.html" : "../pages/volunteer.html";
    const volunteerMatch = nav.match(/<a href="([^"]+)">Volunteer<\/a>/);
    assert.ok(volunteerMatch, "Expected volunteer menu entry");
    assert.equal(volunteerMatch[1], expectedVolunteer);

    for (const [, href] of nav.matchAll(/href="([^"]+)"/g)) {
      if (/^(https?:|mailto:|tel:|#)/.test(href)) continue;
      const target = href.split("#")[0];
      assert.ok(existsSync(resolve(root, dirname(page), target)), "Invalid navigation destination: " + page + " -> " + href);
    }

    assert.ok(source.includes('class="portal-btn"'), "Portal link missing");
    assert.ok(source.includes('class="donate-btn"'), "Donate link missing");
  });
}

test("homepage volunteer card has an explanation-first destination", () => {
  const source = readFileSync(resolve(root, "index.html"), "utf8");
  assert.ok(source.includes('<a class="reveal" href="pages/volunteer.html">'));
  assert.ok(!source.includes('src="js/speakout-platform-switcher.js"'));
});
