import {db} from "../firebase-config.js";
import {collection,getDocs,query,where} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const starterEpisodes=[
{id:"archive-speakout-anthem",title:"SpeakOut Anthem | Together We Rise for Mental Health",show:"SpeakOut Special",description:"SpeakOut anthem and movement video.",url:"https://www.youtube.com/watch?v=tAoGJvkvNRg",format:"episode",status:"published",archive:true,order:901,tags:["motivation","youth"]},
{id:"archive-adhd-men",title:"Dear Men With ADHD: This Is For You | Spoken Word",show:"SpeakOut Stories",description:"A spoken-word conversation from SpeakOut.",url:"https://www.youtube.com/watch?v=ixDjSGFBA5Q",format:"episode",status:"published",archive:true,order:902,tags:["adhd","men","motivation"]},
{id:"archive-religion",title:"This Might Change How You See Religion Forever",show:"SpeakOut Stories",description:"A SpeakOut conversation from our video archive.",url:"https://www.youtube.com/watch?v=PSq-nwyzrNk",format:"episode",status:"published",archive:true,order:903,tags:["overthinking","stories"]},
{id:"archive-tired-nation",title:"Heavy Heart of a Tired Nation (Nigeria as a Case Study)",show:"SpeakOut Stories",description:"A SpeakOut reflection from our video archive.",url:"https://www.youtube.com/watch?v=EFOEWzO1a3E",format:"episode",status:"published",archive:true,order:904,tags:["stress","stories"]},
{id:"archive-marital-decay",title:"The Silent Architect of Marital Decay",show:"SpeakOut Stories",description:"A SpeakOut conversation from our video archive.",url:"https://www.youtube.com/watch?v=akWDTQmn9K0",format:"episode",status:"published",archive:true,order:905,tags:["relationships","stories"]}
];

const defaultSeries=[
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
const $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const ytId=raw=>{try{const u=new URL(raw);if(u.hostname==="youtu.be")return u.pathname.split("/").filter(Boolean)[0]||null;if(u.hostname.endsWith("youtube.com"))return u.searchParams.get("v")||u.pathname.match(/\/(?:embed|live|shorts)\/([^/?]+)/)?.[1]||null}catch{}return null};
const embed=raw=>{try{const u=new URL(raw),host=u.hostname.replace(/^www\./,""),y=ytId(raw);if(y)return "https://www.youtube-nocookie.com/embed/"+encodeURIComponent(y)+"?rel=0";if(host==="vimeo.com"){const id=u.pathname.split("/").filter(Boolean)[0];if(id)return "https://player.vimeo.com/video/"+encodeURIComponent(id)}if(host==="player.vimeo.com")return raw;if(host.endsWith("twitch.tv")){const ch=u.pathname.split("/").filter(Boolean)[0];if(ch)return "https://player.twitch.tv/?channel="+encodeURIComponent(ch)+"&parent="+encodeURIComponent(location.hostname)}}catch{}return null};
const dateValue=x=>x.publishedAt?.toMillis?.()||Date.parse(x.publishedAt||x.publishDate||x.date||0)||0;
const order=(a,b)=>(Number(a.order)||999)-(Number(b.order)||999);
const spotifyEmbed=raw=>{try{const u=new URL(raw),h=u.hostname.replace(/^www\./,"");if(h!=="open.spotify.com")return null;const p=u.pathname.replace(/^\/embed/,"");if(/^\/(episode|show|track)\//.test(p))return "https://open.spotify.com/embed"+p+"?theme=0"}catch{}return null};
const imageFor=x=>{const y=ytId(x?.url||x?.videoUrl);return x?.imageUrl||x?.thumbnailUrl||(y?"https://i.ytimg.com/vi/"+encodeURIComponent(y)+"/hqdefault.jpg":"")};
const normalize=s=>String(s||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const preferredScrollBehavior=()=>matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth";
const scheduleValue=x=>x?.scheduledAt?.toMillis?.()||Date.parse(x?.scheduledAt||"")||0;
const formatSchedule=(ms,opts={})=>ms?new Intl.DateTimeFormat(undefined,{weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit",...opts}).format(new Date(ms)):"";
const livePeople=x=>[x?.presenter?"Host · "+x.presenter:"",x?.guest?"Guest · "+x.guest:"",x?.guestRole||"",x?.sponsor?"Supported by "+x.sponsor:""].filter(Boolean);

function setFrame(target,item,autoplay=false){
 const src=embed(item?.url||item?.videoUrl);if(!src||!target)return;
 target.innerHTML='<iframe loading="lazy" referrerpolicy="strict-origin-when-cross-origin" src="'+esc(src+(autoplay?"&autoplay=1":""))+'" title="'+esc(item.title||"SpeakOut TV")+'" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>';
}
function renderEpisodePreview(target,item){
 if(!target||!item)return;
 const img=imageFor(item);
 target.innerHTML='<button class="tv-player-preview" type="button" data-episode-open="'+esc(item.id)+'">'+
  (img?'<img src="'+esc(img)+'" alt="" loading="lazy">':'<div class="ios-thumb-fallback">SPEAKOUT TV</div>')+
  '<span class="tv-player-preview-play">▶</span><span class="sr-only">Play '+esc(item.title||"SpeakOut TV")+'</span></button>';
}
const defaultSpotifySrc="https://open.spotify.com/embed/show/4Z8Ua9vAYLT5YJEWYV1gfx?utm_source=generator&theme=0";
function ensureDefaultAudioPlayer(){
 const host=$("#audioPlayer");if(!host||host.querySelector("iframe"))return;
 host.innerHTML='<iframe loading="lazy" src="'+esc(defaultSpotifySrc)+'" title="SpeakOut podcast" allow="autoplay;clipboard-write;encrypted-media;fullscreen;picture-in-picture"></iframe>';
}
function contentCard(x){
 const img=imageFor(x),saved=isSaved(x.id);
 return '<div class="youth-content-card" data-episode-id="'+esc(x.id)+'"><button class="content-save'+(saved?' is-saved':'')+'" type="button" data-save-id="'+esc(x.id)+'" aria-label="'+(saved?'Remove from saved':'Save for later')+'">'+(saved?'✓':'＋')+'</button><button class="youth-content-open" type="button" data-episode-open="'+esc(x.id)+'"><div class="youth-content-thumb">'+(img?'<img src="'+esc(img)+'" alt="" loading="lazy">':'')+'</div><small>'+esc(x.show||"SpeakOut TV")+'</small><strong>'+esc(x.title||"SpeakOut TV")+'</strong><p>'+esc(x.description||"Watch on SpeakOut TV.")+'</p></button></div>';
}
function episodeCard(x){
 const img=imageFor(x);
 return '<button class="ios-episode-card" type="button" data-episode-id="'+esc(x.id)+'">'+(img?'<img src="'+esc(img)+'" alt="" loading="lazy">':'<div class="ios-thumb-fallback">TV</div>')+'<span>'+esc(x.title||"SpeakOut TV")+'</span></button>';
}
function originalCard(x,episode){
 const img=x.imageUrl||imageFor(episode),style=img?' style="background-image:url(\''+esc(img)+'\')"':"";
 const label=x.category||x.label||"Original";
 return '<a class="original-card" href="show.html?show='+encodeURIComponent(x.slug)+'"><div class="original-art"'+style+'></div><div class="original-copy"><small>'+esc(label)+'</small><strong>'+esc(x.title)+'</strong><span>Explore series →</span></div></a>';
}
function audioCard(x){
 const art=x.imageUrl||"";
 return '<button class="ios-audio-episode" type="button" data-audio-id="'+esc(x.id)+'">'+(art?'<img src="'+esc(art)+'" alt="" loading="lazy">':'<div class="ios-audio-art">◉</div>')+'<span><small>'+esc(x.audioType||"Audio")+'</small><strong>'+esc(x.title||"SpeakOut Audio")+'</strong></span></button>';
}
function topicMatch(x,topic){
 if(topic==="all")return true;
 const hay=normalize([x.title,x.description,x.show,x.contentPillar,x.audience,(Array.isArray(x.tags)?x.tags.join(" "):x.tags)].join(" "));
 const groups={
  stress:["stress","tired","pressure","burnout","heavy"],
  overthinking:["overthinking","thought","worry","religion","mind"],
  motivation:["motivation","rise","confidence","future","anthem"],
  adhd:["adhd","focus","attention"],
  school:["school","student","campus","study","youth"],
  relationships:["relationship","marriage","family","friend"],
  men:["men","man","male","adhd"]
 };
 return (groups[topic]||[topic]).some(k=>hay.includes(k));
}

const dailyProgramming=[
 {title:"Reset & Perspective",description:"A calmer mix for slowing down, reflecting and starting again.",topic:"stress"},
 {title:"Focus & Momentum",description:"Stories and conversations about attention, confidence and taking the next step.",topic:"motivation"},
 {title:"Real Stories",description:"Human experiences and reflections that make difficult conversations easier to enter.",topic:"stories"},
 {title:"Student Life",description:"Campus voices, school pressure and conversations about growing through change.",topic:"school"},
 {title:"Relationships & Connection",description:"Perspectives on family, friendship, communication and connection.",topic:"relationships"},
 {title:"Confidence & Possibility",description:"A mix for perspective, motivation and moving into the weekend with intention.",topic:"motivation"},
 {title:"Youth Voices",description:"Stories and ideas centered on young people, community and everyday life.",topic:"youth"}
];
let dailyFocusItems=[];
const placementOf=x=>normalize(x?.homePlacement||"auto").replace(/\s+/g,"_");
const discoveryEligible=x=>placementOf(x)!=="library_only";
const placementPriority=x=>{const n=Number(String(x?.placementPriority??"").trim()||100);return Number.isInteger(n)&&n>=0&&n<=999?n:100};
const localDateKey=d=>String(d.getFullYear())+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const programmingDayMatches=(pattern,date=new Date())=>{
 const value=normalize(pattern||"all");
 const day=date.getDay();
 if(value==="all"||!value)return true;
 if(value==="weekdays")return day>=1&&day<=5;
 if(value==="weekend")return day===0||day===6;
 return ["sun","mon","tue","wed","thu","fri","sat"][day]===value;
};
const placementScheduleActive=(x,date=new Date())=>{
 if(!programmingDayMatches(x?.programmingDays,date))return false;
 const today=localDateKey(date),start=String(x?.placementStart||"").trim(),end=String(x?.placementEnd||"").trim();
 if(start&&today<start)return false;
 if(end&&today>end)return false;
 return true;
};
const activePlacement=(x,name,date=new Date())=>placementOf(x)===name&&placementScheduleActive(x,date);
const editorialPlacementSort=(a,b)=>placementPriority(a)-placementPriority(b)||order(a,b)||dateValue(b)-dateValue(a);

function diverseItems(items,limit=10){
 const result=[],seenShows=new Set();
 for(const item of items){
  const key=normalize(item.show||"");
  if(key&&!seenShows.has(key)){result.push(item);seenShows.add(key)}
  if(result.length>=limit)return result;
 }
 for(const item of items){
  if(!result.includes(item))result.push(item);
  if(result.length>=limit)break;
 }
 return result;
}
function dailySeed(){
 const d=new Date();
 return Number(String(d.getFullYear())+String(d.getMonth()+1).padStart(2,"0")+String(d.getDate()).padStart(2,"0"));
}
function renderDailyProgramming(){
 const plan=dailyProgramming[new Date().getDay()]||dailyProgramming[0];
 $("#dailyFocusEyebrow").textContent="TODAY · "+new Intl.DateTimeFormat(undefined,{weekday:"long"}).format(new Date()).toUpperCase();
 const homePool=regularEpisodes.filter(discoveryEligible);
 const editorial=homePool.filter(x=>activePlacement(x,"daily")).sort(editorialPlacementSort);
 const topicPicks=homePool.filter(x=>topicMatch(x,plan.topic)&&!editorial.includes(x));
 const picks=[...editorial,...topicPicks];
 dailyFocusItems=diverseItems(picks.length?picks:homePool,10);
 $("#dailyFocusTitle").textContent=plan.title;
 $("#dailyFocusDescription").textContent=plan.description;
 $("#dailyFocusRail").innerHTML=dailyFocusItems.map(contentCard).join("")||'<div class="ios-audio-empty">More curated content is coming.</div>';
}
function renderFresh(){
 const section=$("#fresh"),rail=$("#freshRail");
 const dated=regularEpisodes.filter(x=>discoveryEligible(x)&&dateValue(x)>0).sort((a,b)=>dateValue(b)-dateValue(a));
 if(!dated.length){section.hidden=true;return}
 const weekAgo=Date.now()-7*24*60*60*1000;
 const thisWeek=dated.filter(x=>dateValue(x)>=weekAgo);
 const picks=diverseItems((thisWeek.length?thisWeek:dated).slice(0,12),8);
 section.hidden=!picks.length;
 $("#freshEyebrow").textContent=thisWeek.length?"NEW THIS WEEK":"RECENTLY ADDED";
 $("#freshTitle").textContent=thisWeek.length?"Fresh on SpeakOut TV":"Recently Added";
 $("#freshSub").textContent=thisWeek.length?"Newly published conversations and stories from this week.":"The most recently published SpeakOut TV content.";
 rail.innerHTML=picks.map(contentCard).join("");
}
function pickFeatured(){
 if(!regularEpisodes.length)return null;
 const homePool=regularEpisodes.filter(discoveryEligible);
 const placed=homePool.filter(x=>activePlacement(x,"featured")).sort(editorialPlacementSort);
 if(placed.length)return placed[0];
 const editorial=homePool.filter(x=>placementOf(x)==="auto"&&(x.featured===true||String(x.featured).toLowerCase()==="true")&&placementScheduleActive(x)).sort(editorialPlacementSort);
 return editorial[0]||null;
}
function pickSomething(){
 const homePool=regularEpisodes.filter(discoveryEligible);
 const pool=dailyFocusItems.length?dailyFocusItems:homePool;
 if(!pool.length)return;
 const recent=new Set(readShelf().recent);
 const unseen=pool.filter(x=>!recent.has(x.id));
 const source=unseen.length?unseen:pool;
 const item=source[dailySeed()%source.length]||source[0];
 if(item)playEpisode(item,true);
}

let regularEpisodes=[],currentEpisode=null;
const shelfKey="speakout-tv-shelf-v1";
function readShelf(){try{const raw=JSON.parse(localStorage.getItem(shelfKey)||"{}");return {recent:Array.isArray(raw.recent)?raw.recent:[],saved:Array.isArray(raw.saved)?raw.saved:[]}}catch{return {recent:[],saved:[]}}}
function writeShelf(data){try{localStorage.setItem(shelfKey,JSON.stringify({recent:data.recent.slice(0,8),saved:data.saved.slice(0,24)}))}catch{}}
function isSaved(id){return readShelf().saved.includes(id)}
function markRecent(id){if(!id)return;const s=readShelf();s.recent=[id,...s.recent.filter(x=>x!==id)].slice(0,8);writeShelf(s);renderShelf()}
function toggleSaved(id){const s=readShelf();s.saved=s.saved.includes(id)?s.saved.filter(x=>x!==id):[id,...s.saved];writeShelf(s);renderShelf();renderForYou(document.querySelector(".mood-chip.active")?.dataset.topic||"all");return s.saved.includes(id)}
function renderShelf(){
 const shelf=readShelf();
 const recent=shelf.recent.map(id=>regularEpisodes.find(x=>x.id===id)).filter(Boolean);
 const saved=shelf.saved.map(id=>regularEpisodes.find(x=>x.id===id)).filter(Boolean);
 const section=$("#shelf"),continueBlock=$("#continueBlock"),savedBlock=$("#savedBlock");
 if($("#continueRail"))$("#continueRail").innerHTML=recent.map(contentCard).join("");
 if($("#savedRail"))$("#savedRail").innerHTML=saved.map(contentCard).join("");
 if(continueBlock)continueBlock.hidden=!recent.length;
 if(savedBlock)savedBlock.hidden=!saved.length;
 if(section)section.hidden=!(recent.length||saved.length);
}
function playEpisode(item,autoplay=true){
 if(!item)return;
 currentEpisode=item;
 setFrame($("#episodePlayer"),item,autoplay);
 $("#episodeTitle").textContent=item.title||"SpeakOut TV";
 $("#episodeDescription").textContent=item.description||"";
 $$(".ios-episode-card,.youth-content-card").forEach(el=>el.classList.toggle("active",el.dataset.episodeId===item.id));
 markRecent(item.id);
 showView("watch",{push:true});
}
function renderForYou(topic="all"){
 const homePool=regularEpisodes.filter(discoveryEligible);
 let picks=homePool.filter(x=>topicMatch(x,topic));
 if(!picks.length)picks=homePool;
 picks=diverseItems(picks,12);
 $("#forYouRail").innerHTML=picks.map(contentCard).join("")||'<div class="ios-audio-empty">More SpeakOut content is coming.</div>';
 $("#forYouSub").textContent=topic==="all"?"A mix of stories, conversations and ideas worth your time.":"Showing content connected to what you picked for this visit.";
}

let liveItems=[],currentLive=null,nextLive=null,liveCountdownTimer=null;
function liveMetaMarkup(item){
 const bits=[];
 const scheduled=scheduleValue(item);
 if(scheduled)bits.push("<span>◷ "+esc(formatSchedule(scheduled))+"</span>");
 livePeople(item).forEach(x=>bits.push("<span>"+esc(x)+"</span>"));
 return bits.join("");
}
function liveScheduleCard(item){
 const img=imageFor(item),when=scheduleValue(item);
 return '<article class="live-schedule-card">'+
  '<div class="live-schedule-art">'+(img?'<img src="'+esc(img)+'" alt="" loading="lazy">':'<div class="live-schedule-fallback">SPEAKOUT LIVE</div>')+'<span>'+esc(formatSchedule(when,{weekday:"long"}))+'</span></div>'+
  '<div class="live-schedule-copy"><small>'+esc(formatSchedule(when))+'</small><strong>'+esc(item.title||"SpeakOut Live")+'</strong><p>'+esc(item.description||"Join the conversation live on SpeakOut TV.")+'</p>'+
  '<div class="live-card-actions"><button type="button" data-live-calendar="'+esc(item.id)+'">＋ Reminder</button><button type="button" data-live-share="'+esc(item.id)+'">Share</button></div></div></article>';
}
function previousLiveCard(item){
 const img=imageFor(item);
 return '<button class="live-previous-card" type="button" data-live-watch="'+esc(item.id)+'">'+
  '<div class="live-previous-art">'+(img?'<img src="'+esc(img)+'" alt="" loading="lazy">':'<div class="live-schedule-fallback">LIVE</div>')+'<span>▶</span></div>'+
  '<small>'+esc(item.show||"SpeakOut Live")+'</small><strong>'+esc(item.title||"SpeakOut Live")+'</strong></button>';
}
function calendarText(item){
 const start=scheduleValue(item);if(!start)return "";
 const end=start+60*60*1000;
 const stamp=ms=>new Date(ms).toISOString().replace(/[-:]/g,"").replace(/\.\d{3}Z$/,"Z");
 const clean=s=>String(s||"").replace(/\\/g,"\\\\").replace(/\n/g,"\\n").replace(/,/g,"\\,").replace(/;/g,"\\;");
 const url=location.origin+location.pathname+"#live";
 return ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//SpeakOut TV//Live//EN","BEGIN:VEVENT",
  "UID:"+clean((item.id||"live")+"@speakoutmentalhealth.org"),"DTSTAMP:"+stamp(Date.now()),"DTSTART:"+stamp(start),"DTEND:"+stamp(end),
  "SUMMARY:"+clean(item.title||"SpeakOut Live"),"DESCRIPTION:"+clean(item.description||"Join SpeakOut Live."),"URL:"+url,"END:VEVENT","END:VCALENDAR"].join("\r\n");
}
function addLiveReminder(item){
 const body=calendarText(item);if(!body)return;
 const blob=new Blob([body],{type:"text/calendar;charset=utf-8"});
 const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=(normalize(item.title||"speakout-live").replace(/ /g,"-")||"speakout-live")+".ics";
 document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
 $("#liveActionStatus").textContent="Calendar reminder prepared.";
}
async function shareLive(item){
 if(!item)return;
 const url=new URL(location.origin+location.pathname);url.searchParams.set("live",item.id||"");url.hash="live";
 try{
  if(navigator.share)await navigator.share({title:item.title||"SpeakOut Live",text:item.description||"Join SpeakOut Live.",url:url.href});
  else{await navigator.clipboard.writeText(url.href);$("#liveActionStatus").textContent="Live link copied."}
 }catch(error){if(error?.name!=="AbortError")$("#liveActionStatus").textContent="Use your browser address bar to copy the live link."}
}
function startLiveCountdown(item){
 if(liveCountdownTimer)clearInterval(liveCountdownTimer);
 const target=scheduleValue(item),out=$("#liveCountdown");if(!target||!out)return;
 const tick=()=>{
  const left=Math.max(0,target-Date.now());
  const days=Math.floor(left/86400000),hours=Math.floor((left%86400000)/3600000),mins=Math.floor((left%3600000)/60000);
  const values=[days,hours,mins];out.querySelectorAll("b").forEach((b,i)=>b.textContent=String(values[i]??0).padStart(2,"0"));
  if(left<=0){clearInterval(liveCountdownTimer);$("#liveActionStatus").textContent="This session is scheduled to begin now."}
 };
 tick();liveCountdownTimer=setInterval(tick,30000);
}
function renderLiveExperience(allEpisodes){
 const now=Date.now();
 liveItems=allEpisodes.filter(x=>String(x.format||x.type||"").toLowerCase()==="live");
 const future=liveItems.filter(x=>scheduleValue(x)>now).sort((a,b)=>scheduleValue(a)-scheduleValue(b));
 const recent=liveItems.filter(x=>{const t=scheduleValue(x);return t&&t<=now&&(now-t)<=3*60*60*1000}).sort((a,b)=>scheduleValue(b)-scheduleValue(a));
 const previous=liveItems.filter(x=>{const t=scheduleValue(x);return t&&t<now-6*60*60*1000}).sort((a,b)=>scheduleValue(b)-scheduleValue(a));
 const requestedLiveId=new URLSearchParams(location.search).get("live")||"";
 const requestedLive=liveItems.find(x=>x.id===requestedLiveId)||null;
 const requestedTime=scheduleValue(requestedLive);
 currentLive=recent[0]||null;nextLive=future[0]||null;
 if(requestedLive&&requestedTime>now)nextLive=requestedLive;
 if(requestedLive&&(!requestedTime||(requestedTime<=now&&(now-requestedTime)<=6*60*60*1000)))currentLive=requestedLive;
 const requestedReplay=requestedLive&&requestedTime&&requestedTime<now-6*60*60*1000?requestedLive:null;

 const status=$("#liveStatus"),stageTime=$("#liveStageTime"),meta=$("#liveMeta"),share=$("#liveShare"),calendar=$("#liveCalendar");
 if(currentLive){
  status.textContent="Scheduled now";status.classList.add("is-live");
  stageTime.textContent="Scheduled · "+formatSchedule(scheduleValue(currentLive));
  $("#liveEyebrow").textContent="ON AIR";
  $("#liveTitle").textContent=currentLive.title||"SpeakOut Live";
  $("#liveDescription").textContent=currentLive.description||"Join the conversation live on SpeakOut TV.";
  meta.innerHTML=liveMetaMarkup(currentLive);setFrame($("#livePlayer"),currentLive,false);
  share.hidden=false;calendar.hidden=!scheduleValue(currentLive);
 }else{
  status.textContent=nextLive?"Upcoming":"Standby";status.classList.remove("is-live");
  stageTime.textContent=nextLive?"Next · "+formatSchedule(scheduleValue(nextLive)):"Waiting for the next session";
  $("#liveEyebrow").textContent="LIVE CHANNEL";
  $("#liveTitle").textContent="The next conversation starts here.";
  $("#liveDescription").textContent=nextLive?"A SpeakOut Live session is scheduled. The countdown and reminder are ready below.":"Interviews, youth conversations and special SpeakOut sessions will appear here when scheduled.";
  meta.innerHTML="";share.hidden=true;calendar.hidden=true;
 }
 if(requestedReplay){
  status.textContent="Replay";status.classList.remove("is-live");stageTime.textContent="Previously live · "+formatSchedule(scheduleValue(requestedReplay));
  $("#liveEyebrow").textContent="PREVIOUSLY LIVE";$("#liveTitle").textContent=requestedReplay.title||"SpeakOut Live";
  $("#liveDescription").textContent=requestedReplay.description||"Watch this previous SpeakOut live conversation.";
  meta.innerHTML=liveMetaMarkup(requestedReplay);setFrame($("#livePlayer"),requestedReplay,false);share.hidden=false;calendar.hidden=true;
 }

 const nextPanel=$("#nextLivePanel");
 if(nextLive){
  nextPanel.hidden=false;$("#nextLiveTitle").textContent=nextLive.title||"Upcoming SpeakOut Live";$("#nextLiveDescription").textContent=nextLive.description||"Join the next SpeakOut conversation live.";
  $("#nextLiveMeta").innerHTML=liveMetaMarkup(nextLive);startLiveCountdown(nextLive);
 }else nextPanel.hidden=true;

}

const viewGroups={
 home:["home","featured","today-focus","for-you","topic-journeys","fresh","shelf","reset","series","stories"],
 watch:["episodes"],
 listen:["audio"],
 live:["live"]
};
function showView(view,{push=false}={}){
 const chosen=viewGroups[view]?view:"home";
 document.documentElement.dataset.tvRoute=chosen;
 document.body.dataset.tvView=chosen;
 document.body.classList.toggle("youth-view-filtered",chosen!=="home");
 $$(".youth-welcome,.youth-feature,.youth-section,.youth-closing").forEach(el=>{
   const id=el.id||"";
   el.hidden=id?!viewGroups[chosen].includes(id):chosen!=="home";
 });
 $$(".youth-nav a").forEach(a=>{const active=a.dataset.view===chosen;a.classList.toggle("active",active);if(active)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current")});
 if(chosen==="watch"&&currentEpisode&&!$("#episodePlayer iframe"))setFrame($("#episodePlayer"),currentEpisode,false);
 if(chosen==="listen")ensureDefaultAudioPlayer();
 if(push){
   const next=chosen==="home"?"tv.html":"#"+chosen;
   history.pushState({tvView:chosen},"",next);
 }
 window.scrollTo({top:0,behavior:preferredScrollBehavior()});
}

async function load(){
 let episodes=[];
 try{const snap=await getDocs(query(collection(db,"tvEpisodes"),where("status","in",["active","published"])));snap.forEach(d=>episodes.push({id:d.id,...d.data()}))}catch{}
 const known=new Set(episodes.map(x=>ytId(x.url||x.videoUrl)).filter(Boolean));
 starterEpisodes.forEach(x=>{const id=ytId(x.url);if(!known.has(id))episodes.push(x)});
 episodes.sort((a,b)=>dateValue(b)-dateValue(a)||order(a,b));

 renderLiveExperience(episodes);

 regularEpisodes=episodes.filter(x=>String(x.format||x.type||"").toLowerCase()!=="live");
 const homeEpisodes=regularEpisodes.filter(discoveryEligible);
 renderDailyProgramming();
 renderFresh();
 const featured=pickFeatured();
 const first=homeEpisodes[0]||featured;
 if(first){
   currentEpisode=first;renderEpisodePreview($("#episodePlayer"),first);$("#episodeTitle").textContent=first.title||"SpeakOut TV";$("#episodeDescription").textContent=first.description||"";
 }
 if(featured){
   $("#featured")?.classList.remove("feature-empty");
   $("#introTitle").textContent=featured.title||"Worth watching now.";$("#introDescription").textContent=featured.description||"Original SpeakOut stories and conversations.";
   const img=imageFor(featured),backdrop=$("#introBackdrop");if(backdrop&&img){backdrop.style.backgroundImage='url("'+img.replace(/"/g,"%22")+'")';backdrop.classList.add("has-image")}
   $("#introPlay")?.addEventListener("click",()=>playEpisode(featured,true));
 }
 $("#latestRail").innerHTML=homeEpisodes.map(episodeCard).join("")||'<div class="ios-audio-empty">Published TV episodes will appear here.</div>';
 renderForYou();
 renderShelf();
 $("#storiesRail").innerHTML=homeEpisodes.filter(x=>normalize(x.show).includes("stories")||x.archive).slice(0,10).map(contentCard).join("")||homeEpisodes.slice(0,5).map(contentCard).join("");
 let seriesItems=[];
 try{
   const snap=await getDocs(query(collection(db,"tvShows"),where("status","in",["active","published"])));
   snap.forEach(d=>seriesItems.push({id:d.id,...d.data()}));
 }catch{}
 const knownSeries=new Set(seriesItems.map(x=>normalize(x.slug||x.title).replace(/ /g,"-")));
 defaultSeries.forEach(x=>{if(!knownSeries.has(x.slug))seriesItems.push(x)});
 seriesItems.sort((a,b)=>order(a,b)||String(a.title||"").localeCompare(String(b.title||"")));
 $("#seriesRail").innerHTML=seriesItems.map(item=>originalCard(item,homeEpisodes.find(ep=>normalize(ep.show)===normalize(item.title)))).join("");
 $("#introSeries")?.addEventListener("click",()=>location.href="tv-search.html");

 let audio=[];
 try{const snap=await getDocs(query(collection(db,"tvAudio"),where("status","in",["active","published"])));snap.forEach(d=>audio.push({id:d.id,...d.data()}))}catch{}
 audio.sort((a,b)=>dateValue(b)-dateValue(a)||order(a,b));
 const spotifyAudio=audio.filter(x=>spotifyEmbed(x.url||""));
 $("#audioRail").innerHTML=spotifyAudio.length?spotifyAudio.map(audioCard).join(""):'<div class="ios-audio-empty">Published audio episodes will appear here.</div>';
 $("#audioRail")?.addEventListener("click",e=>{const b=e.target.closest(".ios-audio-episode");if(!b)return;const item=spotifyAudio.find(x=>x.id===b.dataset.audioId),src=spotifyEmbed(item?.url||"");if(!src)return;$("#audioPlayer").innerHTML='<iframe loading="lazy" src="'+esc(src)+'" title="'+esc(item.title||"SpeakOut audio")+'" allow="autoplay;clipboard-write;encrypted-media;fullscreen;picture-in-picture"></iframe>';});

 const requested=new URLSearchParams(location.search).get("episode");
 if(requested){const item=regularEpisodes.find(x=>x.id===requested);if(item)playEpisode(item,false)}
}

document.addEventListener("click",e=>{
 const save=e.target.closest("[data-save-id]");if(save){e.preventDefault();e.stopPropagation();const saved=toggleSaved(save.dataset.saveId);save.classList.toggle("is-saved",saved);save.textContent=saved?"✓":"＋";save.setAttribute("aria-label",saved?"Remove from saved":"Save for later");return}
 const open=e.target.closest("[data-episode-open]");if(open){const item=regularEpisodes.find(x=>x.id===open.dataset.episodeOpen);if(item)playEpisode(item,true);return}
 const ep=e.target.closest(".ios-episode-card[data-episode-id]");if(ep){const item=regularEpisodes.find(x=>x.id===ep.dataset.episodeId);if(item)playEpisode(item,true);return}
 const mood=e.target.closest(".mood-chip");if(mood){$$(".mood-chip").forEach(x=>x.classList.toggle("active",x===mood));renderForYou(mood.dataset.topic||"all");$("#for-you")?.scrollIntoView({behavior:preferredScrollBehavior(),block:"start"});return}
 const pick=e.target.closest("#pickForMe");if(pick){pickSomething();return}
 const reset=e.target.closest("[data-reset]");if(reset){const messages={breathe:"Unclench your jaw, lower your shoulders and take one slow breath. Give yourself a minute before the next thing.",ground:"Look around and quietly notice five things you can see, four you can feel, and three you can hear. No rush.",focus:"Choose one small task that matters next. Finish that one before deciding what comes after it."};const panel=$("#resetPanel");panel.textContent=messages[reset.dataset.reset]||"";panel.hidden=false;return}
 const reminder=e.target.closest("[data-live-calendar]");if(reminder){const item=liveItems.find(x=>x.id===reminder.dataset.liveCalendar);if(item)addLiveReminder(item);return}
 const shareLiveBtn=e.target.closest("[data-live-share]");if(shareLiveBtn){const item=liveItems.find(x=>x.id===shareLiveBtn.dataset.liveShare);if(item)shareLive(item);return}
 const watchLive=e.target.closest("[data-live-watch]");if(watchLive){const item=liveItems.find(x=>x.id===watchLive.dataset.liveWatch);if(item){setFrame($("#livePlayer"),item,true);$("#liveTitle").textContent=item.title||"SpeakOut Live";$("#liveDescription").textContent=item.description||"";$("#liveEyebrow").textContent="PREVIOUSLY LIVE";$("#liveMeta").innerHTML=liveMetaMarkup(item);$("#live").scrollIntoView({behavior:preferredScrollBehavior(),block:"start"})}return}
 const nav=e.target.closest(".youth-nav a[data-view]");if(nav){e.preventDefault();showView(nav.dataset.view,{push:true})}
});
function routeTvHash(){
 const hash=location.hash.slice(1);
 if(hash==="discover"){location.replace("tv-search.html");return}
 if(hash==="listen"||hash==="audio"){location.replace("radio.html");return}
 showView(hash||"home");
}
addEventListener("popstate",routeTvHash);
routeTvHash();

let deferredInstall;
addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstall=e;const b=$("#installTv");if(b)b.hidden=false});
$("#installTv")?.addEventListener("click",async()=>{if(!deferredInstall)return;deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;$("#installTv").hidden=true});

load();
$("#liveShare")?.addEventListener("click",()=>{const requested=new URLSearchParams(location.search).get("live");shareLive(liveItems.find(x=>x.id===requested)||currentLive||nextLive)});
$("#liveCalendar")?.addEventListener("click",()=>{const item=currentLive||nextLive;if(item)addLiveReminder(item)});
$("#nextLiveReminder")?.addEventListener("click",()=>{if(nextLive)addLiveReminder(nextLive)});
