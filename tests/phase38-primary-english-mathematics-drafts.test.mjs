import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const files=[...Array.from({length:6},(_,i)=>'primary'+(i+1)+'-mathematics-draft-01.md'),'primary5-english-draft-02.md','primary6-english-draft-02.md'];
for(const file of files){test(file+' has three lessons, accessible practice and honest release gates',async()=>{const s=await readFile(new URL('../content/kiddies/drafts/'+file,import.meta.url),'utf8');assert.equal((s.match(/^## Lesson /gm)||[]).length,3);for(const required of ['Interactive practice prompt','Printable worksheet','Answer key','Accessibility','teacher review','NERDC'])assert.ok(s.includes(required),required+' missing from '+file);});}
