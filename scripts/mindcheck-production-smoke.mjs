// Temporary synthetic production account only. Never use or log a real user's tokens.
import {initializeApp,cert,deleteApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';import {getFirestore} from 'firebase-admin/firestore';
import {readFileSync} from 'node:fs';import {randomUUID,randomBytes} from 'node:crypto';
const credential=JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT||'{}');
if(credential.project_id!=='speaakout-portal')throw Error('Production project credential mismatch.');
const app=initializeApp({credential:cert(credential),projectId:'speaakout-portal'}),auth=getAuth(app),db=getFirestore(app);
const uid='mindcheck-ai-smoke-'+randomUUID(),email=uid+'@example.test',password=randomBytes(24).toString('base64url');let created=false;
const api='https://speakout-platform-api.speakout-platform-api.workers.dev',portal='https://speakoutmentalhealth.org',guide='https://mindcheck-guide.speakout-platform-api.workers.dev/';
async function post(url,body,token,origin=portal){return fetch(url,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)})}
try{
 await auth.createUser({uid,email,password,emailVerified:true});created=true;
 await db.doc('users/'+uid).set({uid,email,role:'volunteer',status:'approved',syntheticReleaseCheck:true});
 const key=/apiKey:\s*"([^"]+)"/.exec(readFileSync('js/firebase-config.js','utf8'))?.[1];if(!key)throw Error('Public Firebase config missing.');
 const login=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key='+key,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,returnSecureToken:true}),signal:AbortSignal.timeout(20000)});
 const session=await login.json();if(!login.ok||!session.idToken)throw Error('Synthetic Firebase sign-in failed.');
 let response=await post(api+'/v1/mindcheck/token',{consent:true},session.idToken);if(response.status!==403)throw Error('Unverified adult denial failed.');
 const now=Math.floor(Date.now()/1000);
 await db.doc('mindcheckAdultAccess/'+uid).set({subject:uid,status:'active',ageBand:'adult',reviewerId:'synthetic-release-check',verificationMethod:'synthetic-release-check',verifiedAt:now,expiresAt:now+600});
 response=await post(api+'/v1/mindcheck/token',{consent:true},session.idToken);const issued=await response.json();if(!response.ok||!issued.token)throw Error('Verified synthetic token issuance failed.');
 response=await post(guide,{question:'mood',language:'en',adult:true},issued.token,'https://mindcheck.speakoutmentalhealth.org');const answer=await response.json();
 console.log('Live generated-answer check:',JSON.stringify({source:answer.source,reason:answer.reason||null}));
 if(answer.source!=='gemini')throw Error('Verified Gemini generation did not succeed; inspect the safe reason above.');
 await db.doc('mindcheckAdultAccess/'+uid).update({status:'revoked'});
 response=await post(api+'/v1/mindcheck/token',{consent:true},session.idToken);if(response.status!==403)throw Error('Revoked access renewal denial failed.');
 console.log('PASS production synthetic Firebase sign-in, unverified denial, adult token delivery, Gemini answer and revocation.');
}finally{
 const results=await Promise.allSettled(['users','mindcheckAdultAccess','mindcheckAIConsents','mindcheckTokenLimits'].map(c=>db.doc(c+'/'+uid).delete()));
 if(created)results.push(await auth.deleteUser(uid).then(()=>({status:'fulfilled'}),()=>({status:'rejected'})));
 await deleteApp(app);if(results.some(r=>r.status==='rejected'))throw Error('Synthetic account cleanup needs attention.');
 console.log('Synthetic release account and records removed.');
}
