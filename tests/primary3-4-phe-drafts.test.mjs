import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('Primary 3–4 PHE drafts are distinct, safe and include accessible practice',async()=>{
 const titles=new Set();
 for(const grade of [3,4]){
  const content=await readFile(new URL(`../content/kiddies/drafts/primary${grade}-phe-draft-01.md`,import.meta.url),'utf8');
  assert.match(content,/Editorial draft — not published/);
  assert.match(content,/unverified/);
  assert.match(content,/Printable worksheet/);
  assert.match(content,/Facilitator answer key/);
  assert.match(content,/speak, point, sign, write or dictate/);
  assert.match(content,/never overwrite student data/);
  const lessons=[...content.matchAll(/^## Lesson \d+: (.+)$/gm)].map(m=>m[1]);
  assert.equal(lessons.length,3);
  for(const title of lessons){assert.ok(!titles.has(title));titles.add(title);}
  assert.equal((content.match(/Interactive practice prompt/g)||[]).length,3);
  assert.equal((content.match(/Facilitator feedback:/g)||[]).length,3);
 }
});
