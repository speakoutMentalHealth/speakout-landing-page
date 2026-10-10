import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {publishedUnits} from '../js/kiddies-catalogue.js';
import {ADVENTURES} from '../js/kiddies-adventures.js';

test('Creative units include open-ended making, supported teaching and complete paper tasks',async()=>{
 for(const [id,count] of [['nursery-unit-04',4],['primary1-unit-04',6]]){
  const unit=publishedUnits().find(u=>u.id===id);assert.equal(unit.unitNumber,4);assert.equal(unit.review.humanApproval,false);assert.match(unit.mapping,/not established/);
  const lessons=unit.sections.filter(s=>/^Lesson \d:/.test(s.title));assert.equal(lessons.length,count);
  for(const lesson of lessons){for(const label of ['Aim:','Model:','Together:','Try:','Check and answers:','Next step:'])assert.ok(lesson.paragraphs.join(' ').includes(label),`${lesson.title}: ${label}`);}
  const source=await readFile(new URL(`../content/kiddies/${id}.md`,import.meta.url),'utf8');assert.match(source,/no single correct|no single right/);assert.match(source,/Independent.*teacher validation/);assert.match(source,/Movement.*optional|Movement, sound and touch are optional/);assert.match(source,/not uploaded or saved|does not upload or save/);
  assert.ok(ADVENTURES[id].some(a=>a.creativeBoard));
 }
 const primary=publishedUnits().find(u=>u.id==='primary1-unit-04');assert.equal(primary.subject,'Cultural & Creative Arts');
 const sheet=primary.sections.find(s=>s.title==='Creative arts practice sheet');
 for(let i=1;i<=6;i++)assert.ok(sheet.paragraphs.some(p=>p.startsWith(`Task A${i}:`)));
 assert.ok(primary.sections.some(s=>s.title==='Answer guidance and support'));
});

test('Creative answers follow stated examples and preserve choice, permission and sequence',()=>{
 const nursery=ADVENTURES['nursery-unit-04'],primary=ADVENTURES['primary1-unit-04'];
 const correct=q=>q.choices[q.answer];
 assert.equal(correct(nursery[1].questions[1]),'Yes');
 assert.deepEqual(nursery[2].questions[0].picture.actions,['TAP','PAUSE','TAP','PAUSE']);assert.equal(correct(nursery[2].questions[0]),'Pause');
 assert.equal(correct(primary[0].questions[0]),'Line B');assert.equal(correct(primary[0].questions[1]),'Yes');
 assert.equal(correct(primary[2].questions[0]),'A circle');assert.equal(correct(primary[2].questions[1]),'A square');
 const sequence=primary[3].questions[0].picture.actions;assert.equal(sequence.indexOf('PAUSE'),2);assert.equal(sequence.filter(a=>a==='TAP').length,3);
 assert.equal(correct(primary[3].questions[0]),'The third');assert.equal(correct(primary[3].questions[1]),'Three');
 assert.equal(correct(primary[4].questions[1]),'The story does not say');assert.equal(correct(primary[5].questions[1]),'Yes');
});
