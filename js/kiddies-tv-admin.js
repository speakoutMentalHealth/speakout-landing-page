import {requireRoles} from '../launch-role-guard.js';
import {auth,db} from '../firebase-config.js';
import {collection,doc,getDoc,getDocs,runTransaction,query,orderBy,limit,startAfter,serverTimestamp} from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js';
import {SUBJECTS,AGES,parseYouTubeId,previewBulkImport,buildCoverage,getReviewQueue,determineAction} from './kiddies-tv-studio-tools.js';
import {mergeKiddiesCatalogue} from './kiddies-tv-data.js';

const $=id=>document.getElementById(id);
const names=SUBJECTS;
const validId=id=>/^[A-Za-z0-9_-]{11}$/.test(id||'');
const safeText=value=>String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const videoUrl=id=>'https://www.youtube.com/watch?v='+encodeURIComponent(id);
const clean=video=>({youtubeId:video.youtubeId,title:video.title,description:video.description,source:video.source,category:video.category,ages:video.ages});
const configRef=doc(db,'kiddiesTvConfig','live');
let baseline=[],records=new Map(),hidden=new Set(),editing=null,busy=false,profile=null;
let bulkDrafts=[],auditCursor=null,auditDone=false;

const now=()=>new Date().toISOString();
function status(message,tone=''){
 const el=$('studio-status');el.textContent=message;el.className='notice'+(tone?' '+tone:'');
}
function setBusy(value){
 busy=value;$('save-video').disabled=value;
 $('bulk-submit').disabled=value||bulkDrafts.length===0;
 $('bulk-preview').disabled=value;
 for(const button of document.querySelectorAll('.video-actions button, .workflow-list button'))button.disabled=value;
}
function legacyById(id){return baseline.find(x=>x.youtubeId===id)||null;}
function allRows(){
 const out=new Map();
 baseline.forEach(v=>out.set(v.youtubeId,{...clean(v),status:hidden.has(v.youtubeId)?'archived':'published',origin:'legacy',reviewConfirmed:false,reviewer:'',reviewDate:''}));
 for(const [id,v] of records)out.set(id,{...v,origin:legacyById(id)?'legacy override':'database'});
 return [...out.values()].sort((a,b)=>a.title.localeCompare(b.title));
}
function metrics(){
 const live=mergeKiddiesCatalogue(baseline,[...records.values()],Array.from(hidden));
 const rows=allRows();
 $('metric-total').textContent=live.length;
 $('metric-draft').textContent=rows.filter(x=>x.status==='draft').length;
 $('metric-hidden').textContent=rows.filter(x=>x.status==='archived').length;
 $('metric-teen').textContent=live.filter(x=>Array.isArray(x.ages)&&x.ages.includes('13-17')).length;
}
function draw(){
 metrics();
 const query=$('library-search').value.trim().toLowerCase(),state=$('library-filter').value;
 const rows=allRows().filter(v=>(state==='all'||v.status===state)&&(!query||[v.title,v.source,v.category].join(' ').toLowerCase().includes(query)));
 const host=$('video-list');host.replaceChildren();
 if(!rows.length){const p=document.createElement('p');p.className='empty-list';p.textContent='No videos match. Try changing the search or status filter.';host.append(p);drawReviewQueue();drawCoverage();return;}
 const frag=document.createDocumentFragment();
 for(const v of rows){
  const card=document.createElement('article');card.className='video-item';
  const image=document.createElement('img');image.className='video-thumb';image.loading='lazy';image.alt='';image.src='https://i.ytimg.com/vi/'+encodeURIComponent(v.youtubeId)+'/hqdefault.jpg';
  const info=document.createElement('div');info.className='video-info';
  const title=document.createElement('h3');title.textContent=v.title;
  const stateEl=document.createElement('span');stateEl.className='video-status '+v.status;stateEl.textContent=v.status+' · '+v.origin;
  const meta=document.createElement('p');meta.textContent=v.source+' · '+v.category+' · Ages '+v.ages.join(', ');
  const actions=document.createElement('div');actions.className='video-actions';
  const edit=document.createElement('button');edit.type='button';edit.textContent='Edit';edit.addEventListener('click',()=>fill(v));
  actions.append(edit);
  if(v.status==='published'){
   actions.append(action('Unpublish',()=>changeStatus(v,'draft')));
   actions.append(action('Archive',()=>changeStatus(v,'archived')));
  }else if(v.status==='draft')actions.append(action('Archive',()=>changeStatus(v,'archived')));
  else actions.append(action('Restore as draft',()=>changeStatus(v,'draft')));
  info.append(title,stateEl,meta,actions);card.append(image,info);frag.append(card);
 }
 host.append(frag);
 drawReviewQueue();drawCoverage();
}
function action(text,fn){const b=document.createElement('button');b.type='button';b.textContent=text;b.addEventListener('click',fn);return b;}
function reset(){
 editing=null;$('video-form').reset();$('video-url').readOnly=false;
 $('form-heading').textContent='Add a learning video';
 $('video-status').value='draft';
 document.querySelectorAll('[name="ages"]').forEach(x=>x.checked=false);
}
function fill(v){
 editing=v.youtubeId;
 $('form-heading').textContent='Edit: '+v.title;
 $('video-url').value=videoUrl(v.youtubeId);$('video-url').readOnly=true;
 $('video-title').value=v.title;$('video-description').value=v.description;
 $('video-source').value=v.source;$('video-category').value=v.category;
 $('video-status').value=v.status;$('video-reviewer').value=v.reviewer||'';
 $('video-review-date').value=String(v.reviewDate||'').slice(0,10);
 $('video-reviewed').checked=v.reviewConfirmed===true;
 for(const box of document.querySelectorAll('[name="ages"]'))box.checked=v.ages.includes(box.value);
 document.querySelector('.editor').scrollIntoView({behavior:'smooth',block:'start'});
}
function formData(){
 const youtubeId=parseYouTubeId($('video-url').value);
 const title=$('video-title').value.trim(),source=$('video-source').value.trim(),description=$('video-description').value.trim();
 const category=$('video-category').value,ages=[...document.querySelectorAll('[name="ages"]:checked')].map(x=>x.value);
 const state=$('video-status').value,reviewConfirmed=$('video-reviewed').checked;
 const reviewer=$('video-reviewer').value.trim(),reviewDate=$('video-review-date').value;
 if(!youtubeId)throw Error('Paste one individual YouTube video URL or its 11-character ID.');
 if(editing&&youtubeId!==editing)throw Error('You cannot change a saved video ID. Create a new draft instead.');
 if(!names.includes(category)||!ages.length)throw Error('Choose a valid subject and at least one age group.');
 if(!title||title.length<5||title.length>160||description.length<15||description.length>250||source.length<2||source.length>120)throw Error('Check the title, creator and description lengths.');
 if(state==='published'&&(!reviewConfirmed||reviewer.length<3||!reviewDate))throw Error('Publishing requires a named full-video reviewer, review date and completed safety confirmation.');
 return {youtubeId,title,source,description,category,ages,status:state,approved:state==='published',reviewConfirmed,reviewer,reviewDate};
}
async function refresh(){
 const response=await fetch('data/kiddies-tv-approved.json',{cache:'no-store'});
 if(!response.ok)throw Error('Could not load the existing Kiddies TV catalogue.');
 baseline=await response.json();
 if(!Array.isArray(baseline))throw Error('Invalid video catalogue');
 const [config,docs]=await Promise.all([getDoc(configRef),getDocs(collection(db,'kiddiesTvVideos'))]);
 if(config.exists()&&config.data().mode!=='overlay')throw Error('Unsupported publication configuration.');
 hidden=new Set(config.exists()?(config.data().hiddenLegacyIds||[]):[]);
 records=new Map(docs.docs.map(d=>[d.id,d.data()]));
 draw();
}
async function writeVideo(data){
 const user=auth.currentUser;if(!user)throw Error('Please sign in again.');
 const isLegacy=Boolean(legacyById(data.youtubeId));
 const eventRef=doc(collection(db,'kiddiesTvAudit'));
 const videoRef=doc(db,'kiddiesTvVideos',data.youtubeId);
 await runTransaction(db,async transaction=>{
  const config=await transaction.get(configRef);
  const current=await transaction.get(videoRef);
  const existing=current.exists()?current.data():null;
  const previous=existing?.status||(isLegacy&&!config.data()?.hiddenLegacyIds?.includes(data.youtubeId)?'published':'none');
  const oldIds=config.exists()?(config.data().hiddenLegacyIds||[]):[];
  const hiddenIds=isLegacy?[...new Set([...oldIds,data.youtubeId])]:oldIds;
  transaction.set(configRef,{mode:'overlay',hiddenLegacyIds:hiddenIds,updatedAt:now(),updatedBy:user.uid});
  transaction.set(videoRef,{
   ...data,createdAt:existing?.createdAt||now(),createdBy:existing?.createdBy||user.uid,
   updatedAt:now(),updatedBy:user.uid
  });
  transaction.set(eventRef,{youtubeId:data.youtubeId,
   action:determineAction(previous,data.status),actorUid:user.uid,at:serverTimestamp(),
   previousStatus:previous,nextStatus:data.status,title:data.title,batchId:''});
 });
}
async function changeStatus(v,target){
 if(busy)return;
 const message=target==='archived'?'Archive this video and remove it from Kiddies TV?':target==='draft'?'Unpublish this video? It will immediately disappear from the public catalogue.':'Confirm this action?';
 if(!confirm(message))return;
 try{
  setBusy(true);status('Updating the video…');
  await writeVideo({...clean(v),status:target,approved:false,reviewConfirmed:v.reviewConfirmed===true,reviewer:v.reviewer||'',reviewDate:v.reviewDate||''});
  await refresh();await refreshAudit();status('Video '+(target==='archived'?'archived':'unpublished')+'. The public library updates without GitHub.','ok');
 }catch(error){status(error.message||'Unable to update video.','error');}
 finally{setBusy(false);}
}
async function save(event){
 event.preventDefault();if(busy)return;
 try{
  const data=formData();
  if(!editing&&(records.has(data.youtubeId)||legacyById(data.youtubeId)))throw Error('This video already exists. Use Edit in the library below.');
  setBusy(true);status('Saving your lesson securely…');
  await writeVideo(data);
  await refresh();await refreshAudit();reset();status('Lesson saved as '+data.status+'. Changes are available to the public collection without a deployment.','ok');
 }catch(error){status(error.message||'Save failed.','error');}
 finally{setBusy(false);}
}
function setup(){
 const select=$('video-category');for(const name of names){const option=new Option(name,name);select.append(option);}
 $('video-form').addEventListener('submit',save);
 $('cancel-edit').addEventListener('click',reset);
 $('preview-video').addEventListener('click',()=>{
  const id=parseYouTubeId($('video-url').value);
  if(!id){status('Enter a valid YouTube video first.','error');return;}
  window.open(videoUrl(id),'_blank','noopener,noreferrer');
 });
 $('library-search').addEventListener('input',draw);
 $('library-filter').addEventListener('change',draw);
 setupBulk();
 $('audit-more').addEventListener('click',()=>loadAuditPage());
 reset();
}
requireRoles(['admin','super_admin'],async current=>{
 profile=current;
 try{setup();await refresh();await refreshAudit();$('studio-app').hidden=false;status('Administrator verified. Kiddies TV editor is ready.','ok');}
 catch(error){status('Could not load Kiddies TV management: '+(error?.message||'Unknown error')+'. Please check Firebase and Firestore access.','error');}
});
