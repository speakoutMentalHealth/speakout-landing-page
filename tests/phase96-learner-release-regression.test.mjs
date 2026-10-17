import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');

test('Completed module assessments remain in sequential lesson navigation',async()=>{
 const source=await read('course-player.html');
 assert.match(source,/if\(last&&m\.quiz\)\s*\{currentView=\{type:"moduleQuiz",moduleIndex:l\.moduleIndex\}/);
 assert.match(source,/isLastInModule&&m\.quiz\)/);
 assert.match(source,/Review Module Assessment/);
 assert.doesNotMatch(source,/if\(last&&m\.quiz&&!passedModuleQuizzes/);
 assert.match(source,/passedModuleQuizzes\[mi\]===true/);
});

test('Certificates retain verified one-tap PDF generation and browser fallback',async()=>{
 const source=await read('certificate-view.html');
 assert.match(source,/html2canvas/);
 assert.match(source,/jspdf\.umd\.min\.js/);
 assert.match(source,/\.download="SpeakOut-Certificate-"/);
 assert.match(source,/URL\.createObjectURL\(blob\)/);
 assert.match(source,/Open PDF/);
});

test('Independent learner browser path checks assessment and public certificate verification',async()=>{
 const source=await read('tests/independent-learner-browser.mjs');
 for(const step of ['browserRegister','lessonCompletion','progressPersistence','moduleAssessment','finalAssessment','certificateIssued','publicCertificateVerification']){
  assert.ok(source.includes(step),'Missing staging journey step: '+step);
 }
});
