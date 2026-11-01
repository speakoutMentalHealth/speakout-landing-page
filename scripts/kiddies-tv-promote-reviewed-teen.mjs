#!/usr/bin/env node
/* Promote individually reviewed 13–17 videos to the approved-only catalogue.
 * Does nothing unless a named reviewer explicitly approves all required checks.
 * Usage: node scripts/kiddies-tv-promote-reviewed-teen.mjs [--apply]
 * --apply edits working-tree JSON only; release still needs PR + CI + deployment.
 */
import {readFileSync,writeFileSync} from 'node:fs';
const REVIEW_FILE='docs/kiddies-tv-teen-13-17-review-batch.json';
const PUBLIC_FILE='data/kiddies-tv-approved.json';
const reviews=JSON.parse(readFileSync(REVIEW_FILE,'utf8'));
const publicVideos=JSON.parse(readFileSync(PUBLIC_FILE,'utf8'));
const required=['watchComplete','ageAppropriate','accuracyVerified','languageReviewed','advertAndExternalLinkRisksReviewed','captionsVerified','fullscreenIOSVerified','fullscreenAndroidVerified','endScreenReviewed'];
const approvedReviews=reviews.filter(x=>x.review?.decision==='approved');
const existing=new Set(publicVideos.map(v=>v.youtubeId));
const toPublish=[];
for(const item of approvedReviews){
 const rv=item.review||{};
 if(!/^[A-Za-z0-9_-]{11}$/.test(item.youtubeId))throw Error(item.reviewId+': invalid YouTube ID');
 if(!item.proposedAges?.includes('13-17'))throw Error(item.reviewId+': not a teen candidate');
 if(!rv.reviewer||rv.reviewer.toLowerCase()==='your name'||!rv.reviewedAt||!Number.isFinite(Date.parse(rv.reviewedAt)))throw Error(item.reviewId+': missing named reviewer or valid timestamp');
 for(const key of required)if(rv[key]!==true)throw Error(item.reviewId+': review item not verified: '+key);
 if(item.youtubeMetadata?.embeddable!==true)throw Error(item.reviewId+': embed not verified');
 const title=item.youtubeMetadata?.title,source=item.youtubeMetadata?.channel,description=rv.publicDescription;
 if(typeof title!=='string'||!title.trim()||title.length>160||typeof source!=='string'||!source.trim()||typeof description!=='string'||description.trim().length<15||description.length>250)throw Error(item.reviewId+': missing exact title, channel or approved editorial description');
 if(existing.has(item.youtubeId))throw Error(item.reviewId+': duplicate video in public catalogue');
 existing.add(item.youtubeId);
 toPublish.push({approved:true,title,category:item.category,ages:['13-17'],youtubeId:item.youtubeId,source,description});
}
console.log('Passed complete review gates:',toPublish.length,'of',reviews.length,'candidates.');
if(process.argv.includes('--apply')){
 if(toPublish.length===0){console.log('No approved videos to publish; catalogue unchanged.');process.exit(0);}
 writeFileSync(PUBLIC_FILE,JSON.stringify([...publicVideos,...toPublish],null,2)+'\n');
 console.log('Working-tree catalogue updated; create a PR and run browser tests before deployment.');
}else{
 console.log('Dry run: no files changed. Pass --apply only after individual signed media reviews.');
}
