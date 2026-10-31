import {issueAdultToken} from './mindcheck-entitlement.js';
const fail=(message,status=403)=>{throw Object.assign(Error(message),{status})};
export function eligibleGrant(grant,uid,now){return !!grant&&grant.subject===uid&&grant.status==='active'&&grant.ageBand==='adult'&&!!grant.reviewerId&&!!grant.verificationMethod&&Number.isSafeInteger(grant.verifiedAt)&&grant.verifiedAt<=now&&Number.isSafeInteger(grant.expiresAt)&&grant.expiresAt>now;}
export async function pilotRoute({path,data,user,env,get,transaction,now=Math.floor(Date.now()/1000)}){
 const uid=user.uid;
 if(path==='/v1/admin/mindcheck/access'){
  if((user.profile.actualRole||user.profile.role)!=='super_admin')fail('Super Admin required.');
  if(!/^[A-Za-z0-9_-]{5,128}$/.test(data.uid||''))fail('Valid account UID required.',400);
  const profile=await get('users/'+data.uid);
  if(profile?.status!=='approved')fail('An approved account is required.');
  if(data.action==='read')return {grant:await get('mindcheckAdultAccess/'+data.uid)};
  if(!['grant','revoke'].includes(data.action))fail('Invalid access action.',400);
  if(data.action==='grant'&&(data.adultVerified!==true||!['in_person_review','verified_existing_record'].includes(data.verificationMethod)))fail('Documented adult verification is required.',400);
  return transaction(async tx=>{
   const current=await tx.get('mindcheckAdultAccess/'+data.uid);
   const grant={subject:data.uid,status:data.action==='grant'?'active':'revoked',ageBand:'adult',reviewerId:uid,verificationMethod:data.verificationMethod||current?.verificationMethod||'revoked',verifiedAt:now,expiresAt:now+30*86400,version:(current?.version||0)+1};
   tx.set('mindcheckAdultAccess/'+data.uid,grant);
   tx.set('mindcheckAccessAudits/'+crypto.randomUUID(),{subject:data.uid,reviewerId:uid,action:data.action,at:now,version:grant.version});
   return {grant};
  });
 }
 if(path==='/v1/mindcheck/status'){
  const grant=await get('mindcheckAdultAccess/'+uid),consent=await get('mindcheckAIConsents/'+uid);
  return {eligible:eligibleGrant(grant,uid,now),consentApproved:consent?.version==='platform-help-v1'};
 }
 if(path==='/v1/mindcheck/token'){
  if(data.consent!==true)fail('Consent is required.',400);
  if(typeof env.AGE_AUTH_SECRET!=='string'||env.AGE_AUTH_SECRET.length<32)fail('AI access is not configured yet.',503);
  return transaction(async tx=>{
   const grant=await tx.get('mindcheckAdultAccess/'+uid);
   const count=await tx.get('mindcheckTokenLimits/'+uid);
   if(!eligibleGrant(grant,uid,now))fail('Verified adult pilot approval is required. Contact SpeakOut.');
   const window=Math.floor(now/60),used=count?.window===window?count.used:0;
   if(used>=10)fail('Please wait a minute before trying again.',429);
   const expiresAt=Math.min(now+300,grant.expiresAt);
   const token=await issueAdultToken(env.AGE_AUTH_SECRET,{subject:uid,expiresAt});
   tx.set('mindcheckTokenLimits/'+uid,{window,used:used+1});
   tx.set('mindcheckAIConsents/'+uid,{subject:uid,version:'platform-help-v1',at:now});
   return {token,expiresAt};
  });
 }
 fail('Endpoint not found.',404);
}
