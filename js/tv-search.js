import {loadTvEpisodes,loadTvAudio,loadTvShows} from "./tv-data.js";
import {artClass,artFallback,artOverlay} from "./tv-art.js";

const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const preferredScrollBehavior=()=>matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth";
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const norm=s=>String(s||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const slugFor=s=>norm(s).replace(/\s+/g,"-");
const ytId=raw=>{try{const u=new URL(raw);if(u.hostname==="youtu.be")return u.pathname.split("/").filter(Boolean)[0]||"";if(u.hostname.endsWith("youtube.com"))return u.searchParams.get("v")||u.pathname.match(/\/(?:embed|live|shorts)\/([^/?]+)/)?.[1]||""}catch{}return ""};
const dateValue=x=>x?.publishedAt?.toMillis?.()||Date.parse(x?.publishedAt||x?.publishDate||x?.date||0)||0;
const orderValue=x=>Number.isFinite(Number(x?.order))?Number(x.order):999;
const imageFor=x=>{const y=ytId(x?.url||x?.videoUrl);return x?.imageUrl||x?.thumbnailUrl||(y?"https://i.ytimg.com/vi/"+encodeURIComponent(y)+"/hqdefault.jpg":"")};

const discoveryRailSelector=".discovery-series-grid,.discovery-media-grid";
function updateDiscoveryRailControls(){
  $$(discoveryRailSelector).forEach(rail=>{
    const group=rail.closest(".discovery-group");
    const nav=group?.querySelector(".discovery-rail-nav");
    if(!group||!nav)return;
    const max=Math.max(0,rail.scrollWidth-rail.clientWidth);
    const overflow=max>8;
    nav.hidden=!overflow;
    const prev=nav.querySelector('[data-discovery-arrow="prev"]');
    const next=nav.querySelector('[data-discovery-arrow="next"]');
    if(prev)prev.disabled=!overflow||rail.scrollLeft<=8;
    if(next)next.disabled=!overflow||rail.scrollLeft>=max-8;
  });
}
function installDiscoveryRailControls(){
  $$(".discovery-group").forEach(group=>{
    if(group.querySelector(".discovery-rail-nav"))return;
    const rail=group.querySelector(discoveryRailSelector);
    const title=group.querySelector(".discovery-group-title");
    if(!rail||!title)return;
    const nav=document.createElement("div");
    nav.className="discovery-rail-nav";
    nav.hidden=true;
    nav.setAttribute("aria-label",(title.querySelector("h3")?.textContent?.trim()||"Discovery")+" navigation");
    for(const [direction,symbol] of [["prev","‹"],["next","›"]]){
      const button=document.createElement("button");
      button.type="button";
      button.className="discovery-rail-arrow "+direction;
      button.dataset.discoveryArrow=direction;
      button.setAttribute("aria-label",(direction==="prev"?"Previous ":"Next ")+(title.querySelector("h3")?.textContent?.trim()||"items"));
      button.innerHTML='<span aria-hidden="true">'+symbol+"</span>";
      button.addEventListener("click",()=>{
        const amount=Math.max(300,Math.round(rail.clientWidth*.82));
        rail.scrollBy({left:(direction==="prev"?-1:1)*amount,behavior:preferredScrollBehavior()});
      });
      nav.appendChild(button);
    }
    title.appendChild(nav);
    rail.addEventListener("scroll",()=>requestAnimationFrame(updateDiscoveryRailControls),{passive:true});
    if("ResizeObserver" in window)new ResizeObserver(()=>updateDiscoveryRailControls()).observe(rail);
    if("MutationObserver" in window)new MutationObserver(()=>requestAnimationFrame(updateDiscoveryRailControls)).observe(rail,{childList:true});
  });
  requestAnimationFrame(updateDiscoveryRailControls);
}

const starterEpisodes=[
{id:"archive-speakout-anthem",title:"SpeakOut Anthem | Together We Rise for Mental Health",show:"SpeakOut Special",description:"SpeakOut anthem and movement video.",url:"https://www.youtube.com/watch?v=tAoGJvkvNRg",format:"episode",status:"published",archive:true,tags:["motivation","youth"]},
{id:"archive-adhd-men",title:"Dear Men With ADHD: This Is For You | Spoken Word",show:"SpeakOut Stories",description:"A spoken-word conversation from SpeakOut.",url:"https://www.youtube.com/watch?v=ixDjSGFBA5Q",format:"episode",status:"published",archive:true,tags:["adhd","men","motivation"]},
{id:"archive-religion",title:"This Might Change How You See Religion Forever",show:"SpeakOut Stories",description:"A SpeakOut conversation from our video archive.",url:"https://www.youtube.com/watch?v=PSq-nwyzrNk",format:"episode",status:"published",archive:true,tags:["stories"]},
{id:"archive-tired-nation",title:"Heavy Heart of a Tired Nation (Nigeria as a Case Study)",show:"SpeakOut Stories",description:"A SpeakOut reflection from our video archive.",url:"https://www.youtube.com/watch?v=EFOEWzO1a3E",format:"episode",status:"published",archive:true,tags:["stories","stress"]},
{id:"archive-marital-decay",title:"The Silent Architect of Marital Decay",show:"SpeakOut Stories",description:"A SpeakOut conversation from our video archive.",url:"https://www.youtube.com/watch?v=akWDTQmn9K0",format:"episode",status:"published",archive:true,tags:["relationships","stories"]}
];

const defaultSeries=[
{title:"On the Walk",slug:"on-the-walk",category:"Street",description:"Street conversations and reflections from SpeakOut."},
{title:"SpeakOut On The Move",slug:"on-the-move",category:"Street",description:"Real conversations with people where they are."},
{title:"SpeakOut Podcast",slug:"podcast",category:"Studio",description:"Long-form conversations with guests and professionals."},
{title:"How Are You, Really?",slug:"how-are-you-really",category:"Wellbeing",description:"Short, human conversations about mental wellbeing."},
{title:"Youth Voices",slug:"youth-voices",category:"Youth",description:"A platform for young people to discuss what affects them."},
{title:"Campus Connect",slug:"campus-connect",category:"Campus",description:"Stories and conversations from schools and campuses."},
{title:"Expert Corner",slug:"expert-corner",category:"Expert",description:"Informed educational conversations with qualified guests."},
{title:"SpeakOut Stories",slug:"speakout-stories",category:"Stories",description:"Human and community stories that deserve to be heard."},
{title:"SpeakOut Special",slug:"speakout-special",category:"Special",description:"Events, campaigns and special coverage."}
];

let items=[],filter="all";

function searchable(x){
 return norm([x.title,x.show,x.description,x.presenter,x.guest,x.guestRole,x.tags,x.audioType,x.category,x.host,x.contentPillar,x.audience].flat().join(" "));
}
function matchesQuery(x,q){
 if(!q)return true;
 const words=norm(q).split(" ").filter(Boolean),hay=searchable(x);
 return words.every(word=>hay.includes(word));
}
function kindOf(x){
 if(x.mediaType==="series")return "series";
 if(x.mediaType==="audio")return "audio";
 if(String(x.format||x.type||"").toLowerCase()==="live")return "live";
 return "video";
}
function hrefFor(x){
 const kind=kindOf(x);
 if(kind==="series")return "show.html?show="+encodeURIComponent(x.slug||slugFor(x.title));
 if(kind==="audio")return "radio.html?audio="+encodeURIComponent(x.id);
 if(kind==="live")return "tv.html?live="+encodeURIComponent(x.id)+"#live";
 return "watch.html?id="+encodeURIComponent(x.id);
}
function mediaCard(x){
 const kind=kindOf(x),img=imageFor(x);
 const badge=kind==="audio"?(x.audioType||"AUDIO"):kind==="live"?"LIVE":(x.show||"SPEAKOUT TV");
 return '<a class="discovery-media-card" href="'+hrefFor(x)+'">'+
  '<div class="discovery-media-art '+artClass(x,kind)+'">'+(img?'<img src="'+esc(img)+'" alt="" loading="lazy">':artFallback(x,kind))+
  artOverlay(x,kind)+(x.sourceType==="youtube-curated"&&x.sourceChannelTitle?'<span class="tv-source-attribution">YouTube · '+esc(x.sourceChannelTitle)+'</span>':"")+'<span class="discovery-media-play">'+(kind==="audio"?"◉":"▶")+'</span></div>'+
  '<div class="discovery-media-copy"><strong>'+esc(x.title||"SpeakOut TV")+'</strong><p>'+esc(x.description||"")+'</p></div></a>';
}
function seriesCard(x){
 const img=x.imageUrl||"";
 const item={...x,show:x.title};
 return '<a class="discovery-series-card'+(img?'':' no-image')+'" href="'+hrefFor(x)+'">'+
  '<div class="discovery-series-art '+artClass(item,"series")+'"'+(img?' style="background-image:url(\''+esc(img)+'\')"':"")+'>'+(img?'':artFallback(item,"series"))+artOverlay(item,"series")+'</div>'+
  '<div class="discovery-series-copy"><small>'+esc(x.category||"ORIGINAL")+'</small><strong>'+esc(x.title||"SpeakOut Original")+'</strong><p>'+esc(x.description||"")+'</p><span>Enter series →</span></div></a>';
}

function render(){
 const input=$("#tvSearch"),q=input.value.trim();
 const selected=items.filter(x=>(filter==="all"||kindOf(x)===filter)&&matchesQuery(x,q));
 const groups={
  series:selected.filter(x=>kindOf(x)==="series"),
  video:selected.filter(x=>kindOf(x)==="video"),
  audio:selected.filter(x=>kindOf(x)==="audio"),
  live:selected.filter(x=>kindOf(x)==="live")
 };
 const mapping=[
  ["series","#seriesGroup","#seriesResults",seriesCard],
  ["video","#videoGroup","#videoResults",mediaCard],
  ["audio","#audioGroup","#audioResults",mediaCard],
  ["live","#liveGroup","#liveResults",mediaCard]
 ];
 let count=0;
 mapping.forEach(([key,groupSel,outSel,card])=>{
  const group=$(groupSel),out=$(outSel),arr=groups[key];
  group.hidden=!arr.length;
  if(arr.length){out.innerHTML=arr.slice(0,18).map(card).join("");count+=arr.length}
  else out.innerHTML="";
 });
 $("#emptyResults").hidden=count!==0;
 $("#resultCount").textContent=count+(count===1?" result":" results");
 $("#resultTitle").textContent=q?'Results for “'+q+'”':filter==="all"?"Start discovering":"Explore "+({series:"series",video:"watch",audio:"listen",live:"live"}[filter]||filter);
 $("#resultEyebrow").textContent=q?"SEARCH RESULTS":"EXPLORE";
 $("#clearSearch").hidden=!q;
 const url=new URL(location.href);
 if(q)url.searchParams.set("q",q);else url.searchParams.delete("q");
 history.replaceState(null,"",url.pathname+url.search);
 requestAnimationFrame(updateDiscoveryRailControls);
}

async function load(){
 const initial=new URLSearchParams(location.search).get("q")||"";
 if(initial)$("#tvSearch").value=initial;
 $$("[data-filter]").forEach(x=>x.setAttribute("aria-selected",String(x.dataset.filter==="all")));
 installDiscoveryRailControls();

 let episodes=starterEpisodes.map(x=>({...x,mediaType:"video"}));
 let audio=[];
 let shows=defaultSeries.map(x=>({...x,mediaType:"series"}));
 items=[...shows,...episodes];
 render();
 $("#tvSearch").focus({preventScroll:true});

 const loaded=await Promise.allSettled([loadTvEpisodes(),loadTvAudio(),loadTvShows()]);
 if(loaded[0].status==="fulfilled")episodes=loaded[0].value.map(x=>({mediaType:"video",...x}));
 if(loaded[1].status==="fulfilled")audio=loaded[1].value.map(x=>({mediaType:"audio",...x}));
 if(loaded[2].status==="fulfilled")shows=loaded[2].value.map(x=>({mediaType:"series",...x}));

 const knownVideos=new Set(episodes.map(x=>ytId(x.url||x.videoUrl)).filter(Boolean));
 starterEpisodes.forEach(x=>{const y=ytId(x.url);if(!knownVideos.has(y))episodes.push({...x,mediaType:"video"})});

 const knownSeries=new Set(shows.map(x=>slugFor(x.slug||x.title)));
 defaultSeries.forEach(x=>{if(!knownSeries.has(slugFor(x.slug||x.title)))shows.push({...x,mediaType:"series"})});

 episodes.sort((a,b)=>dateValue(b)-dateValue(a));
 audio.sort((a,b)=>dateValue(b)-dateValue(a));
 shows.sort((a,b)=>orderValue(a)-orderValue(b)||String(a.title||"").localeCompare(String(b.title||"")));
 items=[...shows,...episodes,...audio];
 render();

 if(loaded.every(result=>result.status==="rejected")){
  $("#resultEyebrow").textContent="AVAILABLE NOW";
 }
}

$("#tvSearch").addEventListener("input",()=>{$$("#topicRail button").forEach(b=>b.classList.remove("active"));render()});
$("#clearSearch").addEventListener("click",()=>{$("#tvSearch").value="";$("#tvSearch").focus();render()});
$("#showEverything").addEventListener("click",()=>{$("#tvSearch").value="";filter="all";$$("[data-filter]").forEach(b=>b.classList.toggle("active",b.dataset.filter==="all"));$$("[data-topic]").forEach(b=>b.classList.remove("active"));render();window.scrollTo({top:0,behavior:preferredScrollBehavior()})});

$$("[data-filter]").forEach(button=>button.addEventListener("click",()=>{
 filter=button.dataset.filter||"all";
 $$("[data-filter]").forEach(x=>{const active=x===button;x.classList.toggle("active",active);x.setAttribute("aria-selected",String(active))});
 render();
}));

$$("[data-topic]").forEach(button=>button.addEventListener("click",()=>{
 const topic=button.dataset.topic||"";
 $("#tvSearch").value=topic;
 $$("[data-topic]").forEach(x=>x.classList.toggle("active",x===button));
 render();
 $("#tvSearch").focus({preventScroll:true});
}));

addEventListener("keydown",e=>{
 if(e.key==="/"&&document.activeElement!==$("#tvSearch")){e.preventDefault();$("#tvSearch").focus()}
 if(e.key==="Escape"&&document.activeElement===$("#tvSearch")){$("#tvSearch").value="";render();$("#tvSearch").blur()}
});

load();