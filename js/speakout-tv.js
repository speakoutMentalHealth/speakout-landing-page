import {db} from "../firebase-config.js";
import {collection,getDocs,query,where} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const starterEpisodes=[
{id:"archive-speakout-anthem",title:"SpeakOut Anthem | Together We Rise for Mental Health",show:"SpeakOut Special",description:"SpeakOut anthem and movement video.",url:"https://www.youtube.com/watch?v=tAoGJvkvNRg",format:"episode",status:"published",archive:true,order:901},
{id:"archive-adhd-men",title:"Dear Men With ADHD: This Is For You | Spoken Word",show:"SpeakOut Stories",description:"A spoken-word conversation from SpeakOut.",url:"https://www.youtube.com/watch?v=ixDjSGFBA5Q",format:"episode",status:"published",archive:true,order:902},
{id:"archive-religion",title:"This Might Change How You See Religion Forever",show:"SpeakOut Stories",description:"A SpeakOut conversation from our video archive.",url:"https://www.youtube.com/watch?v=PSq-nwyzrNk",format:"episode",status:"published",archive:true,order:903},
{id:"archive-tired-nation",title:"Heavy Heart of a Tired Nation (Nigeria as a Case Study)",show:"SpeakOut Stories",description:"A SpeakOut reflection from our video archive.",url:"https://www.youtube.com/watch?v=EFOEWzO1a3E",format:"episode",status:"published",archive:true,order:904},
{id:"archive-marital-decay",title:"The Silent Architect of Marital Decay",show:"SpeakOut Stories",description:"A SpeakOut conversation from our video archive.",url:"https://www.youtube.com/watch?v=akWDTQmn9K0",format:"episode",status:"published",archive:true,order:905}
];

const series=[
{slug:"on-the-walk",title:"On the Walk",label:"Street"},
{slug:"on-the-move",title:"SpeakOut On The Move",label:"Street"},
{slug:"podcast",title:"SpeakOut Podcast",label:"Studio"},
{slug:"how-are-you-really",title:"How Are You, Really?",label:"Wellbeing"},
{slug:"youth-voices",title:"Youth Voices",label:"Youth"},
{slug:"campus-connect",title:"Campus Connect",label:"Campus"},
{slug:"expert-corner",title:"Expert Corner",label:"Expert"},
{slug:"speakout-stories",title:"SpeakOut Stories",label:"Stories"},
{slug:"speakout-special",title:"SpeakOut Special",label:"Special"}
];

const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const ytId=raw=>{try{const u=new URL(raw);if(u.hostname==="youtu.be")return u.pathname.split("/").filter(Boolean)[0]||null;if(u.hostname.endsWith("youtube.com"))return u.searchParams.get("v")||u.pathname.match(/\/(?:embed|live|shorts)\/([^/?]+)/)?.[1]||null}catch{}return null};
const embed=raw=>{try{const u=new URL(raw),host=u.hostname.replace(/^www\./,""),y=ytId(raw);if(y)return "https://www.youtube-nocookie.com/embed/"+encodeURIComponent(y)+"?rel=0";if(host==="vimeo.com"){const id=u.pathname.split("/").filter(Boolean)[0];if(id)return "https://player.vimeo.com/video/"+encodeURIComponent(id)}if(host==="player.vimeo.com")return raw;if(host.endsWith("twitch.tv")){const ch=u.pathname.split("/").filter(Boolean)[0];if(ch)return "https://player.twitch.tv/?channel="+encodeURIComponent(ch)+"&parent="+encodeURIComponent(location.hostname)}}catch{}return null};
const dateValue=x=>x.publishedAt?.toMillis?.()||Date.parse(x.publishedAt||x.publishDate||x.date||0)||0;
const order=(a,b)=>(Number(a.order)||999)-(Number(b.order)||999);
const spotifyEmbed=raw=>{try{const u=new URL(raw),h=u.hostname.replace(/^www\./,"");if(h!=="open.spotify.com")return null;const p=u.pathname.replace(/^\/embed/,"");if(/^\/(episode|show|track)\//.test(p))return "https://open.spotify.com/embed"+p+"?theme=0"}catch{}return null};

function setFrame(target,item,autoplay=false){
 const src=embed(item?.url||item?.videoUrl);if(!src)return;
 const finalSrc=src+(autoplay?(src.includes("?")?"&":"?")+"autoplay=1":"");
 target.innerHTML='<iframe src="'+esc(finalSrc)+'" title="'+esc(item.title||"SpeakOut TV")+'" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>';
}
function episodeCard(x){
 const y=ytId(x.url||x.videoUrl),img=x.imageUrl||x.thumbnailUrl||(y?"https://i.ytimg.com/vi/"+encodeURIComponent(y)+"/hqdefault.jpg":"");
 return '<button class="ios-episode-card" type="button" data-episode-id="'+esc(x.id)+'">'+(img?'<img src="'+esc(img)+'" alt="" loading="lazy">':'<div class="ios-thumb-fallback">TV</div>')+'<span>'+esc(x.title||"SpeakOut TV")+'</span></button>';
}
function seriesCard(x,index,episode){
 const y=ytId(episode?.url||episode?.videoUrl),img=episode?.imageUrl||episode?.thumbnailUrl||(y?"https://i.ytimg.com/vi/"+encodeURIComponent(y)+"/hqdefault.jpg":"");
 const art=img?' style="background-image:url(\''+esc(img)+'\')"':"";
 return '<a class="ios-series-card" href="show.html?show='+encodeURIComponent(x.slug)+'"><div class="series-card-art"'+art+'></div><span class="series-card-index">'+String(index+1).padStart(2,"0")+'</span><div class="series-card-copy"><small>'+esc(x.label)+'</small><strong>'+esc(x.title)+'</strong><span>Explore series ›</span></div></a>';
}
function audioCard(x){
 const art=x.imageUrl||"";
 return '<button class="ios-audio-episode" type="button" data-audio-id="'+esc(x.id)+'">'+(art?'<img src="'+esc(art)+'" alt="" loading="lazy">':'<div class="ios-audio-art">◉</div>')+'<span><small>'+esc(x.audioType||"Spotify")+'</small><strong>'+esc(x.title||"SpeakOut Audio")+'</strong></span></button>';
}

async function load(){
 let episodes=[];
 try{const snap=await getDocs(query(collection(db,"tvEpisodes"),where("status","in",["active","published"])));snap.forEach(d=>episodes.push({id:d.id,...d.data()}))}catch{}
 const known=new Set(episodes.map(x=>ytId(x.url||x.videoUrl)).filter(Boolean));starterEpisodes.forEach(x=>{const id=ytId(x.url);if(!known.has(id))episodes.push(x)});
 episodes.sort((a,b)=>dateValue(b)-dateValue(a)||order(a,b));

 const now=Date.now();
 const live=episodes.find(x=>String(x.format||x.type||"").toLowerCase()==="live"&&(!x.scheduledAt||Date.parse(x.scheduledAt)<=now));
 if(live){
   $("#liveStatus").textContent="Live Now";$("#liveStatus").classList.add("is-live");
   $("#liveTitle").textContent=live.title||"SpeakOut Live";
   $("#liveDescription").textContent=live.description||"Live now on SpeakOut TV.";
   setFrame($("#livePlayer"),live,false);
 }

 const regular=episodes.filter(x=>String(x.format||x.type||"").toLowerCase()!=="live");
 const first=regular[0]||episodes[0];
 if(first){setFrame($("#episodePlayer"),first,false);$("#episodeTitle").textContent=first.title||"SpeakOut TV";$("#episodeDescription").textContent=first.description||""}
 $("#latestRail").innerHTML=regular.map(episodeCard).join("");
 const normalizedShow=s=>String(s||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
 $("#seriesRail").innerHTML=series.map((item,index)=>{
   const match=regular.find(ep=>normalizedShow(ep.show)===normalizedShow(item.title));
   return seriesCard(item,index,match);
 }).join("");
 if(first){
   const y=ytId(first.url||first.videoUrl),img=first.imageUrl||first.thumbnailUrl||(y?"https://i.ytimg.com/vi/"+encodeURIComponent(y)+"/maxresdefault.jpg":"");
   $("#introTitle").textContent=first.title||"Watch. Listen. Connect.";
   $("#introDescription").textContent=first.description||"Original SpeakOut programming, stories and conversations.";
   const backdrop=$("#introBackdrop");
   if(backdrop&&img){backdrop.style.backgroundImage='url("'+img.replace(/"/g,"%22")+'")';backdrop.classList.add("has-image")}
   $("#introPlay")?.addEventListener("click",()=>{setTvView("episodes",{push:true,scroll:true});setFrame($("#episodePlayer"),first,true);$("#episodeTitle").textContent=first.title||"SpeakOut TV";$("#episodeDescription").textContent=first.description||""});
 }
 $("#introSeries")?.addEventListener("click",()=>setTvView("series",{push:true,scroll:true}));

 let audio=[];
 try{const a=await getDocs(query(collection(db,"tvAudio"),where("status","in",["active","published"])));a.forEach(d=>audio.push({id:d.id,...d.data()}))}catch{}
 audio.sort((a,b)=>dateValue(b)-dateValue(a)||order(a,b));
 const spotifyAudio=audio.filter(x=>spotifyEmbed(x.url||""));
 $("#audioRail").innerHTML=spotifyAudio.length?spotifyAudio.map(audioCard).join(""):'<div class="ios-audio-empty">Published Spotify episodes will appear here.</div>';
 $("#audioRail").addEventListener("click",e=>{const b=e.target.closest(".ios-audio-episode");if(!b)return;const item=spotifyAudio.find(x=>x.id===b.dataset.audioId);const src=spotifyEmbed(item?.url||"");if(!item||!src)return;$("#audioPlayer").innerHTML='<iframe loading="lazy" src="'+esc(src)+'" title="'+esc(item.title||"SpeakOut audio")+'" allow="autoplay;clipboard-write;encrypted-media;fullscreen;picture-in-picture"></iframe>';document.querySelectorAll(".ios-audio-episode").forEach(x=>x.classList.toggle("active",x===b));document.getElementById("audio")?.scrollIntoView({behavior:"smooth",block:"start"})});

 $("#latestRail").addEventListener("click",e=>{const b=e.target.closest(".ios-episode-card");if(!b)return;const item=regular.find(x=>x.id===b.dataset.episodeId);if(!item)return;setFrame($("#episodePlayer"),item,true);$("#episodeTitle").textContent=item.title||"SpeakOut TV";$("#episodeDescription").textContent=item.description||"";document.querySelectorAll(".ios-episode-card").forEach(x=>x.classList.toggle("active",x===b));document.getElementById("episodes")?.scrollIntoView({behavior:"smooth",block:"start"})});
 const requested=new URLSearchParams(location.search).get("episode");
 if(requested){const item=regular.find(x=>x.id===requested);if(item){setFrame($("#episodePlayer"),item,false);$("#episodeTitle").textContent=item.title||"SpeakOut TV";$("#episodeDescription").textContent=item.description||"";document.getElementById("episodes")?.scrollIntoView({block:"start"})}}
}
load();

let deferredInstall;
addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstall=e;const b=$("#installTv");if(b)b.hidden=false});
$("#installTv")?.addEventListener("click",async()=>{if(!deferredInstall)return;deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;$("#installTv").hidden=true});

/* Segmented navigation: each channel tab becomes its own focused view. */
const TV_VIEWS=new Set(["live","episodes","series","audio"]);
function setTvView(view,{push=false,scroll=true}={}){
  const normalized=TV_VIEWS.has(view)?view:"home";
  document.body.classList.toggle("tv-view-filtered",normalized!=="home");
  document.querySelectorAll(".ios-section").forEach(section=>section.classList.toggle("tv-view-active",normalized!=="home"&&section.id===normalized));
  document.querySelectorAll(".ios-tabbar a").forEach(link=>{
    const href=link.getAttribute("href")||"";
    const target=href.startsWith("#")?href.slice(1):"home";
    link.classList.toggle("active",target===normalized);
    link.setAttribute("aria-current",target===normalized?"page":"false");
  });
  if(push){
    const next=normalized==="home"?"tv.html":"#"+normalized;
    history.pushState({tvView:normalized},"",next);
  }
  if(scroll) window.scrollTo({top:0,behavior:"smooth"});
}
document.querySelector(".ios-tabbar")?.addEventListener("click",event=>{
  const link=event.target.closest("a");if(!link)return;
  const href=link.getAttribute("href")||"";
  const target=href.startsWith("#")?href.slice(1):"home";
  if(target==="home"||TV_VIEWS.has(target)){
    event.preventDefault();
    setTvView(target,{push:true,scroll:true});
  }
});
addEventListener("popstate",()=>setTvView(location.hash.slice(1),{push:false,scroll:false}));
setTvView(location.hash.slice(1),{push:false,scroll:false});
