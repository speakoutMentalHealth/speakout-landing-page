import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("critical public pages keep mobile, accessibility and SEO launch primitives", () => {
  for (const path of ["index.html", "pages/contact.html", "pages/donate.html", "pages/academy.html", "pages/schools.html"]) {
    const html = read(path);
    assert.match(html, /name=["']viewport["']/i, path);
    assert.match(html, /<main\b/i, path);
    assert.match(html, /rel=["']canonical["']/i, path);
    assert.match(html, /production-ready\.css/i, path);
  }
});

test("sitewide production layer protects touch, focus, reduced motion and mobile forms", () => {
  const css = read("css/production-ready.css");
  assert.match(css, /:focus-visible/);
  assert.match(css, /min-height:44px/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /font-size:16px/);
  assert.match(css, /\.sr-only/);
  assert.match(css, /scroll-margin-top/);
});

test("contact handoff remains explicit and accessible", () => {
  const html = read("pages/contact.html");
  const js = read("js/contact-form.js");
  assert.match(html, /id=["']contactFormStatus["'][^>]*role=["']status["'][^>]*aria-live=["']polite["']/i);
  assert.match(html, /Continue on WhatsApp/);
  assert.match(html, /review before sending/i);
  assert.match(js, /aria-busy/);
  assert.match(js, /contact_form_handoff/);
  assert.doesNotMatch(js, /fetch\(|XMLHttpRequest/);
});

test("donation page does not imply recurring billing", () => {
  const html = read("pages/donate.html");
  assert.match(html, /one-time donation/i);
  assert.doesNotMatch(html, /monthly giving/i);
  assert.doesNotMatch(html, /recurring donation/i);
});

test("search controls exclude protected surfaces while public sitemap stays clean", () => {
  const robots = read("robots.txt");
  const sitemap = read("sitemap.xml");
  for (const path of ["/admin", "/auth", "/portal/", "/school-dashboard.html", "/credential-passport.html"]) {
    assert.ok(robots.includes(`Disallow: ${path}`), path);
  }
  assert.doesNotMatch(sitemap, /\/admin|\/auth|school-dashboard|credential-passport/i);
});

test("prelaunch operations are codified instead of relying on memory", () => {
  const preflight = read(".github/workflows/approval-preflight.yml");
  const smoke = read(".github/workflows/public-launch-smoke.yml");
  const runbook = read("docs/PRELAUNCH-OPERATIONS-RUNBOOK.md");
  assert.match(preflight, /NORMALIZE_APPROVAL_FLAGS/);
  assert.match(preflight, /environment: production/);
  assert.match(smoke, /schedule:/);
  assert.match(runbook, /KPA authenticated acceptance/i);
  assert.match(runbook, /backup and restore/i);
  assert.match(runbook, /Search Console/i);
});
