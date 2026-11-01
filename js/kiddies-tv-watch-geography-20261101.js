/* Compact deep-link player: still validates against the approved-only Kiddies TV library. */
(()=>{'use strict';
const title=document.getElementById('watch-title'),desc=document.getElementById('watch-description'),box=document.getElementById('watch-video'),status=document.getElementById('watch-status'),full=document.getElementById('watch-fullscreen'),land=document.getElementById('watch-landscape');
const id=new URLSearchParams(location.search).get('v')||'';
const validId=/^[A-Za-z0-9_-]{11}$/.test(id);
const groups=new Set(['English & Phonics','English & Grammar','Mathematics','Science & Nature','Life Skills','Geography & Culture','Coding & Digital Literacy']);
const ages=new Set(['3-5','6-9','10-12','13-17']);
const approved=v=>v&&v.approved===true&&typeof v.title==='string'&&v.title.length<=160&&v.youtubeId===id&&groups.has(v.category)&&Array.isArray(v.ages)&&v.ages.length>0&&v.ages.every(a=>ages.has(a));
let theatre=false;
function fail(){
 title.textContent='This lesson is unavailable';
 desc.textContent='The selected video is not in SpeakOut’s approved Kiddies TV collection.';
 box.textContent='Please choose another lesson from the library.';
 status.textContent='Return to the library to select an educational video.';
 full.disabled=true;land.disabled=true;
}
function setTheatre(enabled){
 theatre=enabled;document.body.classList.toggle('kiddies-landscape-active',enabled);
 box.classList.toggle('landscape-theatre',enabled);
 land.textContent=enabled?'Exit landscape':'↻ Landscape';
 land.setAttribute('aria-pressed',String(enabled));
 status.textContent=enabled?'Landscape mode active. Use Exit landscape to return.':'Portrait view restored.';
}
if(!validId){fail();return;}
fetch('data/kiddies-tv-approved.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('catalogue unavailable');return r.json()}).then(data=>{
 const video=Array.isArray(data)?data.find(approved):null;
 if(!video){fail();return;}
 title.textContent=video.title;desc.textContent=(video.description||video.category)+' · Ages '+video.ages.join(', ');
 const iframe=document.createElement('iframe');iframe.title=video.title;iframe.loading='eager';iframe.referrerPolicy='strict-origin-when-cross-origin';
 iframe.allow='accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen';
 iframe.allowFullscreen=true;iframe.setAttribute('webkitallowfullscreen','');
 iframe.src='https://www.youtube-nocookie.com/embed/'+encodeURIComponent(id)+'?rel=0&autoplay=0&playsinline=1';
 box.replaceChildren(iframe);
 const report=document.createElement('button');report.type='button';report.className='video-report';
 report.textContent='Report lesson';report.dataset.reportVideo=video.youtubeId;report.dataset.reportTitle=video.title;
 document.querySelector('.watch-actions').append(report);
 full.disabled=false;land.disabled=false;
 status.textContent='Enjoy learning. Fullscreen and landscape availability depends on your browser.';
}).catch(fail);
full.addEventListener('click',async()=>{
 if(theatre){setTheatre(false);return;}
 try{
  if(document.fullscreenElement){await document.exitFullscreen();return;}
  if(box.requestFullscreen){await box.requestFullscreen();return;}
  status.textContent='Use the fullscreen control in the video player on this browser.';
 }catch{status.textContent='Your browser restricts fullscreen. Use the player’s own control.';}
});
land.addEventListener('click',async()=>{
 if(theatre){setTheatre(false);return;}
 if(!screen.orientation?.lock){setTheatre(true);return;}
 try{
  if(!document.fullscreenElement&&box.requestFullscreen)await box.requestFullscreen();
  await screen.orientation.lock('landscape');
  status.textContent='Landscape enabled. Exit fullscreen to return.';
 }catch{
  if(document.fullscreenElement){try{await document.exitFullscreen();}catch{}}
  setTheatre(true);
 }
});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&theatre)setTheatre(false);});
document.addEventListener('fullscreenchange',()=>{
 full.textContent=document.fullscreenElement?'Exit fullscreen':'⛶ Fullscreen';
 if(!document.fullscreenElement&&screen.orientation?.unlock){try{screen.orientation.unlock();}catch{}}
});
})();
