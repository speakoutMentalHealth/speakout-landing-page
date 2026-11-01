#!/usr/bin/env node
/* Discover metadata for owner-shared videos; NEVER publishes or approves content. */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const input=JSON.parse(readFileSync('docs/kiddies-tv-user-submitted-african-videos-20261101.json','utf8'));
const outDir='artifacts/kiddies-tv-user-submissions';mkdirSync(outDir,{recursive:true});
async function oembed(v){
 const endpoint='https://www.youtube.com/oembed?url='+encodeURIComponent('https://www.youtube.com/watch?v='+v.youtubeId)+'&format=json';
 try{
  const response=await fetch(endpoint,{signal:AbortSignal.timeout(12000),headers:{'User-Agent':'Mozilla/5.0 SpeakOutKiddiesTVEditorialPreflight/1.0'}});
  if(!response.ok)return {reviewId:v.reviewId,youtubeId:v.youtubeId,status:'metadata_unavailable',httpStatus:response.status,approved:false};
  const j=await response.json();
  return {reviewId:v.reviewId,youtubeId:v.youtubeId,status:'oembed_available',title:j.title||null,channel:j.author_name||null,provider:j.provider_name||null,approved:false,fullMediaViewed:false,embedVerified:false,captionVerified:false};
 }catch(e){return {reviewId:v.reviewId,youtubeId:v.youtubeId,status:'metadata_unavailable',error:e?.name||'request_failed',approved:false};}
}
const results=await Promise.all(input.videos.map(oembed));
const curated=JSON.parse(readFileSync('docs/kiddies-tv-geography-coding-age-curation-20261101.json','utf8'));
const curatedResults=[];
for(let i=0;i<curated.candidates.length;i+=5){
 const batch=await Promise.all(curated.candidates.slice(i,i+5).map(item=>oembed({reviewId:item.reviewId,youtubeId:item.youtubeId})));
 curatedResults.push(...batch);
}
let playlist={playlistId:input.playlist.playlistId,status:'discovery_unavailable',items:[],limitedTo:30};
const command=spawnSync('yt-dlp',['--flat-playlist','--playlist-items','1:30','--dump-single-json','--skip-download','--no-warnings','--socket-timeout','12',input.playlist.url],{encoding:'utf8',timeout:90000,maxBuffer:3*1024*1024});
if(command.status===0){
 try{
  const j=JSON.parse(command.stdout);
  const entries=Array.isArray(j.entries)?j.entries:[];
  playlist={playlistId:input.playlist.playlistId,status:'discovered',title:j.title||null,channel:j.channel||j.uploader||null,totalCount:Number.isInteger(j.playlist_count)?j.playlist_count:null,limitedTo:30,items:entries.filter(x=>x&&/^[A-Za-z0-9_-]{11}$/.test(x.id||'')).map(x=>({youtubeId:x.id,title:x.title||null,channel:x.channel||x.uploader||null,approvalStatus:'pending_full_review'}))};
 }catch(e){playlist.error='Could not parse playlist metadata';}
}else{playlist.error='Playlist metadata fetch unavailable; no item claims made';}
const data={generatedAt:new Date().toISOString(),submittedSingleVideos:results.length,singleVideoMetadataAvailable:results.filter(v=>v.status==='oembed_available').length,curatedTotal:curatedResults.length,curatedMetadataAvailable:curatedResults.filter(v=>v.status==='oembed_available').length,playlist,results,curatedResults,allUnapproved:true};
writeFileSync(outDir+'/preflight.json',JSON.stringify(data,null,2)+'\n');
const lines=[
 '## Kiddies TV: owner-shared videos review-only preflight',
 '- Single video IDs: '+data.submittedSingleVideos,
 '- Verified YouTube metadata: '+data.singleVideoMetadataAvailable,
 '- Additional geography and coding candidates: '+data.curatedTotal+'; metadata verified: '+data.curatedMetadataAvailable,
 '- Playlist discovery: '+playlist.status+'; identified items: '+playlist.items.length,
 '- **No video approved or published, and no complete video was watched.**',
 '',
 '| ID | YouTube ID | Status | YouTube title | Channel |',
 '|---|---|---|---|---|',
 ...results.map(v=>'| '+[v.reviewId,v.youtubeId,v.status,(v.title||'').replaceAll('|','/'),(v.channel||'').replaceAll('|','/')].join(' | ')+' |'),
 '',
 '### Discovered playlist items (up to first 30)',
 '| ID | Title |',
 '|---|---|',
 ...playlist.items.map(v=>'| '+[v.youtubeId,(v.title||'').replaceAll('|','/')].join(' | ')+' |'),
 '',
 '### Age-graded geography and coding candidates',
 '| ID | YouTube ID | Metadata | Title | Channel |',
 '|---|---|---|---|---|',
 ...curatedResults.map(v=>'| '+[v.reviewId,v.youtubeId,v.status,(v.title||'').replaceAll('|','/'),(v.channel||'').replaceAll('|','/')].join(' | ')+' |'),
 ''
];
const summary=lines.join('\n');
console.log(summary);
if(process.env.GITHUB_STEP_SUMMARY)writeFileSync(process.env.GITHUB_STEP_SUMMARY,summary+'\n',{flag:'a'});
