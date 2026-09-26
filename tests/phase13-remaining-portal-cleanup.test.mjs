import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root=new URL("../",import.meta.url);
const read=path=>readFileSync(new URL(path,root),"utf8");

const remainingPortalPages=[
  "settings.html",
  "school-resources.html",
  "ambassador-dashboard.html"
];

test("remaining portal pages use the shared responsive learner system",()=>{
  for(const page of remainingPortalPages){
    const source=read(page);
    assert.match(source,/css\/learner-portal\.css/u,page);
    assert.match(source,/js\/learner-shell\.js/u,page);
    assert.match(source,/js\/learner\/simple-portal-page\.js/u,page);
    assert.match(source,/<nav class="links" id="roleNav"><\/nav>/u,page);
    assert.doesNotMatch(source,/dashboard-shared\.css|css\/portal-ui\.css|fonts\.googleapis\.com/u,page);
    assert.doesNotMatch(source,/\son[a-z]+="/u,page);
    assert.doesNotMatch(source,/<script(?![^>]*src=)[^>]*>[\s\S]*?<\/script>/u,page);
  }
});

test("school resources no longer presents placeholder hash links as downloads",()=>{
  const source=read("school-resources.html");
  assert.doesNotMatch(source,/href="#"/u);
  assert.match(source,/In Preparation/u);
  assert.match(source,/aria-disabled="true"/u);
});

test("legacy nested learner routes redirect to canonical organized pages",()=>{
  const courses=read("learning/my-courses.html");
  const library=read("learning/my-library.html");
  const redirect=read("js/learner/legacy-redirect.js");

  assert.match(courses,/data-redirect-target="\.\.\/my-courses\.html"/u);
  assert.match(courses,/rel="canonical" href="\.\.\/my-courses\.html"/u);
  assert.match(library,/data-redirect-target="\.\.\/my-library\.html"/u);
  assert.match(library,/rel="canonical" href="\.\.\/my-library\.html"/u);
  assert.match(courses,/js\/learner\/legacy-redirect\.js/u);
  assert.match(library,/js\/learner\/legacy-redirect\.js/u);
  assert.doesNotMatch(courses,/dashboard-shared|fonts\.googleapis|SO\.getAll/u);
  assert.doesNotMatch(library,/dashboard-shared|fonts\.googleapis|SO\.getAll/u);
  assert.match(redirect,/destination\.search=window\.location\.search/u);
  assert.match(redirect,/destination\.hash=window\.location\.hash/u);
});

test("ambassador routing points to the real dashboard everywhere",()=>{
  const guard=read("launch-role-guard.js");
  assert.doesNotMatch(guard,/"ambassador\.html"/u);
  const dashboardReferences=(guard.match(/"ambassador-dashboard\.html"/gu)||[]).length;
  assert.ok(dashboardReferences>=2,`expected dashboard route and nav link, found ${dashboardReferences}`);
});

test("shared simple portal bootstrap parses and renders centralized navigation",()=>{
  const source=read("js/learner/simple-portal-page.js");
  assert.match(source,/renderLearnerNav/u);
  assert.match(source,/SO\.onAuthStateChanged/u);
  const stripped=source.replace(/^\s*import[\s\S]*?;\s*$/gmu,"");
  assert.doesNotThrow(()=>new Function(stripped));
});
