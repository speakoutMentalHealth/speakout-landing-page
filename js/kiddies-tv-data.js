/* Public Kiddies TV catalogue: fast legacy bootstrap plus Firestore's access-controlled
 * editorial overrides. Remote outages fail CLOSED so archived videos cannot reappear. */
const firebaseProjects={
 "speakout-portal-staging.web.app":{project:"speakout-portal-staging",key:"AIzaSyAfe0T3E__vQBxZKQHpoiABrSXOfXkh7FA"},
 "speakout-portal-staging.firebaseapp.com":{project:"speakout-portal-staging",key:"AIzaSyAfe0T3E__vQBxZKQHpoiABrSXOfXkh7FA"}
};
const production={project:"speaakout-portal",key:"AIzaSyARxKEaNvQhl4ZPKj4ZRxA0boiZJGqNOQ4"};
export const getProject=hostname=>firebaseProjects[hostname]||production;
const scalar=value=>{
 if(!value||typeof value!=="object")return null;
 if("stringValue" in value)return value.stringValue;
 if("booleanValue" in value)return value.booleanValue;
 if("integerValue" in value)return Number(value.integerValue);
 if("doubleValue" in value)return value.doubleValue;
 if("nullValue" in value)return null;
 if("arrayValue" in value)return (value.arrayValue.values||[]).map(scalar);
 if("mapValue" in value)return Object.fromEntries(Object.entries(value.mapValue.fields||{}).map(([k,v])=>[k,scalar(v)]));
 return null;
};
export const decodeDocument=document=>Object.fromEntries(Object.entries(document?.fields||{}).map(([k,v])=>[k,scalar(v)]));
const validId=id=>/^[A-Za-z0-9_-]{11}$/.test(id||"");
export function mergeKiddiesCatalogue(legacy,remote,hidden=[]){
 const excluded=new Set(hidden.filter(validId));
 const byId=new Map();
 for(const item of legacy)if(validId(item?.youtubeId)&&!excluded.has(item.youtubeId))byId.set(item.youtubeId,item);
 for(const item of remote){
  if(validId(item?.youtubeId)&&item.status==="published"&&item.approved===true&&item.reviewConfirmed===true)byId.set(item.youtubeId,{
   approved:true,title:item.title,category:item.category,ages:item.ages,youtubeId:item.youtubeId,source:item.source,description:item.description
  });
 }
 return [...byId.values()];
}
/* A missing config is the ONLY allowed legacy fallback. Any other Firestore
 * failure rejects loading rather than resurfacing a removed/unsafe video. */
export async function loadKiddiesTvCatalogue({fetcher=fetch,hostname=location.hostname}={}){
 const r=await fetcher("data/kiddies-tv-approved.json",{cache:"no-store"});
 if(!r.ok)throw Error("Video library unavailable");
 const legacy=await r.json();if(!Array.isArray(legacy))throw Error("Invalid video catalogue");
 const {project,key}=getProject(hostname);
 const root="https://firestore.googleapis.com/v1/projects/"+encodeURIComponent(project)+"/databases/(default)/documents";
 const config=await fetcher(root+"/kiddiesTvConfig/live?key="+encodeURIComponent(key),{cache:"no-store"});
 if(config.status===404)return legacy;
 if(!config.ok)throw Error("The video library could not verify its publication settings.");
 const settings=decodeDocument(await config.json());
 if(settings.mode!=="overlay")throw Error("Unexpected Kiddies TV publication settings");
 if(!Array.isArray(settings.hiddenLegacyIds))throw Error("Invalid Kiddies TV publication settings");
 const response=await fetcher(root+":runQuery?key="+encodeURIComponent(key),{
  method:"POST",cache:"no-store",headers:{"Content-Type":"application/json"},
  body:JSON.stringify({structuredQuery:{from:[{collectionId:"kiddiesTvVideos"}],where:{fieldFilter:{field:{fieldPath:"status"},op:"EQUAL",value:{stringValue:"published"}}},limit:500}})
 });
 if(!response.ok)throw Error("The updated Kiddies TV library is temporarily unavailable.");
 const rows=await response.json();
 if(!Array.isArray(rows))throw Error("Invalid Kiddies TV response");
 return mergeKiddiesCatalogue(legacy,rows.filter(x=>x.document).map(x=>decodeDocument(x.document)),settings.hiddenLegacyIds);
}
