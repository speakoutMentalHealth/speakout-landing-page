import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('Academy preview is labelled honestly and leaves My Learning unpublished',async()=>{
 const html=await readFile(new URL('../pages/academy.html',import.meta.url),'utf8');
 const css=await readFile(new URL('../css/academy-extra.css',import.meta.url),'utf8');
 assert.match(html,/id="primary-curriculum-preview"/);
 assert.match(html,/aria-labelledby="primary-preview-heading"/);
 assert.match(html,/not yet teacher-approved/);
 assert.match(html,/not yet in My Learning/i);
 assert.match(html,/18 draft lessons/);
 assert.match(html,/Six original lessons/);
 assert.match(css,/\.academy-preview-grid/);
 assert.match(css,/@media\(max-width:900px\)/);
});
