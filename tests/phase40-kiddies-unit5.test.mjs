import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {publishedUnits} from '../js/kiddies-catalogue.js';
import {ADVENTURES} from '../js/kiddies-adventures.js';

test('Unit 5 retains complete teaching, supported responses, worksheets and disclosed mapping limits',async()=>{
 for(const [id,count] of [['nursery-unit-05',4],['primary1-unit-05',6]]){
  const unit=publishedUnits().find(u=>u.id===id);assert.equal(unit.unitNumber,5);assert.equal(unit.review.humanApproval,false);assert.match(unit.mapping,/not established/);
  const lessons=unit.sections.filter(s=>/Lesson \d/.test(s.title));assert.equal(lessons.length,count);
  for(const lesson of lessons){for(const marker of ['Aim:','Model:','Together:','Try:','Check and answers:','Next step:'])assert.ok(lesson.paragraphs.join(' ').includes(marker),`${id} ${lesson.title}: ${marker}`);}
  const source=await readFile(new URL(`../content/kiddies/${id}.md`,import.meta.url),'utf8');
  assert.match(source,/not a prerequisite/);assert.match(source,/Independent.*teacher validation/);assert.match(source,/communication aid/);
  for(const match of source.matchAll(/(\d+)\s*([+−])\s*(\d+)\s*=\s*(\d+)/g)){const [,a,op,b,c]=match;assert.equal(op==='+'?Number(a)+Number(b):Number(a)-Number(b),Number(c));}
 }
 const primary=publishedUnits().find(u=>u.id==='primary1-unit-05');
 assert.deepEqual(primary.classLevels,['Primary 1']);
 for(const prefix of ['E','M']){
  const sheet=primary.sections.find(s=>s.title===(prefix==='E'?'English':'Mathematics')+' practice sheet');
  for(let i=1;i<=3;i++)assert.ok(sheet.paragraphs.some(p=>p.startsWith(`Task ${prefix}${i}:`)));
 }
 assert.ok(primary.sections.some(s=>s.title==='Answer guidance and support'));
});

test('Story, question, sound and represented-number answers match the actual examples',()=>{
 const correct=q=>q.choices[q.answer], nursery=ADVENTURES['nursery-unit-05'], primary=ADVENTURES['primary1-unit-05'];
 assert.equal(correct(nursery[1].questions[0]),'On the table');assert.equal(nursery[1].questions[0].picture.position,'on');
 assert.equal(correct(nursery[1].questions[1]),'Under the table');assert.equal(nursery[1].questions[1].picture.position,'under');
 assert.equal(correct(nursery[2].questions[0]),'The circle');assert.equal(correct(nursery[3].questions[0]),'Musa');assert.equal(correct(nursery[3].questions[1]),'They look at a picture together');
 assert.equal(correct(primary[0].questions[0]),'Zainab');assert.equal(correct(primary[0].questions[1]),'The story does not say');
 assert.equal(correct(primary[1].questions[0]),'A question mark (?)');assert.equal(correct(primary[1].questions[1]),'Where is the book?');
 assert.equal(correct(primary[2].questions[0]),'pin');assert.equal(correct(primary[2].questions[1]),'The first sound');
 assert.equal(Number(correct(primary[3].questions[0])),primary[3].questions[0].picture.start+1);
 assert.equal(Number(correct(primary[3].questions[1])),primary[3].questions[1].picture.start-1);
 const words={Six:6,Eight:8,Ten:10};
 for(const adventure of primary.slice(4))for(const question of adventure.questions){const quantity=question.picture.counts.reduce((a,b)=>a+b,0)-(question.picture.removed||0);assert.equal(words[correct(question)],quantity);}
});
