/* SpeakOut Kiddies TV: approved-only YouTube video discovery and in-page playback. */
(()=>{'use strict';
const groups=[
 ['English & Phonics','English & Phonics','Letters, sounds and the magic of reading'],
 ['English & Grammar','English & Grammar','Words, stories and confident communication'],
 ['Mathematics','Mathematics','Numbers, patterns and clever problem solving'],
 ['Science & Nature','Science & Nature','Explore the amazing world around us'],
 ['Life Skills','Life Skills','Everyday ideas for growing minds'],
 ['Geography & Culture','Geography & Culture','Countries, capitals, maps and African heritage'],
 ['Coding & Digital Literacy','Coding & Digital Literacy','Create, code and learn digital skills']
];
const validAges=['3-5','6-9','10-12','13-17'];
const byId=id=>document.getElementById(id);
const catalog=byId('catalogue'),search=byId('search'),age=byId('age'),chips=byId('subjects'),empty=byId('empty'),counter=byId('video-count'),teenStatus=byId('teen-review-status');
const player=byId('player'),frame=byId('player-frame'),title=byId('player-title'),description=byId('player-description');
const hero=document.querySelector('.hero'),heroImage=byId('hero-image'),heroArtwork=byId('hero-artwork'),heroTitle=byId('hero-title'),heroCategory=byId('hero-category'),heroDescription=byId('hero-description'),featureButton=byId('surprise-video'),featureNext=byId('hero-next'),featureCount=byId('hero-feature-count');
let videos=[],subject='',lastTrigger=null,featured=null,spotlight=[],spotlightIndex=0;
const reducedMotion=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const approved=v=>v&&v.approved===true&&typeof v.title==='string'&&v.title.length<=160&&/^[A-Za-z0-9_-]{11}$/.test(v.youtubeId||'')&&groups.some(g=>g[0]===v.category)&&Array.isArray(v.ages)&&v.ages.length>0&&v.ages.every(a=>validAges.includes(a));
const filtered=()=>{const query=search.value.trim().toLowerCase(),targetAge=age.value;return videos.filter(v=>(!subject||v.category===subject)&&(!targetAge||v.ages.includes(targetAge))&&(!query||(v.title+' '+(v.description||'')+' '+(v.source||'')+' '+v.category).toLowerCase().includes(query)));};
const imageUrl=id=>'https://i.ytimg.com/vi/'+encodeURIComponent(id)+'/hqdefault.jpg';
function chip(label,key){
 const button=document.createElement('button');
 button.type='button';button.className='chip';button.textContent=label;
 button.setAttribute('aria-pressed',String(subject===key));
 button.addEventListener('click',()=>{
  subject=key;updateChips();draw();
  byId('catalogue').scrollIntoView({behavior:reducedMotion()?'auto':'smooth',block:'start'});
 });
 return button;
}
function renderChips(){
 chips.replaceChildren(chip('All lessons',''));
 for(const group of groups) chips.append(chip(group[0],group[0]));
}
function updateChips(){for(const button of chips.children)button.setAttribute('aria-pressed',String(button.textContent===(subject||'All lessons')));}
function spotlightCandidates(matches){
 // Spotlight choices come exclusively from the approved catalogue, never from
 // YouTube recommendations or unreviewed candidate leads.
 if(subject||age.value||search.value.trim())return matches.slice(0,3);
 const ids=['mxzyANgHrS0','ZN2rjEVlsmc','xg4_gWt8N_Q'];
 const curated=ids.map(id=>matches.find(v=>v.youtubeId===id)).filter(Boolean);
 return curated.length?curated:matches.slice(0,3);
}
function renderSpotlight(){
 featured=spotlight[spotlightIndex]||null;
 featureButton.disabled=!featured;
 featureNext.disabled=spotlight.length<=1;
 featureCount.textContent=featured?String(spotlightIndex+1).padStart(2,'0')+' / '+String(spotlight.length).padStart(2,'0'):'00 / 00';
 if(!featured){
  hero.classList.remove('has-feature');heroImage.removeAttribute('src');heroArtwork.removeAttribute('src');
  heroTitle.textContent=videos.length?'Find a new favourite.':'A world of wonder is waiting.';
  heroCategory.textContent='SPEAKOUT SPOTLIGHT';
  heroDescription.textContent=videos.length?'Try another subject, age or search to discover a lesson.':'Big discoveries start with one little question. Explore something amazing today.';
  return;
 }
 // Build highlighted text with DOM nodes rather than untrusted HTML.
 const words=featured.title.split(' '),tail=words.splice(-Math.min(2,words.length)).join(' ');
 const mark=document.createElement('em');mark.textContent=tail;
 heroTitle.replaceChildren(document.createTextNode((words.join(' ')||'Discover')+' '),mark);
 heroCategory.textContent='SPEAKOUT SPOTLIGHT · '+featured.category.toUpperCase();
 heroDescription.textContent=(featured.description||'Find something wonderful to learn.')+' · '+(featured.source||'Educational publisher')+' · Ages '+featured.ages.join(', ');
 heroImage.src=imageUrl(featured.youtubeId);heroArtwork.src=imageUrl(featured.youtubeId);
 hero.classList.add('has-feature');
}
function paintHero(matches){
 spotlight=spotlightCandidates(matches);
 spotlightIndex=0;
 renderSpotlight();
}
featureNext.addEventListener('click',()=>{
 if(spotlight.length<2)return;
 spotlightIndex=(spotlightIndex+1)%spotlight.length;
 renderSpotlight();
});
function makeTile(video){
 const article=document.createElement('article');article.className='tile';
 const button=document.createElement('button');button.className='tile-watch';button.type='button';
 button.setAttribute('aria-label','Watch '+video.title);
 const artwork=document.createElement('span');artwork.className='art';
 const img=document.createElement('img');img.src=imageUrl(video.youtubeId);img.alt='';img.loading='lazy';img.decoding='async';img.referrerPolicy='no-referrer';
 const play=document.createElement('span');play.className='playmark';play.textContent='▶';play.setAttribute('aria-hidden','true');
 const ageTag=document.createElement('span');ageTag.className='age-tag';ageTag.textContent='AGES '+video.ages.join(' / ');
 artwork.append(img,ageTag,play);
 const copy=document.createElement('span');copy.className='tile-copy';
 const name=document.createElement('strong');name.textContent=video.title;
 const publisher=document.createElement('small');publisher.textContent=video.source||'Educational publisher';
 copy.append(name,publisher);
 button.append(artwork,copy);button.addEventListener('click',()=>watch(video,button));
 const footer=document.createElement('div');footer.className='tile-footer';
 const subjectName=document.createElement('span');subjectName.className='tile-subject';subjectName.textContent=video.category;
 const report=document.createElement('button');report.type='button';report.className='video-report';
 report.textContent='Report';report.setAttribute('aria-label','Report a concern about '+video.title);
 report.dataset.reportVideo=video.youtubeId;report.dataset.reportTitle=video.title;
 footer.append(subjectName,report);article.append(button,footer);
 return article;
}
function makeSection(group,items,index){
 const [key,heading,subtitle]=group;
 const section=document.createElement('section');section.className='rail-section';section.id='section-'+index;
 section.setAttribute('aria-label',heading+' lessons');
 const head=document.createElement('div');head.className='section-head';
 const copy=document.createElement('div'),label=document.createElement('span');label.className='section-label';label.textContent='COLLECTION '+String(index+1).padStart(2,'0');
 const title=document.createElement('h2');title.textContent=heading;
 const sub=document.createElement('p');sub.textContent=subtitle;
 copy.append(label,title,sub);
 const tools=document.createElement('div');tools.className='section-tools';
 const count=document.createElement('span');count.className='section-count';count.textContent=items.length+' videos';
 const rail=document.createElement('div');rail.className='rail';rail.tabIndex=0;rail.setAttribute('aria-label',heading+' videos: swipe or scroll to browse');
 const left=document.createElement('button'),right=document.createElement('button');
 left.type=right.type='button';left.className=right.className='rail-arrow';
 left.textContent='‹';right.textContent='›';
 left.setAttribute('aria-label','Scroll '+heading+' left');right.setAttribute('aria-label','Scroll '+heading+' right');
 left.addEventListener('click',()=>rail.scrollBy({left:-Math.max(rail.clientWidth*.78,230),behavior:reducedMotion()?'auto':'smooth'}));
 right.addEventListener('click',()=>rail.scrollBy({left:Math.max(rail.clientWidth*.78,230),behavior:reducedMotion()?'auto':'smooth'}));
 tools.append(count,left,right);head.append(copy,tools);
 for(const video of items) rail.append(makeTile(video));
 section.append(head,rail);return section;
}
function draw(){
 const matches=filtered();const fragment=document.createDocumentFragment();
 const allSubjects=!subject;
 const teenMatches=matches.filter(v=>v.ages.includes('13-17'));
 // Netflix-style discovery, without displaying the same video twice in the same
 // view. On All Subjects, secondary-school lessons form a dedicated first shelf.
 if(allSubjects&&teenMatches.length){
  const shelf=makeSection(['Teen Learning','Secondary School · Ages 13–17','WAEC/JAMB-ready lessons from Nigerian educational publishers'],teenMatches,0);
  shelf.classList.add('rail-section--teen');
  fragment.append(shelf);
 }
 for(let i=0;i<groups.length;i++){
  const matching=matches.filter(v=>v.category===groups[i][0]&&(!allSubjects||!v.ages.includes('13-17')));
  if(matching.length)fragment.append(makeSection(groups[i],matching,allSubjects?i+1:i));
 }
 catalog.replaceChildren(fragment);
 const teenCollectionPending=age.value==='13-17'&&!videos.some(v=>v.ages.includes('13-17'));
 teenStatus.hidden=!teenCollectionPending;
 empty.hidden=matches.length>0||teenCollectionPending;
 counter.textContent=matches.length+' learning video'+(matches.length===1?'':'s');
 paintHero(matches);
}
function watch(video,trigger){
 if(!approved(video))return;
 lastTrigger=trigger||null;
 title.textContent=video.title;
 description.textContent=(video.description||video.category)+' · Ages '+video.ages.join(', ');
 const iframe=document.createElement('iframe');
 iframe.title=video.title;iframe.loading='eager';iframe.referrerPolicy='strict-origin-when-cross-origin';
 iframe.allow='accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen';
 iframe.allowFullscreen=true;iframe.setAttribute('webkitallowfullscreen','');
 iframe.src='https://www.youtube-nocookie.com/embed/'+encodeURIComponent(video.youtubeId)+'?rel=0&autoplay=0&playsinline=1';
 frame.replaceChildren(iframe);
 player.hidden=false;byId('close-video').hidden=false;
 player.scrollIntoView({behavior:reducedMotion()?'auto':'smooth',block:'start'});
}
function close(){
 frame.replaceChildren();player.hidden=true;
 title.textContent='Choose a lesson';description.textContent='';
 byId('close-video').hidden=true;
 if(lastTrigger && lastTrigger.isConnected)lastTrigger.focus({preventScroll:true});
}
byId('close-video').addEventListener('click',close);
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!player.hidden)close();});
search.addEventListener('input',draw);age.addEventListener('change',draw);
byId('browse-videos').addEventListener('click',()=>byId('explore').scrollIntoView({behavior:reducedMotion()?'auto':'smooth',block:'start'}));
featureButton.addEventListener('click',()=>{if(featured)watch(featured,featureButton);});
renderChips();featureButton.disabled=true;
fetch('data/kiddies-tv-approved.json',{cache:'no-store'})
 .then(response=>{if(!response.ok)throw new Error('Video catalogue unavailable');return response.json();})
 .then(data=>{videos=Array.isArray(data)?data.filter(approved):[];draw();})
 .catch(()=>{videos=[];draw();empty.hidden=false;empty.textContent='The learning library is temporarily unavailable. Please try again later.';});
})();
