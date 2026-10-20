import { adminApi } from './platform-api.js?admin-traffic=20261019';
import { auth } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js';
const el=id=>document.getElementById(id),format=n=>Number.isSafeInteger(n)?n.toLocaleString():'—';
let allowed=false,generation=0,allowedUid=null;
function connectionMessage(report){
 if(report.status==='not_configured')return 'MindCheck reporting needs its one-time private connection. Portal sign-in reporting works independently. See connection instructions below.';
 const messages={
  provider_unauthorized:'MindCheck analytics rejected the saved connection (401). The owner needs to verify the GoatCounter token for the MindCheck site in the Worker secret. Never paste it into this page.',
  provider_blocked:'MindCheck analytics blocked the reporting server before returning an API response. The owner needs to check provider access or security settings.',
  provider_forbidden:'MindCheck analytics denied the statistics request (403). The owner needs to check the token’s Read statistics permission and access to the MindCheck site.',
  provider_rate_limited:'MindCheck analytics is rate-limiting requests (429). Wait a minute before refreshing.',
  provider_bad_request:'MindCheck analytics rejected the reporting request. The API date range and request format need checking.',
  provider_redirect:'MindCheck analytics redirected the request. The saved site address needs checking; credentials were not forwarded.',
  provider_response:'MindCheck analytics returned an unexpected response. Its figures could not be validated; this does not mean zero visits.',
  provider_timeout:'MindCheck analytics did not respond in time. Try refreshing shortly.',
  provider_network:'The reporting server could not reach MindCheck analytics. Try refreshing shortly.',
  provider_http:'MindCheck analytics returned a service error. Try refreshing shortly.'
 };
 return messages[report.reason]||'MindCheck reporting is temporarily unavailable. Try refreshing shortly.';
}
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
  el('connection').hidden=mindcheck.status==='ready';el('connection').textContent=connectionMessage(mindcheck);
  el('login-status').hidden=logins.status==='ready'&&!logins.truncated;el('login-status').textContent=logins.truncated?'This period exceeds 10,000 recorded sign-ins. Portal totals shown are partial; select a shorter period.':'Portal sign-in reporting is temporarily unavailable. Try refreshing shortly.';
  el('pages').replaceChildren();for(const page of mindcheck.pages||[]){const row=document.createElement('tr');for(const value of [page.path,format(page.visits)]){const cell=document.createElement('td');cell.textContent=value;row.append(cell)}el('pages').append(row)}
  el('pages-status').textContent=(mindcheck.pagesStatus||mindcheck.status)!=='ready'?'Page figures will appear when reporting is available.':mindcheck.pages.length?(mindcheck.more?'Showing the leading public pages.':''):'No public page visits recorded in this period.';
  el('activity').replaceChildren();const daily=logins.daily||[],max=Math.max(1,...daily.map(d=>d.signIns));for(const day of daily){const item=document.createElement('li'),date=document.createElement('span'),bar=document.createElement('meter'),value=document.createElement('strong');date.textContent=day.day;bar.min=0;bar.max=max;bar.value=day.signIns;bar.setAttribute('aria-label',day.day+' sign-ins');value.textContent=format(day.signIns);item.append(date,bar,value);el('activity').append(item)}
  el('activity-status').textContent=logins.status!=='ready'?'Activity is currently unavailable.':daily.length?'':'No new portal sign-ins recorded in this period.';
  el('status').textContent='Updated '+new Date(data.updatedAt).toLocaleString('en-GB',{timeZone:'Africa/Lagos'})+' · West Africa Time';el('report').hidden=false;
 }catch(error){if(turn===generation){
  const message=String(error?.message||'');
  if(/support (mode|session|school)|selected support school/i.test(message))el('status').textContent='Exit school support mode in the Command Centre, then refresh this organisation report.';
  else if(error?.status===401)el('status').textContent='Your session needs to be renewed. Sign out, sign in again, then reopen Traffic & sign-ins. (401)';
  else if(error?.status===403&&error?.responseType&&!error.responseType.includes('application/json'))el('status').textContent='The reporting request was blocked before it reached the API. The production API access settings need checking. (403)';
  else if(error?.status===403)el('status').textContent='The reporting service could not confirm organisation administrator access. Open the Command Centre to check your account. (403)';
  else if(error?.status===404)el('status').textContent='The reporting endpoint is unavailable. The production API deployment needs checking. (404)';
  else if(error?.status>=500)el('status').textContent='The reporting service encountered a server error. Please try again shortly. ('+error.status+')';
  else if(error instanceof TypeError)el('status').textContent='The reporting service could not be reached. Check your connection and try again. If this persists, its network or browser access needs checking.';
  else el('status').textContent='Unable to load the report. The reporting response needs checking; your administrator access has not been determined by this error.';
 }}
 finally{if(turn===generation&&allowed){el('refresh').disabled=false;el('period').disabled=false}}
}
el('period').addEventListener('change',load);el('refresh').addEventListener('click',load);
export function startTrafficReport(){allowedUid=auth.currentUser?.uid;allowed=Boolean(allowedUid);load()}
