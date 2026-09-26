import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL("../"+path, import.meta.url), "utf8");
const combined = (page,module) => read(page) + "\n" + read(module);
const stripImports = source => source.replace(/^\s*import[\s\S]*?;\s*$/gmu,"");

function moduleSources(file){
  const page=read(file);
  const sources=[...page.matchAll(/<script type="module">([\s\S]*?)<\/script>/gu)].map(match=>match[1]);
  for(const match of page.matchAll(/<script type="module" src="([^"]+)"><\/script>/gu)){
    sources.push(read(match[1]));
  }
  return sources;
}

test("Credential Passport uses authenticated server APIs instead of browser Firestore writes", () => {
  const source=combined("credential-passport.html","js/learner/credential-passport.js");
  const client=read("js/platform-api.js");
  const worker=read("workers/platform-api/src/index.js");

  assert.match(source,/credentialApi\.list\(\)/u);
  assert.match(source,/credentialApi\.submit\(payload\)/u);
  assert.doesNotMatch(source,/firebase-firestore|addDoc\(|setDoc\(|updateDoc\(|deleteDoc\(/u);
  assert.match(source,/Professional Certification \(provider-reported\)/u);
  assert.match(source,/does not grant professional licensure/u);
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
  const center=combined("certificate-center.html","js/learner/certificate-center.js");
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
  const source=combined("learning-portfolio.html","js/learner/learning-portfolio.js");
  const credentialUtils=read("js/learner/credential-utils.js");
  const worker=read("workers/platform-api/src/index.js");
  assert.match(source,/unifiedCredentialRecords\(dashboard\.certificates\|\|\[\],manualCredentials\)/u);
  assert.match(credentialUtils,/function unifiedCredentialRecords\(certificates=\[\],manual=\[\]\)/u);
  assert.match(credentialUtils,/sourceCredentialIds/u);
  assert.match(source,/dashboard\.externalCredentials/u);
  assert.match(source,/const credentialNames=credentials/u);
  assert.match(source,/Credential Passport/u);
  assert.match(worker,/externalCredentials: credentialPage\.documents\.map/u);
});

test("certificate list uses the same canonical plus verified Passport view", () => {
  const source=combined("certificates.html","js/learner/certificates.js");
  const credentialUtils=read("js/learner/credential-utils.js");
  assert.match(source,/unifiedCredentialRecords\(dashboard\.certificates\|\|\[\],dashboard\.externalCredentials\|\|\[\]\)/u);
  assert.match(source,/dashboard\.externalCredentials/u);
  assert.match(credentialUtils,/linkedCertificateId/u);
  assert.match(credentialUtils,/sourceCredentialIds/u);
  assert.match(source,/credential-passport\.html/u);
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
    const sources=moduleSources(file);
    assert.ok(sources.length>0,file+": module script missing");
    for(const source of sources){
      assert.doesNotThrow(()=>new Function(stripImports(source)),file);
    }
  }
});

test("Portfolio laptop navigation cannot inherit the legacy mobile dropdown", () => {
  const page=read("learning-portfolio.html");
  const styles=read("css/learner-portal.css");
  const shell=read("js/learner-shell.js");

  assert.doesNotMatch(page,/dashboard-shared\.css/u);
  assert.match(page,/css\/learner-portal\.css/u);
  assert.match(styles,/\.links,\.nav-links\{[\s\S]*?overflow-x:auto/u);
  assert.match(styles,/@media\(max-width:1100px\)[\s\S]*?overflow-x:auto/u);
  assert.match(styles,/@media\(max-width:760px\)[\s\S]*?position:static!important/u);
  assert.match(shell,/document\.body\.classList\.remove\("menu-open"\)/u);
});
