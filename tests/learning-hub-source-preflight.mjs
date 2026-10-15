import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {bookReadiness} from '../js/content-visibility.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const files=['learning-hub.html','my-learning.html','my-library.html','pages/academy.html','pages/resources.html'];
const read=p=>readFile(path.join(root,p),'utf8');
const hrefs=html=>[...html.matchAll(/\bhref=["']([^"'#]+)(?:#[^"']*)?["']/g)].map(x=>x[1]);
let checked=0;
for(const file of files){
 const html=await read(file);
 assert.match(html,/learning-hub\.html|id="courses"/,file+' does not expose Learning Hub');
 if(file==='learning-hub.html'){
  for(const id of ['courses','books','guides'])assert.ok(html.includes('id="'+id+'"'),'Missing '+id+' hub section');
 }
 for(const href of hrefs(html)){
  if(/^(?:https?:|mailto:|tel:|javascript:|data:|\/\/)/i.test(href))continue;
  const resolved=path.resolve(root,path.dirname(file),decodeURIComponent(href.split('?')[0]));
  assert.ok(resolved===root||resolved.startsWith(root+path.sep),'Link escapes repository: '+href);
  await access(resolved).catch(()=>{throw new Error(file+' -> missing '+href)});
  checked++;
 }
}
const hub=await read('learning-hub.html');
for(const [id,library] of [
  ['student-wellbeing-guide-v1','student-library.html'],
  ['teacher-wellbeing-safeguarding-guide-v1','teacher-library.html'],
  ['parent-caregiver-wellbeing-guide-v1','my-library.html']
]){
  assert.ok(hub.includes('book-reader.html?id='+id),'Direct reader link missing for '+id);
  assert.ok(hub.includes('href="'+library+'"'),'Fallback library link missing for '+id);
}
for(const file of ['firestore-seed/audience-guides.json']){
 const guides=JSON.parse(await read(file));
 for(const [id,minimum] of [['student-wellbeing-guide-v1',16],['teacher-wellbeing-safeguarding-guide-v1',12],['parent-caregiver-wellbeing-guide-v1',12]]){
  const guide=guides.find(g=>g.id===id);
  assert.ok(guide,'Missing guide '+id);
  assert.ok(guide.chapters?.length>=minimum,'Incomplete chapter index: '+id);
  assert.ok(guide.content?.length>1000,'Missing substantial guide content: '+id);
  const headings=[...guide.content.matchAll(/<h2\b[^>]*>/gi)].length;
  assert.ok(headings>=minimum,'Full reader body has fewer chapter headings than index: '+id+' ('+headings+' vs '+minimum+')');
  const readiness=bookReadiness(guide);
  assert.ok(readiness.ready,'Guide does not meet publication-readiness checks: '+id+' — '+readiness.reasons.join('; '));
 }
}
console.log('Learning Hub source preflight passed: '+files.length+' HTML pages, '+checked+' local destinations, 3 guide source records including publication-readiness checks. This does not verify deployment, Firestore imports, chapter renderability, or authentication.');
