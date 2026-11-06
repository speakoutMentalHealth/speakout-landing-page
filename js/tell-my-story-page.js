import {loadTvEpisodes} from "./tv-data.js";

const statusNode=document.getElementById("tmsContentStatus");
const grid=document.getElementById("tmsContentGrid");
const normalize=value=>String(value||"").trim().toLowerCase().replace(/[\s_]+/g,"-");
const publicStatus=value=>!value||["published","active"].includes(String(value).trim().toLowerCase());
const isTms=item=>{
  const tags=Array.isArray(item.tags)?item.tags:String(item.tags||"").split(",");
  if(tags.some(tag=>normalize(tag)==="tell-my-story"))return true;
  return [item.show,item.series,item.partner,item.partnerName,item.collection].some(value=>normalize(value)==="tell-my-story");
};
function youtubeImage(item){
  try{
    const url=new URL(item.url||item.videoUrl||"");
    const hostname=url.hostname.toLowerCase();
    let id="";
    if(hostname==="youtu.be")id=url.pathname.split("/")[1]||"";
    else if(hostname==="youtube.com"||hostname==="www.youtube.com"||hostname==="m.youtube.com")id=url.searchParams.get("v")||url.pathname.match(/^\/(?:shorts|embed)\/([\w-]+)/)?.[1]||"";
    return /^[\w-]{11}$/.test(id)?"https://i.ytimg.com/vi/"+id+"/hqdefault.jpg":"";
  }catch{return "";}
}
function approvedImage(item){
  const candidate=item.imageUrl||item.thumbnail||"";
  try{
    const u=new URL(candidate);
    if(u.protocol==="https:"&&u.hostname)return u.href;
  }catch{}
  return youtubeImage(item);
}
function renderCard(item){
  const link=document.createElement("a");
  link.className="tms-card";
  link.href="../tv.html?episode="+encodeURIComponent(item.id)+"#watch";
  link.setAttribute("aria-label","Watch "+String(item.title||"Tell My Story video")+" on SpeakOut TV");
  const thumb=document.createElement("div");thumb.className="tms-card-thumb";
  const image=approvedImage(item);
  if(image){const img=document.createElement("img");img.src=image;img.alt="";img.loading="lazy";img.decoding="async";thumb.append(img);}
  else thumb.textContent="▶";
  const copy=document.createElement("div");copy.className="tms-card-copy";
  const label=document.createElement("span");label.textContent="Tell My Story · Watch on SpeakOut TV";
  const title=document.createElement("h3");title.textContent=String(item.title||"Untitled video");
  const description=document.createElement("p");description.textContent=String(item.description||"Watch this conversation on SpeakOut TV.").slice(0,160);
  copy.append(label,title,description);link.append(thumb,copy);
  return link;
}
async function renderCollection(){
  try{
    const episodes=await loadTvEpisodes();
    const matches=(Array.isArray(episodes)?episodes:[]).filter(item=>item&&item.id&&publicStatus(item.status)&&isTms(item)&&String(item.format||item.type||"").toLowerCase()!=="live");
    matches.sort((a,b)=>Date.parse(b.publishedAt||b.createdAt||0)-Date.parse(a.publishedAt||a.createdAt||0));
    if(!matches.length){
      statusNode.textContent="Approved Tell My Story interviews and trailers will appear here after publication. Explore SHIFT and the official Tell My Story website above in the meantime.";
      return;
    }
    const fragment=document.createDocumentFragment();
    matches.forEach(item=>fragment.append(renderCard(item)));
    grid.replaceChildren(fragment);
    statusNode.hidden=true;
  }catch{
    statusNode.textContent="The video collection is temporarily unavailable. You can still visit the official Tell My Story website using the link above.";
  }
}
renderCollection();
