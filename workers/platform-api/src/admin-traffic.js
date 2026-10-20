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
// Never return provider bodies, headers, token values or raw error messages.
function providerFailure(response){
 const status=Number(response?.status);
 const type=response?.headers?.get?.('content-type')||'';
 if([401,403].includes(status)&&type&&!type.includes('application/json'))return {reason:'provider_blocked',providerStatus:status};
 const reason=status===401?'provider_unauthorized':status===403?'provider_forbidden':status===429?'provider_rate_limited':status>=300&&status<400?'provider_redirect':status===400||status===422?'provider_bad_request':'provider_http';
 return {reason,...(Number.isInteger(status)&&status>=100&&status<=599?{providerStatus:status}:{})};
}
export async function mindCheckSummary(env,window,request=fetch){
 if(!env.GOATCOUNTER_READ_TOKEN)return {status:'not_configured',visits:null,pages:[]};
 const options={headers:{Authorization:`Bearer ${env.GOATCOUNTER_READ_TOKEN}`,'Content-Type':'application/json'},redirect:'manual',signal:AbortSignal.timeout(10000)};
 const query=new URLSearchParams({start:window.start,end:window.end});
 const origin='https://mindcheck.goatcounter.com/api/v0/stats/';
 async function read(path){
  try{
   const response=await request(origin+path,options);
   if(!response.ok)return {failure:providerFailure(response)};
   try{return {data:await response.json()};}catch{return {failure:{reason:'provider_response'}};}
  }catch(error){return {failure:{reason:['TimeoutError','AbortError'].includes(error?.name)?'provider_timeout':'provider_network'}};}
 }
 const [totalResult,pagesResult]=await Promise.all([read('total?'+query),read('hits?'+query+'&limit=10')]);
 const visits=number(totalResult.data?.total);
 const hits=pagesResult.data?.hits;
 // A Go nil slice can be JSON null for a successful, empty result. Require an
 // explicit zero returned-result total; missing or malformed data stays unavailable.
 const list=Array.isArray(hits)?hits:hits===null&&pagesResult.data?.total===0?[]:null;
 const pages=list?list.filter(p=>p&&p.event!==true&&/^\/[a-z0-9-]+\.html$/.test(p.path)&&number(p.count)!==null).slice(0,10).map(p=>({path:p.path,visits:p.count})):[];
 const pagesStatus=list?'ready':'unavailable';
 if(visits!==null&&list)return {status:'ready',visits,pages,pagesStatus,more:pagesResult.data?.more===true};
 const failure=visits===null?(totalResult.failure||{reason:'provider_response'}):(pagesResult.failure||{reason:'provider_response'});
 return {status:visits===null?'unavailable':'partial',visits,pages,pagesStatus,...failure};
}
