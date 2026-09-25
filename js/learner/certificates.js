import { SO } from "../../dashboard-shared.js";
import { learningApi } from "../platform-api.js";

const normalize=value=>String(value||"").trim().toLowerCase();
const activeCredential=item=>!["revoked","rejected","invalid"].includes(normalize(item.status));
const verifiedManual=item=>["verified","approved"].includes(normalize(item.status||item.verificationStatus));
function keyOf(item={}){
  const issuer=normalize(item.externalProvider||item.provider||item.issuer);
  const title=normalize(item.courseTitle||item.awardTitle||item.title);
  const number=normalize(item.credentialNumber||item.certificateNumber);
  const date=String(item.issueDate||item.completionDate||"").slice(0,10);
  return number&&issuer?`number|${issuer}|${number}`:issuer&&title&&date?`title|${issuer}|${title}|${date}`:"";
}
function unifiedCredentials(dashboard={}){
  const canonical=(dashboard.certificates||[]).filter(activeCredential);
  const ids=new Set(canonical.flatMap(item=>[item.id,item.certificateId].filter(Boolean)));
  const sourceIds=new Set(canonical.map(item=>item.sourceCredentialId).filter(Boolean));
  const keys=new Set(canonical.map(keyOf).filter(Boolean));
  const legacy=(dashboard.externalCredentials||[]).filter(verifiedManual).filter(item=>{
    if(sourceIds.has(item.id))return false;
    if(item.certificateId&&ids.has(item.certificateId))return false;
    if(item.linkedCertificateId&&ids.has(item.linkedCertificateId))return false;
    const key=keyOf(item);
    return !key||!keys.has(key);
  }).map(item=>({...item,_manualExternal:true,type:"external-credential-verification"}));
  return [...canonical,...legacy];
}
SO.onAuthStateChanged(SO.auth, async user=>{
  if(!user)return;
  try{
    const dashboard=await learningApi.dashboard();
    const data=unifiedCredentials(dashboard);
    total.textContent=SO.num(data.length);
    issued.textContent=SO.num(data.filter(r=>["active","issued","verified","approved"].includes(normalize(r.status))).length);
    types.textContent=SO.num(new Set(data.map(r=>r.type||r.credentialType).filter(Boolean)).size);
    rows.innerHTML=data.length?data.map(r=>{
      const id=r.certificateId||r.linkedCertificateId||r.id||"";
      const type=r.type||r.credentialType||"credential";
      const provider=r.externalProvider||r.provider||r.issuer;
      const title=r.courseTitle||r.title||r.schoolName;
      const verification=r.verificationCode||r.credentialNumber||"—";
      return `<tr><td>${SO.safe(r.recipientName)}</td><td>${id?`<a href="certificate-view.html?id=${encodeURIComponent(id)}">${SO.safe(type)}</a>`:SO.safe(type)}</td><td>${SO.safe([title,provider].filter(Boolean).join(" • "))}</td><td>${SO.safe(r.issueDate||r.issuedDate||r.completionDate)}</td><td>${SO.safe(verification)}</td></tr>`;
    }).join(""):`<tr><td colspan="5">No certificates or verified credentials yet.</td></tr>`;
  }catch(error){
    rows.innerHTML=`<tr><td colspan="5">${SO.safe(error.message||"Could not load certificates.")}</td></tr>`;
  }
});
