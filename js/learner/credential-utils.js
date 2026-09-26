import { credentialStatus, normalize } from "./ui-utils.js";

export const activeCredential=item=>!["revoked","rejected","invalid"].includes(normalize(item?.status));

export const verifiedManual=item=>["verified","approved"].includes(credentialStatus(item));

export function credentialKey(item={}){
  const issuer=normalize(item.externalProvider||item.provider||item.issuer);
  const title=normalize(item.courseTitle||item.awardTitle||item.title);
  const number=normalize(item.credentialNumber||item.certificateNumber);
  const date=String(item.issueDate||item.completionDate||"").slice(0,10);

  if(number&&issuer)return `number|${issuer}|${number}`;
  if(issuer&&title&&date)return `title|${issuer}|${title}|${date}`;
  return "";
}

export function unifiedCredentialRecords(certificates=[],manual=[]){
  const canonical=certificates.filter(activeCredential);
  const canonicalIds=new Set(canonical.flatMap(item=>[item.id,item.certificateId].filter(Boolean)));
  const sourceCredentialIds=new Set(canonical.map(item=>item.sourceCredentialId).filter(Boolean));
  const keys=new Set(canonical.map(credentialKey).filter(Boolean));

  const verifiedLegacy=manual
    .filter(verifiedManual)
    .filter(item=>{
      if(sourceCredentialIds.has(item.id))return false;
      if(item.certificateId&&canonicalIds.has(item.certificateId))return false;
      if(item.linkedCertificateId&&canonicalIds.has(item.linkedCertificateId))return false;
      const key=credentialKey(item);
      return !key||!keys.has(key);
    })
    .map(item=>({...item,_manualExternal:true,type:"external-credential-verification"}));

  return [...canonical,...verifiedLegacy];
}
