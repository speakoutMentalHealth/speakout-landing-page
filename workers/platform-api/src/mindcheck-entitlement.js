// Server-only signed adult entitlement. Never expose AGE_AUTH_SECRET to the browser.
// Token format: base64url(payload).base64url(HMAC-SHA256(payload)).
// Provision tokens only after a trusted age/consent workflow; this module does NOT verify identity.
const encoder=new TextEncoder();
function b64url(bytes){return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function unb64url(value){if(!/^[A-Za-z0-9_-]+$/.test(value))throw Error('Invalid token');return Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));}
async function key(secret){return crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
export async function issueAdultToken(secret,{subject,expiresAt}){
 if(typeof secret!=='string'||secret.length<32||typeof subject!=='string'||!subject||!Number.isSafeInteger(expiresAt))throw Error('Invalid entitlement');
 const payload=b64url(encoder.encode(JSON.stringify({sub:subject,band:'adult',exp:expiresAt})));
 const signature=b64url(new Uint8Array(await crypto.subtle.sign('HMAC',await key(secret),encoder.encode(payload))));
 return payload+'.'+signature;
}
export async function verifyAdultToken(secret,token,now=Math.floor(Date.now()/1000)){
 if(typeof secret!=='string'||secret.length<32||typeof token!=='string'||token.length>2048)return false;
 const parts=token.split('.');if(parts.length!==2)return false;
 try{
  const valid=await crypto.subtle.verify('HMAC',await key(secret),unb64url(parts[1]),encoder.encode(parts[0]));
  if(!valid)return false;
  const data=JSON.parse(new TextDecoder().decode(unb64url(parts[0])));
  return data.band==='adult'&&typeof data.sub==='string'&&data.sub.length>0&&Number.isSafeInteger(data.exp)&&data.exp>now&&data.exp<=now+86400;
 }catch{return false;}
}
