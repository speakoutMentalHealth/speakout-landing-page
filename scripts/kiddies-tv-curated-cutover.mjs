#!/usr/bin/env node
/* Safe and reversible full-curriculum replacement gate. Never deploys. */
import {readFileSync,writeFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const policy=read('data/kiddies-tv-curriculum.json');
const staged=read('docs/kiddies-tv-replacement-staging-20261101.json');
const backup=read('docs/kiddies-tv-legacy-catalogue-20261101.json');
const target='data/kiddies-tv-approved.json',old=read(target),queued=staged.newVideos;
const allowed=new Set(policy.subjects.map(s=>s.id)),ages=['3-5','6-9','10-12','13-17'];
const failures=[];
const check=(condition,message)=>{if(!condition)failures.push(message);};
check(JSON.stringify(backup.videos)===JSON.stringify(old),'Legacy archive and current public catalogue differ; reconcile before replacement.');
check(Array.isArray(queued),'Replacement staging must contain newVideos array.');
const ids=new Set();
for(const [i,v] of (Array.isArray(queued)?queued:[]).entries()){
 const id=v.youtubeId||'(missing)';
 check(v.approved===true,i+': '+id+': not explicitly approved');
 check(/^[A-Za-z0-9_-]{11}$/.test(id),i+': invalid YouTube ID');
 check(!ids.has(id),i+': duplicate ID '+id);ids.add(id);
 check(typeof v.title==='string'&&v.title.trim().length>4&&v.title.length<=160,i+': missing exact title');
 check(typeof v.source==='string'&&Boolean(v.source.trim()),i+': missing publisher');
 check(typeof v.description==='string'&&v.description.trim().length>=15&&v.description.length<=250,i+': missing description');
 check(allowed.has(v.category),i+': unsupported subject category');
 check(Array.isArray(v.ages)&&v.ages.length>0&&v.ages.every(x=>ages.includes(x)),i+': unsupported age group; infants cannot receive a video');
 const review=v.review||{};
 for(const key of policy.sourcePolicy.reviewRequirements){
  if(key==='namedReviewerAndDate'){
   check(typeof review.reviewer==='string'&&review.reviewer.trim().length>2&&typeof review.reviewedAt==='string'&&!Number.isNaN(Date.parse(review.reviewedAt)),i+': missing named reviewer/date');
  }else check(review[key]===true,i+': incomplete review: '+key);
 }
 check(review.decision==='approved',i+': missing explicit reviewer decision');
 check(review.embeddable===true,i+': embed not verified');
}
const needed=policy.cutoverCriteria,items=Array.isArray(queued)?queued:[];
check(items.length>=needed.minUniqueNewVideos,'Need at least '+needed.minUniqueNewVideos+' signed-off replacement videos; currently '+items.length);
for(const age of ages){
 const n=items.filter(x=>Array.isArray(x.ages)&&x.ages.includes(age)).length;
 check(n>=needed.minPerVideoAgeBand,age+' has '+n+' videos; minimum '+needed.minPerVideoAgeBand);
}
for(const subject of needed.requiredSubjects)check(items.some(x=>x.category===subject),'Missing required subject '+subject);
const report={currentPublic:old.length,legacyBackup:backup.videos.length,staged:items.length,ageCoverage:Object.fromEntries(ages.map(age=>[age,items.filter(x=>Array.isArray(x.ages)&&x.ages.includes(age)).length])),ready:failures.length===0,blockers:failures};
console.log(JSON.stringify(report,null,2));
if(failures.length){console.log('CUTOVER BLOCKED: live catalogue unchanged.');process.exit(0);}
if(process.argv.includes('--apply')){
 if(!process.argv.includes('--confirm=replace-legacy-kiddies-tv'))throw Error('Missing explicit confirm flag');
 const clean=items.map(({approved,title,category,ages,youtubeId,source,description})=>({approved,title,category,ages,youtubeId,source,description}));
 writeFileSync(target,JSON.stringify(clean,null,2)+'\n');
 console.log('Updated working tree ONLY: run tests, review diff, open PR. No deployment.');
}else console.log('DRY RUN: no file changes. Use --apply --confirm=replace-legacy-kiddies-tv after full reviews.');
