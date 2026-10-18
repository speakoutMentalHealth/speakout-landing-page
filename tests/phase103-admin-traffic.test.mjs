import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import {trafficWindow,signInReceipt,loginSummary,mindCheckSummary} from '../workers/platform-api/src/admin-traffic.js';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const source=readFileSync(new URL('../workers/platform-api/src/index.js',import.meta.url),'utf8');
test('traffic windows follow Lagos midnight including year boundaries',()=>{
 const now=new Date('2026-12-31T23:30:00Z');
 assert.equal(trafficWindow('day',now).start,'2026-12-31T23:00:00.000Z');
 assert.equal(trafficWindow('week',now).start,'2026-12-25T23:00:00.000Z');
 assert.equal(trafficWindow('month',now).start,'2026-12-02T23:00:00.000Z');
 assert.throws(()=>trafficWindow('year'),{status:400});
});
test('verified sign-in receipts deduplicate token refreshes without storing identifying fields',async()=>{
 const now=Date.parse('2026-10-18T23:05:00Z'),identity={uid:'private-user',authTime:now/1000,email:'private@example.org'};
 const a=await signInReceipt(identity,now,'prod'),b=await signInReceipt(identity,now+1000,'prod');
 assert.deepEqual(a,b);assert.equal(a.data.day,'2026-10-19');assert.equal(a.id.length,64);
 assert.doesNotMatch(JSON.stringify(a),/private-user|private@example/);
 assert.notEqual((await signInReceipt(identity,now,'staging')).id,a.id);
 assert.equal(await signInReceipt({...identity,authTime:now/1000-901},now),null);
 assert.equal(await signInReceipt({...identity,authTime:now/1000+61},now),null);
 assert.equal(await signInReceipt({...identity,uid:''},now),null);
});
test('accounts are unique over the whole period, while sign-ins count daily events',()=>{
 const result=loginSummary([{accountKey:'a',day:'2026-10-17'},{accountKey:'a',day:'2026-10-18'},{accountKey:'b',day:'2026-10-18'}],true);
 assert.equal(result.signIns,3);assert.equal(result.accounts,2);assert.equal(result.daily[1].signIns,2);assert.equal(result.truncated,true);
});
test('missing analytics connection never produces a misleading zero',async()=>{
 assert.deepEqual(await mindCheckSummary({},trafficWindow(),()=>assert.fail('no request expected')),{status:'not_configured',visits:null,pages:[]});
});
test('provider reads use fixed HTTPS origin and project only safe public-page counts',async()=>{
 const calls=[],secret='private-token';const request=async(url,opts)=>{calls.push(url);assert.equal(opts.headers.Authorization,'Bearer '+secret);assert.equal(opts.redirect,'error');return {ok:true,json:async()=>url.includes('/total?')?{total:12}:{hits:[{path:'/index.html',count:12,title:'not returned'},{path:'/report.html?email=secret',count:1},{path:'/event.html',event:true,count:1}]}}};
 const data=await mindCheckSummary({GOATCOUNTER_READ_TOKEN:secret},trafficWindow(),request);
 assert.deepEqual(data.pages,[{path:'/index.html',visits:12}]);assert.equal(data.visits,12);assert.equal(calls.length,2);
 assert.ok(calls.every(url=>url.startsWith('https://mindcheck.goatcounter.com/api/v0/stats/')));assert.doesNotMatch(JSON.stringify(data),/private-token|not returned|email/);
});
test('provider outages, authorization failures and malformed counts stay unavailable',async()=>{
 for(const request of [async()=>{throw Error('private-token')},async()=>({ok:false}),async()=>({ok:true,json:async()=>({total:-1,hits:[]})})]){
  const data=await mindCheckSummary({GOATCOUNTER_READ_TOKEN:'private-token'},trafficWindow(),request);assert.equal(data.status,'unavailable');assert.equal(data.visits,null);assert.doesNotMatch(JSON.stringify(data),/private-token/);
 }
});
function harness(){
 let reads=0,writes=0;const stored=new Map();
 const context={Date,Map,trafficWindow,signInReceipt,loginSummary,mindCheckSummary:async()=>({status:'not_configured',visits:null,pages:[]}),requireAdmin:user=>{if(!['admin','super_admin'].includes(user.role))throw Object.assign(Error('Forbidden'),{status:403})},verifiedIdentity:async()=>({uid:'u',authTime:Math.floor(Date.now()/1000)}),runTransaction:async(_env,fn)=>fn({get:async path=>stored.get(path),set:(path,data)=>{writes++;stored.set(path,data)}}),firestoreRequest:async()=>{reads++;return []},databaseUrl:()=>'',decodeFields:f=>f};
 vm.createContext(context);vm.runInContext(source.slice(source.indexOf('const trafficReportCache ='),source.indexOf('async function route('))+'\nglobalThis.report=adminTrafficReport;globalThis.record=recordTrafficSignIn;',context);
 return {context,reads:()=>reads,writes:()=>writes};
}
test('only organisation admins may read reports, including when a cached report exists',async()=>{
 const h=harness(),env={FIREBASE_PROJECT_ID:'test'};await h.context.report(env,{role:'admin'},{period:'week'});assert.equal(h.reads(),1);
 await h.context.report(env,{role:'super_admin'},{period:'week'});assert.equal(h.reads(),1);
 for(const role of ['student','school_admin','contributor',''])await assert.rejects(h.context.report(env,{role},{period:'week'}),{status:403});
 await assert.rejects(h.context.report(env,{role:'admin',supportMode:true},{period:'week'}),{status:403});assert.equal(h.reads(),1);
});
test('repeated verified authentication receipts write once',async()=>{
 const h=harness();await h.context.record({},{});await h.context.record({},{});assert.equal(h.writes(),1);
});
test('private report responses cannot be cached by browsers or intermediaries',()=>{
 assert.match(source,/"cache-control": "private, no-store"/);
});
