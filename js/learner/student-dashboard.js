import {
  requireRoles,
  renderRoleNav
} from "../../launch-role-guard.js";

import {
  db
} from "../../firebase-config.js";

import {
  doc,
  setDoc,
  serverTimestamp,
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
import { learningApi } from "../platform-api.js";
import { escapeHtml, formatDisplayDate as formatDate, normalize, prettyLabel as pretty, setFieldValue as setVal, statusPill as pill } from "./ui-utils.js";


let currentUser = null;
let profile = null;


const statusBox =
  document.getElementById("statusBox");

const profileWarning =
  document.getElementById("profileWarning");

const pills =
  document.getElementById("pills");

const welcomeTitle =
  document.getElementById("welcomeTitle");

const nameBox =
  document.getElementById("nameBox");

const studentIdBox =
  document.getElementById("studentIdBox");

const schoolBox =
  document.getElementById("schoolBox");

const certificateCount =
  document.getElementById("certificateCount");

const courseStartedCount =
  document.getElementById("courseStartedCount");

const courseCompletedCount =
  document.getElementById("courseCompletedCount");

const externalCourseCount =
  document.getElementById("externalCourseCount");

const pendingParentCount =
  document.getElementById("pendingParentCount");

const progressList =
  document.getElementById("progressList");

const completedList =
  document.getElementById("completedList");

const externalList =
  document.getElementById("externalList");

const certificateList =
  document.getElementById("certificateList");

const profilePhoto =
  document.getElementById("profilePhoto");

const profilePhotoPreview =
  document.getElementById("profilePhotoPreview");

const profileForm =
  document.getElementById("profileForm");


function show(message,type=""){

  statusBox.textContent =
    message;

  statusBox.className =
    `notice ${type}`;

}


function safe(value,fallback="—"){
  return (
    value === null ||
    value === undefined ||
    value === ""
  )
    ? fallback
    : value;
}


function generateStudentId(){

  const random =
    Math.random()
      .toString(36)
      .slice(2,5)
      .toUpperCase();

  return (
    "STU-" +
    Date.now()
      .toString()
      .slice(-6) +
    "-" +
    random
  );

}


/* =========================================================
   IMAGE
========================================================= */

async function compressPhoto(file){

  return new Promise(
    (resolve,reject)=>{

      if(
        !file.type.startsWith(
          "image/"
        )
      ){
        reject(
          new Error(
            "Please upload an image file."
          )
        );
        return;
      }


      const img =
        new Image();

      const reader =
        new FileReader();


      reader.onload =
        event=>{
          img.src =
            event.target.result;
        };


      img.onload =
        ()=>{

          const max =
            300;

          let width =
            img.width;

          let height =
            img.height;


          if(
            width > height &&
            width > max
          ){

            height =
              Math.round(
                height *
                max /
                width
              );

            width =
              max;

          }else if(
            height > width &&
            height > max
          ){

            width =
              Math.round(
                width *
                max /
                height
              );

            height =
              max;

          }else if(
            width > max
          ){

            width =
              max;

            height =
              max;

          }


          const canvas =
            document.createElement(
              "canvas"
            );


          canvas.width =
            width;

          canvas.height =
            height;


          canvas
            .getContext("2d")
            .drawImage(
              img,
              0,
              0,
              width,
              height
            );


          const data =
            canvas.toDataURL(
              "image/jpeg",
              .65
            );


          if(data.length > 260000){

            reject(
              new Error(
                "Image is still too large. Please choose a smaller photo."
              )
            );

            return;
          }


          resolve(
            data
          );

        };


      img.onerror =
        ()=>reject(
          new Error(
            "Could not read image."
          )
        );


      reader.readAsDataURL(
        file
      );

    }
  );

}


/* =========================================================
   PROFILE
========================================================= */

async function ensureStudentId(user,p){

  if(p.studentId){
    return p.studentId;
  }


  const newId =
    generateStudentId();


  await setDoc(
    doc(
      db,
      "users",
      user.uid
    ),
    {
      studentId:
        newId,

      updatedAt:
        serverTimestamp()
    },
    {
      merge:true
    }
  );


  p.studentId =
    newId;


  return newId;

}


function renderProfile(user,p){

  currentUser =
    user;

  profile =
    p;


  renderRoleNav(
    p,
    "Dashboard"
  );


  pills.innerHTML =
    pill(p.role) +
    pill(p.status) +
    pill(
      p.schoolCode ||
      "individual"
    );


  const fullName =
    (
      (
        p.firstName ||
        p.fullName ||
        user.email ||
        "Student"
      ) +
      " " +
      (
        p.lastName ||
        ""
      )
    ).trim();


  nameBox.textContent =
    fullName;


  studentIdBox.textContent =
    p.studentId ||
    "Not Assigned";


  schoolBox.textContent =
    p.schoolName ||
    p.schoolCode ||
    "Individual Access";


  welcomeTitle.textContent =
    `Welcome, ${
      p.firstName ||
      p.fullName ||
      "Student"
    }`;


  [
    "firstName",
    "lastName",
    "phone",
    "country",
    "state",
    "city",
    "occupation",
    "bio"
  ]
  .forEach(key=>
    setVal(
      key,
      p[key] || ""
    )
  );


  profilePhotoPreview.src =
    p.photoData ||
    p.photoURL ||
    "logo.png";


  profileWarning.classList.toggle(
    "hidden",
    Boolean(
      p.profileCompleted
    )
  );

}


/* =========================================================
   PROGRESS NORMALIZATION
========================================================= */

function progressPercent(item){

  return Math.max(
    0,
    Math.min(
      100,
      Number(
        item.percent ??
        item.progressPercent ??
        item.progress ??
        0
      ) || 0
    )
  );

}


function isCourseProgress(item){

  const type =
    normalize(
      item.type
    );

  return (
    type === "course" ||
    type === "external-course" ||
    Boolean(item.courseId)
  );

}


function isExternalProgress(item){

  return (
    normalize(item.type) === "external-course" ||
    normalize(item.courseType) === "external" ||
    normalize(item.completionMethod) === "certificate-upload"
  );

}


function isCompletedProgress(item){

  const status=normalize(item.status||item.verificationStatus);
  return (
    ["completed","approved","verified"].includes(status) ||
    item.completed === true ||
    progressPercent(item) >= 100
  );

}


function progressCourseId(item){

  return (
    item.courseId ||
    item.itemId ||
    ""
  );

}


function progressActionUrl(item){

  const id =
    progressCourseId(item);

  if(!id){
    return "speakhub.html";
  }


  if(isExternalProgress(item)){
    return (
      `course-details.html?id=${encodeURIComponent(id)}`
    );
  }


  return (
    `course-player.html?id=${encodeURIComponent(id)}`
  );

}


/* External learning is tracked through the authenticated Platform API.
   Provider credentials remain external; SpeakHub stores only pathway
   status and verification metadata needed for the learner record. */
function externalReviewStatus(item){

  const value =
    normalize(
      item.verificationStatus ||
      item.status ||
      ""
    );

  if(["approved","verified"].includes(value)){
    return "approved";
  }

  if(value === "rejected"){
    return "rejected";
  }

  if(value === "resubmission_required"){
    return "resubmission_required";
  }

  if(value === "started" || value === "not_submitted"){
    return "started";
  }

  return "pending";

}


function progressCard(item){

  const percent =
    progressPercent(item);

  const external =
    isExternalProgress(item);

  const completed =
    isCompletedProgress(item);

  const url =
    progressActionUrl(item);

  const target = "";

  const reviewStatus =
    external
    ? externalReviewStatus(item)
    : "";

  const courseIdForResubmit =
    encodeURIComponent(
      progressCourseId(item)
    );


  return `
    <div class="mini-item">

      <div class="item-head">

        <div>
          <strong>
            ${escapeHtml(
              item.title ||
              item.courseTitle ||
              "Learning Item"
            )}
          </strong>

          <div class="item-meta">

            ${
              item.provider
              ? `<span>${escapeHtml(item.provider)}</span>`
              : ""
            }

            ${
              item.category
              ? `<span>${escapeHtml(pretty(item.category))}</span>`
              : ""
            }

            ${
              external
              ? `<span>External Provider</span>`
              : `<span>SpeakHub</span>`
            }

          </div>

        </div>

        ${pill(
          completed
          ? "completed"
          : item.status ||
            "in-progress"
        )}

      </div>


      ${
        !external
        ? `
          <div class="progress-track">
            <div
              class="progress-bar"
              style="width:${percent}%"
            ></div>
          </div>

          <div class="progress-label">
            ${percent}% complete
          </div>
        `
        : `
          <p class="progress-label">
            ${
              reviewStatus === "approved"
              ? "SpeakOut has verified this external achievement."
              : reviewStatus === "pending"
                ? "Certificate submitted. Awaiting SpeakOut verification."
                : reviewStatus === "started"
                  ? "Started on the provider platform. Return here when you are ready to submit completion evidence."
                  : `This submission needs another look.${
                    item.reviewerFeedback
                    ? ` Reviewer note: ${escapeHtml(item.reviewerFeedback)}`
                    : ""
                  }`
            }
          </p>
        `
      }


      <div class="item-actions">

        ${
          !external
          ? `
            <a
              class="btn ${completed ? "soft" : "primary"}"
              href="${escapeHtml(url)}"
              ${target}
            >
              ${completed ? "View Course" : "Continue Course"}
            </a>
          `
          : reviewStatus === "approved"
            ? `
              <a class="btn soft" href="certificate-view.html?id=${encodeURIComponent(item.certificateId || "")}">
                View SpeakOut Certificate
              </a>
            `
            : reviewStatus === "pending"
              ? `<a class="btn soft" href="${escapeHtml(url)}">View Pathway</a><span class="btn soft" aria-disabled="true">Verification Pending</span>`
              : reviewStatus === "started"
                ? `<a class="btn soft" href="${escapeHtml(url)}">View Pathway</a><a class="btn primary" href="external-learning-submit.html?courseId=${courseIdForResubmit}">Submit Completion</a>`
                : `
                  <a class="btn soft" href="${escapeHtml(url)}">View Pathway</a>
                  <a class="btn primary" href="external-learning-submit.html?courseId=${courseIdForResubmit}">
                    Resubmit Certificate
                  </a>
                `
        }

      </div>

    </div>
  `;

}


/* =========================================================
   CERTIFICATES
========================================================= */

function certificateCard(record,docId){

  const publicId =
    record.certificateId ||
    record.certificateNumber ||
    record.verificationCode ||
    docId;


  const status =
    normalize(
      record.verificationStatus ||
      record.status ||
      "verified"
    );


  const issuer =
    record.issuer ||
    record.certificateIssuer ||
    record.provider ||
    "SpeakOut / SpeakHub";


  return `
    <div class="mini-item">

      <div class="item-head">

        <div>

          <strong>
            ${escapeHtml(
              record.title ||
              record.certificateTitle ||
              record.courseTitle ||
              "Certificate"
            )}
          </strong>

          <div class="item-meta">

            <span>
              ${escapeHtml(issuer)}
            </span>

            <span>
              ${escapeHtml(
                formatDate(
                  record.issueDate ||
                  record.issuedAt ||
                  record.completionDate ||
                  record.createdAt
                )
              )}
            </span>

          </div>

        </div>

        ${pill(
          status ||
          "verified"
        )}

      </div>


      <div class="item-actions">

        <a
          class="btn soft"
          href="certificate-view.html?id=${encodeURIComponent(publicId)}"
        >
          View Certificate
        </a>

      </div>

    </div>
  `;

}


/* =========================================================
   LOAD DASHBOARD DATA
========================================================= */

async function loadCertificates(){

  try{

    const byRecipientId =
      await getDocs(
        query(
          collection(
            db,
            "certificates"
          ),
          where(
            "recipientId",
            "==",
            currentUser.uid
          )
        )
      );


    let docs =
      byRecipientId.docs;


    /*
      Compatibility fallback for certificate schemas using userId.
    */

    if(!docs.length){

      const byUserId =
        await getDocs(
          query(
            collection(
              db,
              "certificates"
            ),
            where(
              "userId",
              "==",
              currentUser.uid
            )
          )
        );


      docs =
        byUserId.docs;

    }


    certificateCount.textContent =
      docs.length;


    certificateList.innerHTML =
      docs.length
      ? docs
          .slice(0,8)
          .map(
            document=>
              certificateCard(
                document.data(),
                document.id
              )
          )
          .join("")
      : `
        <div class="notice warn">
          No certificate yet.
        </div>
      `;


  }catch(error){

    console.error(
      "Certificate load failed:",
      error
    );


    certificateList.innerHTML = `
      <div class="notice bad">
        Could not load certificates.
      </div>
    `;

  }

}


async function loadProgress(){

  try{

    const dashboard=await learningApi.dashboard();

    const internalProgress=(dashboard.progress||[])
      .filter(isCourseProgress)
      .filter(item=>!isExternalProgress(item));

    const externalProgress=(dashboard.externalLearning||[]).map(record=>({
      ...record,
      type:"external-course",
      courseType:"external",
      completionMethod:"certificate-upload",
      title:record.courseTitle,
      category:record.courseCategory,
      externalUrl:record.providerCourseUrl
    }));

    const courseProgress=[...internalProgress,...externalProgress];

    const completed=courseProgress.filter(isCompletedProgress);

    const activeInternal=internalProgress.filter(item=>!isCompletedProgress(item));

    courseStartedCount.textContent=courseProgress.length;
    courseCompletedCount.textContent=completed.length;
    externalCourseCount.textContent=externalProgress.length;

    progressList.innerHTML=activeInternal.length
      ? activeInternal.slice(0,8).map(progressCard).join("")
      : `<div class="notice warn">No active SpeakHub course progress yet.</div>`;

    completedList.innerHTML=completed.length
      ? completed.slice(0,8).map(progressCard).join("")
      : `<div class="notice warn">No completed courses yet.</div>`;

    externalList.innerHTML=externalProgress.length
      ? externalProgress.slice(0,8).map(progressCard).join("")
      : `<div class="notice warn">No external learning records yet.</div>`;

  }catch(error){

    console.error("Progress load failed:",error);

    progressList.innerHTML=`<div class="notice bad">Could not load progress.</div>`;
    completedList.innerHTML=`<div class="notice bad">Could not load completed learning.</div>`;
    externalList.innerHTML=`<div class="notice bad">Could not load external learning.</div>`;

  }

}


async function loadParentRequests(){

  try{

    /*
      Current system historically stores studentId as the Firebase UID
      in parentStudentLinks. Keep that as primary behavior.
    */

    const requestSnap =
      await getDocs(
        query(
          collection(
            db,
            "parentStudentLinks"
          ),
          where(
            "studentId",
            "==",
            currentUser.uid
          ),
          where(
            "status",
            "==",
            "pending"
          )
        )
      );


    pendingParentCount.textContent =
      requestSnap.size;


  }catch(error){

    console.warn(
      "Parent request count failed:",
      error
    );


    pendingParentCount.textContent =
      "0";

  }

}


async function loadStats(){

  await Promise.all([
    loadCertificates(),
    loadProgress(),
    loadParentRequests()
  ]);

}


/* =========================================================
   PROFILE EVENTS
========================================================= */

profilePhoto.addEventListener(
  "change",
  async ()=>{

    if(
      profilePhoto.files &&
      profilePhoto.files[0]
    ){

      try{

        profilePhotoPreview.src =
          await compressPhoto(
            profilePhoto.files[0]
          );

      }catch(error){

        show(
          error.message,
          "bad"
        );

      }

    }

  }
);


profileForm.addEventListener(
  "submit",
  async event=>{

    event.preventDefault();


    try{

      let photoData =
        profile.photoData ||
        "";


      if(
        profilePhoto.files &&
        profilePhoto.files[0]
      ){

        photoData =
          await compressPhoto(
            profilePhoto.files[0]
          );

      }


      const updated = {

        firstName:
          document
            .getElementById("firstName")
            .value
            .trim(),

        lastName:
          document
            .getElementById("lastName")
            .value
            .trim(),

        phone:
          document
            .getElementById("phone")
            .value
            .trim(),

        country:
          document
            .getElementById("country")
            .value
            .trim(),

        state:
          document
            .getElementById("state")
            .value
            .trim(),

        city:
          document
            .getElementById("city")
            .value
            .trim(),

        occupation:
          document
            .getElementById("occupation")
            .value
            .trim(),

        bio:
          document
            .getElementById("bio")
            .value
            .trim(),

        photoData,

        profileCompleted:
          true,

        updatedAt:
          serverTimestamp()
      };


      await setDoc(
        doc(
          db,
          "users",
          currentUser.uid
        ),
        updated,
        {
          merge:true
        }
      );


      profile = {
        ...profile,
        ...updated
      };


      renderProfile(
        currentUser,
        profile
      );


      show(
        "Profile updated successfully.",
        "ok"
      );


    }catch(error){

      console.error(
        error
      );


      show(
        error.message ||
        "Profile update failed.",
        "bad"
      );

    }

  }
);


/* =========================================================
   AUTH / ROLE GUARD
========================================================= */

requireRoles(
  ["student"],
  async (user,p)=>{

    if(
      normalize(
        p.role
      ) !== "student"
    ){

      location.href =
        "auth.html";

      return;

    }


    await ensureStudentId(
      user,
      p
    );


    renderProfile(
      user,
      p
    );


    await loadStats();


    show(
      "Dashboard loaded.",
      "ok"
    );

  }
);
