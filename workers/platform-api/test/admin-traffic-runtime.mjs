import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
const helper=readFileSync(new URL('../src/admin-traffic.js',import.meta.url),'utf8');
let mode='success',calls=[];
const mf=new Miniflare(convertV4MiniflareOptions({
 compatibilityDate:'2026-09-09',compatibilityFlags:['nodejs_compat'],
 modules:[{type:'ESModule',path:'main.js',contents:`import {mindCheckSummary,trafficWindow} from './admin-traffic.js';export default {async fetch(request,env){return Response.json(await mindCheckSummary(env,trafficWindow('day')))}}`},{type:'ESModule',path:'admin-traffic.js',contents:helper}],
 bindings:{GOATCOUNTER_READ_TOKEN:'runtime-fixture-token'},
 outboundService:async request=>{
  const url=new URL(request.url);calls.push(url.origin);assert.equal(url.origin,'https://mindcheck.goatcounter.com');assert.equal(request.headers.get('Authorization'),'Bearer runtime-fixture-token');
  if(mode==='redirect')return new Response(null,{status:302,headers:{Location:'https://example.org/never-send-the-token'}});
  return Response.json(url.pathname.endsWith('/total')?{total:9}:{hits:[{path:'/index.html',count:9}]});
 }
}));
try{
 const result=await (await mf.dispatchFetch('http://localhost/report')).json();
 console.log('Worker runtime provider status:',result.status);
 assert.equal(result.status,'ready');assert.equal(result.visits,9);assert.deepEqual(result.pages,[{path:'/index.html',visits:9}]);assert.equal(calls.length,2);
 mode='redirect';calls=[];
 const redirected=await (await mf.dispatchFetch('http://localhost/report')).json();
 assert.equal(redirected.status,'unavailable');assert.equal(redirected.visits,null);assert.equal(calls.length,2);assert.ok(calls.every(origin=>origin==='https://mindcheck.goatcounter.com'));
 console.log('Worker runtime: provider data loads, redirects are rejected without forwarding credentials.');
}finally{await mf.dispose()}
