import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('Primary 5 and 6 PHE packs have distinct lessons, accessible prompts and review gates',async()=>{
 const names=new Set();
 for(const grade of [5,6]){
  const s=await readFile(new URL(`../content/kiddies/drafts/primary${grade}-phe-draft-01.md`,import.meta.url),'utf8');
  assert.match(s,/Editorial draft — not published/);
  assert.match(s,/unverified/);
  assert.match(s,/speak, sign, point, type, write or dictate/);
  assert.match(s,/Printable worksheet/);
  assert.match(s,/Facilitator answer key/);
  assert.match(s,/never overwrite existing student data or weaken access controls/);
  const titles=[...s.matchAll(/^## Lesson \d+: (.+)$/gm)].map(x=>x[1]);
  assert.equal(titles.length,3);
  for(const title of titles){assert.ok(!names.has(title));names.add(title);}
  assert.equal((s.match(/\*\*Interactive practice \(oral, paper or digital prompt\):\*\*/g)||[]).length,3);
  assert.equal((s.match(/\*\*Answer and reasoning:\*\*/g)||[]).length,3);
 }
});
