import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {AGES,SUBJECTS,parseYouTubeId,parseCsv,previewBulkImport,buildCoverage,getReviewQueue,determineAction} from '../js/kiddies-tv-studio-tools.js';
const example='"https://youtu.be/G0F2PiVP_FI","African geography for children","Learn countries of Africa, their flags and cultures.","Bino and Fino","Geography & Culture","6-9|10-12"';
const header='url,title,description,source,category,ages';
test('CSV supports quoted commas and multi-line lesson description',()=>{
 const csv=header+'\n'+example+'\n"https://youtu.be/VroOSToSNx8","Scratch lessons","Create a game with blocks,\nand explore coding concepts.","Black Girls Code","Coding & Digital Literacy","10-12"';
 const rows=parseCsv(csv);
 assert.equal(rows.length,3);
 assert.equal(rows[2][2],'Create a game with blocks,\nand explore coding concepts.');
 const preview=previewBulkImport(csv);
 assert.deepEqual(preview.errors,[]);
 assert.equal(preview.videos.length,2);
 assert.deepEqual(preview.videos[0].ages,['6-9','10-12']);
 assert(preview.videos.every(v=>v.status==='draft'&&!v.approved&&!v.reviewConfirmed));
});
test('Import requires individual valid YouTube IDs and never accepts unknown or duplicate content',()=>{
 assert.equal(parseYouTubeId('https://youtu.be/G0F2PiVP_FI?feature=shared'),'G0F2PiVP_FI');
 assert.equal(parseYouTubeId('https://www.youtube.com/watch?v=G0F2PiVP_FI'),'G0F2PiVP_FI');
 assert.equal(parseYouTubeId('https://evil.example/watch?v=G0F2PiVP_FI'),null);
 assert.equal(parseYouTubeId('https://www.youtube.com/playlist?list=ABC'),null);
 assert(previewBulkImport(header+'\n'+example,['G0F2PiVP_FI']).errors.some(e=>e.includes('duplicate video')));
 assert(previewBulkImport(header+'\n'+example+'\n'+example).errors.some(e=>e.includes('duplicate video')));
 assert(previewBulkImport(header+'\n'+example.replace('"6-9|10-12"','"0-2"')).errors.some(e=>e.includes('valid age bands')));
 assert(previewBulkImport(header+'\n'+example.replace('"Geography & Culture"','"Invalid Category"')).errors.some(e=>e.includes('supported subject')));
 assert(previewBulkImport(header+'\n'+example.replace('African geography for children','Tiny')).errors.some(e=>e.includes('title must')));
 assert(previewBulkImport('url,title\n'+example).errors.some(e=>e.includes('Missing column')));
});
test('Bulk import is bounded and never allows a partial publication',()=>{
 const csv=header+'\n'+Array.from({length:41},(_,i)=>example.replace('G0F2PiVP_FI','ABCDEFGHIJ'+(i%10))).join('\n');
 const result=previewBulkImport(csv);
 assert.equal(result.videos.length,0);
 assert(result.errors.some(x=>x.includes('Maximum 40')));
 const invalid=previewBulkImport(header+'\n'+example+'\n'+example.replace('G0F2PiVP_FI','invalid'));
 assert.deepEqual(invalid.videos,[]);
 assert(invalid.errors.length>0);
});
test('Age-by-subject reporting counts only supplied published lessons',()=>{
 const published=[
  {category:'Mathematics',ages:['6-9','10-12']},
  {category:'Mathematics',ages:['6-9']},
  {category:'Geography & Culture',ages:['13-17']}
 ];
 const r=buildCoverage(published);
 assert.equal(r.total,3);
 assert.equal(r.cells.Mathematics['6-9'],2);
 assert.equal(r.cells.Mathematics['10-12'],1);
 assert.equal(r.cells['Geography & Culture']['13-17'],1);
 assert.equal(r.cells['Nigerian Languages']['13-17'],0);
 assert(r.empty.includes('Nigerian Languages'));
 assert.equal(SUBJECTS.length,16);
 assert.deepEqual(AGES,['3-5','6-9','10-12','13-17']);
});
test('Review queue prioritises drafts and includes existing published with missing review evidence',()=>{
 const rows=[
  {title:'Z published',status:'published',reviewConfirmed:false},
  {title:'B draft',status:'draft',reviewConfirmed:false},
  {title:'A reviewed',status:'published',reviewConfirmed:true},
  {title:'A draft',status:'draft',reviewConfirmed:false}
 ];
 assert.deepEqual(getReviewQueue(rows).map(v=>v.title),['A draft','B draft','Z published']);
});
test('Every state transition maps to a distinct log action',()=>{
 assert.equal(determineAction(null,'draft'),'create_draft');
 assert.equal(determineAction('draft','draft'),'edit_draft');
 assert.equal(determineAction('draft','published'),'publish');
 assert.equal(determineAction('published','draft'),'unpublish');
 assert.equal(determineAction('published','archived'),'archive');
 assert.equal(determineAction('archived','draft'),'restore_draft');
 assert.equal(determineAction(null,'draft',{bulk:true}),'bulk_import_draft');
});
test('Studio exposes workflow panels, stages imports as drafts and writes audit atomically',()=>{
 const html=readFileSync('admin-kiddies-tv.html','utf8');
 const admin=readFileSync('js/kiddies-tv-admin.js','utf8');
 for(const id of ['bulk-file','bulk-text','bulk-preview','bulk-submit','review-queue','coverage-body','audit-list','audit-more'])
  assert(html.includes('id="'+id+'"'),id+' missing');
 assert(admin.includes('previewBulkImport('));
 assert(admin.includes('await runTransaction(db,async transaction=>'));
 assert(admin.includes("action:'bulk_import_draft'"));
 assert(admin.includes('at:serverTimestamp()'));
 assert(admin.includes("collection(db,'kiddiesTvAudit')"));
 assert(admin.includes('status:target,approved:false'));
 assert(!admin.includes("status:'published',approved:true,reviewConfirmed:true"));
});
