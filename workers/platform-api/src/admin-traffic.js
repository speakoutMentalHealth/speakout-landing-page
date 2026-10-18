/* Only aggregate projections leave this module. Provider credentials stay in Worker secrets. */
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const number=value=>Number.isSafeInteger(value)&&value>=0?value:null;
export function trafficWindow(period='day',now=new Date()){
 if(!['day','week','month'].includes(period))throw fail('Choose day, week or month.');
 const count={day:1,week:7,month:30}[period];
 const local=new Date(now.getTime()+3600000),today=local.toISOString().slice(0,10);
 const midnight=Date.parse(today+'T00:00:00Z')-3600000;
 const start=new Date(midnight-(count-1)*86400000),end=new Date(midnight+86400000);
 return {period,days:count,start:start.toISOString(),end:end.toISOString(),timezone:'Africa/Lagos'};
}
export async function signInReceipt(identity,now=Date.now(),project=''){
 const seconds=Number(identity.authTime),time=seconds*1000;
 if(!identity.uid||!Number.isSafeInteger(seconds)||seconds<=0||time>now+60000||now-time>900000)return null;
 const hash=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),v=>v.toString(16).padStart(2,'0')).join('');
 const accountKey=await hash(project+':'+identity.uid),id=await hash(accountKey+':'+seconds);
 return {id,data:{accountKey,authenticatedAt:new Date(time).toISOString(),day:new Date(time+3600000).toISOString().slice(0,10)}};
}
export function loginSummary(records,truncated=false){
 const accounts=new Set(),days=new Map();
 for(const record of records){if(!record.accountKey||!/^\d{4}-\d{2}-\d{2}$/.test(record.day))continue;accounts.add(record.accountKey);days.set(record.day,(days.get(record.day)||0)+1)}
 return {status:'ready',signIns:[...days.values()].reduce((a,b)=>a+b,0),accounts:accounts.size,truncated:Boolean(truncated),daily:[...days].sort(([a],[b])=>a.localeCompare(b)).map(([day,signIns])=>({day,signIns}))};
}
export async function mindCheckSummary(env,window,request=fetch){
 if(!env.GOATCOUNTER_READ_TOKEN)return {status:'not_configured',visits:null,pages:[]};
 const options={headers:{Authorization:`Bearer ${env.GOATCOUNTER_READ_TOKEN}`,'Content-Type':'application/json'},redirect:'error',signal:AbortSignal.timeout(10000)};
 try{
  const query=new URLSearchParams({start:window.start,end:window.end});
  const origin='https://mindcheck.goatcounter.com/api/v0/stats/';
  const [totalResponse,pagesResponse]=await Promise.all([request(origin+'total?'+query,options),request(origin+'hits?'+query+'&limit=10',options)]);
  if(!totalResponse.ok||!pagesResponse.ok)return {status:'unavailable',visits:null,pages:[]};
  const [total,pages]=await Promise.all([totalResponse.json(),pagesResponse.json()]);
  const visits=number(total.total);if(visits===null||!Array.isArray(pages.hits))throw Error('Invalid provider data');
  return {status:'ready',visits,pages:pages.hits.filter(p=>p.event!==true&&/^\/[a-z0-9-]+\.html$/.test(p.path)&&number(p.count)!==null).slice(0,10).map(p=>({path:p.path,visits:p.count})),more:pages.more===true};
 }catch{return {status:'unavailable',visits:null,pages:[]}}
}
