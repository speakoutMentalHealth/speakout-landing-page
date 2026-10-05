import assert from "node:assert/strict";

const base = (process.env.SPEAKOUT_BASE_URL || "https://speakoutmentalhealth.org").replace(/\/$/, "");
const routes = [
  ["/", true],
  ["/pages/contact.html", true],
  ["/pages/donate.html", true],
  ["/speakhub.html", true],
  ["/tv.html", true],
  ["/auth/auth.html", false]
];

async function get(path) {
  const response = await fetch(base + path, {
    redirect: "follow",
    headers: { "user-agent": "SpeakOutLaunchSmoke/1.0" }
  });
  const body = await response.text();
  return { response, body };
}

for (const [path, publicIndexable] of routes) {
  const { response, body } = await get(path);
  assert.equal(response.status, 200, `${path} returned ${response.status}`);
  assert.match(body, /<meta[^>]+name=["']viewport["']/i, `${path} missing viewport metadata`);
  assert.match(body, /<main\b/i, `${path} missing main landmark`);
  if (publicIndexable) {
    assert.match(body, /rel=["']canonical["']/i, `${path} missing canonical URL`);
  }
}

for (const path of ["/robots.txt", "/sitemap.xml"]) {
  const { response, body } = await get(path);
  assert.equal(response.status, 200, `${path} returned ${response.status}`);
  assert.ok(body.trim().length > 20, `${path} returned an unexpectedly empty response`);
}

console.log(`Public smoke checks passed for ${base}`);
