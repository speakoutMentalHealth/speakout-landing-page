import {requireRoles,renderRoleNav} from '../../launch-role-guard.js';
import {publishedUnits} from '../kiddies-catalogue.js';
const byId=id=>document.getElementById(id);
requireRoles(['student','teacher','parent','school_admin','admin','super_admin'],(_user,profile)=>{
 renderRoleNav(profile,'My Learning');
 const params=new URLSearchParams(location.search),unit=publishedUnits().find(item=>item.id===params.get('id'));
 if(!unit){byId('unitStatus').textContent='This learning unit is unavailable. Return to My Learning to choose another.';return;}
 document.title=`${unit.title} | SpeakOut`;
 byId('unitLevel').textContent=unit.educationStages[0]==='nursery'?'Kiddies Corner · Nursery · introductory unit':'Kiddies Corner · Primary 1 · introductory unit';
 byId('unitTitle').textContent=unit.title;byId('unitDescription').textContent=unit.description;
 byId('mappingNote').textContent=unit.mapping;byId('curriculumSource').href=unit.source;
 byId('backToLearning').href=`my-learning.html?stage=${unit.educationStages[0]}${unit.classLevels.length?'&class='+encodeURIComponent(unit.classLevels[0]):''}${params.get('mode')==='materials'?'#materials':''}`;
 const select=byId('unitSection');select.replaceChildren(...unit.sections.map((section,i)=>new Option(section.title,String(i))));
 const requested=Number(params.get('section'));
 const first=params.get('mode')==='materials'?unit.sections.findIndex(s=>/practice sheet|activity sheet/i.test(s.title)):unit.sections.findIndex(s=>/Lesson \d/.test(s.title));
 select.value=String(params.has('section')&&Number.isInteger(requested)&&requested>=0&&requested<unit.sections.length?requested:Math.max(0,first));
 const render=()=>{const section=unit.sections[Number(select.value)],heading=document.createElement('h2');heading.id='lessonTitle';heading.textContent=section.title;byId('lessonContent').replaceChildren(heading,...section.paragraphs.map(text=>{const p=document.createElement('p');p.textContent=text;return p;}));const url=new URL(location.href);url.searchParams.set('section',select.value);history.replaceState(null,'',url);byId('unitStatus').textContent=`${section.title} selected.`;};
 select.addEventListener('change',render);byId('printSection').addEventListener('click',()=>window.print());byId('unitContent').hidden=false;render();
});
