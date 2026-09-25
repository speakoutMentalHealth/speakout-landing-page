import { auth,db } from "../../firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { doc,getDoc } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
import { externalLearningApi } from "../platform-api.js";
import { PHASE2_VERIFIED_COURSES } from "../../phase2-verified-courses.js";
import { isPublicCourse } from "../content-visibility.js";

const courseId=new URLSearchParams(location.search).get("courseId");
const $=id=>document.getElementById(id);
const statusBox=$("statusBox"),contentArea=$("contentArea"),courseTitle=$("courseTitle"),pageCourseTitle=$("pageCourseTitle"),
providerName=$("providerName"),issuerName=$("issuerName"),categoryName=$("categoryName"),providerCourseLink=$("providerCourseLink"),
courseDetailsLink=$("courseDetailsLink"),backToCourse=$("backToCourse"),submissionForm=$("submissionForm"),proofFile=$("proofFile"),
proofPreview=$("proofPreview"),submitButton=$("submitButton"),resultBox=$("resultBox"),existingSubmission=$("existingSubmission"),
reviewBox=$("reviewBox"),reviewFeedback=$("reviewFeedback"),reviewedBy=$("reviewedBy"),reviewedAt=$("reviewedAt"),
completionDate=$("completionDate"),certificateNumber=$("certificateNumber"),verificationUrl=$("verificationUrl"),learnerNote=$("learnerNote"),
heroTitle=$("heroTitle"),heroText=$("heroText");

let currentUser=null,currentProfile=null,course=null,existingRecord=null;

function normalize(v){return String(v||"").trim().toLowerCase()}
function pretty(v){return String(v||"—").replaceAll("-"," ").replace(/\b\w/g,l=>l.toUpperCase())}
function show(message,type=""){statusBox.textContent=message;statusBox.className=`notice ${type}`}
function externalUrl(item){
  const raw=item.externalUrl||item.courseUrl||item.providerCourseUrl||item.providerUrl||item.url||"";
  try{const url=new URL(raw);return url.protocol==="https:"?url.toString():""}catch{return""}
}
function isExternal(item){return normalize(item.courseType)==="external"||normalize(item.completionMethod)==="certificate-upload"||item.externalProvider===true}
function recordStatus(record){
  const s=normalize(record?.verificationStatus||record?.status||"");
  if(["approved","verified"].includes(s))return"approved";
  if(["rejected","revoked"].includes(s))return"rejected";
  if(["pending","pending_review","submitted"].includes(s))return"pending";
  if(["started","not_submitted"].includes(s))return"started";
  return"none";
}
function formatDate(v){
  if(!v)return"—";
  try{
    const d=v?.toDate?v.toDate():new Date(v);
    return Number.isNaN(d.getTime())?String(v):d.toLocaleDateString();
  }catch{return String(v)}
}
function compressImage(file){
  return new Promise((resolve,reject)=>{
    if(!file||!["image/jpeg","image/png","image/webp"].includes(file.type)){
      reject(new Error("Please select a JPG, PNG or WebP image."));return;
    }
    if(file.size>8*1024*1024){reject(new Error("The selected image is too large. Please use an image below 8 MB."));return;}
    const reader=new FileReader(),image=new Image();
    reader.onload=e=>image.src=e.target.result;
    image.onload=()=>{
      const maxWidth=1400,maxHeight=1400;
      let width=image.width,height=image.height;
      const ratio=Math.min(1,maxWidth/width,maxHeight/height);
      width=Math.round(width*ratio);height=Math.round(height*ratio);
      const canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;
      canvas.getContext("2d").drawImage(image,0,0,width,height);
      let quality=.74,data=canvas.toDataURL("image/jpeg",quality);
      while(data.length>780000&&quality>.40){quality-=.08;data=canvas.toDataURL("image/jpeg",quality);}
      if(data.length>850000){reject(new Error("Certificate image is still too large after compression. Please upload a smaller screenshot."));return;}
      resolve(data);
    };
    image.onerror=()=>reject(new Error("Could not read the selected image."));
    reader.onerror=()=>reject(new Error("Could not read the selected file."));
    reader.readAsDataURL(file);
  });
}

async function loadExisting(){
  existingRecord=null;
  const result=await externalLearningApi.status(courseId);
  existingRecord=result.record||null;
  renderExisting();
}

function renderExisting(){
  reviewBox.style.display="none";
  submissionForm.classList.remove("locked");
  submitButton.disabled=false;
  submitButton.textContent="Submit for Review";

  if(!existingRecord){
    existingSubmission.style.display="block";
    existingSubmission.className="notice";
    existingSubmission.innerHTML=`<strong>Status:</strong> <span class="status-pill none">Not Submitted</span><br>Complete the provider course, then submit your proof here.`;
    return;
  }

  const status=recordStatus(existingRecord);
  existingSubmission.style.display="block";

  if(status==="approved"){
    existingSubmission.className="notice ok";
    existingSubmission.innerHTML=`<strong>Status:</strong> <span class="status-pill approved">Approved</span><br>Your external learning achievement has been approved and recorded.`;
    submissionForm.classList.add("locked");
    submitButton.disabled=true;
    submitButton.textContent="Approved";
  }else if(status==="pending"){
    existingSubmission.className="notice warn";
    existingSubmission.innerHTML=`<strong>Status:</strong> <span class="status-pill pending">Pending Review</span><br>Your submission is awaiting review. Submitted: ${formatDate(existingRecord.submittedAt||existingRecord.createdAt)}`;
    submissionForm.classList.add("locked");
    submitButton.disabled=true;
    submitButton.textContent="Awaiting Review";
  }else if(status==="rejected"){
    existingSubmission.className="notice bad";
    existingSubmission.innerHTML=`<strong>Status:</strong> <span class="status-pill rejected">Needs attention</span><br>You may correct the evidence and resubmit.`;
    submitButton.textContent="Resubmit for Review";
  }else if(status==="started"){
    existingSubmission.className="notice";
    existingSubmission.innerHTML=`<strong>Status:</strong> <span class="status-pill">Started</span><br>This pathway is already in your SpeakHub learning record. Submit genuine provider evidence after you complete the course.`;
  }

  completionDate.value=existingRecord.completionDate||"";
  certificateNumber.value=existingRecord.certificateNumber||"";
  verificationUrl.value=existingRecord.verificationUrl||"";
  learnerNote.value=existingRecord.learnerNote||"";

  const feedback=existingRecord.reviewerFeedback||existingRecord.reviewNote||existingRecord.adminNote||"";
  if(feedback||existingRecord.reviewedAt||existingRecord.reviewedBy){
    reviewBox.style.display="block";
    reviewFeedback.textContent=feedback||"No written feedback was provided.";
    reviewedBy.textContent=existingRecord.reviewedByName||existingRecord.reviewedBy||"SpeakHub reviewer";
    reviewedAt.textContent=formatDate(existingRecord.reviewedAt);
  }
}

proofFile.addEventListener("change",()=>{
  const file=proofFile.files?.[0];
  if(!file){proofPreview.style.display="none";proofPreview.removeAttribute("src");return;}
  const url=URL.createObjectURL(file);proofPreview.src=url;proofPreview.style.display="block";
  proofPreview.onload=()=>URL.revokeObjectURL(url);
});

submissionForm.addEventListener("submit",async event=>{
  event.preventDefault();
  if(!currentUser||!course)return;

  const status=recordStatus(existingRecord);
  if(status==="approved")return;
  if(status==="pending"){resultBox.style.display="block";resultBox.className="notice warn";resultBox.textContent="This submission is already awaiting review.";return;}

  submitButton.disabled=true;submitButton.textContent="Submitting...";
  resultBox.style.display="block";resultBox.className="notice";resultBox.textContent="Preparing your evidence and submitting it for review...";

  try{
    const file=proofFile.files?.[0];
    if(!file)throw new Error(status==="rejected"?"Upload corrected certificate/proof before resubmitting.":"Upload a certificate or proof image.");

    if(!completionDate.value)throw new Error("Enter the course completion date.");

    const verification=verificationUrl.value.trim();
    if(verification){
      try{if(new URL(verification).protocol!=="https:")throw new Error()}catch{throw new Error("Enter a valid secure provider verification URL beginning with https://.");}
    }

    await externalLearningApi.submit(file,{
      courseId,
      completionDate:completionDate.value,
      certificateNumber:certificateNumber.value.trim(),
      verificationUrl:verification,
      learnerNote:learnerNote.value.trim()
    });

    resultBox.className="notice ok";
    resultBox.innerHTML="<strong>Submission received.</strong><br>Your external learning evidence is now pending SpeakHub review.";
    proofFile.value="";proofPreview.style.display="none";proofPreview.removeAttribute("src");
    await loadExisting();

  }catch(error){
    console.error(error);resultBox.className="notice bad";resultBox.textContent=error.message||"Could not submit your external learning record.";
  }finally{
    if(recordStatus(existingRecord)==="rejected"||recordStatus(existingRecord)==="none"){
      submitButton.disabled=false;
      submitButton.textContent=recordStatus(existingRecord)==="rejected"?"Resubmit for Review":"Submit for Review";
    }
  }
});

onAuthStateChanged(auth,async user=>{
  if(!user){location.href="auth.html";return;}
  if(!courseId){show("No external course was selected.","bad");return;}

  try{
    currentUser=user;
    const profileSnap=await getDoc(doc(db,"users",user.uid));
    if(!profileSnap.exists()){show("Your learner profile could not be found.","bad");return;}
    currentProfile={uid:user.uid,...profileSnap.data()};

    if(normalize(currentProfile.status)!=="approved"){
      show("Your account must be approved before submitting external learning evidence.","warn");return;
    }

    const verifiedCourse=PHASE2_VERIFIED_COURSES.find(item=>item.id===courseId)||null;
    let firestoreCourse=null;
    try{
      const courseSnap=await getDoc(doc(db,"courses",courseId));
      if(courseSnap.exists())firestoreCourse={id:courseSnap.id,...courseSnap.data()};
    }catch(error){
      console.warn("Firestore course lookup failed; using verified catalogue fallback.",error);
    }
    course=firestoreCourse?{...(verifiedCourse||{}),...firestoreCourse}:(verifiedCourse?{...verifiedCourse}:null);

    if(!course||!isPublicCourse(course)||!isExternal(course)){show("This external course is not currently available for evidence submission.","bad");return;}

    const url=externalUrl(course);
    const provider=course.provider||"External Provider";
    const issuer=course.certificate?.issuer||course.certificateIssuer||provider;

    document.title=`${course.title||"External Course"} | External Learning Submission`;
    heroTitle.textContent=`Submit proof for ${course.title||"this course"}`;
    heroText.textContent=`Complete the course with ${provider}, then submit the provider-issued certificate or accepted proof for SpeakHub review.`;

    courseTitle.textContent=course.title||"External Course";
    pageCourseTitle.textContent=course.title||"External Course";
    providerName.textContent=provider;
    issuerName.textContent=issuer;
    categoryName.textContent=pretty(course.category||"General");
    courseDetailsLink.href=`course-details.html?id=${encodeURIComponent(course.id)}`;
    backToCourse.href=`course-details.html?id=${encodeURIComponent(course.id)}`;

    if(url)providerCourseLink.href=url;
    else{providerCourseLink.style.display="none";}

    contentArea.style.display="grid";
    show("External course verified. You can submit your completion evidence.","ok");
    await loadExisting();

  }catch(error){
    console.error(error);
    show(error.message||"Could not load the external learning submission page.","bad");
  }
});
