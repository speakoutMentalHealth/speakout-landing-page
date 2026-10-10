import test from 'node:test';
import assert from 'node:assert/strict';
import {NATIONAL_CURRICULUM,nationalGroupForClass} from '../js/national-curriculum.js';
import {placementForClass} from '../js/education-levels.js';
test('national framework groups cover school classes once, with correct stages',()=>{
 const classes=NATIONAL_CURRICULUM.groups.flatMap(group=>group.classes);
 assert.equal(classes.length,12);assert.equal(new Set(classes).size,12);
 for(const group of NATIONAL_CURRICULUM.groups)for(const level of group.classes)assert.equal(placementForClass(level).educationStage,group.stage);
 assert.equal(nationalGroupForClass('Nursery 1'),null);assert.equal(nationalGroupForClass('100 Level'),null);
});
test('revised offerings retain upper primary distinctions and JSS Business Studies',()=>{
 assert.ok(nationalGroupForClass('Primary 1').additional.includes('Basic Science'));
 assert.ok(nationalGroupForClass('Primary 4').additional.includes('Basic Digital Literacy'));
 assert.ok(nationalGroupForClass('JSS 2').additional.includes('Business Studies'));
 assert.equal(nationalGroupForClass('SS 1').core.length,5);
 for(const group of NATIONAL_CURRICULUM.groups)assert.equal(group.status,undefined);
 for(const source of NATIONAL_CURRICULUM.sources)assert.equal(new URL(source.url).protocol,'https:');
});
