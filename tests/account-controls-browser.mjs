// UI regression test with mocked Firebase. Does not create users or prove live auth.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
const base=process.env.PORTAL_BASE_URL||"http://127.0.0.1:4173";
const evidence="artifacts/access-gateway/accounts";
await mkdir(evidence,{recursive:true});
const browser=await chromium.launch();
const results=[];
async function fixture(user,fail=false){
  const context=await browser.newContext();
  await context.route('**/*',async route=>{
    const request=route.request(),url=new URL(request.url());
    if(url.pathname==='/js/firebase-config.js')return route.fulfill({contentType:'text/javascript',body:`export const auth={};export const db={};`});
    if(url.hostname==='www.gstatic.com'&&url.pathname.endsWith('/firebase-auth.js'))return route.fulfill({contentType:'text/javascript',body:`
      let callback;export function onAuthStateChanged(auth, cb){callback=cb;queueMicrotask(()=>cb(${JSON.stringify(user)}));return ()=>{};}
      export async function signOut(){sessionStorage.setItem('qa-signouts',String(Number(sessionStorage.getItem('qa-signouts')||0)+1));if(${fail})throw Error('QA service unavailable');callback?.(null);}
    `});
    if(request.resourceType()==='script'&&!['/js/account-controls.js','/js/account-session.js'].includes(url.pathname))return route.abort();
    if(url.origin!==new URL(base).origin)return route.abort();
    return route.continue();
  });
  return context;
}
try{
  for(const width of [320,390,1280]){
    for(const path of ['contributor.html','my-learning.html','course-player.html','profile.html','student-dashboard.html','admin-dashboard.html','learning/index.html','pages/academy-native-lessons.html']){
      const context=await fixture({uid:'qa-contributor'}),page=await context.newPage();
      await page.setViewportSize({width,height:844});await page.goto(`${base}/${path}`);
      const account=page.getByRole('navigation',{name:'Account',exact:true});
      const logout=account.getByRole('button',{name:'Logout',exact:true});await logout.waitFor({state:'visible'});
      assert.equal(await account.getByRole('link',{name:'Login',exact:true}).isVisible(),false);
      const box=await logout.boundingBox();assert.ok(box&&box.width>=44&&box.height>=44&&box.x>=0&&box.x+box.width<=width+1,path);
      await logout.focus();assert.equal(await logout.evaluate(el=>el===document.activeElement),true);
      if(path==='contributor.html')await page.screenshot({path:`${evidence}/contributor-${width}.png`,fullPage:false});
      await logout.click();await page.waitForURL(`${base}/auth.html?loggedOut=1`);
      assert.equal(await page.evaluate(()=>sessionStorage.getItem('qa-signouts')),'1');
      results.push({path,width,visibleLogout:true,signedOut:true});await context.close();
    }
  }
  const context=await fixture(null),page=await context.newPage();await page.goto(`${base}/contributor.html`);
  const account=page.getByRole('navigation',{name:'Account',exact:true});await account.getByRole('link',{name:'Login',exact:true}).waitFor({state:'visible'});
  assert.equal(await account.getByRole('button',{name:'Logout',exact:true}).isVisible(),false);await context.close();
  const failing=await fixture({uid:'qa-user'},true),failedPage=await failing.newPage();await failedPage.goto(`${base}/contributor.html`);
  const failedAccount=failedPage.getByRole('navigation',{name:'Account',exact:true});await failedAccount.getByRole('button',{name:'Logout',exact:true}).click();
  await failedAccount.getByText('Could not log out. Please try again.',{exact:true}).waitFor();assert.ok(failedPage.url().endsWith('/contributor.html'));
  assert.equal(await failedAccount.getByRole('button',{name:'Logout',exact:true}).isEnabled(),true);await failing.close();
  await writeFile(`${evidence}/results.json`,JSON.stringify({mockedFirebase:true,results,signedOutLogin:true,failedLogoutRetry:true},null,2));
  console.log(`Account UI: ${results.length} responsive signed-in/logout cases, signed-out login and failed logout passed.`);
}finally{await browser.close();}
