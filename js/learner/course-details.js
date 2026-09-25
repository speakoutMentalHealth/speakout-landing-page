import { db, auth } from "../../firebase-config.js";
import { PHASE2_VERIFIED_COURSES } from "../../phase2-verified-courses.js";
import { isPublicCourse } from "../content-visibility.js";
import { externalLearningApi } from "../platform-api.js";

import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

const id = new URLSearchParams(location.search).get("id");

const heroTitle = document.getElementById("heroTitle");
const heroDesc = document.getElementById("heroDesc");
const title = document.getElementById("title");
const description = document.getElementById("description");
const coverText = document.getElementById("coverText");
const courseCover = document.getElementById("courseCover");
const outcomes = document.getElementById("outcomes");
const outcomeCount = document.getElementById("outcomeCount");
const levelValue = document.getElementById("levelValue");
const durationValue = document.getElementById("durationValue");
const moduleCount = document.getElementById("moduleCount");
const moduleLabel = document.getElementById("moduleLabel");
const pills = document.getElementById("pills");
const prerequisites = document.getElementById("prerequisites");
const audienceList = document.getElementById("audienceList");
const moduleList = document.getElementById("moduleList");
const modulesSection = document.getElementById("modulesSection");
const actions = document.getElementById("actions");
const premiumNote = document.getElementById("premiumNote");
const externalNotice = document.getElementById("externalNotice");
const certificateBox = document.getElementById("certificateBox");
const providerLogo = document.getElementById("providerLogo");
const providerPlaceholder = document.getElementById("providerPlaceholder");
const providerName = document.getElementById("providerName");
const providerType = document.getElementById("providerType");
const externalTrackingStatus = document.getElementById("externalTrackingStatus");

function formatLabel(value){
  if(!value) return "";
  return String(value)
    .replaceAll("-"," ")
    .replace(/\b\w/g,letter=>letter.toUpperCase());
}

function escapeHtml(value){
  return String(value ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function isExternalCourse(course){
  return (
    course.courseType === "external" ||
    course.completionMethod === "certificate-upload"
  );
}

function safeExternalUrl(value){
  try{
    const url=new URL(String(value||""),location.origin);
    return url.protocol==="https:" ? url.toString() : "";
  }catch{
    return "";
  }
}

function isInstructorLed(course){
  return course.courseType === "instructor-led";
}

function externalRecordState(record){
  const status=String(record?.status||record?.verificationStatus||"").toLowerCase();
  if(["approved","verified"].includes(status)) return {label:"Verified by SpeakHub",className:"notice certificate-notice"};
  if(["pending","pending_review","submitted"].includes(status)) return {label:"Completion evidence pending review",className:"notice external-notice"};
  if(["rejected","resubmission_required"].includes(status)) return {label:"Evidence needs attention — you can resubmit",className:"notice external-notice"};
  if(status==="started") return {label:"Started on the provider platform",className:"notice"};
  return {label:"Not started in SpeakHub yet",className:"notice"};
}

async function refreshExternalTracking(courseId){
  externalTrackingStatus.style.display="block";
  externalTrackingStatus.className="notice external-tracking-status";
  externalTrackingStatus.textContent="Checking your SpeakHub pathway status...";
  try{
    const result=await externalLearningApi.status(courseId);
    const state=externalRecordState(result.record);
    externalTrackingStatus.className=`${state.className} external-tracking-status`;
    externalTrackingStatus.textContent=state.label;
  }catch(error){
    console.warn("External pathway status unavailable",error);
    externalTrackingStatus.className="notice external-tracking-status";
    externalTrackingStatus.textContent="You can still open the provider course. SpeakHub tracking will update when the secure learning service is available.";
  }
}

async function loadCourse(){
  try{

    if(!id){
      document.getElementById("loading").textContent =
        "No course ID was provided.";
      return;
    }

    const verifiedCourse = PHASE2_VERIFIED_COURSES.find(item => item.id === id) || null;
    let course = verifiedCourse ? {...verifiedCourse} : null;

    try{
      const snap = await getDoc(doc(db,"courses",id));
      if(snap.exists()){
        course = {
          ...(verifiedCourse || {}),
          id:snap.id,
          ...snap.data()
        };
      }
    }catch(error){
      console.warn("Firestore course lookup failed; checking verified catalogue.",error);
    }

    if(!course || !isPublicCourse(course)){
      document.getElementById("loading").textContent =
        "This course is not currently available.";
      return;
    }

    heroTitle.textContent =
      course.title || "Course Details";

    heroDesc.textContent =
      course.shortDescription ||
      course.description ||
      "Explore this SpeakHub Academy course.";

    title.textContent =
      course.title || "Untitled Course";

    description.textContent =
      course.fullDescription ||
      course.description ||
      "No course description is available.";

    coverText.textContent =
      course.title || "";

    if(course.coverUrl){
      courseCover.innerHTML = `
        <img
          src="${escapeHtml(course.coverUrl)}"
          alt="${escapeHtml(course.title || "Course cover")}"
        >
        <strong>${escapeHtml(course.title || "")}</strong>
      `;
    }

    const external = isExternalCourse(course);
    const instructorLed = isInstructorLed(course);

    const provider =
      course.provider ||
      "SpeakHub Academy";

    providerName.textContent = provider;

    if(external){
      providerType.textContent = "External Learning Provider";
    }else if(instructorLed){
      providerType.textContent = "Instructor-Led Course";
    }else{
      providerType.textContent = "SpeakHub Course";
    }

    if(course.providerLogo){
      providerLogo.src = course.providerLogo;
      providerLogo.style.display = "block";
      providerPlaceholder.style.display = "none";
    }else{
      providerPlaceholder.textContent =
        provider.charAt(0).toUpperCase();
    }

    const outcomesArr =
      Array.isArray(course.outcomes)
      ? course.outcomes
      : [];

    outcomes.innerHTML =
      outcomesArr.length
      ? outcomesArr
          .map(item=>`<li>${escapeHtml(item)}</li>`)
          .join("")
      : `
        <li>
          Learning outcomes will be provided with the course.
        </li>
      `;

    outcomeCount.textContent = outcomesArr.length;

    const level =
      course.difficulty ||
      course.level ||
      "Beginner";

    levelValue.textContent =
      formatLabel(level);

    durationValue.textContent =
      course.duration ||
      "Self-paced";

    let pillsHtml = "";

    pillsHtml += `
      <span class="pill">
        ${escapeHtml(formatLabel(course.category || "General"))}
      </span>
    `;

    pillsHtml += `
      <span class="pill">
        ${escapeHtml(formatLabel(level))}
      </span>
    `;

    const isFree =
      course.free === true ||
      String(course.accessType || "").toLowerCase() === "free";

    pillsHtml += `
      <span class="pill">
        ${isFree ? "Free" : "Premium"}
      </span>
    `;

    pillsHtml += `
      <span class="pill provider">
        ${escapeHtml(provider)}
      </span>
    `;

    if(external){
      pillsHtml += `
        <span class="pill external">
          External Course
        </span>
      `;
    }

    if(
      course.certificateEligible ||
      course.certificate?.available
    ){
      pillsHtml += `
        <span class="pill certificate">
          Certificate Available
        </span>
      `;
    }

    pills.innerHTML = pillsHtml;

    if(
      Array.isArray(course.prerequisites) &&
      course.prerequisites.length
    ){
      prerequisites.innerHTML = `
        <ul>
          ${
            course.prerequisites
              .map(item=>`<li>${escapeHtml(item)}</li>`)
              .join("")
          }
        </ul>
      `;
    }else{
      prerequisites.textContent =
        "No formal prerequisites.";
    }

    let audience = course.audience;

    if(Array.isArray(audience)){
      audienceList.innerHTML =
        audience
          .map(item=>`
            <span class="pill">
              ${escapeHtml(formatLabel(item))}
            </span>
          `)
          .join("");
    }else if(audience){
      audienceList.innerHTML = `
        <span class="pill">
          ${escapeHtml(formatLabel(audience))}
        </span>
      `;
    }else{
      audienceList.textContent =
        "Open to eligible SpeakHub learners.";
    }

    let modules = [];

    if(
      Array.isArray(course.modules) &&
      course.modules.length
    ){
      modules =
        course.modules.map(
          (module,index)=>({
            id:`embedded-${index}`,
            ...module
          })
        );
    }else if(!external){

      const ms =
        await getDocs(
          query(
            collection(db,"courseModules"),
            where("courseId","==",id)
          )
        );

      ms.forEach(docSnap=>{
        modules.push({
          id:docSnap.id,
          ...docSnap.data()
        });
      });

      modules.sort(
        (a,b)=>
          (a.order || 0) -
          (b.order || 0)
      );
    }

    if(external && !modules.length){

      modulesSection.style.display = "none";

      moduleCount.textContent =
        course.lessonCount || "—";

      moduleLabel.textContent =
        course.lessonCount
        ? "Lessons"
        : "Course";

    }else{

      moduleCount.textContent =
        modules.length;

      moduleLabel.textContent =
        "Modules";

      moduleList.innerHTML =
        modules.length
        ? modules.map(
            (module,index)=>`
              <div class="module">
                <strong>
                  ${escapeHtml(
                    module.title ||
                    `Module ${index+1}`
                  )}
                </strong>

                <div>
                  ${escapeHtml(
                    module.description ||
                    ""
                  )}
                </div>
              </div>
            `
          ).join("")
        : `
          <div class="module">
            Course modules are being prepared.
          </div>
        `;
    }

    if(external){
      externalNotice.style.display = "block";
      const credentialMessage=(course.certificateEligible||course.certificate?.available)
        ? "If you complete the provider requirements, keep the genuine provider-issued credential so you can submit it to SpeakHub for verification."
        : "Complete the learning on the provider's official platform and keep any completion evidence the provider makes available.";
      externalNotice.innerHTML=`
        <strong>This is an external-provider pathway.</strong>
        <p style="margin:8px 0 0">SpeakHub helps you discover and track this learning, but <strong>${escapeHtml(provider)}</strong> delivers the course and remains responsible for its original credential.</p>
        <div class="external-pathway-steps" aria-label="External course pathway">
          <div class="external-pathway-step"><strong>1. Start with the provider</strong><span>Open the official course page and complete the provider's own learning requirements.</span></div>
          <div class="external-pathway-step"><strong>2. Keep your credential</strong><span>${escapeHtml(credentialMessage)}</span></div>
          <div class="external-pathway-step"><strong>3. Return to SpeakHub</strong><span>Submit genuine evidence for review so the achievement can appear in your SpeakHub learning record.</span></div>
        </div>
      `;
      await refreshExternalTracking(course.id);
    }

    const certificate =
      course.certificate || {};

    const certificateAvailable =
      course.certificateEligible ||
      certificate.available;

    if(certificateAvailable){

      certificateBox.style.display =
        "block";

      const issuer =
        certificate.issuer ||
        course.certificateIssuer ||
        provider;

      if(external){

        const credentialType =
          course.certificateType ||
          certificate.type ||
          "provider credential";

        certificateBox.innerHTML = `
          <strong>External Credential</strong>
          <br>
          <strong>Issuer:</strong>
          ${escapeHtml(issuer)}
          <br>
          <strong>Credential type:</strong>
          ${escapeHtml(formatLabel(credentialType))}
          ${course.credentialNote ? `<br><br>${escapeHtml(course.credentialNote)}` : ""}
          <br><br>
          <small>This credential is issued by the external provider, not SpeakOut. It does not imply professional licensure, academic credit or accreditation unless the provider explicitly states that separately.</small>
        `;

      }else{

        certificateBox.innerHTML = `
          <strong>SpeakHub Certificate</strong>
          <br>
          Eligible learners can receive a certificate issued by
          <strong>${escapeHtml(issuer)}</strong>
          after successfully completing the course requirements.
        `;
      }
    }

    actions.innerHTML = "";

    if(external){

      const providerUrl = safeExternalUrl(course.externalUrl || course.courseUrl || course.providerCourseUrl || "");

      if(providerUrl){

        const externalButton =
          document.createElement("a");

        externalButton.className =
          "btn primary";

        externalButton.href =
          providerUrl;

        externalButton.target =
          "_blank";

        externalButton.rel =
          "noopener noreferrer";

        externalButton.textContent =
          `Start on ${provider} →`;

        externalButton.addEventListener("click",()=>{
          externalLearningApi.start(course.id)
            .then(()=>refreshExternalTracking(course.id))
            .catch(error=>console.warn("Could not record external course start",error));
        });

        actions.appendChild(
          externalButton
        );

      }else{

        const unavailable =
          document.createElement("span");

        unavailable.className =
          "btn soft";

        unavailable.textContent =
          "Provider Link Coming Soon";

        actions.appendChild(
          unavailable
        );
      }

      if(certificateAvailable || course.completionMethod==="certificate-upload"){
        const submitButton=document.createElement("a");
        submitButton.className="btn green";
        submitButton.href=`external-learning-submit.html?courseId=${encodeURIComponent(course.id)}`;
        submitButton.textContent="I've completed it — Submit proof";
        actions.appendChild(submitButton);
      }

    }else if(instructorLed){

      const enrollUrl =
        course.enrollmentUrl ||
        course.contactUrl;

      const enrollButton =
        document.createElement("a");

      enrollButton.className =
        "btn green";

      enrollButton.href =
        enrollUrl || "contact.html";

      enrollButton.textContent =
        enrollUrl
        ? "Enroll in Course"
        : "Request Enrollment";

      actions.appendChild(
        enrollButton
      );

    }else if(isFree){

      const startButton =
        document.createElement("a");

      startButton.className =
        "btn primary";

      startButton.href =
        `course-player.html?id=${encodeURIComponent(course.id)}`;

      startButton.textContent =
        "Start Course";

      actions.appendChild(
        startButton
      );

    }else{

      premiumNote.style.display =
        "block";

      const previewButton =
        document.createElement("a");

      previewButton.className =
        "btn gold";

      previewButton.href =
        `course-player.html?id=${encodeURIComponent(course.id)}&preview=1`;

      previewButton.textContent =
        "Preview Course";

      actions.appendChild(
        previewButton
      );
    }

    const backButton =
      document.createElement("a");

    backButton.className =
      "btn soft";

    backButton.href =
      "speakhub.html";

    backButton.textContent =
      "Back to Courses";

    actions.appendChild(
      backButton
    );

    document.getElementById("loading").style.display =
      "none";

    document.getElementById("courseArea").style.display =
      "grid";

    document.getElementById("statsRow").style.display =
      "grid";

  }catch(error){

    console.error(
      "Course loading error:",
      error
    );

    document.getElementById("loading").textContent =
      "Failed to load this course. Please try again.";
  }
}

onAuthStateChanged(auth,async user=>{
  if(!user){
    location.href=`auth.html?returnTo=${encodeURIComponent(location.pathname+location.search)}`;
    return;
  }
  try{
    const profileSnap=await getDoc(doc(db,"users",user.uid));
    if(!profileSnap.exists()){location.href="auth.html#pending";return}
    const profile={uid:user.uid,...profileSnap.data()};
    const role=(profile.role||"").toLowerCase();
    const approved=profile.status==="approved"||profile.approved===true||role==="admin"||role==="super_admin";
    if(!approved){location.href="auth.html#pending";return}
    await loadCourse();
  }catch(error){
    console.error("Course access check failed",error);
    document.getElementById("loading").textContent="Could not verify course access. Please sign in again.";
  }
});
