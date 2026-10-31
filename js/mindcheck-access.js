import {auth} from '../firebase-config.js';
import {onAuthStateChanged,signInWithEmailAndPassword,signInWithPopup,GoogleAuthProvider,signOut} from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js';
import {platformRequest} from './platform-api.js';
const $=id=>document.getElementById(id),origin='https://mindcheck.speakoutmentalhealth.org',rid=new URL(location.href).searchParams.get('rid');
const say=message=>{$('status').textContent=message};
const run=fn=>async e=>{e?.preventDefault();try{await fn()}catch(error){say(error.message||'Unable to continue. Please try again.')}};
onAuthStateChanged(auth,async user=>{$('signIn').hidden=!!user;$('access').hidden=!user;$('account').textContent=user?'Signed in as '+(user.email||'SpeakOut member'):'';if(!user)$('consent').checked=false;else if(window.opener&&rid){try{const state=await platformRequest('/v1/mindcheck/status');if(state.eligible&&state.consentApproved){$('consent').checked=true;$('continue').click();}}catch(error){say(error.message)}}});
$('google').onclick=run(()=>signInWithPopup(auth,new GoogleAuthProvider()));
$('emailForm').onsubmit=run(()=>signInWithEmailAndPassword(auth,$('email').value,$('password').value));
$('logout').onclick=run(()=>signOut(auth));
$('continue').onclick=run(async()=>{
 if(!window.opener||!rid||!/^[a-f0-9-]{36}$/.test(rid))throw Error('Open AI access from the MindCheck guide to continue.');
 if(!$('consent').checked)throw Error('Please review and accept the AI-use notice.');
 $('continue').disabled=true;
 try{const result=await platformRequest('/v1/mindcheck/token',{consent:true});window.opener.postMessage({type:'mindcheck-adult-token',rid,token:result.token,expiresAt:result.expiresAt},origin);say('Access confirmed. You can return to MindCheck.');window.close()}finally{$('continue').disabled=false}
});
