import {loadTvAudio} from "./tv-data.js";
import {artClass,artFallback,artOverlay} from "./tv-art.js";

const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const preferredScrollBehavior=()=>matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth";
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const shelfKey="speakout-listen-shelf-v2";
let items=[],filter="all",current=null;

function spotifyEmbed(raw){
 try{
  const u=new URL(raw),host=u.hostname.replace(/^www\./,"");
  if(host!=="open.spotify.com")return null;
  const path=u.pathname.replace(/^\/embed/,"");
  if(/^\/(episode|show|track)\//.test(path))return "https://open.spotify.com/embed"+path+"?theme=0";
 }catch{}
 return null;
}
function safeAudio(raw){
 try{const u=new URL(raw,location.href);return["https:","http:"].includes(u.protocol)?u.href:null}catch{return null}
}
function dateValue(x){return Date.parse(x?.publishDate||x?.publishedAt||0)||0}
function readShelf(){
 try{
  const raw=JSON.parse(localStorage.getItem(shelfKey)||"{}");
  return {recent:Array.isArray(raw.recent)?raw.recent:[],saved:Array.isArray(raw.saved)?raw.saved:[]};
 }catch{return {recent:[],saved:[]}}
}
function writeShelf(data){
 try{localStorage.setItem(shelfKey,JSON.stringify({recent:data.recent.slice(0,10),saved:data.saved.slice(0,30)}))}catch{}
}
function isSaved(id){return readShelf().saved.includes(id)}
function markRecent(id){
 if(!id)return;
 const shelf=readShelf();
 shelf.recent=[id,...shelf.recent.filter(x=>x!==id)].slice(0,10);
 writeShelf(shelf);
 renderShelf();
}
function toggleSaved(id){
 if(!id)return false;
 const shelf=readShelf();
 shelf.saved=shelf.saved.includes(id)?shelf.saved.filter(x=>x!==id):[id,...shelf.saved];
 writeShelf(shelf);
 renderShelf();
 renderLibrary();
 renderCurrentSave();
 return shelf.saved.includes(id);
}
function artFor(x){return x?.imageUrl||""}

function card(x,{compact=false}={}){
 const art=artFor(x),saved=isSaved(x.id),spotify=Boolean(spotifyEmbed(x.url||"")||x.source==="spotify");
 return '<article class="listen-card'+(compact?' compact':'')+(spotify?' is-spotify':'')+'" data-audio-id="'+esc(x.id)+'">'+
  '<button class="listen-card-open" type="button" data-audio-open="'+esc(x.id)+'" aria-label="Open '+esc(x.title||"SpeakOut audio")+'">'+
   '<div class="listen-card-art '+artClass(x,"audio")+'">'+(art?'<img src="'+esc(art)+'" alt="" loading="lazy">':artFallback(x,"audio"))+
   (spotify?'':artOverlay(x,"audio"))+'<span class="listen-card-play">▶</span></div>'+
   '<div class="listen-card-copy"><strong>'+esc(x.title||"SpeakOut Audio")+'</strong><p>'+esc(x.description||"")+'</p></div>'+
  '</button>'+
  (spotify?'<a class="spotify-attribution" href="'+esc(x.sourceUrl||x.url||"https://open.spotify.com")+'" target="_blank" rel="noopener">Spotify ↗</a>':'')+
  '<button class="listen-card-save'+(saved?' is-saved':'')+'" type="button" data-save-audio="'+esc(x.id)+'" aria-label="'+(saved?'Remove from saved':'Save for later')+'">'+(saved?'✓':'＋')+'</button>'+
 '</article>';
}

function renderLibrary(){
 const out=$("#audioGrid");
 const list=filter==="all"?items:items.filter(x=>String(x.audioType||"").toLowerCase()===filter.toLowerCase());
 out.innerHTML=list.length?list.map(x=>card(x)).join(""):'<div class="listen-empty"><strong>No published audio in this category yet.</strong><p>Try another filter or check back later.</p></div>';
}
function renderShelf(){
 const shelf=readShelf();
 const recent=shelf.recent.map(id=>items.find(x=>x.id===id)).filter(Boolean);
 const saved=shelf.saved.map(id=>items.find(x=>x.id===id)).filter(Boolean);
 $("#listenShelf").hidden=!(recent.length||saved.length);
 $("#recentAudioBlock").hidden=!recent.length;
 $("#savedAudioBlock").hidden=!saved.length;
 $("#recentAudioRail").innerHTML=recent.map(x=>card(x,{compact:true})).join("");
 $("#savedAudioRail").innerHTML=saved.map(x=>card(x,{compact:true})).join("");
}
function renderCurrentSave(){
 const button=$("#saveCurrentAudio");
 if(!current){button.hidden=true;return}
 const saved=isSaved(current.id);
 button.hidden=false;
 button.classList.toggle("is-saved",saved);
 button.textContent=saved?"✓ Saved":"＋ Save";
 button.setAttribute("aria-pressed",String(saved));
}
function setArtwork(x){
 const host=$("#listenArtwork"),art=artFor(x);
 host.style.backgroundImage=art?'url("'+art.replace(/"/g,"%22")+'")':"";
 host.classList.toggle("has-image",Boolean(art));
}
function openAudio(x,{autoplay=false,scroll=true}={}){
 if(!x)return;
 current=x;
 const spotify=spotifyEmbed(x.url||x.sourceUrl||""),direct=safeAudio(x.audioUrl||x.url||"");
 $("#listenType").textContent=(x.audioType||"SPEAKOUT AUDIO").toUpperCase();
 $("#listenTitle").textContent=x.title||"SpeakOut Audio";
 $("#listenDescription").textContent=x.description||"Listen on SpeakOut.";
 setArtwork(x);
 renderCurrentSave();
 $("#shareCurrentAudio").hidden=false;
 $("#listenStatus").textContent="";
 const host=$("#listenPlayer");

 if(spotify){
  $("#persistentAudio").pause();
  $("#miniPlayer").hidden=true;
  host.innerHTML='<iframe src="'+esc(spotify)+'" title="'+esc(x.title||"SpeakOut audio")+'" allow="autoplay;clipboard-write;encrypted-media;fullscreen;picture-in-picture" loading="eager"></iframe>';
 }else if(direct){
  host.innerHTML='<div class="listen-direct-panel"><span>DIRECT AUDIO</span><strong>'+esc(x.title||"SpeakOut Audio")+'</strong><button type="button" class="listen-direct-play" data-direct-play="'+esc(x.id)+'">▶ Play audio</button></div>';
  if(autoplay)playDirect(x);
 }else{
  host.innerHTML='<div class="listen-unavailable"><strong>This audio is not available right now.</strong><p>Choose another item from the library.</p></div>';
 }
 markRecent(x.id);
 const url=new URL(location.href);
 url.searchParams.set("audio",x.id);
 history.replaceState(null,"",url.pathname+url.search);
 if(scroll)$("#nowPlaying").scrollIntoView({behavior:preferredScrollBehavior(),block:"start"});
}
function playDirect(x){
 const direct=safeAudio(x?.url||"");
 if(!direct)return;
 const player=$("#persistentAudio");
 if(player.src!==direct)player.src=direct;
 $("#miniTitle").textContent=x.title||"SpeakOut Audio";
 $("#miniPlayer").hidden=false;
 player.play().catch(()=>{});
}
async function shareCurrent(){
 if(!current)return;
 const url=new URL(location.href);url.searchParams.set("audio",current.id);
 try{
  if(navigator.share){
   await navigator.share({title:current.title||"SpeakOut Listen",text:"Listen on SpeakOut TV",url:url.href});
   $("#listenStatus").textContent="Shared.";
  }else{
   await navigator.clipboard.writeText(url.href);
   $("#listenStatus").textContent="Audio link copied.";
  }
 }catch(error){
  if(error?.name!=="AbortError")$("#listenStatus").textContent="Use your browser address bar to copy this audio link.";
 }
}

async function load(){
 try{items=await loadTvAudio()}catch{items=[]}
 items.sort((a,b)=>(Number(a.order)||999)-(Number(b.order)||999)||dateValue(b)-dateValue(a));
 renderLibrary();
 renderShelf();

 const selectedId=new URLSearchParams(location.search).get("audio");
 const selected=items.find(x=>x.id===selectedId)||items[0]||null;
 if(selected)openAudio(selected,{autoplay:false,scroll:false});
}

$$("[data-audio-filter]").forEach(button=>button.addEventListener("click",()=>{
 filter=button.dataset.audioFilter||"all";
 $$("[data-audio-filter]").forEach(x=>x.classList.toggle("active",x===button));
 renderLibrary();
}));

document.addEventListener("click",event=>{
 const save=event.target.closest("[data-save-audio]");
 if(save){
  event.preventDefault();event.stopPropagation();
  const saved=toggleSaved(save.dataset.saveAudio);
  $("#listenStatus").textContent=saved?"Saved on this device.":"Removed from saved.";
  return;
 }
 const open=event.target.closest("[data-audio-open]");
 if(open){openAudio(items.find(x=>x.id===open.dataset.audioOpen),{scroll:true});return}
 const direct=event.target.closest("[data-direct-play]");
 if(direct){playDirect(items.find(x=>x.id===direct.dataset.directPlay));return}
});

$("#saveCurrentAudio").addEventListener("click",()=>{
 const saved=toggleSaved(current?.id);
 $("#listenStatus").textContent=saved?"Saved on this device.":"Removed from saved.";
});
$("#shareCurrentAudio").addEventListener("click",shareCurrent);
$("#closeMiniPlayer").addEventListener("click",()=>{
 $("#persistentAudio").pause();
 $("#miniPlayer").hidden=true;
});

load();