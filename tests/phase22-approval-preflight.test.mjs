import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("approval preflight script is valid ESM JavaScript", () => {
  const scriptPath = new URL("../functions/scripts/approval-preflight.js", import.meta.url).pathname;
  execFileSync(process.execPath, ["--check", scriptPath]);
  const source = read("functions/scripts/approval-preflight.js");
  assert.match(source, /import \{ initializeApp \} from "firebase-admin\/app"/u);
  assert.match(source, /import \{ getFirestore, FieldPath, FieldValue \} from "firebase-admin\/firestore"/u);
  assert.doesNotMatch(source, /require\(/u);
});

test("approval preflight workflow does not assume a missing functions lockfile", () => {
  const workflow = read(".github/workflows/approval-preflight.yml");
  assert.doesNotMatch(workflow, /functions\/package-lock\.json/u);
  assert.doesNotMatch(workflow, /npm ci --prefix functions/u);
  assert.match(workflow, /npm install --prefix functions --omit=dev/u);
  assert.match(workflow, /node functions\/scripts\/approval-preflight\.js/u);
});
