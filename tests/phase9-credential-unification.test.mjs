import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL("../"+path, import.meta.url), "utf8");

function moduleBodies(source){
  return [...source.matchAll(/<script type="module">([\s\S]*?)<\/script>/gu)].map(match =>
    match[1]
      .replace(/^import[\s\S]*?from\s+["'][^"']+["'];?\s*$/gmu,"")
      .replace(/^import\s+["'][^"']+["'];?\s*$/gmu,"")
  );
}

test("Credential Passport uses authenticated server APIs instead of browser Firestore writes", () => {
  const page=read("credential-passport.html");
  const client=read("js/platform-api.js");
  const worker=read("workers/platform-api/src/index.js");

  assert.match(page,/credentialApi\.list\(\)/u);
  assert.match(page,/credentialApi\.submit\(payload\)/u);
  assert.doesNotMatch(page,/firebase-firestore|addDoc\(|setDoc\(|updateDoc\(|deleteDoc\(/u);
  assert.match(page,/Professional Certification \(provider-reported\)/u);
  assert.match(page,/does not grant professional licensure/u);
  assert.match(client,/\/v1\/credentials\/list/u);
  assert.match(client,/\/v1\/credentials\/submit/u);
  assert.match(worker,/if \(path === "\/v1\/credentials\/list"\)/u);
  assert.match(worker,/if \(path === "\/v1\/credentials\/submit"\)/u);
  assert.match(worker,/externalCredentials\/\$\{recordId\}/u);
});

test("manual credential verification is admin API controlled and can issue one canonical record", () => {
  const admin=read("admin-credentials.html");
  const client=read("js/platform-api.js");
  const worker=read("workers/platform-api/src/index.js");

  assert.match(admin,/adminApi\.listCredentials\(\)/u);
  assert.match(admin,/adminApi\.reviewCredential\(recordId,decision,note\)/u);
  assert.doesNotMatch(admin,/firebase-firestore|updateDoc\(|setDoc\(|addDoc\(/u);
  assert.match(client,/\/v1\/admin\/credentials\/list/u);
  assert.match(client,/\/v1\/admin\/credentials\/review/u);
  assert.match(worker,/if \(path === "\/v1\/admin\/credentials\/review"\)/u);
  assert.match(worker,/sameCredentialEvidence\(/u);
  assert.match(worker,/duplicateCertificate/u);
  assert.match(worker,/linkedCertificateId/u);
  assert.match(worker,/type: "external-credential-verification"/u);
  assert.match(worker,/certificates\/\$\{certificateId\}/u);
  assert.match(worker,/publicCertificateVerifications\/\$\{verificationCode\}/u);
  assert.match(worker,/verifiedBy: "SpeakOut Mental Health Outreach"/u);
});

test("manual credentials are denied to learner Firestore clients", () => {
  const rules=read("firebase/firestore.rules");
  const block=rules.match(/match \/externalCredentials\/\{credentialId\}[\s\S]*?match \/externalLearningRecords/u)?.[0]||"";
  assert.match(block,/allow read, write: if false;/u);
  assert.doesNotMatch(block,/request\.resource\.data\.userId == request\.auth\.uid/u);
});

test("public certificate verification exposes only the minimal projection", () => {
  const worker=read("workers/platform-api/src/index.js");
  const center=read("certificate-center.html");
  const view=read("certificate-view.html");
  const projection=worker.match(/function publicCertificateProjection[\s\S]*?\n\}/u)?.[0]||"";

  assert.match(worker,/if \(path === "\/v1\/public\/certificates\/verify"\)/u);
  assert.match(center,/certificateApi\.verify\(id\)/u);
  assert.match(view,/certificateApi\.verify\(publicId\)/u);
  assert.doesNotMatch(center,/firebase-firestore|getDocs\(|recipientEmailInput/u);
  assert.doesNotMatch(view,/firebase-firestore|getDoc\(doc\(db,"users"/u);
  assert.match(projection,/recipientName/u);
  assert.match(projection,/awardTitle/u);
  assert.match(projection,/certificateNumber/u);
  assert.doesNotMatch(projection,/recipientEmail|finalScore|evidence|reviewer/u);
});

test("external providers remain the original credential issuer while SpeakOut is the verifier", () => {
  const worker=read("workers/platform-api/src/index.js");
  assert.match(worker,/issuer: provider,/u);
  assert.match(worker,/verifiedBy: "SpeakOut Mental Health Outreach"/u);
  assert.match(worker,/achievementType: "external credential verified by SpeakOut"/u);
  assert.match(worker,/achievementType: "externally-completed course verified by SpeakOut"/u);
  assert.match(worker,/provider: clean\(record\.provider \|\| record\.externalProviderName\)/u);
  assert.doesNotMatch(worker,/provider: clean\(record\.provider \|\| record\.externalProvider \|\| record\.issuer\)/u);
});

test("portfolio navigation uses the same shared role-nav header as the dashboards", () => {
  const page=read("learning-portfolio.html");
  const student=read("student-dashboard.html");
  assert.match(page,/<header class="nav">[\s\S]*?<nav class="links" id="roleNav"><\/nav>/u);
  assert.match(student,/<header class="nav">[\s\S]*?<nav class="links" id="roleNav"><\/nav>/u);
  assert.doesNotMatch(page,/portfolioMenuToggle|portfolioNavTray|portfolio-menu-open/u);
  assert.doesNotMatch(page,/portfolio-nav-head|portfolio-nav-tray|portfolio-menu-toggle/u);
});

test("portfolio unifies verified manual credentials without duplicating canonical certificates", () => {
  const page=read("learning-portfolio.html");
  const worker=read("workers/platform-api/src/index.js");
  assert.match(page,/function unifiedCredentialRecords\(certificates=\[\],manual=\[\]\)/u);
  assert.match(page,/sourceCredentialIds/u);
  assert.match(page,/dashboard\.externalCredentials/u);
  assert.match(page,/const credentialNames=credentials/u);
  assert.match(page,/Credential Passport/u);
  assert.match(worker,/externalCredentials: credentialPage\.documents\.map/u);
});

test("certificate list uses the same canonical plus verified Passport view", () => {
  const page=read("certificates.html");
  assert.match(page,/function unifiedCredentials\(dashboard=\{\}\)/u);
  assert.match(page,/dashboard\.externalCredentials/u);
  assert.match(page,/sourceIds/u);
  assert.match(page,/linkedCertificateId/u);
  assert.match(page,/credential-passport\.html/u);
});

test("production workflow deploys Firestore rules when credential authority changes", () => {
  const workflow=read(".github/workflows/deploy-firestore-rules.yml");
  assert.match(workflow,/firebase\/firestore\.rules/u);
  assert.match(workflow,/FIREBASE_SERVICE_ACCOUNT_SPEAAKOUT_PORTAL/u);
  assert.match(workflow,/firebaserules\.googleapis\.com\/v1\/projects\/\$FIREBASE_PROJECT_ID\/rulesets/u);
  assert.match(workflow,/releases\/cloud\.firestore/u);
  assert.match(workflow,/updateMask/u);
});

test("credential unification browser modules remain syntactically valid", () => {
  for(const file of [
    "learning-portfolio.html",
    "credential-passport.html",
    "admin-credentials.html",
    "certificate-center.html",
    "certificate-view.html",
    "certificates.html"
  ]){
    const bodies=moduleBodies(read(file));
    assert.ok(bodies.length>0,file+": module script missing");
    for(const body of bodies){
      assert.doesNotThrow(()=>new Function(body),file);
    }
  }
});
