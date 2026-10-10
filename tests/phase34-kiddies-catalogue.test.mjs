import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {KIDDIES_UNITS,publishedUnits} from '../js/kiddies-catalogue.js';
import {matchesPlacement} from '../js/education-levels.js';
test('Published short units are separately classified, mapped honestly and placed by section',()=>{
 assert.equal(publishedUnits().length,17);
 for(const unit of KIDDIES_UNITS){assert.equal(unit.contentKind,'introductory-unit');assert.equal(unit.review.humanApproval,false);assert.match(unit.mapping,/not established/);assert.equal(unit.contentTrack,'school-curriculum');assert.ok(unit.sections.some(s=>/sheet/i.test(s.title)));}
 const [nursery,primary]=KIDDIES_UNITS;
 assert.equal(nursery.sections.filter(s=>/Lesson \d/.test(s.title)).length,4);
 assert.equal(primary.sections.filter(s=>/Lesson \d/.test(s.title)).length,6);
 assert.ok(matchesPlacement(nursery,{educationStage:'nursery',classLevel:'Nursery 2'}));
 assert.ok(matchesPlacement(primary,{educationStage:'primary',classLevel:'Primary 1'}));
 assert.equal(matchesPlacement(primary,{educationStage:'primary',classLevel:'Primary 2'}),false);
 assert.equal(matchesPlacement(nursery,{educationStage:'secondary',classLevel:'SS 1'}),false);
});
test('Learner reader retains role approval gate, safe text rendering and no learner-data writes',async()=>{
 const code=await readFile(new URL('../js/learner/kiddies-unit.js',import.meta.url),'utf8');
 assert.match(code,/requireRoles/);assert.match(code,/textContent=text/);assert.doesNotMatch(code,/innerHTML|setDoc|updateDoc/);
 const visibility=await readFile(new URL('../js/content-visibility.js',import.meta.url),'utf8');
 assert.match(visibility,/5000/);
});
