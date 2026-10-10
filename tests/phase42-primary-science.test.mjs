import test from 'node:test';
import assert from 'node:assert/strict';
import {KIDDIES_UNITS} from '../js/kiddies-catalogue.js';
import {ADVENTURES} from '../js/kiddies-adventures.js';
import {matchesPlacement} from '../js/education-levels.js';

test('Primary 2–6 each have an original science unit, safe instructions and four linked adventures',()=>{
 for(let grade=2;grade<=6;grade++){
  const id=`primary${grade}-unit-02`;
  const unit=KIDDIES_UNITS.find(u=>u.id===id);
  assert.ok(unit,id);
  assert.deepEqual(unit.classLevels,[`Primary ${grade}`]);
  assert.equal(unit.subject,'Basic Science');
  assert.equal(unit.review.humanApproval,false);
  assert.match(unit.mapping,/not established/);
  assert.equal(unit.sections.filter(s=>/Lesson \d/.test(s.title)).length,4);
  assert.ok(unit.sections.some(s=>s.title==='Reusable science practice sheet'));
  assert.ok(matchesPlacement(unit,{educationStage:'primary',classLevel:`Primary ${grade}`}));
  const questions=ADVENTURES[id];
  assert.equal(questions.length,4);
  assert.equal(questions.reduce((total,a)=>total+a.questions.length,0),8);
  for(const a of questions)for(const q of a.questions){assert.ok(q.explanation.length>30);assert.ok(q.choices.length>=2);assert.ok(q.answer>=0&&q.answer<q.choices.length);}
 }
});
