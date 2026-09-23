import {db} from "../firebase-config.js";
import {collection,doc,getDoc,getDocs,query,where} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
import {artClass,artFallback,artOverlay} from "./tv-art.js";

const id=new URLSearchParams(location.search).get("id")||"";
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const norm=s=>String(s||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const slugFor=s=>norm(s).replace(/\s+/g,"-");
const dateValue=x=>x?.publishedAt?.toMillis?.()||Date.parse(x?.publishedAt||x?.publishDate||x?.date||0)||0;
const orderValue=x=>Number.isFinite(Number(x?.order))?Number(x.order):999;

const starterEpisodes=[
{id:"archive-speakout-anthem",title:"SpeakOut Anthem | Together We Rise for Mental Health",show:"SpeakOut Special",description:"SpeakOut anthem and movement video.",url:"https://www.youtube.com/watch?v=tAoGJvkvNRg",format:"episode",status:"published",archive:true,tags:["motivation","youth"]},
{id:"archive-adhd-men",title:"Dear Men With ADHD: This Is For You | Spoken Word",show:"SpeakOut Stories",description:"A spoken-word conversation from SpeakOut.",url:"https://www.youtube.com/watch?v=ixDjSGFBA5Q",format:"episode",status:"published",archive:true,tags:["adhd","men","motivation"]},
{id:"archive-religion",title:"This Might Change How You See Religion Forever",show:"SpeakOut Stories",description:"A SpeakOut conversation from our video archive.",url:"https://www.youtube.com/watch?v=PSq-nwyzrNk",format:"episode",status:"published",archive:true,tags:["stories"]},
{id:"archive-tired-nation",title:"Heavy Heart of a Tired Nation (Nigeria as a Case Study)",show:"SpeakOut Stories",description:"A SpeakOut reflection from our video archive.",url:"https://www.youtube.com/watch?v=EFOEWzO1a3E",format:"episode",status:"published",archive:true,tags:["stories"]},
{id:"archive-marital-decay",title:"The Silent Architect of Marital Decay",show:"SpeakOut Stories",description:"A SpeakOut conversation from our video archive.",url:"https://www.youtube.com/watch?v=akWDTQmn9K0",format:"episode",status:"published",archive:true,tags:["relationships","stories"]}
];

function youtubeId(raw){
 try{
  const u=new URL(raw),h=u.hostname.replace(/^www\./,"");
  if(h==="youtu.be")return u.pathname.split("/").filter(Boolean)[0]||"";
  if(h.endsWith("youtube.com"))return u.searchParams.get("v")||u.pathname.match(/\/(?:embed|live|shorts)\/([^/?]+)/)?.[1]||"";
 }catch{}
 return "";
}
function embed(raw){
 try{
  const u=new URL(raw),h=u.hostname.replace(/^www\./,""),y=youtubeId(raw);
  if(y)return "https://www.youtube-nocookie.com/embed/"+encodeURIComponent(y)+"?rel=0&playsinline=1";
  if(h==="player.vimeo.com")return raw;
  if(h==="vimeo.com"){const v=u.pathname.split("/").filter(Boolean)[0];if(v)return "https://player.vimeo.com/video/"+encodeURIComponent(v)}
  if(h.endsWith("twitch.tv")){const ch=u.pathname.split("/").filter(Boolean)[0];if(ch)return "https://player.twitch.tv/?channel="+encodeURIComponent(ch)+"&parent="+encodeURIComponent(location.hostname)}
 }catch{}
 return null;
}
function imageFor(x){
 const y=youtubeId(x?.url||x?.videoUrl);
 return x?.imageUrl||x?.thumbnailUrl||(y?"https://i.ytimg.com/vi/"+encodeURIComponent(y)+"/hqdefault.jpg":"");
}
function tagsFor(x){
 const raw=Array.isArray(x?.tags)?x.tags:String(x?.tags||"").split(",");
 return raw.map(norm).filter(Boolean);
}
function wordsFor(x){
 return new Set(norm([x?.title,x?.description,x?.show,...tagsFor(x)].join(" ")).split(" ").filter(w=>w.length>4));
}
function relevance(current,candidate){
 let score=0;
 if(norm(current.show)===norm(candidate.show))score+=8;
 const a=new Set(tagsFor(current)),b=new Set(tagsFor(candidate));
 for(const tag of a)if(b.has(tag))score+=4;
 const aw=wordsFor(current),bw=wordsFor(candidate);
 let shared=0;for(const w of aw)if(bw.has(w)&&shared<4){score+=1;shared++}
 return score;
}
function formatDate(raw){
 const d=new Date(raw);return Number.isNaN(d.getTime())?"":d.toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"});
}
function relatedCard(x){
 const img=imageFor(x);
 return '<a class="watch-related-card" href="watch.html?id='+encodeURIComponent(x.id)+'">'+
  '<div class="watch-related-art '+artClass(x)+'">'+(img?'<img src="'+esc(img)+'" alt="" loading="lazy">':artFallback(x))+artOverlay(x)+'<span>▶</span></div>'+
  '<small>'+esc(x.show||"SpeakOut TV")+'</small><strong>'+esc(x.title||"Watch on SpeakOut TV")+'</strong></a>';
}

const shelfKey="speakout-tv-shelf-v1";
function readShelf(){
 try{
  const raw=JSON.parse(localStorage.getItem(shelfKey)||"{}");
  return {recent:Array.isArray(raw.recent)?raw.recent:[],saved:Array.isArray(raw.saved)?raw.saved:[]};
 }catch{return {recent:[],saved:[]}}
}
function writeShelf(s){
 try{localStorage.setItem(shelfKey,JSON.stringify({recent:s.recent.slice(0,8),saved:s.saved.slice(0,24)}))}catch{}
}
function markRecent(episodeId){
 if(!episodeId)return;
 const s=readShelf();s.recent=[episodeId,...s.recent.filter(x=>x!==episodeId)].slice(0,8);writeShelf(s);
}
function renderSave(episodeId){
 const saved=readShelf().saved.includes(episodeId),button=$("#saveEpisode");
 if(!button)return;
 button.classList.toggle("is-saved",saved);
 button.setAttribute("aria-pressed",String(saved));
 button.textContent=saved?"✓ Saved":"＋ Save";
}
function toggleSave(episodeId){
 const s=readShelf();
 s.saved=s.saved.includes(episodeId)?s.saved.filter(x=>x!==episodeId):[episodeId,...s.saved];
 writeShelf(s);renderSave(episodeId);
 $("#shareStatus").textContent=s.saved.includes(episodeId)?"Saved to My List on this device.":"Removed from My List.";
}

function setMeta(name,value,property=false){
 if(!value)return;
 const selector=property?'meta[property="'+name+'"]':'meta[name="'+name+'"]';
 document.querySelector(selector)?.setAttribute("content",value);
}
function applySeo(x,playerUrl){
 const title=(x.title||"Watch")+" | SpeakOut TV",description=x.description||"Watch on SpeakOut TV",image=imageFor(x);
 document.title=title;
 setMeta("description",description);
 setMeta("og:title",x.title||"SpeakOut TV",true);setMeta("og:description",description,true);
 if(image)setMeta("og:image",image,true);
 setMeta("og:url",location.href,true);
 const canonical=document.querySelector('link[rel="canonical"]');if(canonical)canonical.href=location.href;
 const schema={"@context":"https://schema.org","@type":"VideoObject",name:x.title||"SpeakOut TV",description,embedUrl:playerUrl};
 if(image)schema.thumbnailUrl=[image];
 const uploadDate=x.publishDate||x.publishedAt;
 if(typeof uploadDate==="string"&&uploadDate)schema.uploadDate=uploadDate;
 const node=document.createElement("script");node.type="application/ld+json";node.id="videoStructuredData";node.textContent=JSON.stringify(schema);document.head.appendChild(node);
}

async function loadAllEpisodes(){
 const episodes=[];
 try{
  const snap=await getDocs(query(collection(db,"tvEpisodes"),where("status","in",["active","published"])));
  snap.forEach(d=>episodes.push({id:d.id,...d.data()}));
 }catch{}
 const videoIds=new Set(episodes.map(x=>youtubeId(x.url||x.videoUrl)).filter(Boolean));
 for(const x of starterEpisodes){const y=youtubeId(x.url);if(!videoIds.has(y))episodes.push(x)}
 return episodes.filter(x=>String(x.format||x.type||"").toLowerCase()!=="live");
}

async function loadCurrent(all){
 let current=all.find(x=>x.id===id)||null;
 if(!current&&id){
  try{
   const snap=await getDoc(doc(db,"tvEpisodes",id));
   if(snap.exists()){const x={id:snap.id,...snap.data()};if(["active","published"].includes(x.status))current=x}
  }catch{}
 }
 return current;
}

function renderCurrent(x,all){
 const playerUrl=embed(x.url||x.videoUrl),player=$("#watchPlayer");
 $("#watchTitle").textContent=x.title||"SpeakOut TV";
 $("#watchDescription").textContent=x.description||"";
 $("#watchShow").textContent=x.show||"SPEAKOUT TV";

 const showSlug=slugFor(x.show||"");
 if(showSlug){
  $("#watchSeriesLink").href="show.html?show="+encodeURIComponent(showSlug);
  $("#allSeriesLink").href="show.html?show="+encodeURIComponent(showSlug);
 }
 const meta=[
  x.presenter&&"Presented by "+x.presenter,
  x.guest&&"Guest: "+x.guest,
  x.guestRole&&x.guestRole,
  x.duration&&String(x.duration),
  String(x.format||"").toLowerCase()==="short"&&"Short",
  x.publishDate&&"Published "+formatDate(x.publishDate)
 ].filter(Boolean);
 $("#episodeMeta").innerHTML=meta.map(v=>"<span>"+esc(v)+"</span>").join("");

 if(playerUrl){
  player.innerHTML='<iframe src="'+esc(playerUrl)+'" title="'+esc(x.title||"SpeakOut TV")+'" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>';
  if(String(x.format||"").toLowerCase()==="short")document.body.classList.add("watching-short");
 }else player.innerHTML='<div class="watch-unavailable"><strong>This program is currently unavailable.</strong><p>Try another SpeakOut episode below.</p></div>';

 markRecent(x.id);renderSave(x.id);applySeo(x,playerUrl||"");

 const sequence=all.filter(item=>norm(item.show)===norm(x.show)).sort((a,b)=>orderValue(a)-orderValue(b)||dateValue(a)-dateValue(b));
 const position=sequence.findIndex(item=>item.id===x.id);
 const next=position>=0?sequence[position+1]:null;
 if(next){
  $("#upNextSection").hidden=false;
  $("#nextTitle").textContent=next.title||"Another episode";
  $("#nextDescription").textContent=next.description||"Continue this SpeakOut series.";
  $("#nextEpisodeLink").href="watch.html?id="+encodeURIComponent(next.id);
 }

 const related=all.filter(item=>item.id!==x.id).map(item=>({item,score:relevance(x,item)}))
  .sort((a,b)=>b.score-a.score||dateValue(b.item)-dateValue(a.item)).slice(0,10).map(v=>v.item);
 if(related.length){
  $("#relatedSection").hidden=false;
  $("#relatedRail").innerHTML=related.map(relatedCard).join("");
 }
}

async function shareEpisode(){
 const title=$("#watchTitle").textContent||"SpeakOut TV";
 try{
  if(navigator.share){await navigator.share({title,text:"Watch on SpeakOut TV",url:location.href});$("#shareStatus").textContent="Shared."}
  else{await navigator.clipboard.writeText(location.href);$("#shareStatus").textContent="Episode link copied."}
 }catch(error){
  if(error?.name!=="AbortError")$("#shareStatus").textContent="Use your browser’s address bar to copy this episode link.";
 }
}

async function init(){
 if(!id){$("#watchPlayer").innerHTML='<div class="watch-unavailable"><strong>No episode selected.</strong><p>Choose something to watch from SpeakOut TV.</p><a href="tv.html#watch">Browse episodes →</a></div>';return}
 const all=await loadAllEpisodes(),current=await loadCurrent(all);
 if(!current){$("#watchPlayer").innerHTML='<div class="watch-unavailable"><strong>Episode not found or not published.</strong><p>It may have been moved or is not currently available.</p><a href="tv.html#discover">Discover something else →</a></div>';return}
 renderCurrent(current,all);
 $("#shareEpisode")?.addEventListener("click",shareEpisode);
 $("#saveEpisode")?.addEventListener("click",()=>toggleSave(current.id));
}

init();