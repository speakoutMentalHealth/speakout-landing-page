import {requireRoles,renderRoleNav} from '../../launch-role-guard.js';
import {publishedUnits} from '../kiddies-catalogue.js';
import {ADVENTURES,isCorrect,readExploration,saveExploration} from '../kiddies-adventures.js';
const byId=id=>document.getElementById(id);
const element=(tag,text,className='')=>{const el=document.createElement(tag);el.textContent=text;if(className)el.className=className;return el;};
requireRoles(['student','teacher','parent','school_admin','admin','super_admin'],(user,profile)=>{
 renderRoleNav(profile,'My Learning');
 const params=new URLSearchParams(location.search),unit=publishedUnits().find(item=>item.id===params.get('id'));
 if(!unit){byId('unitStatus').textContent='This learning unit is unavailable. Return to My Learning to choose another.';return;}
 const adventures=ADVENTURES[unit.id]||[],lessons=unit.sections.map((s,i)=>/Lesson \d/.test(s.title)?i:-1).filter(i=>i>=0);
 const key=`speakout-exploration:${user.uid}:${unit.id}:v${unit.version}`,allowed=lessons.map(String);
 let storage=null;try{storage=window.localStorage;}catch{}
 let completed=readExploration(storage,key,allowed),round=0,resetArmed=false;
 const designs=new Map();
 document.title=`${unit.title} | SpeakOut`;
 byId('unitLevel').textContent=unit.educationStages[0]==='nursery'?'Kiddies Corner · Nursery · introductory unit':'Kiddies Corner · Primary 1 · introductory unit';
 byId('unitTitle').textContent=unit.title;byId('unitDescription').textContent=unit.description;
 byId('unitNumber').textContent=`Unit ${unit.unitNumber||1} · suggested learning sequence`;
 const sequence=publishedUnits().filter(item=>item.educationStages[0]===unit.educationStages[0]&&item.classLevels.join('|')===unit.classLevels.join('|')).sort((a,b)=>a.unitNumber-b.unitNumber);
 byId('unitSequence').replaceChildren(...sequence.map(item=>{const link=element('a',`Unit ${item.unitNumber}: ${item.title}`,'unit-sequence-link');link.href=`kiddies-unit.html?id=${encodeURIComponent(item.id)}${params.get('mode')==='materials'?'&mode=materials':''}`;if(item.id===unit.id)link.setAttribute('aria-current','page');return link;}));
 byId('mappingNote').textContent=unit.mapping;byId('curriculumSource').href=unit.source;
 byId('backToLearning').href=`my-learning.html?stage=${unit.educationStages[0]}${unit.classLevels.length?'&class='+encodeURIComponent(unit.classLevels[0]):''}${params.get('mode')==='materials'?'#materials':''}`;
 const select=byId('unitSection');select.replaceChildren(...unit.sections.map((section,i)=>new Option(section.title,String(i))));
 const requested=Number(params.get('section'));
 const first=params.get('mode')==='materials'?unit.sections.findIndex(s=>/practice sheet|activity sheet/i.test(s.title)):(lessons.find(i=>!completed.has(String(i)))??lessons[0]);
 select.value=String(params.has('section')&&Number.isInteger(requested)&&requested>=0&&requested<unit.sections.length?requested:Math.max(0,first));
 function progress(){
  byId('explorationCount').textContent=`${completed.size} of ${lessons.length} exploration stars`;
  byId('explorationProgress').max=lessons.length;byId('explorationProgress').value=completed.size;
  byId('starCollection').textContent=completed.size===lessons.length?'★ Curious Explorer — you explored every activity!':'Each explored activity adds a star. You can revisit any lesson.';
  byId('lessonJourney').replaceChildren(...lessons.map((index,i)=>{const button=element('button',`${completed.has(String(index))?'★':'○'} ${i+1}. ${adventures[i]?.name||unit.sections[index].title}`,'journey-stop');button.type='button';button.setAttribute('aria-pressed',String(Number(select.value)===index));button.addEventListener('click',()=>{select.value=String(index);render();byId('lessonTitle').focus();});return button;}));
 }
 function picture(value){
  const box=element('div','','challenge-picture');
  if(value==='size-books'){
   box.setAttribute('role','img');box.setAttribute('aria-label','A larger book on the left and a smaller book on the right');
   const big=element('span','','choice-art book larger-book'),small=element('span','','choice-art book smaller-book');big.setAttribute('aria-hidden','true');small.setAttribute('aria-hidden','true');box.append(big,small);return box;
  }
  if(value&&typeof value==='object'){
   if(value.type==='lines'){
    box.classList.add('line-examples');box.setAttribute('role','img');box.setAttribute('aria-label','Line A is straight; Line B bends smoothly and is curved');
    const ns='http://www.w3.org/2000/svg';
    for(const [label,path] of [['Line A','M 10 25 L 190 25'],['Line B','M 10 35 Q 55 -5 100 35 T 190 35']]){
     const row=element('div','','line-example');const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 200 60');svg.setAttribute('aria-hidden','true');const mark=document.createElementNS(ns,'path');mark.setAttribute('d',path);mark.setAttribute('fill','none');mark.setAttribute('stroke','#0a5fbf');mark.setAttribute('stroke-width','5');svg.append(mark);row.append(element('span',label,'picture-group-label'),svg);box.append(row);
    }return box;
   }
   if(value.type==='rhythm'){
    box.classList.add('rhythm-sequence');box.setAttribute('role','img');box.setAttribute('aria-label',value.actions.map((action,i)=>`Position ${i+1}: ${action.toLowerCase()}`).join('; '));
    value.actions.forEach((action,i)=>{const beat=element('div','',`rhythm-position ${action==='PAUSE'?'pause-position':''}`);beat.append(element('span',String(i+1),'rhythm-number'),element('strong',action));box.append(beat);});return box;
   }
   if(value.type==='plant'){
    box.setAttribute('role','img');box.setAttribute('aria-label','Example leafy plant: two broad leaves joined to a central stem; roots drawn below a soil line');
    const drawing=element('div','','plant-drawing');
    for(const part of ['plant-stem','plant-leaf left-leaf','plant-leaf right-leaf','plant-soil','plant-root left-root','plant-root right-root']){const mark=element('span','',part);mark.setAttribute('aria-hidden','true');drawing.append(mark);}
    box.append(drawing,element('p','Example plant · leaves, stem and roots','picture-group-label'));return box;
   }
   if(value.type==='strips'){
    box.classList.add('strip-comparison');box.setAttribute('role','img');box.setAttribute('aria-label',value.lengths[0]===value.lengths[1]?'Strips A and B have the same length from the shared start line; B is wider':'Strips A and B begin at the same start line; B is longer');
    box.append(element('p','Compare length from the same start','picture-group-label'));
    value.lengths.forEach((length,i)=>{const row=element('div','','strip-row');const strip=element('span','','comparison-strip');strip.style.width=`${length}%`;strip.style.height=`${value.widths[i]}px`;strip.setAttribute('aria-hidden','true');row.append(element('span',`Strip ${i===0?'A':'B'}`,'picture-group-label'),strip);box.append(row);});return box;
   }
   if(value.type==='pattern'){box.setAttribute('role','img');box.setAttribute('aria-label',value.shapes.join(', ')+', then a space for the next shape');value.shapes.forEach(shape=>{const drawing=element('span','','pattern-shape '+shape);drawing.setAttribute('aria-hidden','true');box.append(drawing);});const gap=element('span','?','pattern-gap');gap.setAttribute('aria-hidden','true');box.append(gap);return box;}
   if(value.type==='groups'){value.counts.forEach((amount,group)=>{const set=element('div','',`picture-group ${value.spread&&group===1?'spread-group':''}`);set.setAttribute('role','img');set.setAttribute('aria-label',`Group ${group===0?'A':'B'}: ${amount} circles${value.removed?`, ${value.removed} crossed out`:''}`);set.append(element('span',value.removed?`Take ${value.removed} away`:`Group ${group===0?'A':'B'}`,'picture-group-label'));const row=element('div','','circle-row');for(let i=0;i<amount;i++){const circle=element('span','',`counting-circle ${value.removed&&i>=amount-value.removed?'crossed-circle':''}`);circle.setAttribute('aria-hidden','true');row.append(circle);}set.append(row);box.append(set);});return box;}
  }
  if(['groups24','groups33','join22','remove51'].includes(value)){
   const amounts=value==='groups24'?[2,4]:value==='groups33'?[3,3]:value==='join22'?[2,2]:[5];
   amounts.forEach((amount,group)=>{const set=element('div','',`picture-group ${value==='groups33'&&group===1?'spread-group':''}`);set.setAttribute('role','img');set.setAttribute('aria-label',value==='remove51'?'Five circles, one crossed out':`${value==='join22'?'Joining group':'Group'} ${group===0?'A':'B'}: ${amount} circles`);set.append(element('span',value==='remove51'?'Take one away':`Group ${group===0?'A':'B'}`,'picture-group-label'));const row=element('div','','circle-row');for(let i=0;i<amount;i++){const circle=element('span','',`counting-circle ${value==='remove51'&&i===4?'crossed-circle':''}`);circle.setAttribute('aria-hidden','true');row.append(circle);}set.append(row);box.append(set);});return box;
  }
  if(typeof value==='number'){box.setAttribute('role','img');box.setAttribute('aria-label',`${value} circles`);for(let i=0;i<value;i++){const circle=element('span','','counting-circle');circle.setAttribute('aria-hidden','true');box.append(circle);}if(!value)box.append(element('span','An empty picture'));}
  else {box.setAttribute('aria-hidden','true');box.append(element('span','','large-shape '+value));}
  return box;
 }
 function play(){
  const index=lessons.indexOf(Number(select.value)),adventure=adventures[index],panel=byId('playPanel');panel.hidden=!adventure;
  if(!adventure)return;
  panel.replaceChildren(element('span',`TRY IT TOGETHER · ${round+1} OF ${adventure.questions.length}`,'game-kicker'));
  const question=adventure.questions[round];
  const heading=element('h3',question.prompt);heading.id='challengeTitle';panel.append(heading);
  if(question.picture!==''&&question.picture!==undefined)panel.append(picture(question.picture));
  const feedback=element('p','','game-feedback');feedback.id='gameFeedback';feedback.setAttribute('role','status');
  const choices=element('div','','answer-choices');
  const next=element('button',round+1===adventure.questions.length?'Collect my exploration star':'Next activity','btn primary');next.type='button';next.hidden=true;
  let answered=false;
  question.choices.forEach((choice,i)=>{const button=element('button',choice,'answer-choice');button.type='button';if(['Book','Cup','Cloth'].includes(choice)){const art=element('span','','choice-art '+choice.toLowerCase());art.setAttribute('aria-hidden','true');button.prepend(art);}button.addEventListener('click',()=>{
   if(answered)return;
   if(isCorrect(question,i)){answered=true;feedback.textContent=`You found it! ${question.explanation}`;feedback.className='game-feedback correct';button.classList.add('chosen');choices.querySelectorAll('button').forEach(b=>{b.disabled=true;});next.hidden=false;next.focus();}
   else {feedback.textContent=`Let’s look again. ${question.explanation} You can try another choice.`;feedback.className='game-feedback retry';}
  });choices.append(button);});
  next.addEventListener('click',()=>{
   if(round+1<adventure.questions.length){round++;play();byId('challengeTitle').tabIndex=-1;byId('challengeTitle').focus();return;}
   completed.add(select.value);const saved=saveExploration(storage,key,completed);progress();
   panel.replaceChildren(element('span','★','earned-star'),element('h3','You explored this activity!'),element('p','Great exploring. Tell your grown-up what you noticed. This star celebrates practice; it is not a grade.'));
   const following=lessons[index+1];const continueButton=element('button',following===undefined?'Try this activity again':'Explore the next lesson','btn primary');continueButton.type='button';continueButton.addEventListener('click',()=>{if(following!==undefined)select.value=String(following);render();byId('lessonTitle').focus();});panel.append(continueButton);
   const nextUnit=sequence.find(item=>item.unitNumber>unit.unitNumber);if(following===undefined&&nextUnit){const link=element('a',`Explore Unit ${nextUnit.unitNumber}: ${nextUnit.title}`,'btn');link.href=`kiddies-unit.html?id=${encodeURIComponent(nextUnit.id)}`;panel.append(link);}
   byId('unitStatus').textContent=saved?'Exploration star added. Progress is saved for this account on this browser.':'Exploration star added for this visit. Browser storage is unavailable.';
   const celebration=panel.querySelector('h3');celebration.tabIndex=-1;celebration.focus();
  });panel.append(choices,feedback,next,element('p','Ask a grown-up to read the choices, or point to your choice. There is no timer.','game-help'));
 }
 function studio(adventure){
  const host=byId('creativeStudio');host.hidden=!adventure?.creativeBoard;host.replaceChildren();
  if(host.hidden)return;
  const sectionKey=select.value;
  if(!designs.has(sectionKey))designs.set(sectionKey,{cells:Array(9).fill(''),tool:'Circle',history:[]});
  const design=designs.get(sectionKey);
  const title=element('h2','Your shape studio');title.id='studioHeading';title.tabIndex=-1;
  const instructions=element('p','Choose a shape, then choose a space. Use Erase to remove one shape. Make any arrangement you like; there is no single right design. A grown-up can help, or you can use paper.');
  const tools=element('div','','studio-tools');tools.setAttribute('role','group');tools.setAttribute('aria-label','Choose a studio tool');
  const board=element('div','','studio-board');board.setAttribute('role','group');board.setAttribute('aria-label','Nine spaces for your design');
  const status=element('p','Circle selected. Choose a space.','studio-status');status.setAttribute('role','status');
  const buttons=[];
  const undo=element('button','Undo last change','btn');undo.type='button';
  const clear=element('button','Clear this design','btn');clear.type='button';
  const paint=()=>{buttons.forEach((button,i)=>{const shape=design.cells[i];button.replaceChildren(element('span',`${i+1}${shape?' · '+shape:''}`,'studio-space-label'));button.setAttribute('aria-label',`Space ${i+1}: ${shape||'empty'}`);if(shape){const art=element('span','',`studio-shape ${shape.toLowerCase()}`);art.setAttribute('aria-hidden','true');button.append(art);}});undo.disabled=!design.history.length;clear.disabled=design.cells.every(cell=>!cell);};
  const remember=()=>{design.history.push([...design.cells]);if(design.history.length>20)design.history.shift();};
  for(const tool of ['Circle','Square','Line','Erase']){const button=element('button',tool,'studio-tool');button.type='button';button.setAttribute('aria-pressed',String(design.tool===tool));button.addEventListener('click',()=>{design.tool=tool;tools.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));status.textContent=`${tool} selected. Choose a space.`;});tools.append(button);}
  for(let i=0;i<9;i++){const button=element('button','','studio-space');button.type='button';button.addEventListener('click',()=>{const shape=design.tool==='Erase'?'':design.tool;if(design.cells[i]!==shape){remember();design.cells[i]=shape;paint();}status.textContent=shape?`${shape} placed in space ${i+1}. Tell your grown-up about your choice.`:`Space ${i+1} is empty.`;});buttons.push(button);board.append(button);}
  undo.addEventListener('click',()=>{if(!design.history.length)return;design.cells=design.history.pop();paint();status.textContent='Last change undone.';});
  clear.addEventListener('click',()=>{remember();design.cells=Array(9).fill('');paint();status.textContent='Design cleared. Undo last change can restore it.';});
  const actions=element('div','','studio-tools');actions.append(undo,clear);
  host.append(title,instructions,tools,board,status,actions,element('p','This design stays only during this visit. It is not uploaded or saved; refreshing or leaving clears it. The studio adds no extra stars and does not grade your artwork.','game-help'));
  status.textContent=`${design.tool} selected. Choose a space.`;paint();
 }
 function render(){
  round=0;resetArmed=false;byId('resetExploration').textContent='Start a fresh star collection';
  const section=unit.sections[Number(select.value)],heading=element('h2',section.title);heading.id='lessonTitle';heading.tabIndex=-1;
  const adventure=adventures[lessons.indexOf(Number(select.value))];
  const paragraphs=section.paragraphs.map(text=>{const p=document.createElement('p');p.textContent=text;return p;});
  if(adventure){const notes=element('details','','teaching-notes');notes.append(element('summary','Grown-up guide: full lesson, examples and answers'),...paragraphs);byId('lessonContent').replaceChildren(heading,element('p',adventure.intro,'learner-intro'),notes);if(adventure.creativeBoard){const make=element('button','Make your own design','btn primary studio-launch');make.type='button';make.addEventListener('click',()=>{byId('creativeStudio').scrollIntoView({behavior:'auto',block:'start'});byId('studioHeading').focus();});byId('lessonContent').insertBefore(make,notes);}}
  else byId('lessonContent').replaceChildren(heading,...paragraphs);
  byId('adventureIcon').textContent=adventure?.icon||'Aa';
  const url=new URL(location.href);url.searchParams.set('section',select.value);history.replaceState(null,'',url);
  byId('unitStatus').textContent=`${section.title} selected.`;progress();play();studio(adventure);
 }
 byId('resetExploration').addEventListener('click',()=>{if(!resetArmed){resetArmed=true;byId('resetExploration').textContent='Confirm: clear this unit’s stars';byId('unitStatus').textContent='Click Confirm to clear this unit’s stars on this browser. Lessons stay available.';return;}completed=new Set();saveExploration(storage,key,completed);render();byId('unitStatus').textContent='Your star collection is empty. Let’s explore again!';});
 let printNotes=null;
 const printMode=active=>{if(active&&printNotes===null){printNotes=[...document.querySelectorAll('.teaching-notes')].map(el=>({el,open:el.open}));printNotes.forEach(({el})=>{el.open=true;});}else if(!active&&printNotes!==null){printNotes.forEach(({el,open})=>{el.open=open;});printNotes=null;}};
 window.addEventListener('beforeprint',()=>printMode(true));window.addEventListener('afterprint',()=>printMode(false));window.matchMedia('print').addEventListener('change',event=>printMode(event.matches));
 select.addEventListener('change',render);byId('printSection').addEventListener('click',()=>window.print());byId('unitContent').hidden=false;render();
});
