import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { isApprovedProfile } from "../js/profile-approval.js";

test("canonical approval is required regardless of legacy flags or role", () => {
  for (const role of ["student", "parent", "teacher", "school_admin", "admin", "super_admin"]) {
    for (const approved of [undefined, false, true, "true"]) {
      assert.equal(isApprovedProfile({ role, approved, status: "approved" }), true);
      for (const status of [undefined, "", "pending", "rejected", "suspended", "active", " APPROVED ", "unknown"]) {
        assert.equal(isApprovedProfile({ role, approved, status }), false, `${role}/${status}/${approved}`);
      }
    }
  }
  assert.equal(isApprovedProfile(null), false);
});

test("deployed access entry points use canonical approval without role bypasses", () => {
  for (const path of ["js/auth.js", "launch-role-guard.js", "js/learner/course-details.js", "course-player.html", "speakhub.html", "js/school-dashboard.js", "workers/platform-api/src/index.js"]) {
    const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
    assert.match(source, /import \{ isApprovedProfile \} from/, path);
    assert.match(source, /isApprovedProfile\((?:currentProfile|profile)\)/, path);
  }
  const functions = readFileSync(new URL("../functions/index.js", import.meta.url), "utf8");
  assert.match(functions, /if \(p\.status !== "approved"\)/);
});

test("Cloud Functions certificate backend parses as JavaScript", () => {
  execFileSync(process.execPath, ["--check", new URL("../functions/index.js", import.meta.url).pathname]);
});
