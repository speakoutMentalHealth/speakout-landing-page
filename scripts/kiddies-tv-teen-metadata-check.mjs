#!/usr/bin/env node
/* Metadata preflight only. Never changes publication approvals. */
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
const candidates=JSON.parse(readFileSync('docs/kiddies-tv-teen-13-17-review-batch.json','utf8'));
const result=[];
async function check(video){
 const url='https://www.youtube.com/oembed?url='+encodeURIComponent('https://www.youtube.com/watch?v='+video.youtubeId)+'&format=json';
 const signal=AbortSignal.timeout(9000);
 try{
  const response=await fetch(url,{signal,headers:{'User-Agent':'Mozilla/5.0 SpeakOutEditorialReview/1.0'}});
  if(!response.ok)return {reviewId:video.reviewId,youtubeId:video.youtubeId,status:'metadata_unavailable',httpStatus:response.status,publisherVerified:false,approved:false};
  const data=await response.json();
  return {reviewId:video.reviewId,youtubeId:video.youtubeId,status:'oembed_metadata_available',exactTitle:data.title||null,channel:data.author_name||null,provider:data.provider_name||null,videoUrl:'https://www.youtube.com/watch?v='+video.youtubeId,approved:false,fullWatchVerified:false,captionsVerified:false,embedPlaybackVerified:false};
 }catch(e){return {reviewId:video.reviewId,youtubeId:video.youtubeId,status:'metadata_unavailable',reason:e.name==='TimeoutError'?'timeout':'network_or_provider_restriction',approved:false};}
}
for(let i=0;i<candidates.length;i+=3){const batch=await Promise.all(candidates.slice(i,i+3).map(check));result.push(...batch);}
const available=result.filter(x=>x.status==='oembed_metadata_available').length;
mkdirSync('artifacts/kiddies-tv-teen',{recursive:true});
writeFileSync('artifacts/kiddies-tv-teen/metadata-preflight.json',JSON.stringify({generatedAt:new Date().toISOString(),total:result.length,metadataAvailable:available,allStillUnapproved:true,results:result},null,2)+'\n');
const summary=[
 '# Kiddies TV: teen video metadata preflight',
 '',
 '- '+result.length+' videos in manual review queue (ages 13–17).',
 '- '+available+' with accessible YouTube oEmbed metadata from this GitHub runner.',
 '- **Zero approvals made.** Metadata cannot establish suitability, availability on iPhone, closed captions, ad content, completeness, or true iframe playback.',
 '',
 '| ID | YouTube ID | Preflight | Title | Channel |',
 '| --- | --- | --- | --- | --- |',
 ...result.map(v=>'| '+[v.reviewId,v.youtubeId,v.status,(v.exactTitle||'').replaceAll('|','/'),(v.channel||'').replaceAll('|','/')].join(' | ')+' |'),
 '','Reviewer must watch 100% and record the signed release decision before publication.'
].join('\n');
if(process.env.GITHUB_STEP_SUMMARY)writeFileSync(process.env.GITHUB_STEP_SUMMARY,summary+'\n',{flag:'a'});
console.log(summary);
