// Identifying an official source does not verify a material's alignment.
export const CURRICULUM_SOURCES = Object.freeze([
 {id:'nerdc-preprimary-2024',authority:'NERDC',title:'One Year Pre-Primary Education Curriculum and Teachers’ Guide',edition:'Reviewed 2024',stages:['nursery'],url:'https://ppec.nerdcportals.com.ng/pre_primary/web/ppec_tg.pdf',checkedOn:'2026-10-10',inspection:'Selected language and cognitive sections inspected',rights:'All rights reserved; link only, redistribution requires permission.',scope:'One-year pre-primary; not automatic Nursery 1–3 equivalence.'},
 {id:'nerdc-basic-portal',authority:'NERDC',title:'New Basic Education Curriculum portal',edition:null,stages:['primary','secondary'],url:'https://nerdc.gov.ng/content_manager/new_curriculum_home.html',checkedOn:'2026-10-10',inspection:'Portal identified; full class/subject outcomes not checked'},
 {id:'nerdc-senior-portal',authority:'NERDC',title:'Revised Senior Secondary Education Curriculum portal',edition:null,stages:['secondary'],url:'https://nerdc.gov.ng/content_manager/new_senior_curriculum_home.html',checkedOn:'2026-10-10',inspection:'Portal identified; full subject outcomes not checked'},
 {id:'nuc-programmes',authority:'NUC',title:'University programme standards',edition:null,stages:['tertiary'],url:'https://www.nuc.edu.ng/',checkedOn:'2026-10-10',inspection:'Authority identified; programme CCMAS and institution scheme required'},
 {id:'nbte-programmes',authority:'NBTE',title:'Technical education curricula',edition:null,stages:['tertiary'],url:'https://web.nbte.gov.ng/',checkedOn:'2026-10-10',inspection:'Authority identified; qualification and programme document required'},
 {id:'ncce-programmes',authority:'NCCE',title:'Teacher education programme standards',edition:null,stages:['tertiary'],url:'https://www.ncce.gov.ng/Home/EstablishmentRequirement',checkedOn:'2026-10-10',inspection:'Authority identified; applicable NCE programme standard required'}
]);
export function starterCurriculum(stage) {
 return {version:1,track:'school-curriculum',status:stage==='nursery'?'mapping-in-progress':'unmapped',sourceIds:[stage==='nursery'?'nerdc-preprimary-2024':'nerdc-basic-portal'],reviewStatus:'pending-teacher-review',mappings:stage==='nursery'?[
  {chapterId:'chapter-2',sourceId:'nerdc-preprimary-2024',pdfPage:46,printedPage:'29',topic:'Familiar-object vocabulary',coverage:'partial'},
  {chapterId:'chapter-3',sourceId:'nerdc-preprimary-2024',pdfPage:45,printedPage:'28',topic:'Listening and conversational turns',coverage:'partial'},
  {chapterId:'chapter-5',sourceId:'nerdc-preprimary-2024',pdfPage:38,printedPage:'21',topic:'Sorting by attributes',coverage:'partial'},
  {chapterId:'chapter-5',sourceId:'nerdc-preprimary-2024',pdfPage:42,printedPage:'25',topic:'Extending a repeating pair',coverage:'partial'}
 ]:[],gaps:stage==='nursery'?['Candidate references only; teacher must confirm placement and learning checks.','Counting remains unmapped; other domains and a full-year sequence are not covered.','Nursery 1–3 labels are provisional; the source describes one pre-primary year.']:['Obtain the full Primary class/subject outcomes and edition before mapping.','Teacher must confirm class placement, term progression and learning checks.']};
}
export function validateDraftCurriculum(value) {
 if(!value||value.version!==1||value.track!=='school-curriculum'||!['unmapped','mapping-in-progress'].includes(value.status)||value.reviewStatus!=='pending-teacher-review')throw Error('Curriculum mapping must remain an unverified teacher-review draft.');
 if(!Array.isArray(value.sourceIds)||!value.sourceIds.length||value.sourceIds.some(id=>!CURRICULUM_SOURCES.some(source=>source.id===id)))throw Error('Unknown curriculum source.');
 if(!Array.isArray(value.mappings)||!Array.isArray(value.gaps)||!value.gaps.length||value.gaps.some(gap=>typeof gap!=='string'||!gap.trim()))throw Error('Mapping evidence and outstanding gaps are required.');
 if((value.status==='unmapped'&&value.mappings.length)||(value.status==='mapping-in-progress'&&!value.mappings.length))throw Error('Mapping status does not match evidence.');
 for(const mapping of value.mappings){
  const source=CURRICULUM_SOURCES.find(source=>source.id===mapping.sourceId);
  if(!value.sourceIds.includes(mapping.sourceId)||!source?.edition||mapping.coverage!=='partial'||!/^chapter-[1-6]$/.test(mapping.chapterId)||!Number.isInteger(mapping.pdfPage)||mapping.pdfPage<1||mapping.pdfPage>157||typeof mapping.printedPage!=='string'||!mapping.printedPage.trim()||typeof mapping.topic!=='string'||!mapping.topic.trim())throw Error('Candidate mapping requires an inspected edition, chapter, page and partial coverage.');
 }
 return value;
}
export function draftCurriculumLabel(value) {
 validateDraftCurriculum(value);
 return value.status==='unmapped'?'School material · outcome mapping pending · not curriculum verified':'School material · provisional partial mappings · not curriculum verified';
}
