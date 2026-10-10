import { bookReadiness } from './content-visibility.js';
import { parseEducationMetadata } from './education-levels.js';
import { CURRICULUM_SOURCES, validateDraftCurriculum } from './curriculum-mapping.js';
export function validateKiddiesStarterPack(pack) {
  if(pack?.version!==1 || pack.status!=='draft' || pack.reviewStatus!=='pending-teacher-review') throw Error('Only the teacher-review draft pack can be imported.');
  if(!Array.isArray(pack.books)||pack.books.length!==2||!Array.isArray(pack.courses)||pack.courses.length!==2)throw Error('The starter pack must contain two books and two course outlines.');
  const rows=[...pack.books.map(item=>({collection:'books',item})),...pack.courses.map(item=>({collection:'courses',item}))];
  const ids=new Set();
  for(const {collection,item} of rows) {
    if(!/^speakout-kiddies-(nursery|primary)-(activity-book|course-outline)-v1$/.test(item.id)||ids.has(item.id)) throw Error('Unexpected or duplicate draft ID.');
    ids.add(item.id);
    // Older v1 review packs remain compatible, but any new mapping is checked.
    if(item.curriculum)validateDraftCurriculum(item.curriculum);
    if(item.status!=='draft'||item.reviewStatus!=='pending-teacher-review'||item.sourceType!=='original-ai-assisted'||item.curriculumAlignment!=='not-verified')throw Error('Draft and review markers must be preserved.');
    const stage=item.id.includes('-nursery-')?'nursery':'primary';
    if(item.curriculum?.sourceIds.some(id=>!CURRICULUM_SOURCES.find(source=>source.id===id)?.stages.includes(stage)))throw Error('Curriculum source does not match the draft section.');
    if(item.educationStages?.length!==1||item.educationStages[0]!==stage)throw Error('Draft section does not match its ID.');
    parseEducationMetadata(item.educationStages.join(','),item.classLevels?.join(',')||'',item.subject);
    if(collection==='books') {
      if(!item.id.includes('-activity-book-')||!bookReadiness(item).ready)throw Error('An activity book failed content readiness.');
    } else if(!item.id.includes('-course-outline-')||item.editorialStage!=='outline'||item.courseType!=='internal'||item.certificateEligible!==false||item.certificate?.available!==false||item.finalAssessment||item.modules?.some(module=>module.quiz))throw Error('Course outlines must not claim assessments, publication or certificates.');
  }
  return rows;
}
// All reads happen before writes. A transaction protects against concurrent import
// and refuses to replace any existing review, published record or teacher edits.
export async function createKiddiesDrafts(pack, { db, doc, runTransaction, serverTimestamp }) {
  const rows=validateKiddiesStarterPack(pack);
  await runTransaction(db,async transaction=>{
    const refs=rows.map(({collection,item})=>doc(db,collection,item.id));
    const snapshots=await Promise.all(refs.map(ref=>transaction.get(ref)));
    if(snapshots.some(snapshot=>snapshot.exists()))throw Error('Import stopped: one or more starter IDs already exist. Existing content was left unchanged.');
    rows.forEach(({item},index)=>transaction.set(refs[index],{...item,createdAt:serverTimestamp(),updatedAt:serverTimestamp()}));
  });
  return {books:pack.books.length,courses:pack.courses.length};
}
