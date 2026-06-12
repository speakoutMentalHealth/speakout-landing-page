import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const seedBtn = document.getElementById("seedBtn");
const statusBox = document.getElementById("status");

let currentUser = null;
let adminReady = false;

function setStatus(message, type = "info") {
  statusBox.className = "notice " + type;
  statusBox.textContent = message;
}

async function isAdmin(user) {
  if (!user) return false;
  const snap = await getDoc(doc(db, "users", user.uid));
  return snap.exists() && snap.data().role === "admin";
}

async function archiveCollection(collectionName) {
  const snap = await getDocs(collection(db, collectionName));
  let count = 0;

  for (const item of snap.docs) {
    await updateDoc(doc(db, collectionName, item.id), {
      status: "archived",
      featured: false,
      updatedAt: serverTimestamp()
    });
    count++;
  }

  return count;
}

const LAUNCH_BOOKS = [
  {
    id: "understanding-mental-health",
    title: "Understanding Mental Health",
    author: "SpeakOut Mental Health Outreach",
    category: "mental-health",
    accessType: "free",
    price: 0,
    currency: "₦",
    featured: true,
    status: "active",
    shortDescription: "A clear beginner-friendly guide to mental health, emotional wellbeing, stress, support systems and help-seeking.",
    fullDescription: "This SpeakOut guide introduces mental health in a practical, stigma-free way for students, parents, teachers, volunteers and community members.",
    keyLessons: [
      "Understand what mental health means.",
      "Recognize common signs of emotional distress.",
      "Learn when and how to seek help.",
      "Practice simple daily wellbeing habits."
    ],
    tags: ["mental health", "wellbeing", "awareness"],
    readerHtml: `
      <h1>Understanding Mental Health</h1>
      <p><strong>Published by SpeakOut Mental Health Outreach.</strong> Mental health is the way we think, feel, cope, relate with others and make decisions. It affects school, work, family life, friendships, confidence and wellbeing.</p>
      <h2>Chapter 1: What Mental Health Means</h2>
      <p>Mental health is not only about mental illness. Everyone has mental health, just as everyone has physical health. A person can feel strong in one season and overwhelmed in another. This does not make them weak; it means they are human.</p>
      <h2>Chapter 2: Common Signs of Struggle</h2>
      <ul><li>Constant sadness or worry.</li><li>Loss of interest in normal activities.</li><li>Sleeping too much or too little.</li><li>Anger, withdrawal or hopelessness.</li><li>Difficulty concentrating.</li></ul>
      <h2>Chapter 3: Healthy Support</h2>
      <p>Support may include talking to a trusted adult, school counsellor, health worker, parent, teacher, faith leader or trained professional. In urgent danger, contact emergency services immediately.</p>
      <h2>Reflection</h2>
      <ol><li>What helps me feel emotionally safe?</li><li>Who can I speak to when I feel overwhelmed?</li><li>What habit can I practice this week?</li></ol>
      <h2>Action Plan</h2>
      <p>Choose one daily wellbeing habit: sleep better, drink water, reduce harmful screen time, journal, pray, exercise, talk to someone trusted, or take a quiet break.</p>
    `
  },
  {
    id: "anxiety-and-stress-management",
    title: "Anxiety & Stress Management",
    author: "SpeakOut Mental Health Outreach",
    category: "mental-health",
    accessType: "free",
    price: 0,
    currency: "₦",
    featured: true,
    status: "active",
    shortDescription: "A practical guide for understanding anxiety, managing stress and using calm-down tools safely.",
    fullDescription: "This guide explains the difference between normal stress and overwhelming anxiety, with practical coping tools for young people and adults.",
    keyLessons: [
      "Identify stress triggers.",
      "Understand anxiety symptoms.",
      "Use breathing and grounding tools.",
      "Build a personal stress plan."
    ],
    tags: ["anxiety", "stress", "coping"],
    readerHtml: `
      <h1>Anxiety & Stress Management</h1>
      <p>Anxiety and stress are common human experiences. They become a concern when they interfere with sleep, learning, relationships, decision-making or daily life.</p>
      <h2>Stress vs Anxiety</h2>
      <p>Stress usually comes from pressure: exams, money, conflict, work or expectations. Anxiety can continue even when the pressure is unclear or has passed.</p>
      <h2>Body Signs</h2>
      <ul><li>Fast heartbeat.</li><li>Sweating.</li><li>Restlessness.</li><li>Stomach discomfort.</li><li>Difficulty sleeping.</li></ul>
      <h2>Calm-Down Tools</h2>
      <h3>Box Breathing</h3><p>Breathe in for 4 counts, hold for 4, breathe out for 4, hold for 4. Repeat five times.</p>
      <h3>Grounding</h3><p>Name 5 things you see, 4 things you feel, 3 things you hear, 2 things you smell and 1 safe action you can take.</p>
      <h2>Stress Plan</h2>
      <ol><li>What triggers my stress?</li><li>What warning signs do I notice?</li><li>What healthy action helps?</li><li>Who can I talk to?</li></ol>
    `
  },
  {
    id: "building-resilience",
    title: "Building Resilience",
    author: "SpeakOut Mental Health Outreach",
    category: "mental-health",
    accessType: "free",
    price: 0,
    currency: "₦",
    featured: true,
    status: "active",
    shortDescription: "A resilience guide that helps learners recover from setbacks, build confidence and keep moving forward.",
    fullDescription: "A practical resource for helping young people and adults handle disappointment, pressure, failure and change.",
    keyLessons: [
      "Understand resilience.",
      "Reframe setbacks.",
      "Build support systems.",
      "Create a recovery plan."
    ],
    tags: ["resilience", "confidence", "growth"],
    readerHtml: `
      <h1>Building Resilience</h1>
      <p>Resilience is the ability to recover, adapt and keep growing after difficulty. It does not mean pretending pain does not exist. It means learning how to respond with courage and support.</p>
      <h2>What Resilient People Practice</h2>
      <ul><li>They ask for help.</li><li>They learn from mistakes.</li><li>They rest when tired.</li><li>They try again with better information.</li><li>They do not define themselves by one failure.</li></ul>
      <h2>Setback Reflection</h2>
      <p>When something goes wrong, ask: What happened? What can I learn? What support do I need? What is my next small step?</p>
      <h2>Activity</h2>
      <p>Write down one challenge you survived before. List three strengths that helped you get through it.</p>
      <h2>Resilience Plan</h2>
      <ol><li>My warning signs are...</li><li>My safe people are...</li><li>My calming tools are...</li><li>My next step is...</li></ol>
    `
  },
  {
    id: "youth-leadership-handbook",
    title: "Youth Leadership Handbook",
    author: "SpeakOut Mental Health Outreach",
    category: "leadership",
    accessType: "free",
    price: 0,
    currency: "₦",
    featured: true,
    status: "active",
    shortDescription: "A youth-friendly leadership guide focused on responsibility, service, communication and integrity.",
    fullDescription: "This handbook helps students, ambassadors and young leaders understand leadership as service, responsibility and positive influence.",
    keyLessons: [
      "Lead through service.",
      "Communicate clearly.",
      "Solve problems with integrity.",
      "Build teamwork."
    ],
    tags: ["leadership", "youth", "ambassador"],
    readerHtml: `
      <h1>Youth Leadership Handbook</h1>
      <p>Leadership is not about position, noise or control. It is about influence, service, responsibility and character.</p>
      <h2>Qualities of a Good Young Leader</h2>
      <ul><li>Integrity.</li><li>Respect.</li><li>Courage.</li><li>Listening.</li><li>Teamwork.</li><li>Accountability.</li></ul>
      <h2>Leadership in School</h2>
      <p>A young leader can help classmates, report unsafe behavior, encourage others, protect dignity, organize activities and model good conduct.</p>
      <h2>Communication</h2>
      <p>Good leaders speak clearly, listen carefully and correct people without humiliation.</p>
      <h2>Leadership Challenge</h2>
      <p>Choose one helpful action this week: welcome someone new, encourage a classmate, help organize a club activity or solve a small problem respectfully.</p>
    `
  },
  {
    id: "career-planning-guide",
    title: "Career Planning Guide",
    author: "SpeakOut Mental Health Outreach",
    category: "career",
    accessType: "free",
    price: 0,
    currency: "₦",
    featured: true,
    status: "active",
    shortDescription: "A practical career guide for students and young adults exploring skills, goals and future opportunities.",
    fullDescription: "This guide helps learners think about strengths, interests, values, skills and career pathways.",
    keyLessons: [
      "Identify personal strengths.",
      "Explore career options.",
      "Set learning goals.",
      "Build a simple action plan."
    ],
    tags: ["career", "planning", "skills"],
    readerHtml: `
      <h1>Career Planning Guide</h1>
      <p>Career planning is the process of understanding yourself, exploring opportunities and preparing for work that matches your skills, values and goals.</p>
      <h2>Know Yourself</h2>
      <ul><li>What subjects do I enjoy?</li><li>What problems do I like solving?</li><li>What skills do people notice in me?</li><li>What kind of work environment fits me?</li></ul>
      <h2>Build Skills</h2>
      <p>Useful skills include communication, digital literacy, teamwork, problem-solving, writing, confidence and time management.</p>
      <h2>Career Action Plan</h2>
      <ol><li>Choose one career area to explore.</li><li>Identify three required skills.</li><li>Find one course or mentor.</li><li>Create one small weekly learning goal.</li></ol>
    `
  }
];

const LAUNCH_KIDDIES = [
  {
    id: "abc-adventures",
    title: "ABC Adventures",
    category: "literacy",
    ageGroup: "ages-3-5",
    description: "A playful literacy mini-book that helps young learners recognize letters, sounds and simple words.",
    status: "active",
    featured: true,
    contentHtml: `
      <h2>ABC Adventures</h2>
      <p><strong>Published by SpeakOut Mental Health Outreach.</strong> This mini-book helps young children begin their reading journey through letters, sounds, pictures, movement and simple conversation.</p>
      <h3>What Children Will Learn</h3>
      <ul><li>Recognize common letters.</li><li>Connect letters with sounds.</li><li>Say simple words clearly.</li><li>Build confidence while learning.</li></ul>
      <h3>Letter Sound Game</h3>
      <p>Pick one letter. Say the sound. Ask the child to repeat it. Example: “B says /b/ as in ball, baby, bag.” Let the child clap each time they hear the sound.</p>
      <h3>Picture Match</h3>
      <p>Show pictures such as apple, ball, cup, dog and egg. Ask the child to say the word and identify the first letter.</p>
      <h3>Mini Practice</h3>
      <ol><li>Trace five letters with a finger.</li><li>Say the letter name.</li><li>Say the sound.</li><li>Name one word that starts with the letter.</li></ol>
      <h3>For Parents and Teachers</h3>
      <p>Use encouragement and repetition. Do not shame a child for forgetting. Learning should feel safe, warm and fun.</p>
    `
  },
  {
    id: "my-feelings",
    title: "My Feelings",
    category: "emotions",
    ageGroup: "ages-6-9",
    description: "A mental wellbeing mini-book that helps children name, understand and express feelings safely.",
    status: "active",
    featured: true,
    contentHtml: `
      <h2>My Feelings</h2>
      <p>Feelings are normal. Children may feel happy, sad, angry, scared, excited, lonely or worried. Feelings are not bad, but actions must be safe.</p>
      <h3>Common Feelings</h3>
      <ul><li>Happy: when something good happens.</li><li>Sad: when we feel hurt or miss someone.</li><li>Angry: when something feels unfair.</li><li>Scared: when we feel unsafe or unsure.</li><li>Worried: when we keep thinking about a problem.</li></ul>
      <h3>Healthy Ways to Express Feelings</h3>
      <ul><li>Use words: “I feel sad because…”</li><li>Draw the feeling.</li><li>Talk to a trusted adult.</li><li>Take slow breaths.</li><li>Ask for a break.</li></ul>
      <h3>Feeling Thermometer</h3>
      <p>Rate the feeling from 1 to 5. 1 means calm. 5 means very strong. Ask: what can help me move down one step?</p>
      <h3>Reflection</h3>
      <ol><li>What feeling did I have today?</li><li>Where did I feel it in my body?</li><li>Who can I talk to?</li></ol>
    `
  },
  {
    id: "safety-first",
    title: "Safety First",
    category: "safety",
    ageGroup: "ages-6-9",
    description: "A child protection mini-book that teaches body safety, trusted adults and speaking up.",
    status: "active",
    featured: true,
    contentHtml: `
      <h2>Safety First</h2>
      <p>Safety means protecting your body, mind, feelings and environment. Every child deserves to feel safe at home, school, online and in the community.</p>
      <h3>Body Safety Rules</h3>
      <ul><li>Your body belongs to you.</li><li>You can say no to unsafe touch.</li><li>Unsafe secrets should be reported.</li><li>Tell a trusted adult if something feels wrong.</li></ul>
      <h3>Trusted Adults</h3>
      <p>A trusted adult listens, protects and helps without making a child feel afraid. Examples include a parent, teacher, counsellor, caregiver, nurse or responsible family member.</p>
      <h3>Safety Circle Activity</h3>
      <p>Draw a circle and write the names of three trusted adults you can talk to if you feel unsafe.</p>
      <h3>Emergency Practice</h3>
      <ul><li>Know your full name.</li><li>Know where to go for help in school.</li><li>Never follow a stranger without permission.</li></ul>
    `
  },
  {
    id: "healthy-habits",
    title: "Healthy Habits",
    category: "wellness",
    ageGroup: "ages-6-9",
    description: "A wellbeing mini-book that teaches sleep, hygiene, movement, water, screen balance and daily care.",
    status: "active",
    featured: true,
    contentHtml: `
      <h2>Healthy Habits</h2>
      <p>Healthy habits help children grow, learn, play and manage emotions better. Small daily actions can support mood, energy and focus.</p>
      <h3>Important Habits</h3>
      <ul><li>Sleep early and rest well.</li><li>Drink water.</li><li>Wash hands.</li><li>Brush teeth.</li><li>Move the body through play.</li><li>Take breaks from screens.</li></ul>
      <h3>My Healthy Day Checklist</h3>
      <ol><li>I washed my hands.</li><li>I drank water.</li><li>I moved my body.</li><li>I ate something nourishing.</li><li>I rested when tired.</li><li>I spoke kindly to myself.</li></ol>
      <h3>Activity</h3>
      <p>Choose one habit to practice for seven days. Tick a small chart each day you try.</p>
    `
  },
  {
    id: "leadership-for-kids",
    title: "Leadership for Kids",
    category: "leadership",
    ageGroup: "ages-10-13",
    description: "A child-friendly leadership mini-book focused on responsibility, service, teamwork and integrity.",
    status: "active",
    featured: true,
    contentHtml: `
      <h2>Leadership for Kids</h2>
      <p>Leadership is not about shouting or controlling people. It is about serving, guiding, taking responsibility and doing what is right.</p>
      <h3>Leadership Qualities</h3>
      <ul><li>Responsibility</li><li>Honesty</li><li>Kindness</li><li>Courage</li><li>Teamwork</li><li>Problem-solving</li></ul>
      <h3>Leadership at School</h3>
      <ul><li>Help a classmate understand a task.</li><li>Report bullying or unsafe behavior.</li><li>Keep promises.</li><li>Encourage others.</li><li>Use respectful words.</li></ul>
      <h3>Leadership Challenge</h3>
      <p>Choose one helpful action this week: welcome a new student, help clean the classroom, support someone left out or encourage a friend.</p>
      <h3>Reflection</h3>
      <ol><li>How can I lead without being proud?</li><li>What problem can I help solve?</li><li>Who is a leader I admire and why?</li></ol>
    `
  }
];

const LAUNCH_COURSES = [
  {
    id: "mental-health-foundations",
    course: {
      title: "Mental Health Foundations",
      instructor: "SpeakOut Mental Health Outreach",
      category: "mental-health",
      accessType: "free",
      price: 0,
      currency: "₦",
      level: "beginner",
      certificateEligible: true,
      featured: true,
      status: "active",
      shortDescription: "A beginner-friendly course introducing mental health, wellbeing, stigma reduction and help-seeking.",
      fullDescription: "This course equips students, ambassadors, teachers and parents with basic mental health knowledge and practical support awareness.",
      outcomes: ["Explain mental health clearly.", "Recognize common distress signs.", "Reduce stigma.", "Identify support pathways."],
      tags: ["mental health", "wellbeing", "awareness"]
    },
    modules: [
      { id: "mhf-module-1", title: "Understanding Mental Health", order: 1 },
      { id: "mhf-module-2", title: "Support and Help-Seeking", order: 2 }
    ],
    lessons: [
      { id: "mhf-lesson-1", moduleId: "mhf-module-1", title: "What Mental Health Means", order: 1, contentHtml: "<h1>What Mental Health Means</h1><p>Mental health affects how we think, feel, cope, relate and make decisions.</p><h2>Key Idea</h2><p>Everyone has mental health. Support and education help people thrive.</p>", activity: "Write three words that describe emotional wellbeing.", quizPrompt: "Name two signs that someone may need support." },
      { id: "mhf-lesson-2", moduleId: "mhf-module-2", title: "When to Ask for Help", order: 2, contentHtml: "<h1>When to Ask for Help</h1><p>Ask for help when sadness, fear, anger or stress begins to affect daily life, safety, school, work or relationships.</p>", activity: "List three trusted support people.", quizPrompt: "What should you do if someone is in immediate danger?" }
    ]
  },
  {
    id: "student-leadership",
    course: {
      title: "Student Leadership",
      instructor: "SpeakOut Mental Health Outreach",
      category: "leadership",
      accessType: "free",
      price: 0,
      currency: "₦",
      level: "beginner",
      certificateEligible: true,
      featured: true,
      status: "active",
      shortDescription: "A practical course on responsibility, communication, teamwork and positive influence.",
      fullDescription: "This course prepares students to lead with integrity, empathy and service.",
      outcomes: ["Define student leadership.", "Practice respectful communication.", "Support teamwork.", "Take responsible action."],
      tags: ["leadership", "students", "teamwork"]
    },
    modules: [
      { id: "sl-module-1", title: "Leadership as Service", order: 1 },
      { id: "sl-module-2", title: "Communication and Teamwork", order: 2 }
    ],
    lessons: [
      { id: "sl-lesson-1", moduleId: "sl-module-1", title: "What Makes a Good Leader", order: 1, contentHtml: "<h1>What Makes a Good Leader</h1><p>A good leader listens, serves, respects others and takes responsibility.</p>", activity: "Describe one leader you admire.", quizPrompt: "List three leadership qualities." },
      { id: "sl-lesson-2", moduleId: "sl-module-2", title: "Leading With Respect", order: 2, contentHtml: "<h1>Leading With Respect</h1><p>Respectful leaders correct without insulting and include others in problem-solving.</p>", activity: "Practice one respectful correction sentence.", quizPrompt: "Why is listening important in leadership?" }
    ]
  },
  {
    id: "digital-skills-basics",
    course: {
      title: "Digital Skills Basics",
      instructor: "SpeakOut Mental Health Outreach",
      category: "digital-skills",
      accessType: "free",
      price: 0,
      currency: "₦",
      level: "beginner",
      certificateEligible: true,
      featured: true,
      status: "active",
      shortDescription: "A starter course for basic computer, internet, email, online safety and productivity skills.",
      fullDescription: "This course helps learners build confidence using digital tools safely and productively.",
      outcomes: ["Understand basic computer use.", "Use the internet responsibly.", "Practice online safety.", "Use digital tools for learning."],
      tags: ["digital skills", "computer", "internet"]
    },
    modules: [
      { id: "dsb-module-1", title: "Computer and Internet Basics", order: 1 },
      { id: "dsb-module-2", title: "Online Safety", order: 2 }
    ],
    lessons: [
      { id: "dsb-lesson-1", moduleId: "dsb-module-1", title: "Using Digital Tools", order: 1, contentHtml: "<h1>Using Digital Tools</h1><p>Digital tools help us learn, communicate, create and solve problems.</p>", activity: "List five things you can do with a phone or computer for learning.", quizPrompt: "Name two useful digital tools." },
      { id: "dsb-lesson-2", moduleId: "dsb-module-2", title: "Staying Safe Online", order: 2, contentHtml: "<h1>Staying Safe Online</h1><p>Do not share passwords. Be careful with strangers, suspicious links and private information.</p>", activity: "Create three online safety rules.", quizPrompt: "Why should passwords be private?" }
    ]
  },
  {
    id: "career-readiness",
    course: {
      title: "Career Readiness",
      instructor: "SpeakOut Mental Health Outreach",
      category: "career",
      accessType: "free",
      price: 0,
      currency: "₦",
      level: "beginner",
      certificateEligible: true,
      featured: true,
      status: "active",
      shortDescription: "A practical course on career planning, CV basics, communication and workplace readiness.",
      fullDescription: "This course supports learners preparing for future work, volunteering, internships and professional growth.",
      outcomes: ["Identify strengths.", "Create a simple career plan.", "Understand CV basics.", "Practice professional communication."],
      tags: ["career", "cv", "workplace"]
    },
    modules: [
      { id: "cr-module-1", title: "Career Planning", order: 1 },
      { id: "cr-module-2", title: "Professional Readiness", order: 2 }
    ],
    lessons: [
      { id: "cr-lesson-1", moduleId: "cr-module-1", title: "Know Your Strengths", order: 1, contentHtml: "<h1>Know Your Strengths</h1><p>Your strengths can guide your learning, career choices and service opportunities.</p>", activity: "Write five strengths you have.", quizPrompt: "Why is self-awareness useful for career planning?" },
      { id: "cr-lesson-2", moduleId: "cr-module-2", title: "Workplace Communication", order: 2, contentHtml: "<h1>Workplace Communication</h1><p>Professional communication should be respectful, clear, timely and responsible.</p>", activity: "Write a short professional introduction.", quizPrompt: "Name two qualities of professional communication." }
    ]
  },
  {
    id: "speakout-ambassador-orientation",
    course: {
      title: "SpeakOut Ambassador Orientation",
      instructor: "SpeakOut Mental Health Outreach",
      category: "ambassador-training",
      accessType: "free",
      price: 0,
      currency: "₦",
      level: "beginner",
      certificateEligible: true,
      featured: true,
      status: "active",
      shortDescription: "An orientation course for SpeakOut ambassadors, volunteers and student mental health advocates.",
      fullDescription: "This course introduces SpeakOut’s mission, ambassador expectations, reporting, safeguarding and responsible advocacy.",
      outcomes: ["Understand SpeakOut mission.", "Explain ambassador responsibilities.", "Practice ethical advocacy.", "Know reporting expectations."],
      tags: ["ambassador", "orientation", "volunteer"]
    },
    modules: [
      { id: "sao-module-1", title: "SpeakOut Mission", order: 1 },
      { id: "sao-module-2", title: "Ambassador Responsibilities", order: 2 }
    ],
    lessons: [
      { id: "sao-lesson-1", moduleId: "sao-module-1", title: "Why SpeakOut Exists", order: 1, contentHtml: "<h1>Why SpeakOut Exists</h1><p>SpeakOut exists to make mental health conversations normal, accessible and practical for young people.</p>", activity: "Write one reason mental health advocacy matters.", quizPrompt: "What is one goal of SpeakOut?" },
      { id: "sao-lesson-2", moduleId: "sao-module-2", title: "Responsible Advocacy", order: 2, contentHtml: "<h1>Responsible Advocacy</h1><p>Ambassadors educate, encourage and refer. They do not diagnose, shame, expose private stories or replace professionals.</p>", activity: "List three things an ambassador should not do.", quizPrompt: "Why is confidentiality important?" }
    ]
  }
];

async function installBooks() {
  let count = 0;
  for (const item of LAUNCH_BOOKS) {
    const { id, ...data } = item;
    await setDoc(doc(db, "books", id), {
      ...data,
      updatedAt: serverTimestamp()
    }, { merge: true });
    count++;
  }
  return count;
}

async function installKiddies() {
  let count = 0;
  for (const item of LAUNCH_KIDDIES) {
    const { id, ...data } = item;
    await setDoc(doc(db, "kiddiesResources", id), {
      ...data,
      updatedAt: serverTimestamp()
    }, { merge: true });
    count++;
  }
  return count;
}

async function installCourses() {
  let courseCount = 0;
  let moduleCount = 0;
  let lessonCount = 0;

  for (const item of LAUNCH_COURSES) {
    await setDoc(doc(db, "courses", item.id), {
      ...item.course,
      updatedAt: serverTimestamp()
    }, { merge: true });
    courseCount++;

    for (const module of item.modules) {
      const { id, ...moduleData } = module;
      await setDoc(doc(db, "courseModules", id), {
        ...moduleData,
        courseId: item.id,
        updatedAt: serverTimestamp()
      }, { merge: true });
      moduleCount++;
    }

    for (const lesson of item.lessons) {
      const { id, ...lessonData } = lesson;
      await setDoc(doc(db, "courseLessons", id), {
        ...lessonData,
        courseId: item.id,
        updatedAt: serverTimestamp()
      }, { merge: true });
      lessonCount++;
    }
  }

  return { courseCount, moduleCount, lessonCount };
}

async function runCleanupLaunchSeed() {
  if (!adminReady) throw new Error("Admin access not verified.");

  setStatus("Archiving old books, courses and Kiddies resources...", "info");

  const archivedBooks = await archiveCollection("books");
  const archivedCourses = await archiveCollection("courses");
  const archivedModules = await archiveCollection("courseModules");
  const archivedLessons = await archiveCollection("courseLessons");
  const archivedKiddies = await archiveCollection("kiddiesResources");

  setStatus("Installing approved launch set...", "info");

  const books = await installBooks();
  const kiddies = await installKiddies();
  const courseResult = await installCourses();

  return {
    archivedBooks,
    archivedCourses,
    archivedModules,
    archivedLessons,
    archivedKiddies,
    books,
    kiddies,
    courses: courseResult.courseCount,
    modules: courseResult.moduleCount,
    lessons: courseResult.lessonCount
  };
}

onAuthStateChanged(auth, async user => {
  currentUser = user;

  if (!user) {
    setStatus("Please login as admin first, then refresh this page.", "error");
    seedBtn.disabled = true;
    return;
  }

  try {
    adminReady = await isAdmin(user);

    if (!adminReady) {
      setStatus("Access denied. Admin role required.", "error");
      seedBtn.disabled = true;
      return;
    }

    setStatus("Admin verified. You can run the cleanup launch seed.", "success");
    seedBtn.disabled = false;

  } catch (error) {
    console.error(error);
    setStatus("Admin check failed. " + (error.message || ""), "error");
    seedBtn.disabled = true;
  }
});

seedBtn.addEventListener("click", async () => {
  seedBtn.disabled = true;

  try {
    const result = await runCleanupLaunchSeed();

    setStatus(
      `Done.\n\nArchived:\nBooks: ${result.archivedBooks}\nCourses: ${result.archivedCourses}\nModules: ${result.archivedModules}\nLessons: ${result.archivedLessons}\nKiddies: ${result.archivedKiddies}\n\nActive Launch Set Installed:\nBooks: ${result.books}\nCourses: ${result.courses}\nModules: ${result.modules}\nLessons: ${result.lessons}\nKiddies: ${result.kiddies}`,
      "success"
    );

  } catch (error) {
    console.error(error);
    setStatus(error.message || "Cleanup seed failed.", "error");
    seedBtn.disabled = false;
  }
});
