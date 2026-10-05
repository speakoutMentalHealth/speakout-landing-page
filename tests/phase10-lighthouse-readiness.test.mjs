import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Lighthouse readiness is pinned and covers the launch surfaces", () => {
  const workflow = read(".github/workflows/lighthouse-readiness.yml");
  assert.match(workflow, /lighthouse@13\.5\.0/);
  assert.match(workflow, /speakoutmentalhealth\.org\/speakhub\.html/);
  assert.match(workflow, /pages\/donate\.html/);
  assert.match(workflow, /pages\/contact\.html/);
  assert.match(workflow, /tv\.html/);
  assert.match(workflow, /upload-artifact@v4/);
});

test("Lighthouse summary tracks launch-relevant categories without hiding weak scores", () => {
  const source = read("scripts/lighthouse-summary.mjs");
  for (const category of ["performance", "accessibility", "best-practices", "seo"]) {
    assert.ok(source.includes(category), category);
  }
  assert.match(source, /belowTarget/);
  assert.doesNotMatch(source, /process\.exit\(1\)/);
});
