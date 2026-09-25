import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const root=new URL("../",import.meta.url);
const read=path=>readFileSync(new URL(path,root),"utf8");

const pages=[
  "student-dashboard.html","teacher-dashboard.html","parent-dashboard.html",
  "my-courses.html","my-library.html","progress.html","certificates.html",
  "learning-portfolio.html","credential-passport.html","certificate-center.html",
  "course-details.html","external-learning-submit.html"
];

test("learner pages use one responsive shell instead of scattered inline UI code",()=>{
  for(const page of pages){
    const source=read(page);
    assert.match(source,/css\/learner-portal\.css/u,page);
    assert.match(source,/js\/learner-shell\.js/u,page);
    assert.doesNotMatch(source,/<style>/u,page);
    assert.doesNotMatch(source,/<script type="module">/u,page);
    assert.doesNotMatch(source,/dashboard-shared\.css|css\/portal-ui\.css|css\/speakhub-readable\.css/u,page);

    const base=page.replace(/\.html$/u,"");
    const modulePath=`js/learner/${base}.js`;
    assert.ok(source.includes(modulePath),page);
    assert.equal(existsSync(new URL(modulePath,root)),true,modulePath);
  }
});

test("complex learner pages keep page-specific CSS in the pages folder",()=>{
  const complex=[
    "student-dashboard","teacher-dashboard","parent-dashboard",
    "learning-portfolio","credential-passport","certificate-center",
    "course-details","external-learning-submit"
  ];
  for(const base of complex){
    assert.equal(existsSync(new URL(`css/pages/${base}.css`,root)),true,base);
    assert.ok(read(`${base}.html`).includes(`css/pages/${base}.css`),base);
  }
});

test("learner design system separates desktop tablet and mobile navigation without overlays",()=>{
  const css=read("css/learner-portal.css");
  assert.match(css,/@media\(max-width:1100px\)/u);
  assert.match(css,/@media\(max-width:760px\)/u);
  assert.match(css,/\.links,\.nav-links\{[\s\S]*?overflow-x:auto/u);
  assert.match(css,/@media\(max-width:760px\)[\s\S]*?position:static!important/u);
  assert.match(css,/\.menu\{display:none!important\}/u);
  assert.match(css,/\.btn,\.cert-btn,\.search-tab,\.close-btn\{[\s\S]*?width:auto/u);
});

test("learner shell centralizes active navigation tables images and legacy menu cleanup",()=>{
  const shell=read("js/learner-shell.js");
  assert.match(shell,/markCurrentNavigation/u);
  assert.match(shell,/normalizeLegacyNavigation/u);
  assert.match(shell,/document\.body\.classList\.remove\("menu-open"\)/u);
  assert.match(shell,/keepActiveNavVisible/u);
  assert.match(shell,/enhanceTables/u);
  assert.match(shell,/enhanceImages/u);
});

test("extracted learner modules use valid nested import paths and parse after import removal",()=>{
  for(const page of pages){
    const base=page.replace(/\.html$/u,"");
    const source=read(`js/learner/${base}.js`);
    assert.doesNotMatch(source,/from\s+["']\.\//u,base);
    const stripped=source.replace(/^\s*import[\s\S]*?;\s*$/gmu,"");
    assert.doesNotThrow(()=>new Function(stripped),base);
  }
});
