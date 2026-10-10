import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {publishedUnits} from '../js/kiddies-catalogue.js';
import {ADVENTURES} from '../js/kiddies-adventures.js';
test('Unit 2 publishes original lessons, complete practice guidance and honest progression',async()=>{
 for(const [id,count] of [['nursery-unit-02',4],['primary1-unit-02',6]]){
  const unit=publishedUnits().find(u=>u.id===id);assert.equal(unit.unitNumber,2);assert.equal(unit.review.humanApproval,false);assert.match(unit.mapping,/not established/);
  const lessons=unit.sections.filter(s=>/Lesson \d/.test(s.title));assert.equal(lessons.length,count);
  for(const lesson of lessons){const text=lesson.paragraphs.join(' ');for(const marker of ['Model','Together','Try','Check','Next step'])assert.ok(text.includes(marker),`${id}: ${lesson.title} lacks ${marker}`);}
  const source=await readFile(new URL(`../content/kiddies/${id}.md`,import.meta.url),'utf8');assert.match(source,/not a prerequisite|not a national timetable/);assert.match(source,/Independent teacher|Independent Primary teacher/);
  for(const match of source.matchAll(/(\d+)\s*([+−])\s*(\d+)\s*=\s*(\d+)/g)){const [,a,op,b,c]=match;assert.equal(op==='+'?Number(a)+Number(b):Number(a)-Number(b),Number(c));}
 }
});
test('Unit 2 picture quantities and patterns match the intended correct answers',()=>{
 const nursery=ADVENTURES['nursery-unit-02'];assert.equal(nursery[2].questions[0].picture,4);assert.equal(nursery[2].questions[1].picture,5);
 assert.deepEqual(nursery[3].questions[0].picture.shapes,['circle','square','circle','square']);assert.equal(nursery[3].questions[0].choices[nursery[3].questions[0].answer],'A circle');
 const primary=ADVENTURES['primary1-unit-02'];assert.equal(primary[3].questions[0].picture,7);assert.equal(primary[3].questions[1].picture,10);
 const joining=primary[5].questions[0],taking=primary[5].questions[1];assert.equal(joining.picture.counts.reduce((a,b)=>a+b),7);assert.equal(joining.choices[joining.answer],'Seven');assert.equal(taking.picture.counts[0]-taking.picture.removed,6);assert.equal(taking.choices[taking.answer],'Six');
});
