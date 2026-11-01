'use strict';
const {chromium}=require('playwright');
const {readFileSync}=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const [label,viewport] of [['small-phone',{width:320,height:760}],['phone',{width:390,height:844}],['desktop',{width:1440,height:900}]]){
   const page=await browser.newPage({viewport});
   await page.route('https://kiddies.test/**',route=>{
    const name=new URL(route.request().url()).pathname.slice(1);
    try{const raw=readFileSync(path.join(root,name));
      route.fulfill({body:raw,contentType:name.endsWith('.css')?'text/css':name.endsWith('.js')?'application/javascript':'text/html'});
    }catch{route.fulfill({status:404,body:''});}
   });
   await page.route('https://www.gstatic.com/**',route=>route.abort());
   await page.goto('https://kiddies.test/admin-kiddies-tv.html');
   await page.locator('#studio-app').evaluate(el=>{el.hidden=false});
   const ids=['bulk-text','bulk-preview','bulk-submit','review-queue','coverage-body','audit-list','audit-more'];
   for(const id of ids)assert.equal(await page.locator('#'+id).count(),1,id+' missing for '+label);
   const width=await page.evaluate(()=>({viewport:innerWidth,scroll:document.documentElement.scrollWidth}));
   assert(width.scroll<=width.viewport+2,label+' horizontal overflow '+JSON.stringify(width));
   assert.equal(await page.locator('#bulk-submit').isDisabled(),true,'draft import requires validation');
   assert.match(await page.locator('#bulk-heading').textContent(),/Import multiple draft lessons/);
   assert.match(await page.locator('#coverage-heading').textContent(),/Age and subject coverage/);
   await page.close();
  }
  console.log('PASS: mobile/desktop Kiddies TV admin workflow panels, accessible labels, no horizontal overflow.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
