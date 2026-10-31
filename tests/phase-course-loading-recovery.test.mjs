import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../course-player.html',import.meta.url),'utf8');
const bootstrap=source.slice(source.indexOf('async function initializeCourse(user)'),source.indexOf('onAuthStateChanged(auth,async user=>{',source.indexOf('async function initializeCourse(user)')));
function setup({approved=true,profileError=null,courseError=null}={}){
 let profiles=0,courses=0;
 const loading={style:{},children:[],replaceChildren(){this.children=[]},append(...nodes){this.children.push(...nodes)}};
 const context=vm.createContext({loading,courseOverview:{hidden:false},playerArea:{style:{}},currentUser:null,currentProfile:{},console:{error(){}},document:{createElement(){return {}}},loadProfile:async()=>{profiles++;if(profileError)throw profileError},isApprovedProfile:()=>approved,loadCourse:async()=>{courses++;if(courseError)throw courseError}});
 vm.runInContext(bootstrap,context);
 return {context,loading,counts:()=>({profiles,courses})};
}
test('profile failure exposes a manual retry and does not start enrollment',async()=>{
 const s=setup({profileError:new Error('private provider detail')});
 await s.context.initializeCourse({uid:'synthetic'});
 assert.deepEqual(s.counts(),{profiles:1,courses:0});
 assert.equal(s.loading.children[1].textContent,'Try loading course again');
 assert.doesNotMatch(s.loading.children[0].textContent,/private provider/);
 assert.equal(s.context.courseOverview.hidden,true);
 s.context.loadProfile=async()=>{};
 await s.loading.children[1].onclick();
 assert.equal(s.counts().courses,1);
});
test('pending accounts cannot open a course or bypass approval through retry',async()=>{
 const s=setup({approved:false});await s.context.initializeCourse({});
 assert.equal(s.counts().courses,0);assert.equal(s.loading.children.length,0);
 assert.match(s.loading.textContent,/must be approved/);
});
test('capacity errors do not retry enrollment automatically or expose private details',async()=>{
 const s=setup({courseError:Object.assign(new Error('SECRET'),{status:429})});
 await s.context.initializeCourse({});
 assert.equal(s.counts().courses,1);assert.match(s.loading.children[0].textContent,/temporarily busy/);
 assert.equal(s.context.playerArea.style.display,'none');
});
test('roster request failure is reported instead of returning an empty success',async()=>{
 const code=readFileSync(new URL('../js/programmes/programme-workspace.js',import.meta.url),'utf8');
 const fn=code.slice(code.indexOf('async function loadRoster()'),code.indexOf('async function loadMemberships()'));
 const failure=Object.assign(new Error('provider detail'),{status:429});
 const c=vm.createContext({roster:[],rosterMap:null,canManage:()=>true,roleApi:{overview:async()=>{throw failure}},console:{warn(){}}});
 vm.runInContext(fn,c);
 await assert.rejects(c.loadRoster(),e=>e.cause===failure&&/school roster could not load/.test(e.message));
});
