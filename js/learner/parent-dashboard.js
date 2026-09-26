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
  where,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
import { learningApi, roleApi } from "../platform-api.js";
import { escapeHtml, formatDisplayDate as formatDate, normalize, prettyLabel as pretty, setFieldValue as setVal, statusPill as pill } from "./ui-utils.js";


let currentUser = null;
let profile = null;
let linkedChildren = [];


const statusBox = document.getElementById("statusBox");
const profileAlert = document.getElementById("profileAlert");
const pills = document.getElementById("pills");
const welcomeTitle = document.getElementById("welcomeTitle");

const nameBox = document.getElementById("nameBox");
const schoolBox = document.getElementById("schoolBox");
const childrenCountBox = document.getElementById("childrenCountBox");
const approvedChildrenBox = document.getElementById("approvedChildrenBox");
const pendingChildrenBox = document.getElementById("pendingChildrenBox");
const certificateCountBox = document.getElementById("certificateCountBox");
const parentCourseStartedBox = document.getElementById("parentCourseStartedBox");
const parentCourseCompletedBox = document.getElementById("parentCourseCompletedBox");

const childrenBox = document.getElementById("childrenBox");
const parentProgressList = document.getElementById("parentProgressList");
const certificateList = document.getElementById("certificateList");
const workshopList = document.getElementById("workshopList");
const childActivityList = document.getElementById("childActivityList");

const profilePhoto = document.getElementById("profilePhoto");
const profilePhotoPreview = document.getElementById("profilePhotoPreview");
const profileForm = document.getElementById("profileForm");


function show(message,type=""){
  statusBox.textContent = message;
  statusBox.className = `notice ${type}`;
}


function fullName(data,user){
  return (
    (
      data.firstName ||
      data.fullName ||
      user?.email ||
      "Parent"
    ) +
    " " +
    (
      data.lastName ||
      ""
    )
  ).trim();
}


/* =========================================================
   IMAGE
========================================================= */

async function compressPhoto(file){

  return new Promise((resolve,reject)=>{

    if(!file.type.startsWith("image/")){
      reject(new Error("Please upload an image file."));
      return;
    }

    const img = new Image();
    const reader = new FileReader();

    reader.onload = event => {
      img.src = event.target.result;
    };

    img.onload = () => {

      const max = 300;

      let width = img.width;
      let height = img.height;

      if(width > height && width > max){
        height = Math.round(height * max / width);
        width = max;
      }else if(height > width && height > max){
        width = Math.round(width * max / height);
        height = max;
      }else if(width > max){
        width = max;
        height = max;
      }

      const canvas = document.createElement("canvas");

      canvas.width = width;
      canvas.height = height;

      canvas
        .getContext("2d")
        .drawImage(
          img,
          0,
          0,
          width,
          height
        );

      const data = canvas.toDataURL("image/jpeg",.65);

      if(data.length > 260000){
        reject(
          new Error(
            "Image is still too large. Please choose a smaller photo."
          )
        );
        return;
      }

      resolve(data);
    };

    img.onerror = () => reject(new Error("Could not read image."));

    reader.readAsDataURL(file);
  });
}


/* =========================================================
   PROFILE
========================================================= */

function renderProfile(user,data){

  currentUser = user;
  profile = data;

  renderRoleNav(data,"Dashboard");

  pills.innerHTML =
    pill(data.role) +
    pill(data.status) +
    pill(data.schoolCode || "individual");

  nameBox.textContent = fullName(data,user);

  schoolBox.textContent =
    data.schoolName ||
    data.schoolCode ||
    "Individual Access";

  welcomeTitle.textContent =
    `Welcome, ${
      data.firstName ||
      data.fullName ||
      "Parent"
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
  ].forEach(
    key => setVal(key,data[key] || "")
  );

  profilePhotoPreview.src =
    data.photoData ||
    data.photoURL ||
    "logo.png";

  profileAlert.innerHTML =
    data.profileCompleted
      ? ""
      : `
        <div class="notice warn">
          Please complete your profile details so schools, workshops and certificates can display correctly.
        </div>
      `;
}


/* =========================================================
   PROGRESS HELPERS
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
  const type = normalize(item.type);

  return (
    type === "course" ||
    type === "external-course" ||
    Boolean(item.courseId)
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


function isExternalProgress(item){
  return (
    normalize(item.type) === "external-course" ||
    normalize(item.courseType) === "external" ||
    normalize(item.completionMethod) === "certificate-upload"
  );
}


function progressCard(item){

  const percent = progressPercent(item);
  const completed = isCompletedProgress(item);
  const external = isExternalProgress(item);

  const courseId =
    item.courseId ||
    item.itemId ||
    "";

  const url = external
    ? `course-details.html?id=${encodeURIComponent(courseId)}`
    : (
        courseId
          ? `course-player.html?id=${encodeURIComponent(courseId)}`
          : "speakhub.html"
      );

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
              ${external ? "External Provider" : "SpeakHub"}
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
          class="btn ${completed ? "soft" : "primary"}"
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

        ${pill(status || "verified")}

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

  return `
    <div class="mini-item">

      <div class="item-head">

        <div>

          <strong>
            ${escapeHtml(
              item.title ||
              item.name ||
              "Workshop"
            )}
          </strong>

          <div class="item-meta">

            <span>
              ${escapeHtml(
                formatDate(
                  item.date ||
                  item.startDate ||
                  item.startAt ||
                  item.createdAt
                )
              )}
            </span>

            ${
              item.schoolName
                ? `<span>${escapeHtml(item.schoolName)}</span>`
                : ""
            }

          </div>

        </div>

        ${pill(item.status || "planned")}

      </div>

    </div>
  `;
}


/* =========================================================
   CHILDREN
========================================================= */

async function loadChildren(){

  try{

    const snap = await getDocs(
      query(
        collection(db,"parentStudentLinks"),
        where("parentId","==",currentUser.uid)
      )
    );

    let html = "";
    let approved = 0;
    let pending = 0;

    linkedChildren = [];

    for(const document of snap.docs){

      const link = {
        id:document.id,
        ...document.data()
      };

      const status = normalize(link.status);

      if(status === "approved"){
        approved++;
      }

      if(
        status === "pending" ||
        status === "pending_school_approval"
      ){
        pending++;
      }

      let student = null;

      if(link.studentId){
        try{
          const studentSnap = await getDoc(
            doc(
              db,
              "users",
              link.studentId
            )
          );

          if(studentSnap.exists()){
            student = {
              id:studentSnap.id,
              ...studentSnap.data()
            };
          }
        }catch(error){
          console.warn("Could not load child profile:",error);
        }
      }

      linkedChildren.push({
        link,
        student
      });

      const studentName = student
        ? `${student.firstName || student.fullName || "Student"} ${student.lastName || ""}`.trim()
        : "Student";

      const studentPhoto =
        student?.photoData ||
        student?.photoURL ||
        "logo.png";

      const studentCode =
        student?.studentId ||
        link.studentCode ||
        link.studentId ||
        "—";

      const classLevel =
        student?.classLevel ||
        student?.occupation ||
        "—";

      const school =
        student?.schoolName ||
        student?.schoolCode ||
        link.schoolCode ||
        "—";

      html += `
        <div class="card child-card">

          <div class="profile-row">

            <img
              class="avatar"
              src="${escapeHtml(studentPhoto)}"
              alt="Student photo"
            >

            <div style="flex:1;min-width:220px">

              <h3>
                ${escapeHtml(studentName)}
              </h3>

              <p>
                <b>Student ID:</b>
                ${escapeHtml(studentCode)}
              </p>

              <p>
                <b>Class:</b>
                ${escapeHtml(classLevel)}
              </p>

              <p>
                <b>School:</b>
                ${escapeHtml(school)}
              </p>

              <p>
                <b>Relationship:</b>
                ${escapeHtml(
                  link.relationship ||
                  "Guardian"
                )}
              </p>

              ${pill(
                link.status ||
                "pending"
              )}

              <div
                class="actions"
                style="margin-top:10px"
              >

                ${
                  status === "approved" && link.studentId
                    ? `
                      <a
                        class="btn primary"
                        href="child-progress.html?studentId=${encodeURIComponent(link.studentId)}"
                      >
                        View Progress
                      </a>
                    `
                    : `
                      <span class="btn soft">
                        Awaiting Approval
                      </span>
                    `
                }

              </div>

            </div>

          </div>

        </div>
      `;

    }


    childrenCountBox.textContent =
      snap.size;

    approvedChildrenBox.textContent =
      approved;

    pendingChildrenBox.textContent =
      pending;


    childrenBox.innerHTML =
      html ||
      `
        <div class="notice warn">
          No child linked yet. Use My Children to link your child using their Student ID.
        </div>
      `;


  }catch(error){

    console.error("Linked children load failed:",error);

    childrenBox.innerHTML = `
      <div class="notice bad">
        Could not load linked children.
      </div>
    `;

  }
}


/* =========================================================
   PARENT LEARNING
========================================================= */

async function loadParentProgress(){

  try{

    const dashboard=await learningApi.dashboard();

    const internal=(dashboard.progress||[])
      .filter(isCourseProgress)
      .filter(item=>!isExternalProgress(item));

    const external=(dashboard.externalLearning||[]).map(record=>({
      ...record,
      type:"external-course",
      courseType:"external",
      completionMethod:"certificate-upload",
      title:record.courseTitle,
      category:record.courseCategory,
      externalUrl:record.providerCourseUrl
    }));

    const courses=[...internal,...external];

    parentCourseStartedBox.textContent=courses.length;
    parentCourseCompletedBox.textContent=courses.filter(isCompletedProgress).length;

    parentProgressList.innerHTML=courses.length
      ? courses.slice(0,8).map(progressCard).join("")
      : `<div class="notice warn">No parent course progress yet.</div>`;

  }catch(error){

    console.error("Parent progress load failed:",error);

    parentProgressList.innerHTML=`
      <div class="notice bad">
        Could not load parent learning progress.
      </div>
    `;

  }
}


/* =========================================================
   CHILD ACTIVITY
========================================================= */

async function loadChildActivity(){

  try{

    const overview = await roleApi.overview();

    const approvedLinks =
      (overview.subjects || []).map(student=>({
        student,
        link:{status:"approved",studentId:student.id}
      }));


    if(!approvedLinks.length){

      childActivityList.innerHTML = `
        <div class="notice warn">
          No approved child links available for learning activity.
        </div>
      `;

      return;
    }


    const cards = [];


    for(const item of approvedLinks){

      const studentId =
        item.link.studentId;

      const studentName =
        item.student
          ? `${item.student.firstName || item.student.fullName || "Student"} ${item.student.lastName || ""}`.trim()
          : "Student";


      try{

        const courseProgress =
          (overview.progress || [])
            .filter(item=>item.userId===studentId)
            .filter(
              isCourseProgress
            );


        const started =
          courseProgress.length;


        const completed =
          courseProgress.filter(
            isCompletedProgress
          ).length;


        cards.push(`
          <div class="mini-item">

            <div class="item-head">

              <div>

                <strong>
                  ${escapeHtml(studentName)}
                </strong>

                <div class="item-meta">
                  <span>${started} courses started</span>
                  <span>${completed} completed</span>
                </div>

              </div>

              ${pill("approved")}

            </div>


            <div class="item-actions">

              <a
                class="btn primary"
                href="child-progress.html?studentId=${encodeURIComponent(studentId)}"
              >
                View Full Progress
              </a>

            </div>

          </div>
        `);


      }catch(error){

        cards.push(`
          <div class="mini-item">
            <strong>${escapeHtml(studentName)}</strong>
            <p class="progress-label">
              Progress summary could not be loaded.
            </p>
          </div>
        `);

      }

    }


    childActivityList.innerHTML =
      cards.join("") ||
      `
        <div class="notice warn">
          No child learning activity found.
        </div>
      `;


  }catch(error){

    console.error("Child activity load failed:",error);

    childActivityList.innerHTML = `
      <div class="notice bad">
        Could not load child learning activity.
      </div>
    `;

  }
}


/* =========================================================
   CERTIFICATES
========================================================= */

async function loadCertificates(){

  try{

    const dashboard = await learningApi.dashboard();
    const certificates = dashboard.certificates || [];

    certificateCountBox.textContent =
      certificates.length;

    certificateList.innerHTML =
      certificates.length
        ? certificates
            .slice(0,8)
            .map(
              certificate=>
                certificateCard(
                  certificate,
                  certificate.id
                )
            )
            .join("")
        : `
          <div class="notice warn">
            No certificates yet.
          </div>
        `;


  }catch(error){

    console.error("Certificate load failed:",error);

    certificateCountBox.textContent =
      "0";

    certificateList.innerHTML = `
      <div class="notice bad">
        Could not load certificates.
      </div>
    `;

  }
}


/* =========================================================
   WORKSHOPS
========================================================= */

async function loadWorkshops(){

  try{

    const snap =
      await getDocs(
        collection(
          db,
          "workshops"
        )
      );

    const items = [];

    snap.forEach(document=>{

      const item = {
        id:document.id,
        ...document.data()
      };

      const audiences =
        Array.isArray(item.audience)
          ? item.audience.map(normalize)
          : [normalize(item.audience)];

      const parentVisible =
        audiences.some(
          audience =>
            [
              "parent",
              "parents",
              "family",
              "families",
              "school",
              "all",
              "general",
              ""
            ].includes(audience)
        );

      const sameSchool =
        !item.schoolCode ||
        !profile?.schoolCode ||
        item.schoolCode === profile.schoolCode;

      if(parentVisible && sameSchool){
        items.push(item);
      }

    });


    items.sort((a,b)=>{

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
    });


    const upcoming =
      items.filter(
        item =>
          ![
            "completed",
            "cancelled",
            "canceled"
          ].includes(
            normalize(item.status)
          )
      );


    workshopList.innerHTML =
      upcoming.length
        ? upcoming
            .slice(0,6)
            .map(workshopCard)
            .join("")
        : `
          <div class="notice warn">
            No upcoming parent workshops found.
          </div>
        `;


  }catch(error){

    console.warn("Workshop load failed:",error);

    workshopList.innerHTML = `
      <div class="notice warn">
        Workshop data is not available yet.
      </div>
    `;

  }
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
          document.getElementById("firstName").value.trim(),

        lastName:
          document.getElementById("lastName").value.trim(),

        phone:
          document.getElementById("phone").value.trim(),

        country:
          document.getElementById("country").value.trim(),

        state:
          document.getElementById("state").value.trim(),

        city:
          document.getElementById("city").value.trim(),

        occupation:
          document.getElementById("occupation").value.trim(),

        bio:
          document.getElementById("bio").value.trim(),

        photoData,

        profileCompleted:true,

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

      console.error(error);

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
  ["parent"],
  async (user,data)=>{

    const role =
      normalize(
        data.role
      );

    if(
      role !== "parent" &&
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

    await loadChildren();

    await Promise.all([
      loadCertificates(),
      loadParentProgress(),
      loadWorkshops(),
      loadChildActivity()
    ]);

    show(
      "Dashboard loaded.",
      "ok"
    );

  }
);
