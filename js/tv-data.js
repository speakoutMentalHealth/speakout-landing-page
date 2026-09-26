import {db} from "../firebase-config.js";
import {collection,getDocs,query,where} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
import {PLATFORM_API_BASE} from "./platform-config.js";

let tvPromise=null;
let audioPromise=null;

const publicStatus=value=>["active","published"].includes(String(value||"").toLowerCase());
const MEDIA_REQUEST_TIMEOUT_MS=7000;
function withTimeout(promise,ms=MEDIA_REQUEST_TIMEOUT_MS,message="Media request timed out."){
 return Promise.race([
  promise,
  new Promise((_,reject)=>setTimeout(()=>reject(new Error(message)),ms))
 ]);
}


async function apiGet(path){
 if(!PLATFORM_API_BASE)throw new Error("Public media API unavailable.");
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),MEDIA_REQUEST_TIMEOUT_MS);
 try{
  const response=await fetch(PLATFORM_API_BASE+path,{method:"GET",credentials:"omit",cache:"no-store",signal:controller.signal});
  if(!response.ok)throw new Error("Public media API request failed.");
  return response.json();
 }catch(error){
  if(error?.name==="AbortError")throw new Error("Public media API timed out.");
  throw error;
 }finally{
  clearTimeout(timer);
 }
}

async function firestorePublic(collectionName){
 const rows=[];
 const seen=new Set();
 const results=await Promise.allSettled([
  withTimeout(getDocs(query(collection(db,collectionName),where("status","==","published")))),
  withTimeout(getDocs(query(collection(db,collectionName),where("status","==","active"))))
 ]);
 for(const result of results){
  if(result.status!=="fulfilled")continue;
  result.value.forEach(doc=>{
   if(seen.has(doc.id))return;
   const item={id:doc.id,...doc.data()};
   if(publicStatus(item.status)){seen.add(doc.id);rows.push(item)}
  });
 }
 if(!rows.length&&results.every(result=>result.status==="rejected")){
  throw new Error("Public Firestore media query failed.");
 }
 return rows;
}

async function loadTvBundle(){
 if(!tvPromise)tvPromise=(async()=>{
  try{
   const body=await apiGet("/v1/media/tv");
   return {
    episodes:Array.isArray(body.episodes)?body.episodes:[],
    shows:Array.isArray(body.shows)?body.shows:[]
   };
  }catch{
   const [episodes,shows]=await Promise.all([
    firestorePublic("tvEpisodes").catch(()=>[]),
    firestorePublic("tvShows").catch(()=>[])
   ]);
   return {episodes,shows};
  }
 })();
 return tvPromise;
}

export async function loadTvEpisodes(){
 return (await loadTvBundle()).episodes;
}

export async function loadTvShows(){
 return (await loadTvBundle()).shows;
}

export async function loadTvAudio(){
 if(!audioPromise)audioPromise=(async()=>{
  try{
   const body=await apiGet("/v1/media/audio");
   return Array.isArray(body.items)?body.items:[];
  }catch{
   return firestorePublic("tvAudio").catch(()=>[]);
  }
 })();
 return audioPromise;
}

export function resetPublicMediaCache(){
 tvPromise=null;
 audioPromise=null;
}
