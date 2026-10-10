import { validateKiddiesStarterPack } from './kiddies-starter-pack.js';
import { bookReadiness } from './content-visibility.js';
import { CURRICULUM_SOURCES, draftCurriculumLabel } from './curriculum-mapping.js';
const byId=id=>document.getElementById(id);
let pack;
function renderBook(index) {
 const book=pack.books[index];
 byId('book').hidden=false;byId('courseOutline').hidden=false;
 byId('bookTitle').textContent=book.title;
 byId('bookStage').textContent=`Kiddies Corner · ${book.educationStages[0]} · Draft`;
 byId('bookMeta').textContent=`Provisional classes: ${book.classLevels.join(', ')} · ${book.chapters.length} chapters · ${bookReadiness(book).wordCount} chapter words · AI-assisted original draft`;
 let mapping=document.getElementById('curriculumReview');
 if(!mapping){mapping=document.createElement('section');mapping.id='curriculumReview';byId('bookMeta').after(mapping);}
 mapping.replaceChildren();
 const heading=document.createElement('h3');heading.textContent='Nigerian curriculum mapping';mapping.append(heading);
 const note=document.createElement('p');note.textContent=book.curriculum?draftCurriculumLabel(book.curriculum):'Outcome mapping not recorded; not curriculum verified.';mapping.append(note);
 if(book.curriculum){
  for(const id of book.curriculum.sourceIds){const source=CURRICULUM_SOURCES.find(item=>item.id===id),paragraph=document.createElement('p'),link=document.createElement('a');link.href=source.url;link.textContent=`${source.authority}: ${source.title}`;paragraph.append(link,document.createTextNode(` — ${source.edition||'edition pending'}; ${source.inspection}. ${source.scope||''} ${source.rights||''}`));mapping.append(paragraph);}
  const list=document.createElement('ul');
  for(const entry of book.curriculum.mappings){const item=document.createElement('li');item.textContent=`${entry.chapterId}: ${entry.topic} — PDF page ${entry.pdfPage}, printed page ${entry.printedPage}. Candidate partial mapping; teacher review pending.`;list.append(item);}
  for(const gap of book.curriculum.gaps){const item=document.createElement('li');item.textContent=`Outstanding: ${gap}`;list.append(item);}
  mapping.append(list);
 }
 byId('chapters').replaceChildren(...book.chapters.map(chapter=>{
  const article=document.createElement('article'),heading=document.createElement('h3');heading.textContent=chapter.title;article.append(heading);
  // Only plain-text paragraphs/headings enter the review DOM. Do not execute
  // embedded markup, links, images, scripts or event attributes from a pack.
  const source=new DOMParser().parseFromString(chapter.content,'text/html');
  for(const block of source.body.children){const node=document.createElement(block.tagName==='H3'?'h4':'p');node.textContent=block.textContent;article.append(node);}
  return article;
 }));
 const course=pack.courses.find(item=>item.relatedBookId===book.id);
 byId('courseTitle').textContent=course.title;byId('courseNote').textContent=course.shortDescription;
 byId('courseModules').replaceChildren(...course.modules.map(module=>{const node=document.createElement('li');node.textContent=module.title;return node;}));
 document.querySelectorAll('#bookChoices button').forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));
 byId('printBook').disabled=false;
}
byId('printBook').addEventListener('click',()=>window.print());
try {
 const response=await fetch('firestore-seed/kiddies-starter-pack.json',{cache:'no-store'});if(!response.ok)throw Error('The review pack could not be loaded.');
 pack=await response.json();validateKiddiesStarterPack(pack);
 byId('bookChoices').replaceChildren(...pack.books.map((book,index)=>{const button=document.createElement('button');button.type='button';button.textContent=book.educationStages[0]==='nursery'?'Nursery activity book':'Primary activity book';button.addEventListener('click',()=>renderBook(index));return button;}));
 renderBook(0);byId('status').textContent='Review copy ready. Nothing has been imported or published.';
}catch(error){byId('status').textContent=error.message||'Could not load the draft pack. Refresh to try again.';}
