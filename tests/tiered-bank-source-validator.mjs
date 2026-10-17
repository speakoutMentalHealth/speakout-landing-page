import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

export async function validateTieredBank(grade){
 const text=await readFile(new URL('../content/kiddies/drafts/primary'+grade+'-weeks5-8-tiered-assessments-v1.md',import.meta.url),'utf8');
 const sections=[...text.matchAll(/^## (?!Evidence)(.+)$/gm)];
 assert.equal(sections.length,6,'Expected six subjects for Primary '+grade);
 const sectionsWithText=sections.map((section,i)=>text.slice(section.index,sections[i+1]?.index??text.indexOf('## Evidence and safeguarding')));
 for(const section of sectionsWithText){
  const topics=[...section.matchAll(/^### Week [5-8]:/gm)];
  assert.equal(topics.length,4,'Expected four weekly topics in Primary '+grade+' '+section.slice(0,60));
 }
 const topics=text.split(/^### Week [5-8]:/m).slice(1);
 assert.equal(topics.length,24,'Exactly 24 distinct subject-week topics required for Primary '+grade);
 for(const topic of topics){
  for(const type of ['Foundation','Application','Transfer']){
   const match=topic.match(new RegExp('\\*\\*'+type+' question:\\*\\*\\s*([^\\n]+)'));
   assert.ok(match&&match[1].trim().length>=2, 'Missing meaningful '+type+' question in Primary '+grade);
  }
  const keys=[...topic.matchAll(/^\*\*Answer key(?: \/ exemplar)?:\*\*\s*(.*)$/gm)];
  assert.ok(keys.length>=1,'Missing answer guidance in Primary '+grade);
  assert.ok(keys.every(x=>x[1].trim().length>=1),'Blank answer in Primary '+grade);
  assert.ok(/\*\*(?:Marking|Rubric per item|Formative marking|Marking \()/m.test(topic),'Missing marking rubric in Primary '+grade);
  assert.ok(/\*\*Reteach/m.test(topic),'Missing reteach in Primary '+grade);
  assert.ok(/\*\*Progress check/m.test(topic),'Missing progress check in Primary '+grade);
 }
 assert.match(text,/unverified/i);
 assert.match(text,/not received/i);
 assert.match(text,/not conducted/i);
 return true;
}
