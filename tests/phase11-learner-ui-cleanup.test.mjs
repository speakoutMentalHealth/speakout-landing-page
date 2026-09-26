import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const root=new URL("../",import.meta.url);
const read=path=>readFileSync(new URL(path,root),"utf8");

const learnerPages=[
  "student-dashboard.html","teacher-dashboard.html","parent-dashboard.html",
  "my-courses.html","my-library.html","progress.html","certificates.html",
  "learning-portfolio.html","credential-passport.html","certificate-center.html",
  "course-details.html","external-learning-submit.html"
];

test("learner CSS loads shared system before page-specific overrides",()=>{
  for(const page of learnerPages){
    const source=read(page);
    const shared=source.indexOf('css/learner-portal.css');
    assert.ok(shared>=0,page);

    const pageCss=[...source.matchAll(/css\/pages\/([^"']+)\.css/gu)].map(match=>match.index);
    for(const index of pageCss){
      assert.ok(index>shared,`${page}: page CSS must load after learner-portal.css`);
    }
  }
});

test("role dashboards share one small page stylesheet instead of three copies",()=>{
  for(const page of ["student-dashboard.html","teacher-dashboard.html","parent-dashboard.html"]){
    const source=read(page);
    assert.match(source,/css\/pages\/role-dashboard\.css/u,page);
    assert.doesNotMatch(source,/css\/pages\/(student|teacher|parent)-dashboard\.css/u,page);
  }

  assert.equal(existsSync(new URL("css/pages/role-dashboard.css",root)),true);
  for(const oldFile of [
    "css/pages/student-dashboard.css",
    "css/pages/teacher-dashboard.css",
    "css/pages/parent-dashboard.css"
  ]){
    assert.equal(existsSync(new URL(oldFile,root)),false,oldFile);
  }
});

test("learner HTML contains no scattered inline presentation or inline event JavaScript",()=>{
  for(const page of learnerPages){
    const source=read(page);
    assert.doesNotMatch(source,/\sstyle="/u,page);
    assert.doesNotMatch(source,/\son[a-z]+="/u,page);
    assert.doesNotMatch(source,/<style[\s>]/u,page);
    assert.doesNotMatch(source,/<script(?![^>]*src=)[^>]*>[\s\S]*?<\/script>/u,page);
  }
});

test("shared learner utilities own repeated status credential and URL helpers",()=>{
  const ui=read("js/learner/ui-utils.js");
  const credentials=read("js/learner/credential-utils.js");
  const portfolio=read("js/learner/learning-portfolio.js");
  const certificates=read("js/learner/certificates.js");
  const passport=read("js/learner/credential-passport.js");

  assert.match(ui,/export const normalize=/u);
  assert.match(ui,/export function safeHttpsUrl/u);
  assert.match(ui,/export function statusLabel/u);
  assert.match(credentials,/export function unifiedCredentialRecords/u);

  assert.match(portfolio,/from "\.\/ui-utils\.js"/u);
  assert.match(portfolio,/from "\.\/credential-utils\.js"/u);
  assert.match(certificates,/from "\.\/credential-utils\.js"/u);
  assert.match(passport,/from "\.\/ui-utils\.js"/u);

  assert.doesNotMatch(portfolio,/function unifiedCredentialRecords/u);
  assert.doesNotMatch(certificates,/function unifiedCredentials/u);
  assert.doesNotMatch(passport,/const safeHref=/u);
});

test("page-specific learner CSS is lean and does not redefine the global shell",()=>{
  const lean=[
    "css/pages/credential-passport.css",
    "css/pages/external-learning-submit.css",
    "css/pages/course-details.css",
    "css/pages/learning-portfolio.css",
    "css/pages/role-dashboard.css"
  ];

  for(const file of lean){
    const source=read(file);
    assert.doesNotMatch(source,/\bbody\s*\{/u,file);
    assert.doesNotMatch(source,/\.nav\s*\{/u,file);
    assert.doesNotMatch(source,/\.nav-inner\s*\{/u,file);
    assert.doesNotMatch(source,/\.brand\s*\{/u,file);
    assert.doesNotMatch(source,/\.btn\s*\{/u,file);
  }
});

test("shared learner system contains premium desktop tablet and mobile primitives",()=>{
  const css=read("css/learner-portal.css");
  assert.match(css,/\.controls\{[\s\S]*?grid-template-columns/u);
  assert.match(css,/\.icon\{[\s\S]*?linear-gradient/u);
  assert.match(css,/@media\(min-width:1101px\)[\s\S]*?overflow:visible/u);
  assert.match(css,/@media\(max-width:1100px\)/u);
  assert.match(css,/@media\(max-width:760px\)/u);
  assert.match(css,/\.initially-hidden\{display:none\}/u);
});
