/* Dedicated, approved-only Kiddies TV viewing page. No access to general TV catalogue. */
(()=>{'use strict';
const title=document.getElementById('watch-title'),desc=document.getElementById('watch-description'),box=document.getElementById('watch-video'),status=document.getElementById('watch-status'),full=document.getElementById('watch-fullscreen'),land=document.getElementById('watch-landscape');
const params=new URLSearchParams(location.search),id=params.get('v')||'';
const validId=/^[A-Za-z0-9_-]{11}$/.test(id);
const groups=new Set(['English & Phonics','English & Grammar','Mathematics','Science & Nature','Life Skills']);
const ages=new Set(['3-5','6-9','10-12','13-17']);
const approved=v=>v&&v.approved===true&&typeof v.title==='string'&&v.title.length<=160&&v.youtubeId===id&&groups.has(v.category)&&Array.isArray(v.ages)&&v.ages.length>0&&v.ages.every(a=>ages.has(a));
function fail(){title.textContent='Lesson unavailable';desc.textContent='This lesson is not in the approved Kiddies TV catalogue.';box.textContent='Please choose another lesson.';status.textContent='Return to the learning library to select a video.';}
if(!validId){fail();return;}
fetch('data/kiddies-tv-approved.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('catalogue unavailable');return r.json()}).then(data=>{
const video=Array.isArray(data)?data.find(approved):null;if(!video){fail();return;}
title.textContent=video.title;desc.textContent=(video.description||video.category)+' · Ages '+video.ages.join(', ');
const iframe=document.createElement('iframe');iframe.title=video.title;iframe.loading='eager';iframe.referrerPolicy='strict-origin-when-cross-origin';iframe.allow='accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen';iframe.allowFullscreen=true;iframe.setAttribute('webkitallowfullscreen','');iframe.src='https://www.youtube-nocookie.com/embed/'+encodeURIComponent(id)+'?rel=0&autoplay=0&playsinline=1';box.replaceChildren(iframe);
full.disabled=false;land.disabled=false;status.textContent='Use Full screen for an immersive view, or rotate your device for landscape.';
}).catch(fail);
let theatre=false;
function setTheatre(enabled){
  theatre=enabled;
  document.body.classList.toggle('kiddies-landscape-active',enabled);
  box.classList.toggle('landscape-theatre',enabled);
  land.textContent=enabled?'Exit landscape view':'↻ Landscape view';
  land.setAttribute('aria-pressed',String(enabled));
  status.textContent=enabled?'Landscape viewing mode active. Tap Exit landscape view to return.':'Portrait viewing restored.';
}
full.addEventListener('click',async()=>{
  if(theatre){setTheatre(false);return;}
  try{
    if(document.fullscreenElement){await document.exitFullscreen();return;}
    if(box.requestFullscreen){await box.requestFullscreen();return;}
    status.textContent='Use the full-screen control inside the YouTube player on this browser.';
  }catch{status.textContent='This browser restricts page full screen. Use the video player’s full-screen button.';}
});
land.addEventListener('click',async()=>{
  if(theatre){setTheatre(false);return;}
  // iOS in-app browsers often refuse Screen Orientation API calls. Provide a real
  // CSS landscape theatre mode instead of leaving the button apparently inert.
  if(!screen.orientation?.lock){setTheatre(true);return;}
  try{
    if(!document.fullscreenElement&&box.requestFullscreen)await box.requestFullscreen();
    await screen.orientation.lock('landscape');
    status.textContent='Landscape enabled. Exit full screen to return.';
  }catch{
    if(document.fullscreenElement){try{await document.exitFullscreen();}catch{}}
    setTheatre(true);
  }
});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&theatre)setTheatre(false);});

document.addEventListener('fullscreenchange',()=>{full.textContent=document.fullscreenElement?'Exit full screen':'⛶ Full screen';if(!document.fullscreenElement&&screen.orientation?.unlock){try{screen.orientation.unlock();}catch{}}});
})();