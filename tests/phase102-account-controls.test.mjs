import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
const root=fileURLToPath(new URL("../",import.meta.url));
const read=p=>readFileSync(resolve(root,p),"utf8");

function sessionHarness({blocked=false, fail=false}={}){
  const data=new Map([["speakoutSupportSchoolId","old-school"],["unrelated-preference","keep"]]);
  const storage={setItem(k,v){if(blocked)throw Error("blocked");data.set(k,v);},removeItem(k){if(blocked)throw Error("blocked");data.delete(k);}};
  const redirects=[];let signouts=0;
  const window={localStorage:storage,sessionStorage:storage,location:{replace:url=>redirects.push(url)}};
  const source=read("js/account-session.js").replace(/^import .*;\n/gm,"").replace(/export /g,"").replaceAll('import.meta.url','"https://example.test/portal/js/account-session.js"');
  const logout=new Function("auth","signOut","window",`${source}\nreturn logoutSession;`)({},async()=>{signouts++;if(fail)throw Error("offline");},window);
  return {logout,data,redirects,get signouts(){return signouts;}};
}

test("logout ends Firebase authentication once, clears role/support hints and preserves unrelated preferences",async()=>{
  const h=sessionHarness();
  await Promise.all([h.logout(),h.logout()]);
  assert.equal(h.signouts,1);
  assert.equal(h.data.get("speakoutManualLogout"),"true");
  assert.equal(h.data.has("speakoutSupportSchoolId"),false);
  assert.equal(h.data.get("unrelated-preference"),"keep");
  assert.deepEqual(h.redirects,["https://example.test/portal/auth.html?loggedOut=1"]);
});
test("blocked browser storage cannot prevent sign-out",async()=>{
  const h=sessionHarness({blocked:true});await h.logout();assert.equal(h.signouts,1);assert.equal(h.redirects.length,1);
});
test("failed sign-out does not claim success and allows retry",async()=>{
  const h=sessionHarness({fail:true});await assert.rejects(h.logout());await assert.rejects(h.logout());assert.equal(h.signouts,2);assert.equal(h.redirects.length,0);
});

function accountHarness(){
  let observer,listener,authError,finish;
  const login={},logout={},status={};
  const account={setAttribute(){},querySelector:s=>s==='a'?login:s==='button'?logout:status};
  const header={querySelectorAll:()=>[],insertAdjacentElement(position,element){assert.equal(position,'afterend');assert.equal(element,account);}};
  const document={head:{append(){}},querySelector:()=>header,createElement:tag=>tag==='nav'?account:{},addEventListener(type,handler,capture){assert.equal(type,'click');assert.equal(capture,true);listener=handler;}};
  const source=read('js/account-controls.js').replace(/^import .*;\n/gm,'').replaceAll('import.meta.url','"https://example.test/js/account-controls.js"');
  let calls=0;
  new Function('auth','onAuthStateChanged','loginUrl','logoutSession','document','window','MutationObserver',source)({},(_,cb,error)=>{observer=cb;authError=error;},'https://example.test/auth.html',()=>{calls++;return new Promise(r=>finish=r);},document,{},class {observe(){}});
  return {login,logout,status,auth:user=>observer(user),error:()=>authError(),click:()=>listener({target:{closest:()=>logout},preventDefault(){},stopImmediatePropagation(){}}),finish:()=>finish(),get calls(){return calls;}};
}
test("account actions follow auth state without depending on role approval or profile reads",()=>{
  const h=accountHarness();h.auth(null);assert.equal(h.login.hidden,false);assert.equal(h.logout.hidden,true);
  h.auth({uid:'pending-contributor'});assert.equal(h.login.hidden,true);assert.equal(h.logout.hidden,false);
  h.auth(null);assert.equal(h.logout.hidden,true);
});
test("legacy logout clicks are captured, repeated taps deduplicated and progress announced",async()=>{
  const h=accountHarness();h.auth({uid:'contributor'});const click=h.click();await h.click();assert.equal(h.calls,1);assert.equal(h.logout.disabled,true);assert.match(h.status.textContent,/Logging out/);h.finish();await click;
});
test("every maintained page with a header loads account controls at the right depth",()=>{
  function walk(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
    if(['.git','node_modules','artifacts','demo'].includes(entry.name))return [];
    const path=resolve(dir,entry.name);return entry.isDirectory()?walk(path):path.endsWith('.html')?[path]:[];
  });}
  let checked=0;
  for(const path of walk(root)){
    const name=relative(root,path);if(/^(seed-|cleanup-)/.test(name))continue;
    const source=readFileSync(path,'utf8');if(!source.includes('<header'))continue;
    const script=source.match(/<script type="module" src="([^"]*js\/account-controls\.js)"><\/script>/);
    assert.ok(script,`${name} needs account controls`);
    assert.equal(resolve(dirname(path),script[1]),resolve(root,'js/account-controls.js'),name);checked++;
  }
  assert.ok(checked>140);
});
test("contributor route resolves to its actual page",()=>{
  assert.doesNotMatch(read('launch-role-guard.js'),/contributor-dashboard\.html/);
  assert.doesNotMatch(read('contributor.html'),/contributor-dashboard\.html/);
});
