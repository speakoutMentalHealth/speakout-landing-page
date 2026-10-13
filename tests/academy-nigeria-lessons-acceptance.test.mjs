import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const {lessons}=JSON.parse(readFileSync(new URL('../data/academy-native-lessons.json',import.meta.url),'utf8'));
const newLessons=lessons.filter(l=>l.contentBatch==='nigeria-complete-lessons-2026-10');
test('Nigeria content batch has twelve distinct navigable lesson drafts',()=>{
 assert.equal(newLessons.length,12);
 assert.equal(new Set(newLessons.map(l=>l.id)).size,12);
 for(const l of newLessons){assert.ok(l.level&&l.subject&&l.title&&l.objective);assert.ok(l.sections.length>=3);assert.ok(l.activities.length>=1);assert.ok(l.questions.length>=5);}
});
test('questions have valid answer indices and explanatory feedback',()=>{
 for(const l of newLessons)for(const q of l.questions){assert.ok(Array.isArray(q.choices)&&q.choices.length>=2);assert.ok(Number.isInteger(q.answer)&&q.answer>=0&&q.answer<q.choices.length);assert.ok(q.explanation?.trim());}
});
test('unapproved lesson videos remain blocked from native embedding',()=>{
 for(const l of newLessons){assert.equal(l.reviewStatus,'pending');assert.notEqual(l.review?.status,'approved');assert.match(l.video?.id||'',/^[A-Za-z0-9_-]{11}$/);assert.notEqual(l.video?.reviewStatus,'approved');assert.equal(l.publicationStatus,'review-preview');assert.ok(l.curriculum?.sourceUrl?.startsWith('https://'));}
});
