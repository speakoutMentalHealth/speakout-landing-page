import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {KIDDIES_UNITS} from '../js/kiddies-catalogue.js';
import {ADVENTURES} from '../js/kiddies-adventures.js';
import {matchesPlacement} from '../js/education-levels.js';

test('Primary 2 to 6 have distinct age-labelled lesson and interactive content',async()=>{
 const paths=[];
 for(let grade=2;grade<=6;grade++){
  const id=`primary${grade}-unit-01`;
  const unit=KIDDIES_UNITS.find(u=>u.id===id);
  assert.ok(unit,id);
  assert.deepEqual(unit.classLevels,[`Primary ${grade}`]);
  assert.equal(unit.unitNumber,1);
  assert.equal(unit.review.humanApproval,false);
  assert.match(unit.mapping,/not established/);
  assert.equal(unit.sections.filter(s=>/Lesson \\d/.test(s.title)).length,6);
  assert.ok(unit.sections.some(s=>s.title==='English practice sheet'));
  assert.ok(unit.sections.some(s=>s.title==='Mathematics practice sheet'));
  assert.equal(ADVENTURES[id].length,6);
  assert.equal(ADVENTURES[id].reduce((n,a)=>n+a.questions.length,0),12);
  assert.ok(matchesPlacement(unit,{educationStage:'primary',classLevel:`Primary ${grade}`}));
  assert.equal(matchesPlacement(unit,{educationStage:'primary',classLevel:`Primary ${grade===6?5:grade+1}`}),false);
  for(const item of ADVENTURES[id])for(const q of item.questions){assert.equal(q.choices.length,2);assert.notEqual(q.choices[0],q.choices[1]);assert.ok(q.explanation.length>30);}
  const source=await readFile(new URL(`../content/kiddies/${id}.md`,import.meta.url),'utf8');
  assert.match(source,/independent qualified teacher/);
  paths.push(unit.title);
 }
 assert.equal(new Set(paths).size,5);
});
