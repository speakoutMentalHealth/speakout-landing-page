/* Chromium browser acceptance for in-site learning videos; YouTube is mocked. */
'use strict';
const {chromium}=require('playwright');
const {readFileSync}=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');

(async()=>{
 const root=path.resolve(__dirname,'..'),browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.route('https://kiddies.test/**',route=>{
   const file=new URL(route.request().url()).pathname.slice(1);
   try{
    const contentType=file.endsWith('.js')?'application/javascript':file.endsWith('.json')?'application/json':file.endsWith('.css')?'text/css':'text/html';
    route.fulfill({body:readFileSync(path.join(root,file)),contentType});
   }catch{route.fulfill({status:404,body:''});}
  });
  await page.route('https://i.ytimg.com/**',route=>route.abort());
  await page.route('https://www.youtube-nocookie.com/**',route=>route.fulfill({body:'<!doctype html><title>Mock YouTube</title>',contentType:'text/html'}));
  await page.goto('https://kiddies.test/kiddies-tv.html');
  await page.waitForSelector('.tile');
  assert.equal(await page.locator('#player').isHidden(),true);
  assert.equal(await page.locator('.tile').count(),25);
  await page.locator('.tile-watch').first().click();
  await page.waitForSelector('#player-frame iframe');
  assert.equal(new URL(page.url()).pathname,'/kiddies-tv.html');
  assert.match(await page.locator('#player-frame iframe').getAttribute('src'),/^https:\/\/www\.youtube-nocookie\.com\/embed\/[a-zA-Z0-9_-]{11}\?/);
  assert.equal(await page.locator('#close-video').isVisible(),true);
  assert.equal(await page.locator('#stop-video-quick').count(),0);
  await page.locator('#close-video').click();
  assert.equal(await page.locator('#player-frame iframe').count(),0);
  assert.equal(await page.locator('#player').isHidden(),true);
  assert.equal(new URL(page.url()).pathname,'/kiddies-tv.html');
  await page.goto('https://kiddies.test/kiddies-tv-watch.html?v=xg4_gWt8N_Q');
  await page.waitForSelector('#watch-video iframe');
  assert.equal(await page.locator('#watch-stop').count(),0);
  assert.equal(await page.locator('#watch-fullscreen').isEnabled(),true);
  assert.equal(new URL(page.url()).pathname,'/kiddies-tv-watch.html');
  await page.goto('https://kiddies.test/kiddies-tv-watch.html?v=aaaaaaaaaaa');
  await page.waitForFunction(()=>document.querySelector('#watch-title').textContent==='This lesson is unavailable');
  assert.equal(await page.locator('#watch-video iframe').count(),0);
  console.log('PASS: featured-first library, in-site playback, close unmounts iframe, watch-page validation. Provider and ad playback are mocked.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
