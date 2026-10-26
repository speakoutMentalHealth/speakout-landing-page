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
full.addEventListener('click',async()=>{try{if(document.fullscreenElement){await document.exitFullscreen();return;}if(box.requestFullscreen){await box.requestFullscreen();return;}if(box.webkitEnterFullscreen){box.webkitEnterFullscreen();return;}status.textContent='Use the full-screen control inside the YouTube player on this browser.';}catch{status.textContent='This browser restricts page full screen. Use the video player’s full-screen button.';}});
land.addEventListener('click',async()=>{try{if(!document.fullscreenElement&&box.requestFullscreen)await box.requestFullscreen();if(screen.orientation?.lock){await screen.orientation.lock('landscape');status.textContent='Landscape enabled. Exit full screen to return.';}else status.textContent='Rotate your device sideways. On iPhone or iPad, use the YouTube full-screen control if necessary.';}catch{status.textContent='Automatic rotation is not supported here. Turn off orientation lock, rotate the device, or use the player’s full-screen control.';}});
document.addEventListener('fullscreenchange',()=>{full.textContent=document.fullscreenElement?'Exit full screen':'⛶ Full screen';if(!document.fullscreenElement&&screen.orientation?.unlock){try{screen.orientation.unlock();}catch{}}});
})();