import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('Primary 1–2 English packs contain distinct passages, practice and review safeguards',async()=>{
 const names=new Set();
 for(const grade of [1,2]){
  const s=await readFile(new URL(`../content/kiddies/drafts/primary${grade}-english-draft-01.md`,import.meta.url),'utf8');
  assert.match(s,/editorial draft, not published/);
  assert.match(s,/unverified/);
  assert.match(s,/speaking, signing, pointing, typing, writing or dictation/);
  assert.match(s,/Printable worksheet/);
  assert.match(s,/Facilitator answer key/);
  assert.match(s,/Do not overwrite student content or weaken access controls/);
  const lessons=[...s.matchAll(/^## Lesson \d+: (.+)$/gm)].map(m=>m[1]);
  assert.equal(lessons.length,3);
  for(const title of lessons){assert.ok(!names.has(title));names.add(title);}
  assert.equal((s.match(/\*\*Interactive practice prompt:\*\*/g)||[]).length,3);
  assert.equal((s.match(/\*\*Feedback and example answer:\*\*/g)||[]).length,3);
 }
});
