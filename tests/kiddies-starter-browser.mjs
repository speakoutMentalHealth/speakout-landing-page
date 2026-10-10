import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
const require=createRequire(import.meta.url),base=process.env.PORTAL_BASE_URL||'http://127.0.0.1:4173';
const pack=JSON.parse(await readFile('firestore-seed/kiddies-starter-pack.json','utf8'));
const browser=await chromium.launch();
try {
 for(const width of [320,390,768,1280]){
  const page=await browser.newPage({viewport:{width,height:844}});await page.goto(`${base}/kiddies-review.html`);
  await page.getByText('Review copy ready. Nothing has been imported or published.',{exact:true}).waitFor();
  assert.equal(await page.locator('#chapters article').count(),6);
  await page.getByText('School material · provisional partial mappings · not curriculum verified',{exact:true}).waitFor();
  assert.equal(await page.locator('#curriculumReview li').count(),7);
  await page.getByRole('button',{name:'Primary activity book',exact:true}).click();
  await page.getByRole('heading',{name:'Primary: Read, Explain and Solve',exact:true}).waitFor();
  await page.getByText('School material · outcome mapping pending · not curriculum verified',{exact:true}).waitFor();
  assert.equal(await page.locator('#curriculumReview li').count(),2);
  assert.equal(await page.locator('#courseModules li').count(),6);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
  const issues=await page.evaluate(async()=>{const r=await axe.run(document.querySelector('main'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa']}});return r.violations.map(v=>v.id);});assert.deepEqual(issues,[],`Review accessibility at ${width}`);
  await page.emulateMedia({media:'print'});assert.equal(await page.locator('#courseOutline').isVisible(),false);assert.equal(await page.locator('#book').isVisible(),true);await page.close();
 }
 {
  const poisoned=structuredClone(pack);poisoned.books[0].chapters[0].content+='<img src=x onerror="window.executed=true"><script>window.executed=true</script>';
  const page=await browser.newPage();await page.route('**/firestore-seed/kiddies-starter-pack.json',route=>route.fulfill({json:poisoned}));await page.goto(`${base}/kiddies-review.html`);await page.getByText('Review copy ready. Nothing has been imported or published.',{exact:true}).waitFor();assert.equal(await page.evaluate(()=>Boolean(window.executed)),false);assert.equal(await page.locator('#chapters img,#chapters script').count(),0);await page.close();
 }
 for(const existing of [false,true]){
  const page=await browser.newPage();await page.addInitScript(value=>{window.existing=value;window.writes=[];},existing);
  await page.route('**/launch-role-guard.js',route=>route.fulfill({contentType:'application/javascript',body:'export function requireRoles(roles,callback){window.allowedRoles=roles;callback({uid:"admin"},{role:"admin"})}'}));
  await page.route('**/firebase-config.js',route=>route.fulfill({contentType:'application/javascript',body:'export const db={};'}));
  await page.route('**/firebase-firestore.js',route=>route.fulfill({contentType:'application/javascript',body:'export const doc=(_db,collection,id)=>({collection,id});export const serverTimestamp=()=>"server-time";export async function runTransaction(db,callback){const pending=[];await callback({get:async()=>({exists:()=>window.existing}),set:(ref,value)=>pending.push({ref,value})});window.writes.push(...pending)}'}));
  page.on('dialog',dialog=>dialog.accept());await page.goto(`${base}/admin-kiddies-review.html`);await page.getByText('Administrator verified. Importing creates drafts only.',{exact:true}).waitFor();assert.deepEqual(await page.evaluate(()=>window.allowedRoles),['admin','super_admin']);await page.getByRole('button',{name:'Import four draft records'}).click();
  await page.getByText(existing?'Import stopped: one or more starter IDs already exist. Existing content was left unchanged.':'Created 2 draft books and 2 course outlines. Nothing was published.',{exact:true}).waitFor();
  const writes=await page.evaluate(()=>window.writes);assert.equal(writes.length,existing?0:4);assert.ok(writes.every(row=>row.value.status==='draft'));await page.close();
 }
 console.log('Kiddies pack: responsive/accessible review, print view, safe text rendering and draft-only/no-overwrite admin import passed (mocked Firebase).');
}finally{await browser.close();}
