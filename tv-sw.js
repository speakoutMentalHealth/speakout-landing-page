const CACHE="speakout-tv-v12";
const STATIC=[
 "./tv.html","./radio.html","./tv-search.html","./show.html","./watch.html","./tv-privacy.html","./tv.webmanifest",
 "./css/tv/tokens.css","./css/tv/base.css","./css/tv/art.css","./css/tv/home.css","./css/tv/media.css","./css/tv/discover.css","./images/logo.png","./tv.webmanifest","./firebase-config.js",
 "./js/speakout-tv.js","./js/speakout-radio.js","./js/tv-search.js","./js/tv-show.js","./js/tv-watch.js","./js/tv-art.js","./js/tv-data.js","./js/tv-rail-controls.js","./js/platform-config.js"
];

self.addEventListener("install",event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(STATIC)).then(()=>self.skipWaiting()));
});

self.addEventListener("activate",event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});

self.addEventListener("fetch",event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=="GET"||url.origin!==location.origin)return;

 event.respondWith(
  fetch(event.request).then(response=>{
   if(response.ok&&["style","script","image","document"].includes(event.request.destination)){
    const copy=response.clone();
    caches.open(CACHE).then(cache=>cache.put(event.request,copy));
   }
   return response;
  }).catch(async()=>{
   const cached=await caches.match(event.request,{ignoreSearch:event.request.mode==="navigate"});
   if(cached)return cached;
   if(event.request.mode==="navigate")return caches.match("./tv.html");
   return Response.error();
  })
 );
});