import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root=new URL("../",import.meta.url);
const read=path=>readFileSync(new URL(path,root),"utf8");

test("launch navigation points only to supported SpeakOut TV routes",()=>{
  const home=read("index.html");
  assert.doesNotMatch(home,/tv\.html#(?:latest|schedule|library)/u);
  assert.match(home,/tv\.html#watch/u);
  assert.match(home,/tv\.html#live/u);
  for(const file of ["media-center.html","pages/media.html"]){
    const page=read(file);
    assert.doesNotMatch(page,/#library/u,file);
    assert.match(page,/tv\.html/u,file);
    assert.match(page,/noindex,follow/u,file);
  }
});

test("public sitemap contains canonical launch media and excludes redirects and protected routes",()=>{
  const sitemap=read("sitemap.xml");
  for(const url of [
    "https://speakoutmentalhealth.org/tv.html",
    "https://speakoutmentalhealth.org/radio.html",
    "https://speakoutmentalhealth.org/school-register.html",
    "https://speakoutmentalhealth.org/pages/on-the-move.html"
  ]) assert.ok(sitemap.includes("<loc>"+url+"</loc>"),url);
  for(const url of [
    "https://speakoutmentalhealth.org/media-center.html",
    "https://speakoutmentalhealth.org/pages/media.html",
    "https://speakoutmentalhealth.org/kiddies.html",
    "https://speakoutmentalhealth.org/workshops.html"
  ]) assert.equal(sitemap.includes("<loc>"+url+"</loc>"),false,url);
});

test("dynamic and protected launch surfaces opt out of indexing",()=>{
  assert.match(read("tv-search.html"),/<meta name="robots" content="noindex,follow">/u);
  assert.match(read("kiddies.html"),/<meta name="robots" content="noindex,nofollow"\/>/u);
  assert.match(read("workshops.html"),/<meta name="robots" content="noindex,nofollow"\/>/u);
  assert.match(read("school-resources.html"),/<meta name="robots" content="noindex,nofollow"\/>/u);
  const robots=read("robots.txt");
  for(const route of [
    "/admin","/auth","/portal","/student-","/teacher-","/parent-","/school-",
    "/kiddies.html","/workshops.html","/learning/"
  ]) assert.ok(robots.includes("Disallow: "+route),route);
});

test("launch deployments exclude internal artifacts and unused heavyweight originals",()=>{
  const config=read("_config.yml");
  const firebase=JSON.parse(read("firebase.json"));
  for(const item of [
    "SpeakOut_Internship_Letter_Agreement_Friday_Akolo_Dauda.docx",
    "PHASE-3-5-QA-REPORT.txt",
    "PORTAL-REVAMP-NOTES.txt",
    "package-lock.json",
    "academy-hero.png",
    "certificate-hero.png",
    "contact-hero.png",
    "media-hero.png",
    "research-hero.png",
    "volunteer-hero.png",
    "secure-donation.png"
  ]) assert.ok(config.includes(item),item);
  assert.ok(config.includes("*.bundle"));
  assert.ok(firebase.hosting.ignore.includes("*.docx"));
  assert.ok(firebase.hosting.ignore.includes("*.bundle"));
  for(const item of [
    "academy-hero.png","certificate-hero.png","contact-hero.png","media-hero.png",
    "research-hero.png","volunteer-hero.png","secure-donation.png"
  ]) assert.ok(firebase.hosting.ignore.includes(item),item);
});

test("public media loader permits normal browser cache revalidation",()=>{
  const source=read("js/tv-data.js");
  assert.match(source,/cache:"default"/u);
  assert.doesNotMatch(source,/cache:"no-store"/u);
  assert.match(source,/\/v1\/media\/tv/u);
  assert.match(source,/\/v1\/media\/audio/u);
});

test("legacy generic learning shells hand off to maintained launch routes",()=>{
  const source=read("production-ready.js");
  assert.match(source,/legacyLearningRoutes/u);
  assert.match(source,/'course-player\.html':'course-player\.html'/u);
  assert.match(source,/'book-reader\.html':'book-reader\.html'/u);
  assert.match(source,/isDirectLearningShell/u);
  assert.match(source,/location\.replace\('\.\.\/'\+target\+location\.search\+location\.hash\)/u);
});

test("protected resource hub contains no dead download placeholders",()=>{
  const page=read("school-resources.html");
  assert.doesNotMatch(page,/Replace placeholders with real Google Drive links/u);
  assert.doesNotMatch(page,/href="#"[^>]*>Download/u);
  for(const destination of [
    "school-resource-center.html","teacher-library.html","my-library.html",
    "parent-library.html","portal.html","my-courses.html"
  ]) assert.ok(page.includes('href="'+destination+'"'),destination);
});

test("legacy Media Centre navigation no longer creates redirect hops",()=>{
  const pages=[
    "pages/news.html","pages/research.html","pages/donate.html","pages/partners.html",
    "pages/contact.html","pages/volunteer.html","pages/about.html","pages/resources.html",
    "pages/programs.html","pages/impact.html","pages/schools.html","pages/academy.html",
    "school-register.html","evidence-hub.html","certificate-center.html","school-partnership-dashboard.html"
  ];
  for(const file of pages){
    const page=read(file);
    assert.doesNotMatch(page,/href="(?:\.\.\/)?pages\/media\.html"|href="media-center\.html"/u,file);
  }
});
