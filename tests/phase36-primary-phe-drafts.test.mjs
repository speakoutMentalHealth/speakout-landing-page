import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('Primary 1 and 2 PHE draft packs are distinct, offline-accessible and explicitly unapproved',async()=>{
 const names=new Set();
 for(const grade of [1,2]){
  const text=await readFile(new URL(`../content/kiddies/drafts/primary${grade}-phe-draft-01.md`,import.meta.url),'utf8');
  assert.match(text,new RegExp(`Primary ${grade} Physical & Health Education`));
  assert.match(text,/Editorial draft — not published/);
  assert.match(text,/outcomes, term sequence or lesson alignment/);
  assert.match(text,/speaking, pointing, writing, signing, dictation/);
  assert.match(text,/Printable worksheet \(offline alternative\)/);
  assert.match(text,/Facilitator answer key/);
  assert.match(text,/dated, version-specific independent PHE teacher review/);
  const titles=[...text.matchAll(/^## Physical & Health Education Lesson \d+: (.+)$/gm)].map(m=>m[1]);
  assert.equal(titles.length,3);
  for(const title of titles){assert.equal(names.has(title),false);names.add(title);}
  assert.equal((text.match(/\*\*Independent check:\*\*/g)||[]).length,3);
 }
});
