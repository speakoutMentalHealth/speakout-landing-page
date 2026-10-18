import { PLATFORM_API_BASE } from './platform-config.js';
const recorded=new Set();
export async function recordSignIn(user){
 if(!PLATFORM_API_BASE||!user)return;
 let key;
 try{
  const result=await user.getIdTokenResult(),time=Date.parse(result.authTime);
  if(!Number.isFinite(time)||Date.now()-time>900000||time>Date.now()+60000)return;
  key=user.uid+':'+result.authTime;if(recorded.has(key))return;recorded.add(key);
  const response=await fetch(PLATFORM_API_BASE+'/v1/auth/sign-in',{method:'POST',credentials:'omit',headers:{Authorization:'Bearer '+result.token,'Content-Type':'application/json'},body:'{}'});
  if(!response.ok)recorded.delete(key);
 }catch{if(key)recorded.delete(key);/* Reporting must never interrupt sign-in or logout. */}
}
