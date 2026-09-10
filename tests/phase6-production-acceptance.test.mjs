import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = path => readFileSync(new URL(path, root), "utf8");

test("every administrative screen uses the centralized role gate", () => {
  const adminPages = readdirSync(root)
    .filter(file => /^admin-.*\.html$/u.test(file));

  assert.ok(adminPages.length >= 19);
  for (const file of adminPages) {
    const page = read(file);
    assert.match(page, /launch-role-guard\.js|admin-cms-ui\.js/u, file);
    assert.doesNotMatch(page, /onAuthStateChanged\(auth/u, file);
  }
});

test("the shared role gate handles missing, pending, and wrong-role sessions without loops", () => {
  const guard = read("launch-role-guard.js");

  assert.match(guard, /profile\.approved === true\s*\|\|\s*status === "approved"/u);
  assert.ok((guard.match(/await signOut\(auth\)/gu) || []).length >= 3);
  assert.match(guard, /routeForRole\(role\)/u);
  assert.match(guard, /window\.location\.replace/u);
  assert.match(guard, /speakoutManualLogout/u);
});

test("primary role destinations use the centralized gate", () => {
  const expected = {
    "student-dashboard.html": "student",
    "student-library.html": "student",
    "teacher-dashboard.html": "teacher",
    "teacher-library.html": "teacher",
    "parent-dashboard.html": "parent",
    "parent-library.html": "parent",
    "school-dashboard.html": "school_admin",
  };

  for (const [file, role] of Object.entries(expected)) {
    const page = read(file);
    assert.match(page, /launch-role-guard\.js/u, file);
    assert.match(page, new RegExp(`requireRoles\\(\\s*\\["${role}"\\]`, "u"), file);
  }
});

test("payments UI waits for admin verification and escapes stored values", () => {
  const page = read("admin-payments.html");

  assert.match(page, /requireRoles\(\["admin","super_admin"\],startRealtime\)/u);
  assert.match(page, /function safe\(value\)/u);
  assert.match(page, /function safeProofUrl\(value\)/u);
  assert.match(page, /parsed\.protocol==="https:"/u);
  assert.doesNotMatch(page, /onclick="(?:viewPayment|updatePayment)/u);
  assert.match(page, /rows\.querySelectorAll\("button\[data-action\]"\)/u);
});

test("member access includes login, registration, recovery, and pending guidance", () => {
  const page = read("auth.html");
  const auth = read("js/auth.js");

  assert.match(page, /id="loginForm"/u);
  assert.match(page, /id="registerForm"/u);
  assert.match(page, /id="forgotPasswordLink"/u);
  assert.match(page, /id="pending"/u);
  assert.match(auth, /createUserWithEmailAndPassword/u);
  assert.match(auth, /signInWithEmailAndPassword/u);
  assert.match(auth, /sendPasswordResetEmail/u);
});
