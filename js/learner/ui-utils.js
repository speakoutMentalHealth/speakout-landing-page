/* Shared learner-page presentation helpers.
   Keep data fetching and page-specific rendering inside each page module. */

export const normalize=value=>String(value??"").trim().toLowerCase();

export const pretty=value=>String(value??"")
  .trim()
  .replaceAll("-"," ")
  .replaceAll("_"," ")
  .replace(/\b\w/g,letter=>letter.toUpperCase());

export const clampPercent=value=>Math.max(0,Math.min(100,Number(value||0)));

export function safeHttpsUrl(value){
  try{
    const url=new URL(String(value||""));
    return url.protocol==="https:"?url.toString():"";
  }catch{
    return "";
  }
}

export function learnerName(profile={}){
  const candidates=[
    profile.certificateName,
    `${profile.firstName||""} ${profile.lastName||""}`.trim(),
    profile.fullName,
    profile.displayName,
    profile.name
  ].map(value=>String(value||"").trim());

  return candidates.find(value=>value&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value))||"Learner";
}

export function credentialStatus(record={}){
  return normalize(record.status||record.verificationStatus||"");
}

export function isVerifiedStatus(value){
  return ["approved","verified","active","issued"].includes(normalize(value));
}

export function isPendingStatus(value){
  return ["pending","pending_review","submitted"].includes(normalize(value));
}

export function statusLabel(value,{fallback="Started"}={}){
  const status=normalize(value);
  if(["approved","verified"].includes(status))return"Verified";
  if(["pending","pending_review","submitted"].includes(status))return"Pending Review";
  if(["rejected","resubmission_required"].includes(status))return"Needs Attention";
  if(status==="completed")return"Completed";
  if(status==="in_progress"||status==="in-progress")return"In Progress";
  return pretty(status)||fallback;
}
