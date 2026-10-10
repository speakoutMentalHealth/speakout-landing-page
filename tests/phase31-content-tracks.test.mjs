import test from 'node:test';
import assert from 'node:assert/strict';
import {contentTrack,parseContentTrack,contentTrackLabel} from '../js/content-tracks.js';
test('legacy labels and subjects do not imply school curriculum or enrichment',()=>{
 for(const item of [{},{educationStages:['primary'],subject:'English'},{category:'mental-health'},{contentTrack:'verified'}])assert.equal(contentTrack(item),'unclassified');
});
test('explicit classification overrides nested mapping and can be cleared',()=>{
 assert.equal(contentTrack({curriculum:{track:'school-curriculum'}}),'school-curriculum');
 assert.equal(contentTrack({contentTrack:'',curriculum:{track:'school-curriculum'}}),'unclassified');
 assert.equal(contentTrack({contentTrack:'supplementary',curriculum:{track:'school-curriculum'}}),'supplementary');
});
test('classification never creates a verification badge',()=>{
 assert.match(contentTrackLabel({contentTrack:'school-curriculum',curriculum:{status:'verified'},curriculumAlignment:'verified'}),/alignment not established/);
 assert.deepEqual(parseContentTrack(''),{contentTrack:''});
 assert.deepEqual(parseContentTrack('supplementary'),{contentTrack:'supplementary'});
 assert.throws(()=>parseContentTrack('approved'));
});
