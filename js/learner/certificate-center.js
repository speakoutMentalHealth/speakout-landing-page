import { certificateApi } from "../platform-api.js";

const form=document.getElementById("verificationForm");
const certificateIdInput=document.getElementById("certificateId");
const verifyButton=document.getElementById("verifyButton");
const clearButton=document.getElementById("clearButton");
const statusBox=document.getElementById("statusBox");
const resultCard=document.getElementById("resultCard");
const resultTitle=document.getElementById("resultTitle");
const resultSubtitle=document.getElementById("resultSubtitle");
const resultBadge=document.getElementById("resultBadge");
const resultId=document.getElementById("resultId");
const resultRecipient=document.getElementById("resultRecipient");
const resultCourse=document.getElementById("resultCourse");
const resultDate=document.getElementById("resultDate");
const resultType=document.getElementById("resultType");
const resultIssuer=document.getElementById("resultIssuer");
const providerHeading=document.getElementById("providerHeading");
const providerText=document.getElementById("providerText");
const externalCredentialNote=document.getElementById("externalCredentialNote");
const viewCertificateButton=document.getElementById("viewCertificateButton");
const newSearchButton=document.getElementById("newSearchButton");

const normalise=value=>String(value||"").trim().toLowerCase();
const formatLabel=value=>value?String(value).replaceAll("-"," ").replace(/\b\w/g,letter=>letter.toUpperCase()):"—";
function formatDate(value){
  if(!value)return"—";
  const date=new Date(value);
  return Number.isNaN(date.getTime())?String(value):date.toLocaleDateString(undefined,{year:"numeric",month:"long",day:"numeric"});
}
function showStatus(type,message){statusBox.className=`status-box ${type}`;statusBox.textContent=message}
function hideStatus(){statusBox.className="status-box";statusBox.textContent=""}
function clearSearch(){certificateIdInput.value="";hideStatus();resultCard.classList.remove("show")}
function verifiedStatus(status){return["active","issued","verified","approved"].includes(normalise(status))}
function isExternalRecord(record){
  return record.externalProvider===true||Boolean(record.provider)||normalise(record.achievementType).includes("external");
}
function renderCertificate(record){
  const status=normalise(record.status||"active");
  const external=isExternalRecord(record);
  resultTitle.textContent=record.awardTitle||"Credential";
  resultSubtitle.textContent=external?"External provider credential":"SpeakOut / SpeakHub Credential";
  resultId.textContent=record.certificateNumber||record.id||"—";
  resultRecipient.textContent=record.recipientName||"—";
  resultCourse.textContent=record.awardTitle||"—";
  resultDate.textContent=formatDate(record.issueDate);
  resultType.textContent=formatLabel(record.credentialType||record.achievementType||"certificate");
  resultIssuer.textContent=record.issuer||record.provider||"SpeakOut Mental Health Outreach";
  providerHeading.textContent=record.provider||record.issuer||"SpeakOut / SpeakHub";
  providerText.textContent=external
    ? `Original provider credential verified through SpeakHub${record.verifiedBy?` by ${record.verifiedBy}`:""}.`
    :"Credential issued or managed through SpeakOut / SpeakHub.";
  externalCredentialNote.style.display=external?"block":"none";
  if(verifiedStatus(status)){
    resultBadge.textContent="Verified";
    resultBadge.className="verify-badge verified";
  }else if(["pending","pending_review","submitted"].includes(status)){
    resultBadge.textContent="Pending Review";
    resultBadge.className="verify-badge pending";
  }else{
    resultBadge.textContent=formatLabel(status);
    resultBadge.className="verify-badge rejected";
  }
  const publicId=record.certificateNumber||record.id;
  if(publicId&&verifiedStatus(status)){
    viewCertificateButton.href=`certificate-view.html?id=${encodeURIComponent(publicId)}`;
    viewCertificateButton.style.display="inline-flex";
  }else viewCertificateButton.style.display="none";
  resultCard.classList.add("show");
}

clearButton.addEventListener("click",clearSearch);
newSearchButton.addEventListener("click",()=>{
  clearSearch();
  window.scrollTo({top:document.querySelector(".certificate-main").offsetTop-40,behavior:"smooth"});
});
form.addEventListener("submit",async event=>{
  event.preventDefault();
  hideStatus();
  resultCard.classList.remove("show");
  const id=certificateIdInput.value.trim();
  if(!id){showStatus("error","Enter a verification code or certificate ID.");return}
  verifyButton.disabled=true;
  verifyButton.textContent="Checking...";
  showStatus("loading","Checking the public credential registry...");
  try{
    const result=await certificateApi.verify(id);
    if(!result.record){showStatus("error","No matching public credential record was found.");return}
    if(verifiedStatus(result.record.status)){
      showStatus("success","Credential record found and verified.");
    }else{
      showStatus("warning",`Credential record found with status: ${formatLabel(result.record.status)}.`);
    }
    renderCertificate(result.record);
  }catch(error){
    console.error(error);
    showStatus("error",error.message||"Verification failed. Please try again.");
  }finally{
    verifyButton.disabled=false;
    verifyButton.textContent="Verify Certificate";
  }
});

const requested=new URLSearchParams(location.search).get("id")||new URLSearchParams(location.search).get("code");
if(requested){
  certificateIdInput.value=requested;
  form.requestSubmit();
}
