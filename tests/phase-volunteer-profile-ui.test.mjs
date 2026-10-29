import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("Volunteer profile is presented ahead of long onboarding instructions", () => {
  const page = read("volunteer-dashboard.html");
  const profilePosition = page.indexOf('aria-labelledby="form-heading"');
  const reviewPosition = page.indexOf('aria-labelledby="intake-heading"');
  const instructionsPosition = page.indexOf('aria-labelledby="next-title"');
  assert.ok(profilePosition > 0 && profilePosition < reviewPosition && reviewPosition < instructionsPosition);
  assert.match(page, /<dl id="profileSummary"[^>]*hidden/);
  assert.match(page, /<details id="intakeDisclosure">/);
  assert.match(page, /<summary id="intakeToggle">Complete your volunteer information<\/summary>/);
  assert.match(page, /<p id="formMessage" role="status" aria-live="polite"><\/p>/);
  assert.ok(page.indexOf('id="formMessage"') < page.indexOf('id="intakeDisclosure"'),
    "Save confirmation must remain visible after form closes");
});

test("Fresh applicants open the form; submitted volunteers see a collapsible editor", () => {
  const js = read("js/volunteer-onboarding.js");
  assert.match(js, /\$\("intakeDisclosure"\)\.open = !existing/);
  assert.match(js, /\$\("intakeDisclosure"\)\.open = false/);
  assert.match(js, /\$\("intakeToggle"\)\.textContent = "Edit volunteer information"/);
  assert.match(js, /\$\("intakeToggle"\)\.textContent = "Complete your volunteer information"/);
  assert.match(js, /\$\("intakeToggle"\)\.focus\(\)/);
  assert.match(js, /await getDoc\(path\(user\.uid\)\)/);
  assert.match(js, /await setDoc\(path\(user\.uid\)/);
  assert.match(js, /await updateDoc\(path\(user\.uid\)/);
  assert.doesNotMatch(js, /localStorage\.setItem\([^\n]*volunteer/i, "Profile must be read from Firestore, not browser-local state");
});

test("Summary displays bio, interests, availability and opt-in via textContent only", () => {
  const js = read("js/volunteer-onboarding.js");
  for (const token of ["Bio and experience", "Location", "Weekly availability",
    "Participation preference", "Areas of interest", "Languages", "Email updates",
    "WhatsApp updates"]) assert.ok(js.includes(token), "Missing summary field " + token);
  assert.match(js, /description\.textContent = value/);
  assert.match(js, /summary\.replaceChildren\(\)/);
  assert.doesNotMatch(js, /description\.innerHTML/, "Never inject user-provided bio into HTML");
});

test("Volunteer has a single logout and unauthorized content does not flash on mobile", () => {
  const page = read("volunteer-dashboard.html");
  const js = read("js/volunteer-onboarding.js");
  assert.match(page, /<body class="volunteer-auth-pending">/);
  assert.match(page, /\.volunteer-auth-pending \.hero,\.volunteer-auth-pending main\{visibility:hidden\}/);
  assert.match(js, /document\.body\.classList\.remove\("volunteer-auth-pending"\)/);
  assert.match(js, /document\.getElementById\("logoutBtn"\)\?\.remove\(\)/);
  assert.match(page, /src="js\/account-controls\.js"/);
  assert.match(page, /MindCheck training and assessment results are not yet synced automatically/);
  assert.doesNotMatch(page, /<h2>Your current progress<\/h2>/);
});
