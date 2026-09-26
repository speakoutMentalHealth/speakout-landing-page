import {loadTvEpisodes,loadTvShows} from "./tv-data.js";
import {artClass,artFallback,artOverlay} from "./tv-art.js";

const slug=new URLSearchParams(location.search).get("show")||"";
const defaults={
 "on-the-walk":["On the Walk","Street","Street conversations and reflections from SpeakOut."],
 "on-the-move":["SpeakOut On The Move","Street","Real conversations with people where they are."],
 "podcast":["SpeakOut Podcast","Studio","Long-form conversations with guests and professionals."],
 "how-are-you-really":["How Are You, Really?","Wellbeing","Short, human conversations about mental wellbeing."],
 "youth-voices":["Youth Voices","Youth","A platform for young people to discuss what affects them."],
 "campus-connect":["Campus Connect","Campus","Stories and conversations from schools and campuses."],
 "expert-corner":["Expert Corner","Expert","Informed educational conversations with qualified guests."],
 "speakout-stories":["SpeakOut Stories","Stories","Human and community stories that deserve to be heard."],
 "speakout-special":["SpeakOut Special","Special","Events, campaigns and special coverage."]
};

const starterEpisodes=[
{id:"archive-speakout-anthem",title:"SpeakOut Anthem | Together We Rise for Mental Health",show:"SpeakOut Special",description:"SpeakOut anthem and movement video.",url:"https://www.youtube.com/watch?v=tAoGJvkvNRg"},
{id:"archive-adhd-men",title:"Dear Men With ADHD: This Is For You | Spoken Word",show:"SpeakOut Stories",description:"A spoken-word conversation from SpeakOut.",url:"https://www.youtube.com/watch?v=ixDjSGFBA5Q"},
{id:"archive-religion",title:"This Might Change How You See Religion Forever",show:"SpeakOut Stories",description:"A SpeakOut conversation from our video archive.",url:"https://www.youtube.com/watch?v=PSq-nwyzrNk"},
{id:"archive-tired-nation",title:"Heavy Heart of a Tired Nation (Nigeria as a Case Study)",show:"SpeakOut Stories",description:"A SpeakOut reflection from our video archive.",url:"https://www.youtube.com/watch?v=EFOEWzO1a3E"},
{id:"archive-marital-decay",title:"The Silent Architect of Marital Decay",show:"SpeakOut Stories",description:"A SpeakOut conversation from our video archive.",url:"https://www.youtube.com/watch?v=akWDTQmn9K0"}
];

const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const norm=s=>String(s||"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const ytId=raw=>{try{const u=new URL(raw);if(u.hostname==="youtu.be")return u.pathname.split("/").filter(Boolean)[0]||"";if(u.hostname.endsWith("youtube.com"))return u.searchParams.get("v")||u.pathname.match(/\/(?:live|shorts|embed)\/([^/?]+)/)?.[1]||""}catch{}return ""};
const dateValue=x=>x.publishedAt?.toMillis?.()||Date.parse(x.publishedAt||x.publishDate||x.date||0)||0;
const order=(a,b)=>(Number(a.order)||999)-(Number(b.order)||999);
const imageFor=x=>{const y=ytId(x?.url||x?.videoUrl);return x?.imageUrl||x?.thumbnailUrl||(y?"https://i.ytimg.com/vi/"+encodeURIComponent(y)+"/hqdefault.jpg":"")};
const watchHref=x=>"watch.html?id="+encodeURIComponent(x.id);
const setMeta=(name,value,property=false)=>{if(!value)return;document.querySelector(property?'meta[property="'+name+'"]':'meta[name="'+name+'"]')?.setAttribute("content",value)};

function episodeCard(x,index){
 const img=imageFor(x);
 return '<a class="show-episode-card" href="'+watchHref(x)+'">'+
   '<div class="show-episode-art '+artClass(x)+'">'+(img?'<img src="'+esc(img)+'" alt="" loading="lazy" decoding="async">':artFallback(x))+artOverlay(x)+
   '<span class="show-episode-number">'+String(index+1).padStart(2,"0")+'</span><span class="show-play">▶</span></div>'+
   '<div class="show-episode-copy"><small>'+esc(x.presenter?"HOST · "+x.presenter:x.show||"EPISODE")+'</small><strong>'+esc(x.title||"SpeakOut TV")+'</strong><p>'+esc(x.description||"")+'</p></div></a>';
}

let meta=defaults[slug]||[slug.replace(/-/g," ").replace(/\b\w/g,c=>c.toUpperCase()),"Original","SpeakOut TV original programming."];
let showImage="";

try{
 const shows=await loadTvShows();
 shows.forEach(x=>{
   if((x.slug||norm(x.title))===slug){
     meta=[x.title||meta[0],x.category||meta[1],x.description||meta[2]];
     showImage=x.imageUrl||"";
     if(x.host){$("#showHost").textContent="Hosted by "+x.host;$("#showHost").hidden=false}
   }
 });
}catch{}

$("#showTitle").textContent=meta[0];
$("#showLabel").textContent=(meta[1]||"SpeakOut Original").toUpperCase()+" · SPEAKOUT ORIGINAL";
$("#showDescription").textContent=meta[2];
document.title=meta[0]+" | SpeakOut TV";
setMeta("description",meta[2]);setMeta("og:title",meta[0]+" | SpeakOut TV",true);setMeta("og:description",meta[2],true);setMeta("twitter:title",meta[0]+" | SpeakOut TV");setMeta("twitter:description",meta[2]);
const canonical=document.querySelector('link[rel="canonical"]');if(canonical)canonical.href=location.href;

let episodes=[];
try{
 const all=await loadTvEpisodes();
 episodes=all.filter(x=>norm(x.show)===slug&&String(x.format||x.type||"").toLowerCase()!=="live");
}catch{}

const videoIds=new Set(episodes.map(x=>ytId(x.url||x.videoUrl)).filter(Boolean));
starterEpisodes.forEach(x=>{
 const y=ytId(x.url);
 if(norm(x.show)===slug&&!videoIds.has(y))episodes.push(x);
});
episodes.sort((a,b)=>dateValue(b)-dateValue(a)||order(a,b));

$("#episodeCount").textContent=episodes.length+(episodes.length===1?" episode":" episodes");
$("#episodeGrid").innerHTML=episodes.length?episodes.map(episodeCard).join(""):'<div class="show-empty"><strong>No published episodes yet</strong><p>New episodes will appear here when they are published.</p><a href="tv-search.html">Explore other SpeakOut originals →</a></div>';

const first=episodes[0];
const showArtItem={slug,title:meta[0],category:meta[1],show:meta[0]};
const artwork=$("#showArtwork");
artClass(showArtItem,"series").split(" ").forEach(cls=>artwork.classList.add(cls));
if(first){
 $("#startWatching").addEventListener("click",()=>location.href=watchHref(first));
 const heroImg=showImage||imageFor(first);
 if(heroImg){artwork.style.backgroundImage='url("'+heroImg.replace(/"/g,"%22")+'")';artwork.classList.add("has-image");artwork.innerHTML=artOverlay(showArtItem,"series");setMeta("og:image",heroImg,true);setMeta("twitter:image",heroImg)}
 else artwork.innerHTML=artFallback(showArtItem,"series");
}else{
 $("#startWatching").hidden=true;
 if(showImage){artwork.style.backgroundImage='url("'+showImage.replace(/"/g,"%22")+'")';artwork.classList.add("has-image");artwork.innerHTML=artOverlay(showArtItem,"series");setMeta("og:image",showImage,true);setMeta("twitter:image",showImage)}
 else artwork.innerHTML=artFallback(showArtItem,"series");
}
