import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const EXTERNAL_COURSES = [
  {
    "id": "ext-kaggle-intro-machine-learning",
    "title": "Intro to Machine Learning",
    "courseType": "external",
    "provider": "Kaggle",
    "providerLogo": "",
    "category": "ai-data",
    "audience": [
      "secondary",
      "university",
      "young-professionals",
      "adults",
      "general"
    ],
    "difficulty": "beginner",
    "duration": "Self-paced",
    "description": "Learn the core ideas of machine learning and build your first models on Kaggle's official learning platform.",
    "status": "active",
    "featured": true,
    "free": true,
    "accessType": "free",
    "certificateEligible": true,
    "externalUrl": "https://www.kaggle.com/learn/intro-to-machine-learning",
    "completionMethod": "certificate-upload",
    "certificate": {
      "available": true,
      "issuer": "Kaggle",
      "verificationRequired": true,
      "uploadRequired": true
    },
    "outcomes": [
      "Understand basic machine learning model concepts",
      "Explore and prepare data for simple models",
      "Build and validate introductory machine learning models"
    ],
    "prerequisites": [
      "Basic familiarity with Python is helpful."
    ]
  },
  {
    "id": "ext-freecodecamp-python-certification",
    "title": "Python Certification",
    "courseType": "external",
    "provider": "freeCodeCamp",
    "providerLogo": "",
    "category": "programming",
    "audience": [
      "secondary",
      "university",
      "young-professionals",
      "adults",
      "general"
    ],
    "difficulty": "beginner",
    "duration": "Self-paced",
    "description": "Learn Python fundamentals and complete the required projects toward freeCodeCamp's Python certification pathway.",
    "status": "active",
    "featured": true,
    "free": true,
    "accessType": "free",
    "certificateEligible": true,
    "externalUrl": "https://www.freecodecamp.org/learn/python-v9",
    "completionMethod": "certificate-upload",
    "certificate": {
      "available": true,
      "issuer": "freeCodeCamp",
      "verificationRequired": true,
      "uploadRequired": true
    },
    "outcomes": [
      "Understand core Python syntax and programming concepts",
      "Work with variables, functions, data structures and control flow",
      "Complete practical projects toward the provider's certification"
    ],
    "prerequisites": [
      "No previous programming experience is required."
    ]
  },
  {
    "id": "ext-cisco-intro-cybersecurity",
    "title": "Introduction to Cybersecurity",
    "courseType": "external",
    "provider": "Cisco Networking Academy / Skills for All",
    "providerLogo": "",
    "category": "ict-cybersecurity",
    "audience": [
      "secondary",
      "university",
      "teachers",
      "young-professionals",
      "adults",
      "general"
    ],
    "difficulty": "beginner",
    "duration": "6 hours",
    "description": "Build foundational cybersecurity awareness, understand common threats and learn essential security practices on Cisco's official Skills for All platform.",
    "status": "active",
    "featured": true,
    "free": true,
    "accessType": "free",
    "certificateEligible": true,
    "externalUrl": "https://skillsforall.com/course/introduction-to-cybersecurity",
    "completionMethod": "certificate-upload",
    "certificate": {
      "available": true,
      "issuer": "Cisco Networking Academy / Skills for All",
      "verificationRequired": true,
      "uploadRequired": true
    },
    "outcomes": [
      "Understand core cybersecurity concepts",
      "Recognize common threats and vulnerabilities",
      "Apply basic privacy and security best practices"
    ],
    "prerequisites": [
      "No prior cybersecurity experience is required."
    ]
  },
  {
    "id": "ext-openlearn-leadership-followership",
    "title": "Leadership and Followership",
    "courseType": "external",
    "provider": "OpenLearn - The Open University",
    "providerLogo": "",
    "category": "leadership",
    "audience": [
      "secondary",
      "university",
      "teachers",
      "parents",
      "young-professionals",
      "ngo-professionals",
      "adults",
      "general"
    ],
    "difficulty": "beginner",
    "duration": "Self-paced",
    "description": "Explore leadership, followership, common leadership challenges and practical ways to develop your leadership capability through OpenLearn.",
    "status": "active",
    "featured": true,
    "free": true,
    "accessType": "free",
    "certificateEligible": true,
    "externalUrl": "https://www.open.edu/openlearn/education-development/learning/leadership-and-followership/content-section-overview?active-tab=description-tab",
    "completionMethod": "certificate-upload",
    "certificate": {
      "available": true,
      "issuer": "The Open University / OpenLearn",
      "verificationRequired": true,
      "uploadRequired": true
    },
    "outcomes": [
      "Explore what effective leadership means",
      "Recognize common leadership challenges",
      "Identify practical leadership development goals"
    ],
    "prerequisites": [
      "No formal prerequisites."
    ]
  }
];

let adminReady = false;

function normalize(value){
  return String(value || "").trim().toLowerCase();
}

async function requireAdmin(){
  return new Promise((resolve,reject)=>{
    const stop = onAuthStateChanged(auth, async user=>{
      stop();

      if(!user){
        reject(new Error("Please log in as an approved admin first."));
        return;
      }

      const snap = await getDoc(doc(db,"users",user.uid));

      if(!snap.exists()){
        reject(new Error("Admin profile not found."));
        return;
      }

      const profile = snap.data();
      const role = normalize(profile.role);
      const status = normalize(profile.status);

      if(
        !["admin","super_admin"].includes(role) ||
        profile.approved !== true ||
        status !== "approved"
      ){
        reject(new Error("Approved admin access is required."));
        return;
      }

      adminReady = true;
      resolve({user,profile});
    });
  });
}

export async function seedExternalCourses(){
  if(!adminReady){
    await requireAdmin();
  }

  let written = 0;

  for(const item of EXTERNAL_COURSES){
    const { id, ...data } = item;

    await setDoc(
      doc(db,"courses",id),
      {
        ...data,
        seededExternalCourse:true,
        updatedAt:serverTimestamp()
      },
      { merge:true }
    );

    written++;
  }

  return {
    courses:written,
    ids:EXTERNAL_COURSES.map(item=>item.id)
  };
}

window.seedExternalCourses = seedExternalCourses;

requireAdmin()
  .then(()=>{
    window.dispatchEvent(new CustomEvent("external-seed-admin-ready"));
  })
  .catch(error=>{
    window.dispatchEvent(
      new CustomEvent(
        "external-seed-admin-error",
        { detail:error.message }
      )
    );
  });
