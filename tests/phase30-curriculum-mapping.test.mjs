import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {CURRICULUM_SOURCES,starterCurriculum,validateDraftCurriculum,draftCurriculumLabel} from '../js/curriculum-mapping.js';
import {validateKiddiesStarterPack} from '../js/kiddies-starter-pack.js';
test('official register separates portal discovery from inspected editions',()=>{
 assert.equal(new Set(CURRICULUM_SOURCES.map(s=>s.id)).size,6);
 assert.equal(CURRICULUM_SOURCES[0].edition,'Reviewed 2024');
 assert.equal(CURRICULUM_SOURCES[1].edition,null);
 for(const source of CURRICULUM_SOURCES)assert.equal(new URL(source.url).protocol,'https:');
});
test('nursery candidates remain partial; primary remains unmapped',()=>{
 const nursery=starterCurriculum('nursery'),primary=starterCurriculum('primary');
 assert.equal(validateDraftCurriculum(nursery).mappings.length,4);
 assert.equal(validateDraftCurriculum(primary).mappings.length,0);
 assert.match(draftCurriculumLabel(nursery),/not curriculum verified/);
 assert.match(draftCurriculumLabel(primary),/mapping pending/);
});
test('reject false verification, unknown sources and missing outcome evidence',()=>{
 for(const mutate of [v=>v.status='verified',v=>v.reviewStatus='approved',v=>v.sourceIds=['invented'],v=>v.mappings[0].pdfPage=0,v=>v.mappings[0].coverage='full',v=>v.gaps=[],v=>v.mappings[0].sourceId='nerdc-basic-portal']){
  const value=starterCurriculum('nursery');mutate(value);assert.throws(()=>validateDraftCurriculum(value));
 }
});
test('generated pack preserves draft status and carries checked mapping metadata',async()=>{
 const pack=JSON.parse(await readFile(new URL('../firestore-seed/kiddies-starter-pack.json',import.meta.url),'utf8'));
 assert.equal(validateKiddiesStarterPack(pack).length,4);
 for(const item of [...pack.books,...pack.courses]){assert.equal(item.status,'draft');assert.equal(item.curriculumAlignment,'not-verified');validateDraftCurriculum(item.curriculum);}
 pack.books[0].curriculum.status='verified';assert.throws(()=>validateKiddiesStarterPack(pack));
});
