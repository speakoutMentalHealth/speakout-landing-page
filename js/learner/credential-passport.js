import { requireRoles, renderRoleNav } from "../../launch-role-guard.js";
import { credentialApi } from "../platform-api.js";
import { isPendingStatus, normalize, pretty, safeHttpsUrl, statusLabel as sharedStatusLabel } from "./ui-utils.js";

let credentials=[];
const allowedRoles=["student","parent","teacher","ambassador","contributor","volunteer","school_admin","school"];
const $=id=>document.getElementById(id);
const statusBox=$("statusBox"),credentialGrid=$("credentialGrid"),credentialForm=$("credentialForm"),submitBtn=$("submitBtn"),
  totalBox=$("totalBox"),verifiedBox=$("verifiedBox"),pendingBox=$("pendingBox"),issuerBox=$("issuerBox");

const safe=value=>String(value??"—").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));
function show(message,type=""){statusBox.textContent=message;statusBox.className=`notice ${type}`}
function statusLabel(record){
  return sharedStatusLabel(record.status,{fallback:"Under Review"});
}
function updateStats(){
  totalBox.textContent=credentials.length;
  verifiedBox.textContent=credentials.filter(item=>normalize(item.status)==="verified").length;
  pendingBox.textContent=credentials.filter(item=>isPendingStatus(item.status)).length;
  issuerBox.textContent=new Set(credentials.map(item=>item.issuer).filter(Boolean)).size;
}
function render(){
  credentialGrid.innerHTML=credentials.length?credentials.map(item=>{
    const status=normalize(item.status);
    const verified=status==="verified";
    const verify=safeHttpsUrl(item.verificationUrl);
    const certificateId=item.certificateId||item.linkedCertificateId||"";
    const typeLabel=verified
      ? `Verified type: ${pretty(item.verifiedCredentialType||item.credentialType)}`
      : `Reported type: ${pretty(item.credentialType)}`;
    return `<article class="card credential-card">
      <div class="meta-row"><span class="pill ${safe(status)}">${safe(statusLabel(item))}</span>${verified?'<span class="pill verified">Provider remains issuer</span>':""}</div>
      <h3>${safe(item.title)}</h3>
      <p><strong>Issuer:</strong> ${safe(item.issuer)}</p>
      <p><strong>${safe(typeLabel)}</strong></p>
      ${item.issueDate?`<p><strong>Issued:</strong> ${safe(item.issueDate)}</p>`:""}
      ${item.credentialNumber?`<p><strong>Credential No:</strong> ${safe(item.credentialNumber)}</p>`:""}
      ${item.reviewNote?`<div class="notice ${status==="rejected"||status==="resubmission_required"?"warn":""}">${safe(item.reviewNote)}</div>`:""}
      <div class="actions">
        ${verify?`<a class="btn soft" target="_blank" rel="noopener noreferrer" href="${safe(verify)}">Provider Verification</a>`:""}
        ${certificateId?`<a class="btn primary" href="certificate-view.html?id=${encodeURIComponent(certificateId)}">View Verified Record</a>`:""}
      </div>
    </article>`;
  }).join(""):'<div class="card"><h3>No credential records yet</h3><p>Submit a provider-issued certificate or badge above.</p></div>';
  updateStats();
}
async function loadCredentials(){
  const result=await credentialApi.list();
  credentials=result.records||[];
  render();
  show("Credential Passport loaded. Verification records are server-controlled.","ok");
}
credentialForm.addEventListener("submit",async event=>{
  event.preventDefault();
  submitBtn.disabled=true;
  show("Submitting credential securely...");
  try{
    const payload={
      title:$("title").value.trim(),
      issuer:$("issuer").value.trim(),
      credentialType:$("credentialType").value,
      credentialNumber:$("credentialNumber").value.trim(),
      issueDate:$("issueDate").value,
      verificationUrl:$("verificationUrl").value.trim(),
      evidenceUrl:$("evidenceUrl").value.trim(),
      notes:$("notes").value.trim(),
      attested:$("attest").checked
    };
    const result=await credentialApi.submit(payload);
    credentialForm.reset();
    await loadCredentials();
    show(result.created===false?"This credential is already in your secure review record.":"Credential submitted for review.","ok");
  }catch(error){
    console.error(error);
    show(error.message||"Could not submit credential.","bad");
  }finally{submitBtn.disabled=false}
});
requireRoles(allowedRoles,async(_user,profile)=>{
  renderRoleNav(profile,"Credentials");
  try{await loadCredentials()}catch(error){console.error(error);show(error.message||"Could not load your credential passport.","bad")}
});
