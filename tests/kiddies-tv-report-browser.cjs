/* Kiddies TV report, filters, and approved-video browser acceptance. Provider playback mocked. */
'use strict';
const {chromium}=require('playwright'),{readFileSync}=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'..'),browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.route('https://kiddies.test/**',route=>{
   const file=new URL(route.request().url()).pathname.slice(1);
   try{route.fulfill({body:readFileSync(path.join(root,file)),contentType:file.endsWith('.js')?'application/javascript':file.endsWith('.json')?'application/json':file.endsWith('.css')?'text/css':'text/html'});}
   catch{route.fulfill({status:404,body:''});}
  });
  await page.route('https://i.ytimg.com/**',route=>route.abort());
  await page.route('https://www.youtube-nocookie.com/**',route=>route.fulfill({body:'Mock player: no real playback assertion'}));
  await page.goto('https://kiddies.test/kiddies-tv.html');
  await page.waitForSelector('[data-report-video]');
  assert.equal(await page.locator('[data-report-video]').count(),30);
  const selectedVideoId=await page.locator('[data-report-video]').first().getAttribute('data-report-video');
  await page.locator('[data-report-video]').first().click();
  assert.equal(await page.locator('dialog').evaluate(d=>d.open),true);
  assert.ok(decodeURIComponent(await page.locator('#report-whatsapp').getAttribute('href')).includes(selectedVideoId));
  await page.selectOption('#report-reason',{label:'Video unavailable or not playing'});
  assert.ok(decodeURIComponent(await page.locator('#report-email').getAttribute('href')).includes('Video unavailable or not playing'));
  await page.keyboard.press('Escape');assert.equal(await page.locator('dialog').evaluate(d=>d.open),false);
  await page.selectOption('#age','10-12');
  await page.getByRole('button',{name:'Mathematics',exact:true}).click();
  await page.locator('#surprise-video').click();
  assert.match(await page.locator('#player-title').textContent(),/Multiplication/);
  await page.selectOption('#age','13-17');
  await page.getByRole('button',{name:'All lessons',exact:true}).click();
  await page.locator('#close-video').click();
  assert.equal(await page.locator('#surprise-video').isEnabled(),true);
  assert.equal(await page.locator('#player-frame iframe').count(),0);
  assert.equal(await page.locator('#empty').isHidden(),true);
  assert.equal(await page.locator('#teen-review-status').isHidden(),true);
  assert.equal(await page.locator('.rail-section--teen .tile').count(),5);
  await page.goto('https://kiddies.test/kiddies-tv-watch.html?v=xg4_gWt8N_Q');
  await page.waitForSelector('[data-report-video]');
  await page.locator('[data-report-video]').click();
  assert.ok(decodeURIComponent(await page.locator('#report-email').getAttribute('href')).includes('xg4_gWt8N_Q'));
  await page.goto('https://kiddies.test/kiddies-tv-watch.html?v=aaaaaaaaaaa');
  await page.waitForFunction(()=>document.querySelector('#watch-title').textContent==='This lesson is unavailable');
  assert.equal(await page.locator('[data-report-video]').count(),0);
  console.log('PASS: reporting, age/subject filters, empty state, featured selection, approved-only watch reporting. Third-party playback remains mocked.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
