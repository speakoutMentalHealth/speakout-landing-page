import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadKiddiesTvCatalogue,mergeKiddiesCatalogue,decodeDocument, getProject} from '../js/kiddies-tv-data.js';
const legacy=JSON.parse(readFileSync('data/kiddies-tv-approved.json','utf8'));
const body=x=>new Response(JSON.stringify(x),{status:200,headers:{'content-type':'application/json'}});
const fields=data=>Object.fromEntries(Object.entries(data).map(([k,v])=>[k,Array.isArray(v)?{arrayValue:{values:v.map(x=>({stringValue:x}))}}:typeof v==='boolean'?{booleanValue:v}:{stringValue:v}]));
const fixture={youtubeId:'G0F2PiVP_FI',title:'African countries and cultures',description:'Explore African countries through an engaging educational song.',category:'Geography & Culture',source:'Bino and Fino',ages:['6-9'],approved:true,status:'published',reviewConfirmed:true};
const liveConfig={mode:'overlay',hiddenLegacyIds:[legacy[0].youtubeId]};
test('Public loader initially serves exactly the original catalogue when no Firestore configuration exists',async()=>{
 const fetcher=async url=>url.startsWith('data/')?body(legacy):new Response('{}',{status:404});
 const loaded=await loadKiddiesTvCatalogue({fetcher,hostname:'kiddies.test'});
 assert.deepEqual(loaded,legacy);
});
test('Published database additions and legacy removals take effect without a redeploy',async()=>{
 const fetcher=async(url,opts)=>{
  if(url.startsWith('data/'))return body(legacy);
  if(url.includes('/kiddiesTvConfig/live'))return body({fields:fields(liveConfig)});
  if(url.includes(':runQuery')){
   assert.equal(opts.method,'POST');
   const query=JSON.parse(opts.body);
   assert.equal(query.structuredQuery.where.fieldFilter.value.stringValue,'published');
   return body([{document:{fields:fields(fixture)}}]);
  }
  throw Error('Unknown URL '+url);
 };
 const loaded=await loadKiddiesTvCatalogue({fetcher,hostname:'speakoutmentalhealth.org'});
 assert.equal(loaded.length,legacy.length,'one old hidden, one vetted new added');
 assert(!loaded.some(x=>x.youtubeId===legacy[0].youtubeId));
 assert(loaded.some(x=>x.youtubeId===fixture.youtubeId&&x.category==='Geography & Culture'));
});
test('Database drafts and records without review confirmation never become public',()=>{
 const items=[{...fixture,status:'draft'}, {...fixture,youtubeId:'kB7qOJT5x1A',reviewConfirmed:false}];
 assert.equal(mergeKiddiesCatalogue([],items,[]).length,0);
});
test('Firestore outages and permission errors never resurrect a hidden legacy video',async()=>{
 const fetcher=async url=>url.startsWith('data/')?body(legacy):new Response('{}',{status:403});
 await assert.rejects(()=>loadKiddiesTvCatalogue({fetcher,hostname:'speakoutmentalhealth.org'}),/publication settings/);
 const unavailable=async url=>url.startsWith('data/')?body(legacy):url.includes('kiddiesTvConfig')?body({fields:fields(liveConfig)}):new Response('{}',{status:500});
 await assert.rejects(()=>loadKiddiesTvCatalogue({fetcher:unavailable,hostname:'speakoutmentalhealth.org'}),/temporarily unavailable/);
});
test('Editorial database rules prevent public draft reads and non-admin mutations',()=>{
 const rules=readFileSync('firebase/firestore.rules','utf8');
 assert(rules.includes('match /kiddiesTvVideos/{videoId}'));
 assert(rules.includes("resource.data.status == 'published'"));
 assert(rules.includes('allow create, update: if isSuperAdmin() && validKiddiesVideo(videoId)'));
 assert(rules.includes('allow delete: if false'));
 assert(rules.includes("v.reviewConfirmed == true"));
 assert(rules.includes('match /kiddiesTvConfig/{configId}'));
});
test('Admin studio supplies manual moderation and a video-editable source-of-truth',()=>{
 const page=readFileSync('admin-kiddies-tv.html','utf8'),admin=readFileSync('js/kiddies-tv-admin.js','utf8');
 assert(page.includes('id="video-form"')&&page.includes('id="video-reviewed"'));
 assert(page.includes('id="video-status"')&&page.includes('id="video-category"'));
 assert(admin.includes("requireRoles(['admin','super_admin']"));
 assert(admin.includes('runTransaction(db,async transaction=>'));
 assert(admin.includes("mode:'overlay'"));
 assert(admin.includes("hiddenLegacyIds:hiddenIds"));
 assert(admin.includes("status:target,approved:false"));
 assert(admin.includes('if(state===\'published\'&&(!reviewConfirmed||reviewer.length<3||!reviewDate))'));
});
test('Every stage is reversible and learner-facing source code references new managed assets',()=>{
 const publicPage=readFileSync('kiddies-tv.html','utf8'),watchPage=readFileSync('kiddies-tv-watch.html','utf8');
 assert(publicPage.includes('js/kiddies-tv-managed-20261101.js'));
 assert(watchPage.includes('js/kiddies-tv-watch-managed-20261101.js'));
 assert.equal(readFileSync('js/kiddies-tv-library.js','utf8'),readFileSync('js/kiddies-tv-managed-20261101.js','utf8'));
 assert.equal(readFileSync('js/kiddies-tv-watch.js','utf8'),readFileSync('js/kiddies-tv-watch-managed-20261101.js','utf8'));
 assert.equal(getProject('speakout-portal-staging.web.app').project,'speakout-portal-staging');
 assert.equal(getProject('speakoutmentalhealth.org').project,'speaakout-portal');
});
