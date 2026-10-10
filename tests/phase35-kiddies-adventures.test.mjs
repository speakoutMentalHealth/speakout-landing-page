import test from 'node:test';
import assert from 'node:assert/strict';
import {ADVENTURES,isCorrect,readExploration,saveExploration} from '../js/kiddies-adventures.js';
import {publishedUnits} from '../js/kiddies-catalogue.js';
test('Every published lesson has original interactive practice and useful answer feedback',()=>{
 let count=0;
 for(const unit of publishedUnits()){
  const adventures=ADVENTURES[unit.id];assert.equal(adventures.length,unit.sections.filter(s=>/Lesson \d/.test(s.title)).length);
  for(const adventure of adventures){assert.ok(adventure.intro.length>50);for(const question of adventure.questions){count++;assert.ok(question.choices.length>=2);assert.ok(question.explanation.length>30);assert.ok(isCorrect(question,question.answer));assert.equal(isCorrect(question,-1),false);assert.equal(isCorrect(question,String(question.answer)),false);assert.ok(question.answer<question.choices.length);}}
 }
 assert.equal(count,60);
 const nursery=ADVENTURES['nursery-unit-01'][2].questions;
 assert.equal(nursery[0].choices[nursery[0].answer],'Three');assert.equal(nursery[0].picture,3);
 assert.equal(nursery[1].choices[nursery[1].answer],'Two');assert.equal(nursery[1].picture,2);
 const maths=ADVENTURES['primary1-unit-01'][5].questions;
 assert.equal(maths[0].choices[maths[0].answer],'Four');assert.equal(maths[1].choices[maths[1].answer],'Four');
});
test('Exploration storage tolerates blocked/corrupt data and isolates progress by key',()=>{
 const data=new Map(),storage={getItem:key=>data.get(key),setItem:(key,value)=>data.set(key,value)};
 assert.ok(saveExploration(storage,'account-a',new Set(['1','2'])));
 assert.deepEqual([...readExploration(storage,'account-a',['1'])],['1']);
 assert.equal(readExploration(storage,'account-b',['1']).size,0);
 data.set('account-a','broken');assert.equal(readExploration(storage,'account-a',['1']).size,0);
 data.set('account-a','{"1":true}');assert.equal(readExploration(storage,'account-a',['1']).size,0);
 assert.equal(saveExploration(null,'account-a',new Set()),false);assert.equal(readExploration(null,'account-a',['1']).size,0);
});
