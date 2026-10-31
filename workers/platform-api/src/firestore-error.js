// Preserve structural capacity evidence without returning raw provider text or documents.
const safe=value=>typeof value==='string'&&/^[A-Za-z0-9_./:-]{1,110}$/.test(value)?value:'unavailable';
export function firestoreFailure(body){
 const envelope=Array.isArray(body)?body.find(item=>item?.error):body;
 const error=envelope?.error,details=Array.isArray(error?.details)?error.details:[];
 const info=details.find(d=>d?.['@type']==='type.googleapis.com/google.rpc.ErrorInfo');
 return {service:'firestore',status:safe(error?.status),reason:safe(info?.reason),quotaMetric:safe(info?.metadata?.quota_metric),quotaLimit:safe(info?.metadata?.quota_limit)};
}
