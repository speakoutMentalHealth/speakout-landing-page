import { adminApi } from './platform-api.js';
import { auth } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js';
const el=id=>document.getElementById(id),format=n=>Number.isSafeInteger(n)?n.toLocaleString():'—';
let allowed=false,generation=0,allowedUid=null;
function clear(){generation++;el('report').hidden=true;for(const id of ['visits','signins','accounts'])el(id).textContent='—';el('pages').replaceChildren();el('activity').replaceChildren()}
onAuthStateChanged(auth,user=>{if(allowed&&user?.uid===allowedUid)return;allowed=false;allowedUid=null;clear();el('period').disabled=true;el('refresh').disabled=true});
async function load(){
 if(!allowed)return;
 const turn=++generation,user=auth.currentUser;
 el('refresh').disabled=true;el('period').disabled=true;el('status').textContent='Loading your traffic report…';el('report').hidden=true;
 try{
  const data=await adminApi.trafficSummary(el('period').value);
  if(turn!==generation||auth.currentUser!==user||!allowed)return;
  const {mindcheck,logins}=data;
  el('visits').textContent=format(mindcheck.visits);el('signins').textContent=format(logins.signIns);el('accounts').textContent=format(logins.accounts);
  el('connection').hidden=mindcheck.status==='ready';el('connection').textContent=mindcheck.status==='not_configured'?'MindCheck reporting needs its one-time private connection. Portal sign-in reporting works independently. See connection instructions below.':'MindCheck reporting is temporarily unavailable. Try refreshing shortly.';
  el('login-status').hidden=logins.status==='ready'&&!logins.truncated;el('login-status').textContent=logins.truncated?'This period exceeds 10,000 recorded sign-ins. Portal totals shown are partial; select a shorter period.':'Portal sign-in reporting is temporarily unavailable. Try refreshing shortly.';
  el('pages').replaceChildren();for(const page of mindcheck.pages||[]){const row=document.createElement('tr');for(const value of [page.path,format(page.visits)]){const cell=document.createElement('td');cell.textContent=value;row.append(cell)}el('pages').append(row)}
  el('pages-status').textContent=mindcheck.status!=='ready'?'Page figures will appear when reporting is available.':mindcheck.pages.length?(mindcheck.more?'Showing the leading public pages.':''):'No public page visits recorded in this period.';
  el('activity').replaceChildren();const daily=logins.daily||[],max=Math.max(1,...daily.map(d=>d.signIns));for(const day of daily){const item=document.createElement('li'),date=document.createElement('span'),bar=document.createElement('meter'),value=document.createElement('strong');date.textContent=day.day;bar.min=0;bar.max=max;bar.value=day.signIns;bar.setAttribute('aria-label',day.day+' sign-ins');value.textContent=format(day.signIns);item.append(date,bar,value);el('activity').append(item)}
  el('activity-status').textContent=logins.status!=='ready'?'Activity is currently unavailable.':daily.length?'':'No new portal sign-ins recorded in this period.';
  el('status').textContent='Updated '+new Date(data.updatedAt).toLocaleString('en-GB',{timeZone:'Africa/Lagos'})+' · West Africa Time';el('report').hidden=false;
 }catch{if(turn===generation)el('status').textContent='Unable to load traffic. Check your administrator access and try again.'}
 finally{if(turn===generation&&allowed){el('refresh').disabled=false;el('period').disabled=false}}
}
el('period').addEventListener('change',load);el('refresh').addEventListener('click',load);
export function startTrafficReport(){allowedUid=auth.currentUser?.uid;allowed=Boolean(allowedUid);load()}
