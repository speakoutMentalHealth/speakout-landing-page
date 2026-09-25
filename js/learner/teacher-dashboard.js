import {
  requireRoles,
  renderRoleNav
} from "./launch-role-guard.js";

import {
  db
} from "./firebase-config.js";

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

const schoolBox =
  document.getElementById("schoolBox");

const certificateCount =
  document.getElementById("certificateCount");

const studentCount =
  document.getElementById("studentCount");

const courseStartedCount =
  document.getElementById("courseStartedCount");

const courseCompletedCount =
  document.getElementById("courseCompletedCount");

const externalCourseCount =
  document.getElementById("externalCourseCount");

const workshopCount =
  document.getElementById("workshopCount");

const progressList =
  document.getElementById("progressList");

const completedList =
  document.getElementById("completedList");

const certificateList =
  document.getElementById("certificateList");

const workshopList =
  document.getElementById("workshopList");

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


function normalize(value){

  return String(value || "")
    .trim()
    .toLowerCase();

}


function escapeHtml(value){

  return String(value ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");

}


function pretty(value){

  if(!value){
    return "—";
  }

  return String(value)
    .replaceAll("-"," ")
    .replace(/\b\w/g,letter=>letter.toUpperCase());

}


function pill(value){

  const className =
    normalize(value)
      .replace(/[^a-z0-9_-]/g,"-");

  return `
    <span class="pill ${className}">
      ${escapeHtml(pretty(value))}
    </span>
  `;

}


function setVal(id,value){

  const el =
    document.getElementById(id);

  if(el){
    el.value =
      value || "";
  }

}


function formatDate(value){

  if(!value){
    return "—";
  }

  try{

    const date =
      value?.toDate
      ? value.toDate()
      : new Date(value);

    if(Number.isNaN(date.getTime())){
      return String(value);
    }

    return date.toLocaleDateString(
      undefined,
      {
        year:"numeric",
        month:"short",
        day:"numeric"
      }
    );

  }catch{
    return String(value);
  }

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

function renderProfile(user,data){

  currentUser =
    user;

  profile =
    data;


  renderRoleNav(
    data,
    "Dashboard"
  );


  pills.innerHTML =
    pill(data.role) +
    pill(data.status) +
    pill(
      data.schoolCode ||
      "individual"
    );


  const fullName =
    (
      (
        data.firstName ||
        data.fullName ||
        user.email ||
        "Teacher"
      ) +
      " " +
      (
        data.lastName ||
        ""
      )
    ).trim();


  nameBox.textContent =
    fullName;


  schoolBox.textContent =
    data.schoolName ||
    data.schoolCode ||
    "Individual Access";


  welcomeTitle.textContent =
    `Welcome, ${
      data.firstName ||
      data.fullName ||
      "Teacher"
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
  .forEach(
    key=>
      setVal(
        key,
        data[key] || ""
      )
  );


  profilePhotoPreview.src =
    data.photoData ||
    data.photoURL ||
    "logo.png";


  profileWarning.classList.toggle(
    "hidden",
    Boolean(
      data.profileCompleted
    )
  );

}


/* =========================================================
   PROGRESS
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


function progressActionUrl(item){

  const id =
    item.courseId ||
    item.itemId ||
    "";

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

            <span>
              ${
                external
                ? "External Provider"
                : "SpeakHub"
              }
            </span>

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
              completed
                ? "External learning verified and recorded."
                : normalize(item.status)==="pending_review"
                  ? "Completion evidence is awaiting SpeakHub review."
                  : "External learning is in progress. Open the pathway to continue or submit completion evidence."
            }
          </p>
        `
      }


      <div class="item-actions">

        <a
          class="btn ${
            completed
              ? "soft"
              : "primary"
          }"
          href="${escapeHtml(url)}"
          ${target}
        >
          ${
            completed
              ? (external ? "View Pathway" : "View Course")
              : external
                ? "View Pathway"
                : "Continue Course"
          }
        </a>

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
              record.trainingTitle ||
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
   WORKSHOPS
========================================================= */

function workshopCard(item){

  const title =
    item.title ||
    item.name ||
    "Workshop";

  const status =
    item.status ||
    "planned";

  const date =
    item.date ||
    item.startDate ||
    item.startAt ||
    item.createdAt;


  return `
    <div class="mini-item">

      <div class="item-head">

        <div>

          <strong>
            ${escapeHtml(title)}
          </strong>

          <div class="item-meta">

            <span>
              ${escapeHtml(formatDate(date))}
            </span>

            ${
              item.schoolName
              ? `<span>${escapeHtml(item.schoolName)}</span>`
              : ""
            }

          </div>

        </div>

        ${pill(status)}

      </div>

    </div>
  `;

}


/* =========================================================
   DATA LOADERS
========================================================= */

async function loadCertificates(){

  try{

    let snap =
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


    if(snap.empty){

      snap =
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

    }


    const docs =
      snap.docs;


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
            No certificates yet.
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
    const activeLearning=courseProgress.filter(item=>!isCompletedProgress(item));

    courseStartedCount.textContent=courseProgress.length;
    courseCompletedCount.textContent=completed.length;
    externalCourseCount.textContent=externalProgress.length;

    progressList.innerHTML=activeLearning.length
      ? activeLearning.slice(0,8).map(progressCard).join("")
      : `<div class="notice warn">No active teacher course progress yet.</div>`;

    completedList.innerHTML=completed.length
      ? completed.slice(0,8).map(progressCard).join("")
      : `<div class="notice warn">No completed learning yet.</div>`;

  }catch(error){

    console.error("Progress load failed:",error);

    progressList.innerHTML=`<div class="notice bad">Could not load course progress.</div>`;
    completedList.innerHTML=`<div class="notice bad">Could not load completed learning.</div>`;

  }

}


async function loadStudents(){

  try{

    /*
      Primary compatibility path:
      teacher-student records linked directly by teacherId.
    */

    let snap =
      await getDocs(
        query(
          collection(
            db,
            "teacherStudents"
          ),
          where(
            "teacherId",
            "==",
            currentUser.uid
          )
        )
      );


    /*
      Fallback:
      if teacherStudents is not used, count approved students in same school.
    */

    if(
      snap.empty &&
      profile?.schoolCode
    ){

      const schoolStudents =
        await getDocs(
          query(
            collection(
              db,
              "users"
            ),
            where(
              "schoolCode",
              "==",
              profile.schoolCode
            ),
            where(
              "role",
              "==",
              "student"
            )
          )
        );


      studentCount.textContent =
        schoolStudents.size;

      return;

    }


    studentCount.textContent =
      snap.size;


  }catch(error){

    console.warn(
      "Student count failed:",
      error
    );


    studentCount.textContent =
      "0";

  }

}


async function loadWorkshops(){

  try{

    let all = [];


    const snap =
      await getDocs(
        collection(
          db,
          "workshops"
        )
      );


    snap.forEach(
      document=>{

        const item = {
          id:document.id,
          ...document.data()
        };


        const audiences =
          Array.isArray(item.audience)
            ? item.audience.map(normalize)
            : [normalize(item.audience)];


        const teacherVisible =
          audiences.some(
            audience =>
              [
                "teacher",
                "teachers",
                "school",
                "all",
                "general",
                ""
              ].includes(
                audience
              )
          );


        const sameSchool =
          !item.schoolCode ||
          !profile?.schoolCode ||
          item.schoolCode ===
          profile.schoolCode;


        if(
          teacherVisible &&
          sameSchool
        ){
          all.push(item);
        }

      }
    );


    all.sort(
      (a,b)=>{

        const dateA =
          new Date(
            a.date ||
            a.startDate ||
            0
          ).getTime();

        const dateB =
          new Date(
            b.date ||
            b.startDate ||
            0
          ).getTime();


        return dateA - dateB;

      }
    );


    const upcoming =
      all.filter(
        item =>
          ![
            "completed",
            "cancelled",
            "canceled"
          ].includes(
            normalize(
              item.status
            )
          )
      );


    workshopCount.textContent =
      upcoming.length;


    workshopList.innerHTML =
      upcoming.length
        ? upcoming
            .slice(0,6)
            .map(workshopCard)
            .join("")
        : `
          <div class="notice warn">
            No upcoming workshops found.
          </div>
        `;


  }catch(error){

    console.warn(
      "Workshop load failed:",
      error
    );


    workshopCount.textContent =
      "0";


    workshopList.innerHTML = `
      <div class="notice warn">
        Workshop data is not available yet.
      </div>
    `;

  }

}


async function loadDashboardData(){

  await Promise.all([
    loadCertificates(),
    loadProgress(),
    loadStudents(),
    loadWorkshops()
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


      const updatedProfile = {

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
        updatedProfile,
        {
          merge:true
        }
      );


      profile = {
        ...profile,
        ...updatedProfile
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
  ["teacher"],
  async (user,data)=>{

    const role =
      normalize(
        data.role
      );


    if(
      role !== "teacher" &&
      role !== "admin" &&
      role !== "super_admin"
    ){

      location.href =
        "auth.html";

      return;

    }


    renderProfile(
      user,
      data
    );


    await loadDashboardData();


    show(
      "Dashboard loaded.",
      "ok"
    );

  }
);
