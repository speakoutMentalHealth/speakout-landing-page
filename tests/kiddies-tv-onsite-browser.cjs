/* Optional Chromium acceptance check: node tests/kiddies-tv-onsite-browser.cjs
 * Uses mocked YouTube iframe responses. It does not test real YouTube ads.
 */
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
        const body=readFileSync(path.join(root,file));
        const contentType=file.endsWith('.js')?'application/javascript':file.endsWith('.json')?'application/json':file.endsWith('.css')?'text/css':'text/html';
        route.fulfill({body,contentType});
      }catch{route.fulfill({status:404,body:''});}
    });
    await page.route('https://i.ytimg.com/**',route=>route.abort());
    await page.route('https://www.youtube-nocookie.com/**',route=>route.fulfill({body:'<!doctype html><title>Mock YouTube</title>',contentType:'text/html'}));
    await page.goto('https://kiddies.test/kiddies-tv.html');
    await page.locator('.tile button[aria-label^="Watch "]').first().click();
    await page.waitForSelector('#player-frame iframe');
    assert.equal(new URL(page.url()).pathname,'/kiddies-tv.html');
    assert.match(await page.locator('#player-frame iframe').getAttribute('src'),/^https:\/\/www\.youtube-nocookie\.com\/embed\/[a-zA-Z0-9_-]{11}\?/);
    assert.equal(await page.locator('#stop-video-quick').isVisible(),true);
    await page.locator('#stop-video-quick').click();
    assert.equal(await page.locator('#player-frame iframe').count(),0);
    assert.equal(await page.locator('#stop-video-quick').isVisible(),false);
    assert.equal(new URL(page.url()).pathname,'/kiddies-tv.html');

    await page.goto('https://kiddies.test/kiddies-tv-watch.html?v=xg4_gWt8N_Q');
    await page.waitForSelector('#watch-video iframe');
    assert.equal(await page.locator('#watch-stop').isVisible(),true);
    assert.equal(new URL(page.url()).pathname,'/kiddies-tv-watch.html');
    await page.locator('#watch-stop').click();
    assert.equal(await page.locator('#watch-video iframe').count(),0);
    assert.equal(await page.locator('#watch-stop').isVisible(),false);
    assert.equal(await page.locator('#watch-fullscreen').isDisabled(),true);
    assert.equal(new URL(page.url()).pathname,'/kiddies-tv-watch.html');

    console.log('PASS: on-site library and watch-page playback; manual stop removes both mock frames. Real YouTube/ad tests remain outstanding.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
