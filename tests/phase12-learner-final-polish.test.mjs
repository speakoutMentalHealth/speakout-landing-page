import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root=new URL("../",import.meta.url);
const read=path=>readFileSync(new URL(path,root),"utf8");

const compactPortalPages=["my-courses.html","my-library.html","progress.html","certificates.html"];

test("compact learner pages use centralized role navigation instead of duplicated menu markup",()=>{
  for(const page of compactPortalPages){
    const source=read(page);
    assert.match(source,/<nav class="links" id="roleNav"><\/nav>/u,page);
    assert.doesNotMatch(source,/<nav class="nav-links">/u,page);
    assert.doesNotMatch(source,/>Student<\/a>[\s\S]*?>School<\/a>/u,page);
  }
});

test("compact learner modules render navigation through one shared role-nav helper",()=>{
  const expected={
    "js/learner/my-courses.js":"Courses",
    "js/learner/my-library.js":"Library",
    "js/learner/progress.js":"Progress",
    "js/learner/certificates.js":"Certificates"
  };

  for(const [file,label] of Object.entries(expected)){
    const source=read(file);
    assert.match(source,/from "\.\/role-nav\.js"/u,file);
    assert.ok(source.includes(`renderLearnerNav(user,"${label}")`),file);
  }

  const helper=read("js/learner/role-nav.js");
  assert.match(helper,/getCurrentProfile/u);
  assert.match(helper,/renderRoleNav\(profile,activeLabel\)/u);
  assert.match(helper,/speakout:nav-updated/u);
});

test("learner shell refreshes asynchronously rendered navigation",()=>{
  const shell=read("js/learner-shell.js");
  assert.match(shell,/document\.addEventListener\("speakout:nav-updated",refreshNavigation\)/u);
  assert.match(shell,/function refreshNavigation\(\)/u);
});

test("learner tables become labelled mobile cards while remaining tables on desktop",()=>{
  const shell=read("js/learner-shell.js");
  const css=read("css/learner-portal.css");

  assert.match(shell,/table\.classList\.add\("learner-card-table"\)/u);
  assert.match(shell,/cell\.setAttribute\("data-label",headers\[index\]/u);
  assert.match(css,/@media\(max-width:760px\)[\s\S]*?table\.learner-card-table tbody/u);
  assert.match(css,/content:attr\(data-label\)/u);
  assert.match(css,/grid-template-columns:minmax\(105px,.7fr\) minmax\(0,1fr\)/u);
});

test("learner pages no longer depend on external Google fonts",()=>{
  const pages=[
    "student-dashboard.html","teacher-dashboard.html","parent-dashboard.html",
    "my-courses.html","my-library.html","progress.html","certificates.html",
    "learning-portfolio.html","credential-passport.html","course-details.html",
    "external-learning-submit.html"
  ];
  for(const page of pages){
    assert.doesNotMatch(read(page),/fonts\.googleapis\.com/u,page);
  }
});

test("library waits for authenticated user before reading protected content",()=>{
  const source=read("js/learner/my-library.js");
  assert.match(source,/SO\.onAuthStateChanged\(SO\.auth,async user/u);
  assert.match(source,/if\(!user\)return/u);
  assert.match(source,/await renderLearnerNav\(user,"Library"\)/u);
  assert.match(source,/await load\(\)/u);
});
