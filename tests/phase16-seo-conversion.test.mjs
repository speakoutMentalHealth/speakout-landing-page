import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root=new URL("../",import.meta.url);
const read=path=>readFileSync(new URL(path,root),"utf8");

test("sitemap excludes generic dynamic TV shells",()=>{
  const sitemap=read("sitemap.xml");
  assert.doesNotMatch(sitemap,/\/watch\.html<\/loc>/u);
  assert.doesNotMatch(sitemap,/\/show\.html<\/loc>/u);
  assert.match(sitemap,/\/tv\.html<\/loc>/u);
  assert.match(sitemap,/\/tv-search\.html<\/loc>/u);
});

test("TV content canonical URLs retain only content identity parameters",()=>{
  const watch=read("js/tv-watch.js");
  assert.match(watch,/canonicalEpisodeUrl/u);
  assert.match(watch,/searchParams\.set\("id",id\)/u);
  assert.doesNotMatch(watch,/canonical\.href=location\.href/u);

  const show=read("js/tv-show.js");
  assert.match(show,/searchParams\.set\("show",slug\)/u);
  assert.doesNotMatch(show,/canonical\.href=location\.href/u);
});

test("public contact form is a real validated handoff",()=>{
  const page=read("pages/contact.html");
  assert.match(page,/id="contactForm"/u);
  assert.match(page,/type="submit">Continue on WhatsApp/u);
  assert.match(page,/name="full_name"/u);
  assert.match(page,/name="email"/u);
  assert.match(page,/name="reason"/u);
  assert.match(page,/name="message"/u);
  assert.match(page,/src="\.\.\/js\/contact-form\.js"/u);

  const js=read("js/contact-form.js");
  assert.match(js,/form\.addEventListener\("submit"/u);
  assert.match(js,/wa\.me\/2348118103510/u);
  assert.match(js,/encodeURIComponent\(body\)/u);
  assert.doesNotMatch(js,/fetch\(|XMLHttpRequest|localStorage|sessionStorage/u);
});

test("Watch page contains one clean service privacy note and no escaped newline artifact",()=>{
  const source=read("watch.html");
  assert.equal((source.match(/class="tv-container tv-service-note"/g)||[]).length,1);
  assert.doesNotMatch(source,/\\n<\/main>/u);
});
