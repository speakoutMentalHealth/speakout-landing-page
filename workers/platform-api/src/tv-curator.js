const clean=value=>String(value??"").trim();
const lower=value=>clean(value).toLowerCase();

const youtubeApiUrl=(resource,params,apiKey)=>{
  const url=new URL("https://www.googleapis.com/youtube/v3/"+resource);
  for(const [key,value] of Object.entries(params||{})){
    if(value!==undefined&&value!==null&&String(value)!=="")url.searchParams.set(key,String(value));
  }
  url.searchParams.set("key",apiKey);
  return url;
};

async function youtubeGet(apiKey,resource,params){
  if(!clean(apiKey))throw Object.assign(new Error("YouTube curator is not configured. Add the YOUTUBE_API_KEY Worker secret."),{status:503});
  const response=await fetch(youtubeApiUrl(resource,params,apiKey),{
    headers:{"accept":"application/json","user-agent":"SpeakOut-TV-Curator/1.0"}
  });
  const body=await response.json().catch(()=>({}));
  if(!response.ok){
    const detail=body?.error?.message||"YouTube Data API request failed.";
    throw Object.assign(new Error(detail),{status:502});
  }
  return body;
}

export function normalizeKeywordList(value,max=20){
  const source=Array.isArray(value)?value:String(value||"").split(",");
  const unique=[];
  const seen=new Set();
  for(const raw of source){
    const keyword=clean(raw).replace(/\s+/gu," ").slice(0,60);
    const key=lower(keyword);
    if(!keyword||seen.has(key))continue;
    seen.add(key);unique.push(keyword);
    if(unique.length>=max)break;
  }
  return unique;
}

function channelLookup(ref){
  const raw=clean(ref);
  if(!raw)throw Object.assign(new Error("Enter a YouTube channel URL, handle or channel ID."),{status:400});
  if(/^UC[A-Za-z0-9_-]{20,}$/u.test(raw))return {id:raw};
  if(/^@[A-Za-z0-9._-]{2,}$/u.test(raw))return {forHandle:raw};
  try{
    const url=new URL(raw.includes("://")?raw:"https://"+raw);
    const host=url.hostname.replace(/^www\./u,"").toLowerCase();
    if(!["youtube.com","m.youtube.com"].includes(host))throw new Error();
    const parts=url.pathname.split("/").filter(Boolean);
    if(parts[0]==="channel"&&parts[1])return {id:parts[1]};
    if(parts[0]?.startsWith("@"))return {forHandle:parts[0]};
    if(parts[0]==="user"&&parts[1])return {forUsername:parts[1]};
  }catch{}
  if(/^[A-Za-z0-9._-]{2,}$/u.test(raw))return {forHandle:raw.startsWith("@")?raw:"@"+raw};
  throw Object.assign(new Error("Use a YouTube channel URL, @handle or channel ID."),{status:400});
}

export async function resolveYouTubeChannel(apiKey,ref){
  const lookup=channelLookup(ref);
  const body=await youtubeGet(apiKey,"channels",{part:"snippet,contentDetails,status",...lookup});
  const item=Array.isArray(body.items)?body.items[0]:null;
  if(!item)throw Object.assign(new Error("YouTube channel could not be found."),{status:404});
  const uploads=clean(item?.contentDetails?.relatedPlaylists?.uploads);
  if(!uploads)throw Object.assign(new Error("This YouTube channel does not expose an uploads playlist."),{status:409});
  const thumb=item?.snippet?.thumbnails?.medium?.url||item?.snippet?.thumbnails?.default?.url||"";
  return {
    channelId:clean(item.id),
    title:clean(item?.snippet?.title)||"YouTube channel",
    description:clean(item?.snippet?.description).slice(0,800),
    thumbnailUrl:clean(thumb),
    uploadsPlaylistId:uploads,
    madeForKids:item?.status?.madeForKids===true||item?.status?.selfDeclaredMadeForKids===true
  };
}

export function matchesCuratorSource(video,source={}){
  const include=normalizeKeywordList(source.includeKeywords);
  const exclude=normalizeKeywordList(source.excludeKeywords);
  const hay=lower([video.title,video.description,Array.isArray(video.tags)?video.tags.join(" "):video.tags].join(" "));
  if(exclude.some(keyword=>hay.includes(lower(keyword))))return false;
  if(!include.length)return true;
  return include.some(keyword=>hay.includes(lower(keyword)));
}

export async function fetchYouTubeUploads(apiKey,source={},limit=20){
  const max=Math.max(1,Math.min(50,Number(limit)||20));
  const playlistId=clean(source.uploadsPlaylistId);
  if(!playlistId)throw Object.assign(new Error("Source is missing its YouTube uploads playlist."),{status:409});
  const playlist=await youtubeGet(apiKey,"playlistItems",{
    part:"snippet,contentDetails,status",
    playlistId,
    maxResults:max
  });
  const ids=(playlist.items||[]).map(item=>clean(item?.contentDetails?.videoId||item?.snippet?.resourceId?.videoId)).filter(Boolean);
  if(!ids.length)return [];
  const details=await youtubeGet(apiKey,"videos",{part:"snippet,status",id:ids.join(",")});
  const byId=new Map((details.items||[]).map(item=>[clean(item.id),item]));
  const output=[];
  for(const id of ids){
    const item=byId.get(id);
    if(!item)continue;
    const status=item.status||{};
    if(status.privacyStatus!=="public"||status.embeddable===false||status.madeForKids===true)continue;
    const snippet=item.snippet||{};
    const video={
      videoId:id,
      channelId:clean(snippet.channelId),
      channelTitle:clean(snippet.channelTitle)||clean(source.channelTitle)||"YouTube",
      title:clean(snippet.title)||"Untitled video",
      description:clean(snippet.description).slice(0,1600),
      tags:Array.isArray(snippet.tags)?snippet.tags.slice(0,30).map(clean).filter(Boolean):[],
      publishedAt:clean(snippet.publishedAt),
      thumbnailUrl:clean(snippet?.thumbnails?.maxres?.url||snippet?.thumbnails?.standard?.url||snippet?.thumbnails?.high?.url||snippet?.thumbnails?.medium?.url||snippet?.thumbnails?.default?.url),
      url:"https://www.youtube.com/watch?v="+id,
      madeForKids:false,
      embeddable:true
    };
    if(matchesCuratorSource(video,source))output.push(video);
  }
  return output;
}

export function curatorSourceInput(input={}){
  const mode=["review","draft"].includes(lower(input.mode))?lower(input.mode):"review";
  const status=["active","paused"].includes(lower(input.status))?lower(input.status):"active";
  const pillar=lower(input.contentPillar||"motivation").replace(/[^a-z0-9_-]/gu,"");
  const audience=lower(input.audience||"youth").replace(/[^a-z0-9_-]/gu,"");
  return {
    channelRef:clean(input.channelRef).slice(0,300),
    label:clean(input.label).slice(0,120),
    includeKeywords:normalizeKeywordList(input.includeKeywords),
    excludeKeywords:normalizeKeywordList(input.excludeKeywords),
    mode,status,
    show:clean(input.show||"SpeakOut Picks").slice(0,120),
    contentPillar:pillar||"motivation",
    audience:audience||"youth"
  };
}
