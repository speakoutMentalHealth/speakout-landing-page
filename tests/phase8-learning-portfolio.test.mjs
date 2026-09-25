import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

function moduleBody(source){
  const match=source.match(/<script type="module">([\s\S]*?)<\/script>/u);
  assert.ok(match,"module script missing");
  return match[1]
    .replace(/^import[\s\S]*?from\s+["'][^"']+["'];?\s*$/gmu,"")
    .replace(/^import\s+["'][^"']+["'];?\s*$/gmu,"");
}

test("learning portfolio is private, authenticated and read-only", () => {
  const page=read("learning-portfolio.html");
  assert.match(page,/requireRoles\(allowedRoles/u);
  assert.match(page,/learningApi\.dashboard\(\)/u);
  assert.match(page,/SO\.getAll\("courses"\)/u);
  assert.match(page,/Private by default/u);
  assert.match(page,/Nothing on this page becomes public unless you choose/u);
  assert.doesNotMatch(page,/setDoc\(|addDoc\(|updateDoc\(|deleteDoc\(/u);
  assert.doesNotMatch(page,/externalLearningApi\.start|externalLearningApi\.submit/u);
  assert.doesNotMatch(page,/evidencePublicId|evidenceAssetId|proofData|proofUrl/u);
});

test("portfolio CV summary includes only completed or verified learning", () => {
  const page=read("learning-portfolio.html");
  assert.match(page,/function completedCourseIds\(/u);
  assert.match(page,/progress\.filter\(progressComplete\)/u);
  assert.match(page,/external\.filter\(externalVerified\)/u);
  assert.match(page,/const courseNames=completedCourses/u);
  assert.match(page,/learning focus areas, not professional licences or independent skill endorsements/u);
  assert.match(page,/External provider credentials remain issued by their original providers/u);
  assert.match(page,/Review it before adding it to a CV/u);
});

test("portfolio offers deliberate copy share and print actions without a public profile", () => {
  const page=read("learning-portfolio.html");
  assert.match(page,/id="copySummary"/u);
  assert.match(page,/navigator\.clipboard\.writeText\(portfolioSummary\)/u);
  assert.match(page,/id="shareSummary"/u);
  assert.match(page,/navigator\.share/u);
  assert.match(page,/id="printPortfolio"/u);
  assert.match(page,/window\.print\(\)/u);
  assert.doesNotMatch(page,/publicPortfolio|portfolioSlug|shareToken|publishPortfolio/u);
});

test("portfolio is linked from learner navigation and dashboards", () => {
  const nav=read("launch-role-guard.js");
  const portfolioLinks=(nav.match(/"Portfolio",\s*"learning-portfolio\.html"/gu)||[]).length;
  assert.ok(portfolioLinks>=5,`expected portfolio navigation for learner roles, found ${portfolioLinks}`);

  for(const file of ["student-dashboard.html","teacher-dashboard.html","parent-dashboard.html","my-courses.html","progress.html","certificates.html"]){
    assert.match(read(file),/learning-portfolio\.html/u,file);
  }
});

test("progress view combines SpeakHub and tracked external learning", () => {
  const page=read("progress.html");
  assert.match(page,/dashboard\.externalLearning/u);
  assert.match(page,/External Pathways/u);
  assert.match(page,/course-details\.html\?id=/u);
  assert.match(page,/Completion evidence verified/u);
  assert.match(page,/css\/speakhub-readable\.css/u);
});

test("portfolio and updated learner pages use the readable academy typography", () => {
  for(const file of ["learning-portfolio.html","progress.html","certificates.html","my-courses.html"]){
    const source=read(file);
    assert.match(source,/css\/speakhub-readable\.css/u,file);
    assert.doesNotMatch(source,/fonts\.googleapis\.com\/css2\?family=Outfit/u,file);
  }
});

test("learning portfolio browser module parses successfully", () => {
  const source=read("learning-portfolio.html");
  assert.doesNotThrow(()=>new Function(moduleBody(source)));
});
