import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const script = new URL("../tests/staging-capacity-preflight.mjs", import.meta.url).pathname;
const source = readFileSync(script, "utf8");

test("staging preflight parses without exposing service account secrets", () => {
  const result = spawnSync(process.execPath, ["--check", script], {encoding:"utf8", timeout:10000});
  assert.equal(result.status, 0, result.stderr);
  assert.match(source, /account\.project_id, projectId/);
  assert.match(source, /assert\.match\(account\.client_email/);
  assert.match(source, /console\.log\("Staging Firestore preflight principal:", account\.client_email\)/);
  assert.doesNotMatch(source, /console\.log\([^)]*private_key/);
  assert.doesNotMatch(source, /console\.log\([^)]*access_token/);
});
test("a 403 reports the API error, exact principal and required read permission", () => {
  assert.match(source, /response\.status === 403/);
  assert.match(source, /body\?\.error\?\.status/);
  assert.match(source, /body\?\.error\?\.message/);
  assert.match(source, /datastore\.entities\.list/);
  assert.match(source, /account\.client_email \+ " in " \+ projectId/);
  assert.match(source, /no IAM Deny|IAM Deny/);
  assert.doesNotMatch(source, /throw new Error\([^)]*JSON\.stringify\(body\)/);
});
test("staging preflight fail-closed requires credential file before network call", () => {
  const result=spawnSync(process.execPath,[script],{
    encoding:"utf8",timeout:10000,env:{PATH:process.env.PATH}
  });
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/FIREBASE_SERVICE_ACCOUNT_FILE/);
});
