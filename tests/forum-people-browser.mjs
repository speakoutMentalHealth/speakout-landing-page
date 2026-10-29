import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const store=new Map([
 ['users/adult-one',{fullName:'Adult One',email:'one@example.test',role:'volunteer',status:'approved'}],
 ['users/pending-one',{fullName:'Pending One',email:'pending@example.test',role:'teacher',status:'pending'}],
 ['users/teen-one',{fullName:'Student One',role:'student',status:'approved'}],
 ['forumAccessGrants/adult-one',{active:true,adultVerified:true,memberRole:'moderator',privateRoomIds:['existing-room'],version:1}],
 ['forumRooms/team-room',{title:'Team room',visibility:'private'}]
]);
const source=(await readFile(new URL('../js/forum-people-admin.js',import.meta.url),'utf8')).replace('../firebase-config.js','/config').replace('../launch-role-guard.js','/guard').replace('https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js','/firestore');
const mock=`export const collection=(_db,p)=>p;export const doc=(_db,p,id)=>id?p+'/'+id:_db+'/audit-'+Math.random();export const serverTimestamp=()=>1;
const snapshot=(path,data)=>({id:path.split('/').at(-1),exists:()=>!!data,data:()=>data});
export async function getDocs(path){const rows=await(await fetch('/records')).json();return {docs:rows.filter(([p])=>p.split('/').length===2&&p.startsWith(path+'/')).map(([p,d])=>snapshot(p,d))};}
export async function runTransaction(db,fn){const rows=new Map(await(await fetch('/records')).json()),writes=[];const out=await fn({get:async p=>snapshot(p,rows.get(p)),update:(p,d)=>writes.push([p,{...rows.get(p),...d}]),set:(p,d)=>writes.push([p,d])});await fetch('/writes',{method:'POST',body:JSON.stringify(writes)});return out;}`;
const server=createServer(async(req,res)=>{
 res.setHeader('Content-Type',req.url==='/'?'text/html':'text/javascript');
 if(req.url==='/'){res.end(`<input id="peopleSearch"><select id="peopleRole"><option value="">All</option><option>volunteer</option></select><select id="peopleRoom"><option value="">Choose</option></select><button id="selectVisible">Select</button><button id="clearPeople">Clear</button><p id="peopleCount"></p><div id="peopleList"></div><button id="addPeople">Add</button><p id="peopleResult"></p><script type="module" src="/app"></script>`);return;}
 if(req.url==='/app'){res.end(source);return;}
 if(req.url==='/config'){res.end('export const db={};');return;}
 if(req.url==='/guard'){res.end('export const requireRoles=(roles,fn)=>fn({uid:"admin-one"});');return;}
 if(req.url==='/firestore'){res.end(mock);return;}
 if(req.url==='/records'){res.end(JSON.stringify([...store]));return;}
 if(req.url==='/writes'){let body='';for await(const chunk of req)body+=chunk;for(const [p,d] of JSON.parse(body))store.set(p,d);res.end('{}');return;}
 res.writeHead(404).end();
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{
 browser=await chromium.launch();const page=await browser.newPage();page.on('dialog',d=>d.accept());
 await page.goto('http://127.0.0.1:'+server.address().port);
 await page.locator('#peopleList input').first().waitFor();
 assert.equal(await page.locator('#peopleList input:disabled').count(),2);
 await page.locator('#selectVisible').click();await page.locator('#peopleRoom').selectOption('team-room');await page.locator('#addPeople').click();
 await page.locator('#peopleResult').getByText('1 added',{exact:false}).waitFor();
 const grant=store.get('forumAccessGrants/adult-one');assert.deepEqual(grant.privateRoomIds,['existing-room','team-room']);assert.equal(grant.memberRole,'moderator');assert.equal(grant.version,2);
 await page.locator('#selectVisible').click();await page.locator('#addPeople').click();
 await page.locator('#peopleResult').getByText('1 already members',{exact:false}).waitFor();assert.equal(store.get('forumAccessGrants/adult-one').version,2);
 await page.locator('#selectVisible').click();await page.locator('#peopleSearch').fill('pending');assert.match(await page.locator('#peopleCount').textContent(),/^0 selected/);
 console.log('PASS: selection excludes ineligible accounts; preserves roles/memberships; duplicate add is idempotent; filters clear hidden selections.');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
