import { SO } from "../../dashboard-shared.js";
import { learningApi } from "../platform-api.js";
import { isVerifiedStatus } from "./ui-utils.js";
import { unifiedCredentialRecords } from "./credential-utils.js";
SO.onAuthStateChanged(SO.auth, async user=>{
  if(!user)return;
  try{
    const dashboard=await learningApi.dashboard();
    const data=unifiedCredentialRecords(dashboard.certificates||[],dashboard.externalCredentials||[]);
    total.textContent=SO.num(data.length);
    issued.textContent=SO.num(data.filter(r=>isVerifiedStatus(r.status)).length);
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
