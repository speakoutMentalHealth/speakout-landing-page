import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const player = readFileSync(new URL("../course-player.html", import.meta.url), "utf8");
const browser = readFileSync(new URL("./independent-learner-browser.mjs", import.meta.url), "utf8");

test("final assessment only retries read-only requests when temporarily rate-limited", () => {
  assert.match(player, /if\(type!=="final"\|\|!\[429,503\]\.includes\(error\?\.status\)\)throw error/);
  assert.match(player, /Retry loading assessment/);
  assert.match(player, /learningApi\.assessment\(courseId,type,moduleIndex\)/);
  assert.doesNotMatch(player, /retry.*learningApi\.submitAssessment/i);
});

test("a passed module cannot unlock the final without server-confirmed progress", () => {
  assert.match(player, /if\(!finalUnlocked\(\)\)/);
  assert.match(player, /await loadProgress\(\)/);
  assert.match(player, /currentView=\{type:"final"\}/);
  assert.match(player, /coursePercent\(\)===100/);
});

test("independent learner browser records redacted diagnostics at final transition", () => {
  assert.match(browser, /final-assessment-transition-failure\.json/);
  assert.match(browser, /finalMenuDisabled/);
  assert.match(browser, /finalResponses/);
  assert.match(browser, /assessmentErrorCategory/);
  assert.doesNotMatch(browser, /response\.text\(\)|response\.json\(\).*finalResponses/);
});
