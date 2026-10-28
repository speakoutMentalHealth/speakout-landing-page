import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("Volunteer role has its own role-guarded destination", () => {
  const auth = read("js/auth.js");
  const guard = read("launch-role-guard.js");
  const map = read("js/role-access.js");
  const page = read("volunteer-dashboard.html");
  assert.match(auth, /volunteer:\s*"volunteer-dashboard\.html"/);
  assert.match(guard, /volunteer:\s*"volunteer-dashboard\.html"/);
  assert.match(map, /"volunteer-dashboard\.html":\s*\[[^\]]*"volunteer"/);
  assert.match(page, /requireRoles\(\["volunteer"\]/);
  assert.match(page, /renderRoleNav\(profile,"dashboard"\)/);
  assert.match(page, /results are not yet synced automatically/i);
});

test("Public volunteer entry points lead to signup before training", () => {
  const volunteer = read("pages/volunteer.html");
  const join = read("pages/join-us.html");
  assert.match(volunteer, /href="\.\.\/auth\/auth\.html">Register as a Volunteer/);
  assert.match(join, /href="\.\.\/auth\/auth\.html">Register as a volunteer/);
  const account = read("auth/auth.html");
  assert.match(account, /<option value="volunteer">Volunteer<\/option>/);
  assert.match(account, /Individual applications are reviewed by SpeakOut/);
});

test("Volunteer hub provides instructions, contact and training without promising placement", () => {
  const page = read("volunteer-dashboard.html");
  assert.match(page, /mindcheck\.speakoutmentalhealth\.org\/training-hub\.html/);
  assert.match(page, /mindcheck\.speakoutmentalhealth\.org\/volunteers\.html/);
  assert.match(page, /mailto:speaaakout@gmail\.com/);
  assert.match(page, /wa\.me\/2348118103510/);
  assert.match(page, /pages\/news\.html/);
  assert.match(page, /This is not yet approval to work independently with beneficiaries/);
});
