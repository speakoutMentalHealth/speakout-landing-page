import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = name => readFileSync(new URL(name, import.meta.url), "utf8");
test("school staging cleanup queries by scoped IDs rather than scanning whole collections", () => {
  const source = read("./school-management-browser.mjs");
  assert.match(source, /async function queryCleanupRecords\(/);
  assert.match(source, /collectionId: name/);
  assert.match(source, /fieldPath: field/);
  assert.match(source, /\["schoolId", schoolAId\]/);
  assert.doesNotMatch(source, /pageSize=300/);
  assert.match(source, /Cleanup query limit reached/);
});
test("KPA result audit cleanup is result-scoped and fails closed on quota errors", () => {
  const source = read("./kpa-results-browser-pilot.mjs");
  assert.match(source, /collectionId: "academicResultAuditLogs"/);
  assert.match(source, /fieldPath: "resultId"/);
  assert.match(source, /Could not query result audit logs/);
  assert.doesNotMatch(source, /academicResultAuditLogs\?pageSize=200/);
});
test("release capacity check precedes staging deployment", () => {
  const source = read("../.github/workflows/release-acceptance.yml");
  const preflight = source.indexOf("node tests/staging-capacity-preflight.mjs");
  const deploy = source.indexOf("Deploy branch Firestore rules to staging");
  assert.ok(preflight >= 0 && deploy > preflight);
});
