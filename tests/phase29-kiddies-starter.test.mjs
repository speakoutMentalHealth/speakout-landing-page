import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { bookReadiness, courseReadiness, isPublicBook, isPublicCourse } from '../js/content-visibility.js';
import { validateKiddiesStarterPack, createKiddiesDrafts } from '../js/kiddies-starter-pack.js';
const pack=JSON.parse(await readFile(new URL('../firestore-seed/kiddies-starter-pack.json',import.meta.url),'utf8'));
const clone=()=>structuredClone(pack);
test('starter activity books are substantive, correctly labelled drafts; outlines cannot masquerade as finished courses',()=>{
 assert.equal(validateKiddiesStarterPack(pack).length,4);
 for(const book of pack.books){assert.equal(bookReadiness(book).ready,true);assert.equal(book.chapters.length,6);assert.equal(isPublicBook(book),false);assert.equal(book.curriculumAlignment,'not-verified');assert.equal(book.reviewStatus,'pending-teacher-review');}
 for(const course of pack.courses){assert.equal(courseReadiness(course).ready,false);assert.equal(isPublicCourse(course),false);assert.equal(course.certificateEligible,false);assert.ok(pack.books.some(book=>book.id===course.relatedBookId));}
});
test('import rejects public status, forged review markers, invalid classifications and credentials before database access',async()=>{
 for(const change of [p=>p.books[0].status='active',p=>p.reviewStatus='approved',p=>p.books[0].classLevels=['SS 2'],p=>p.courses[0].certificateEligible=true,p=>p.courses[0].finalAssessment={questions:[]},p=>p.books[1].id=p.books[0].id]){
  const item=clone();change(item);let called=false;
  await assert.rejects(createKiddiesDrafts(item,{runTransaction:()=>{called=true;}}));assert.equal(called,false);
 }
});
function adapter(existing=new Set()){
 const committed=[],events=[];
 return {committed,events,db:{},doc:(_db,collection,id)=>({collection,id}),serverTimestamp:()=> 'server-time',runTransaction:async(_db,callback)=>{
  const pending=[];await callback({get:async ref=>{events.push('read');return {exists:()=>existing.has(ref.id)};},set:(ref,data)=>{events.push('write');pending.push({ref,data});}});committed.push(...pending);
 }};
}
test('draft import creates all four records in one transaction with server timestamps and all reads before writes',async()=>{
 const api=adapter();assert.deepEqual(await createKiddiesDrafts(pack,api),{books:2,courses:2});assert.deepEqual(api.events,['read','read','read','read','write','write','write','write']);assert.equal(api.committed.length,4);
 for(const {data} of api.committed){assert.equal(data.status,'draft');assert.equal(data.createdAt,'server-time');assert.equal(data.updatedAt,'server-time');}
});
test('re-import cannot overwrite a published record or teacher edits',async()=>{
 const api=adapter(new Set([pack.books[0].id]));await assert.rejects(createKiddiesDrafts(pack,api),/already exist/);assert.equal(api.committed.length,0);assert.deepEqual(api.events,['read','read','read','read']);
});
