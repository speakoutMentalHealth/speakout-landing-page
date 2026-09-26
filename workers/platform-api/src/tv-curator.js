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

function mapYouTubeVideo(item,source={}){
  const id=clean(item?.id);
  const status=item?.status||{};
  const snippet=item?.snippet||{};
  if(!id)return null;
  return {
    videoId:id,
    channelId:clean(snippet.channelId),
    channelTitle:clean(snippet.channelTitle)||clean(source.channelTitle)||"YouTube",
    title:clean(snippet.title)||"Untitled video",
    description:clean(snippet.description).slice(0,1600),
    tags:Array.isArray(snippet.tags)?snippet.tags.slice(0,30).map(clean).filter(Boolean):[],
    publishedAt:clean(snippet.publishedAt),
    thumbnailUrl:clean(snippet?.thumbnails?.maxres?.url||snippet?.thumbnails?.standard?.url||snippet?.thumbnails?.high?.url||snippet?.thumbnails?.medium?.url||snippet?.thumbnails?.default?.url),
    url:"https://www.youtube.com/watch?v="+id,
    privacyStatus:clean(status.privacyStatus),
    madeForKids:status.madeForKids===true,
    embeddable:status.embeddable!==false,
    eligible:status.privacyStatus==="public"&&status.embeddable!==false&&status.madeForKids!==true
  };
}

export async function fetchYouTubeVideosByIds(apiKey,ids=[],source={}){
  const unique=[...new Set((Array.isArray(ids)?ids:[]).map(clean).filter(Boolean))].slice(0,500);
  const videos=new Map();
  for(let start=0;start<unique.length;start+=50){
    const batch=unique.slice(start,start+50);
    const details=await youtubeGet(apiKey,"videos",{part:"snippet,status",id:batch.join(",")});
    for(const item of details.items||[]){
      const video=mapYouTubeVideo(item,source);
      if(video)videos.set(video.videoId,video);
    }
  }
  return videos;
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
  const byId=await fetchYouTubeVideosByIds(apiKey,ids,source);
  const output=[];
  for(const id of ids){
    const video=byId.get(id);
    if(!video?.eligible)continue;
    if(matchesCuratorSource(video,source))output.push(video);
  }
  return output;
}


export function curatorDiscoveryInput(input={}){
  const status=["active","paused"].includes(lower(input.status))?lower(input.status):"active";
  const pillar=lower(input.contentPillar||"motivation").replace(/[^a-z0-9_-]/gu,"");
  const audience=lower(input.audience||"youth").replace(/[^a-z0-9_-]/gu,"");
  const rawLookback=Number(input.lookbackDays||14);
  const rawMax=Number(input.maxResults||15);
  return {
    query:clean(input.query).replace(/\s+/gu," ").slice(0,160),
    label:clean(input.label).slice(0,120),
    includeKeywords:normalizeKeywordList(input.includeKeywords),
    excludeKeywords:normalizeKeywordList(input.excludeKeywords),
    status,
    show:clean(input.show||"SpeakOut Picks").slice(0,120),
    contentPillar:pillar||"motivation",
    audience:audience||"youth",
    lookbackDays:Number.isFinite(rawLookback)?Math.max(1,Math.min(30,Math.round(rawLookback))):14,
    maxResults:Number.isFinite(rawMax)?Math.max(5,Math.min(25,Math.round(rawMax))):15,
    relevanceLanguage:clean(input.relevanceLanguage||"en").slice(0,12)
  };
}

export async function searchYouTubeVideos(apiKey,rule={},limit=0){
  const query=clean(rule.query);
  if(!query)throw Object.assign(new Error("Enter a YouTube discovery search query."),{status:400});
  const lookbackDays=Math.max(1,Math.min(30,Number(rule.lookbackDays)||14));
  const max=Math.max(5,Math.min(25,Number(limit)||Number(rule.maxResults)||15));
  const publishedAfter=new Date(Date.now()-lookbackDays*24*60*60*1000).toISOString();
  const search=await youtubeGet(apiKey,"search",{
    part:"snippet",
    type:"video",
    q:query,
    order:"date",
    maxResults:max,
    publishedAfter,
    safeSearch:"strict",
    videoEmbeddable:"true",
    videoSyndicated:"true",
    relevanceLanguage:clean(rule.relevanceLanguage||"en")
  });
  const ids=(search.items||[]).map(item=>clean(item?.id?.videoId)).filter(Boolean);
  if(!ids.length)return [];
  const byId=await fetchYouTubeVideosByIds(apiKey,ids,rule);
  const output=[];
  for(const id of ids){
    const video=byId.get(id);
    if(!video?.eligible)continue;
    if(matchesCuratorSource(video,rule))output.push(video);
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
