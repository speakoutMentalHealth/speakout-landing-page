import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {publishedUnits} from '../js/kiddies-catalogue.js';
import {ADVENTURES} from '../js/kiddies-adventures.js';
import {matchesPlacement} from '../js/education-levels.js';

test('Science expansion includes supported teaching, paper tasks, answers and honest limits',async()=>{
 for(const [id,count] of [['nursery-unit-03',4],['primary1-unit-03',6]]){
  const unit=publishedUnits().find(u=>u.id===id);
  assert.equal(unit.unitNumber,3);assert.equal(unit.version,1);assert.equal(unit.review.humanApproval,false);
  assert.match(unit.mapping,/not established/);
  const lessons=unit.sections.filter(s=>/^Lesson \d:/.test(s.title));assert.equal(lessons.length,count);
  for(const lesson of lessons){const text=lesson.paragraphs.join(' ');for(const label of ['Aim:','Model:','Together:','Try:','Check and answers:','Next step:'])assert.ok(text.includes(label),`${id} ${lesson.title}: ${label}`);}
  assert.ok(unit.sections.some(s=>/sheet/i.test(s.title)));
  const source=await readFile(new URL(`../content/kiddies/${id}.md`,import.meta.url),'utf8');
  assert.match(source,/Independent.*teacher validation/);assert.match(source,/not prerequisites|not a national timetable/);
  assert.match(source,/Do not collect names|Do not gather photos/);
 }
 const primary=publishedUnits().find(u=>u.id==='primary1-unit-03');
 assert.equal(primary.subject,'Basic Science');
 assert.ok(matchesPlacement(primary,{educationStage:'primary',classLevel:'Primary 1'}));
 assert.equal(matchesPlacement(primary,{educationStage:'primary',classLevel:'Primary 2'}),false);
 const sheet=primary.sections.find(s=>s.title==='Science practice sheet');
 for(let i=1;i<=6;i++)assert.ok(sheet.paragraphs.some(p=>p.startsWith(`Task S${i}:`)));
 assert.ok(primary.sections.some(s=>s.title==='Answer guidance and support'));
});

test('Science answers distinguish evidence, material, living examples and fair length comparison',()=>{
 const a=ADVENTURES['primary1-unit-03'];
 const correct=q=>q.choices[q.answer];
 assert.equal(correct(a[0].questions[1]),'The note does not say');
 assert.equal(correct(a[1].questions[0]),'Metal');assert.equal(correct(a[1].questions[1]),'Yes');
 assert.equal(correct(a[2].questions[0]),'A growing plant');assert.equal(correct(a[2].questions[1]),'No');
 assert.equal(correct(a[3].questions[0]),'Roots');assert.equal(correct(a[3].questions[1]),'No');
 const [different,equal]=a[4].questions;
 assert.ok(different.picture.lengths[1]>different.picture.lengths[0]);assert.equal(correct(different),'Strip B');
 assert.equal(equal.picture.lengths[0],equal.picture.lengths[1]);assert.ok(equal.picture.widths[1]>equal.picture.widths[0]);assert.equal(correct(equal),'No');
 assert.equal(correct(a[5].questions[1]),'No');
 const nursery=ADVENTURES['nursery-unit-03'];assert.equal(correct(nursery[2].questions[0]),'Both leaf pictures');
 assert.equal(correct(nursery[3].questions[1]),'The supervising grown-up');
});
