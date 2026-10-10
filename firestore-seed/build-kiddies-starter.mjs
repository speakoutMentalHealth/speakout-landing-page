import { readFile, writeFile } from 'node:fs/promises';
import { bookReadiness } from '../js/content-visibility.js';
import { starterCurriculum } from '../js/curriculum-mapping.js';
const root = new URL('../', import.meta.url);
const escape = value => value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function chapters(markdown) {
  return markdown.split(/^## /m).slice(1).map((section, index) => {
    const [title, ...body] = section.split('\n');
    const content = body.join('\n').trim().split(/\n\n+/).map(block => block.startsWith('### ')
      ? `<h3>${escape(block.slice(4))}</h3>` : `<p>${escape(block).replaceAll('\n',' ')}</p>`).join('\n');
    return { id: `chapter-${index + 1}`, title: title.trim(), content };
  });
}
const definitions = [
  { stage:'nursery', file:'nursery-activities.md', title:'Nursery: Talk, Notice and Count', classes:['Nursery 1','Nursery 2','Nursery 3'], subject:'Early language and numeracy', outcomes:['Name or indicate familiar objects','Share a conversational turn using a preferred communication method','Count small groups with one indication per object','Sort by a stated feature and continue a two-part pattern'] },
  { stage:'primary', file:'primary-activities.md', title:'Primary: Read, Explain and Solve', classes:['Primary 1','Primary 2','Primary 3'], subject:'English and mathematics', outcomes:['Locate information and retell an original short story','Create a clear sentence or dictated message','Explain small-group addition and subtraction with drawings','Represent and compare tens and ones'] },
];
const books=[], courses=[];
for(const item of definitions) {
  const chapterList=chapters(await readFile(new URL(`content/kiddies/${item.file}`,root),'utf8'));
  const common={ educationStages:[item.stage], classLevels:item.classes, subject:item.subject, category:'foundational-learning', status:'draft', reviewStatus:'pending-teacher-review', sourceType:'original-ai-assisted', rightsNote:'Original AI-assisted SpeakOut draft; human originality, educational suitability and rights review pending. No third-party text or imagery was intentionally included.', curriculumAlignment:'not-verified', version:1, accessType:'free', price:0, currency:'NGN', coverUrl:'images/logo.png', tags:['kiddies-corner','original-draft','adult-led','offline-activities'] };
  const book={...common,id:`speakout-kiddies-${item.stage}-activity-book-v1`,title:item.title,author:'SpeakOut editorial draft (AI-assisted; review pending)',shortDescription:'Six original adult-supported activity chapters for teacher review. Supplementary practice; not an official curriculum or complete class programme.',chapters:chapterList,relatedCourseId:`speakout-kiddies-${item.stage}-course-outline-v1`};
  const check=bookReadiness(book);if(!check.ready)throw Error(`${item.stage}: ${check.reasons.join('; ')}`);
  common.curriculum=starterCurriculum(item.stage);
  book.curriculum=starterCurriculum(item.stage);
  books.push(book);
  courses.push({...common,id:book.relatedCourseId,title:`${item.title} — course outline`,courseType:'internal',provider:'SpeakHub Academy',difficulty:'Foundation',duration:'Six flexible adult-led sessions; teacher review pending',completionMethod:'internal',certificateEligible:false,certificate:{available:false,type:'none'},editorialStage:'outline',shortDescription:'Planning outline paired with the original activity book. This is not a complete or publishable course. A teacher must refine class placement, lesson progression, learning checks and accessibility before a full course is authored.',outcomes:item.outcomes,prerequisites:['An adult facilitator reads the instructions and selects suitable activities','Paper or copied prompts; no purchase, child device account or continuous internet required'],relatedBookId:book.id,modules:chapterList.map((chapter,index)=>({id:`${item.stage}-outline-module-${index+1}`,title:chapter.title,lessons:[{id:`${item.stage}-outline-lesson-${index+1}`,title:chapter.title,content:`<p>Course planning draft: use chapter ${index+1} of the paired activity book as the review stimulus. Agree the learner-facing instructions, adult notes, adaptations and observation prompts with a teacher. Do not treat this outline as a delivered lesson or a scored assessment.</p>`,activity:'Teacher review: choose one short task from the paired chapter, specify the adult support and record a de-identified observation. No graded quiz or certificate is proposed for this outline.'}]}))});
}
const pack={version:1,generatedFrom:'content/kiddies/*.md',status:'draft',reviewStatus:'pending-teacher-review',sources:[{title:'UNICEF play-based learning reference (pedagogy only; no text copied)',url:'https://www.unicef.org/sites/default/files/2018-12/UNICEF-Lego-Foundation-Learning-through-Play.pdf'},{title:'NERDC curriculum portal for teacher mapping; no alignment claimed',url:'https://nerdc.gov.ng/content_manager/new_curriculum_home.html'}],books,courses};
await writeFile(new URL('firestore-seed/kiddies-starter-pack.json',root),JSON.stringify(pack,null,2)+'\n');
console.log('Built 2 draft activity books and 2 explicitly incomplete course outlines. No database writes or publication.');
