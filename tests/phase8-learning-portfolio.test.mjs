import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const runtime = (page,module) => read(page) + "\n" + read(module);
const stripImports = source => source.replace(/^\s*import[\s\S]*?;\s*$/gmu,"");

test("learning portfolio is private, authenticated and read-only", () => {
  const source=runtime("learning-portfolio.html","js/learner/learning-portfolio.js");
  assert.match(source,/requireRoles\(allowedRoles/u);
  assert.match(source,/learningApi\.dashboard\(\)/u);
  assert.match(source,/SO\.getAll\("courses"\)/u);
  assert.match(source,/Private by default/u);
  assert.match(source,/Nothing on this page becomes public unless you choose/u);
  assert.doesNotMatch(source,/setDoc\(|addDoc\(|updateDoc\(|deleteDoc\(/u);
  assert.doesNotMatch(source,/externalLearningApi\.start|externalLearningApi\.submit/u);
  assert.doesNotMatch(source,/evidencePublicId|evidenceAssetId|proofData|proofUrl/u);
});

test("portfolio CV summary includes only completed or verified learning", () => {
  const source=runtime("learning-portfolio.html","js/learner/learning-portfolio.js");
  assert.match(source,/function completedCourseIds\(/u);
  assert.match(source,/progress\.filter\(progressComplete\)/u);
  assert.match(source,/external\.filter\(externalVerified\)/u);
  assert.match(source,/const courseNames=completedCourses/u);
  assert.match(source,/learning focus areas, not professional licences or independent skill endorsements/u);
  assert.match(source,/External provider credentials remain issued by their original providers/u);
  assert.match(source,/Review it before adding it to a CV/u);
});

test("portfolio offers deliberate copy share and print actions without a public profile", () => {
  const source=runtime("learning-portfolio.html","js/learner/learning-portfolio.js");
  assert.match(source,/id="copySummary"/u);
  assert.match(source,/navigator\.clipboard\.writeText\(portfolioSummary\)/u);
  assert.match(source,/id="shareSummary"/u);
  assert.match(source,/navigator\.share/u);
  assert.match(source,/id="printPortfolio"/u);
  assert.match(source,/window\.print\(\)/u);
  assert.doesNotMatch(source,/publicPortfolio|portfolioSlug|shareToken|publishPortfolio/u);
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
  const source=runtime("progress.html","js/learner/progress.js");
  assert.match(source,/dashboard\.externalLearning/u);
  assert.match(source,/External Pathways/u);
  assert.match(source,/course-details\.html\?id=/u);
  assert.match(source,/Completion evidence verified/u);
  assert.match(source,/css\/learner-portal\.css/u);
});

test("portfolio and updated learner pages use the unified readable academy typography", () => {
  const styles=read("css/learner-portal.css");
  assert.match(styles,/html\{font-size:17px/u);
  assert.match(styles,/font-family:Arial,"Helvetica Neue",Helvetica,sans-serif/u);
  for(const file of ["learning-portfolio.html","progress.html","certificates.html","my-courses.html"]){
    const source=read(file);
    assert.match(source,/css\/learner-portal\.css/u,file);
    assert.doesNotMatch(source,/fonts\.googleapis\.com\/css2\?family=Outfit/u,file);
  }
});

test("learning portfolio browser module parses successfully", () => {
  const source=read("js/learner/learning-portfolio.js");
  assert.doesNotThrow(()=>new Function(stripImports(source)));
});
