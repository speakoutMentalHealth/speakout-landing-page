import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const courses = JSON.parse((await readFile(new URL("courses-seed.json", root), "utf8")).replace(/^\uFEFF/, ""));
const countWords = value => (String(value).replace(/<[^>]*>/g, " ").match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu) || []).length;
const escapeHtml = value => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

function sourceCourse(title) {
  const course = courses.find(item => item.title === title);
  if (!course?.modules?.length) throw new Error(`Complete source course not found: ${title}`);
  return course;
}

function chapterFromModule(module, index) {
  const lessonContent = module.lessons.map((lesson, lessonIndex) => `
    <section>
      <h3>${escapeHtml(`${index + 1}.${lessonIndex + 1} ${lesson.title}`)}</h3>
      ${lesson.content}
      ${lesson.activity ? `<div class="reader-activity"><h4>Apply what you learned</h4><p>${escapeHtml(lesson.activity)}</p></div>` : ""}
    </section>`).join("\n");
  return {
    number: index + 1,
    title: module.title,
    subtitle: module.description || "Knowledge, reflection and practical application",
    content: `${module.description ? `<p class="chapter-intro">${escapeHtml(module.description)}</p>` : ""}${lessonContent}`,
  };
}

function buildBook(spec) {
  const course = sourceCourse(spec.courseTitle);
  const chapters = course.modules.map(chapterFromModule);
  const content = chapters.map(chapter => `<h2>Chapter ${chapter.number}: ${escapeHtml(chapter.title)}</h2>${chapter.content}`).join("\n");
  const contentWordCount = countWords(content);
  if (contentWordCount < 2500) throw new Error(`${spec.title} has only ${contentWordCount} content words`);
  return {
    id: spec.id,
    title: spec.title,
    subtitle: spec.subtitle,
    author: "SpeakOut Mental Health Outreach",
    status: "active",
    featured: spec.featured ?? false,
    accessType: "free",
    price: 0,
    category: spec.category || course.category,
    audience: spec.audience || course.audience || ["general"],
    difficulty: course.difficulty || course.level || "beginner",
    coverUrl: spec.coverUrl,
    description: spec.description,
    shortDescription: spec.description,
    sourceCourseId: course.id,
    sourceCourseTitle: course.title,
    editorialStandard: "SpeakOut In-Depth Library Standard v1",
    contentVersion: course.contentVersion || "1.0",
    chapters,
    content,
    contentWordCount,
    readingTime: `${Math.ceil(contentWordCount / 220)} minutes`,
    readOnline: true,
    downloadEnabled: false,
    keyLessons: course.outcomes || [],
    tags: [...new Set([...(course.tags || []), "guide", "practical-learning", "speakout-library"])],
    disclaimer: spec.disclaimer || "This publication provides general education. Adapt activities to your circumstances and seek qualified advice where appropriate.",
  };
}

const books = [
  buildBook({
    id: "mental-health-foundations",
    courseTitle: "Mental Health Foundations",
    title: "Mental Health Foundations Handbook",
    subtitle: "Understanding wellbeing, emotions, stress, support and everyday protective habits",
    category: "mental-health",
    audience: ["student", "teacher", "parent", "general"],
    featured: true,
    coverUrl: "images/learning-covers/course-mental-health-v1.png",
    description: "A comprehensive, practical handbook for understanding mental health, recognising common pressures, building protective habits, reducing stigma and knowing when and how to seek support.",
    disclaimer: "This handbook offers general mental health education and does not diagnose or treat any condition. Contact a qualified professional or local emergency service when someone may be at immediate risk.",
  }),
  buildBook({
    id: "anxiety-management",
    courseTitle: "Anxiety Management",
    title: "Anxiety Management Workbook",
    subtitle: "Understand the anxiety cycle and practise evidence-informed coping skills",
    category: "mental-health",
    audience: ["student", "university", "adult", "general"],
    featured: true,
    coverUrl: "images/learning-covers/course-mental-health-v1.png",
    description: "An in-depth workbook explaining how anxiety affects thoughts, feelings, the body and behaviour, with structured exercises for grounding, communication, gradual action and a personal maintenance plan.",
    disclaimer: "This workbook provides general education and self-management practice; it is not a substitute for assessment or treatment. Seek qualified or emergency support when anxiety is severe, persistent or connected to immediate danger.",
  }),
  buildBook({
    id: "career-planning",
    courseTitle: "Career Readiness",
    title: "Career Planning and Readiness Handbook",
    subtitle: "From self-assessment and professional documents to interviews and workplace confidence",
    category: "career",
    audience: ["student", "university", "adult", "general"],
    featured: true,
    coverUrl: "images/learning-covers/course-career-v1.png",
    description: "A detailed career-development handbook covering transferable skills, CV and portfolio evidence, job-search planning, interview preparation, professional communication and sustainable workplace growth.",
  }),
  buildBook({
    id: "personal-finance",
    courseTitle: "Personal Finance",
    title: "Practical Personal Finance Workbook",
    subtitle: "Budgeting, saving, debt, protection and long-term financial capability",
    category: "financial-literacy",
    audience: ["student", "university", "adult", "general"],
    featured: true,
    coverUrl: "images/learning-covers/course-financial-literacy-v1.png",
    description: "A practical financial-literacy workbook that helps readers understand cash flow, build a realistic budget, plan emergency savings, evaluate debt, reduce financial risk and make values-based long-term decisions.",
    disclaimer: "This workbook provides general financial education, not personalised financial, investment, tax or legal advice. Consider qualified advice for decisions involving significant risk or contractual obligations.",
  }),
  buildBook({
    id: "cybersecurity-awareness",
    courseTitle: "Cybersecurity Awareness",
    title: "Digital Safety and Cybersecurity Handbook",
    subtitle: "Protect accounts, devices, privacy and people in everyday digital life",
    category: "digital-skills",
    audience: ["student", "teacher", "parent", "adult", "general"],
    featured: true,
    coverUrl: "images/learning-covers/course-digital-skills-v1.png",
    description: "A comprehensive digital-safety handbook covering strong authentication, phishing, social engineering, device and network protection, privacy, digital footprints and calm incident response.",
  }),
  buildBook({
    id: "depression-awareness",
    courseTitle: "Depression Awareness",
    title: "Depression Awareness and Support Guide",
    subtitle: "Recognise changes, reduce stigma, offer support and connect people with appropriate help",
    category: "mental-health",
    audience: ["student", "teacher", "parent", "adult", "general"],
    featured: true,
    coverUrl: "images/learning-covers/course-mental-health-v1.png",
    description: "A careful, in-depth guide to understanding depression, recognising possible signs without diagnosing, responding supportively, challenging stigma and knowing when urgent or professional support is needed.",
    disclaimer: "This guide provides general education and cannot diagnose depression or replace professional care. Treat any mention of suicide or self-harm seriously and contact qualified local or emergency support when someone may be in immediate danger.",
  }),
  buildBook({
    id: "stress-management",
    courseTitle: "Stress Management",
    title: "Practical Stress Management Workbook",
    subtitle: "Understand pressure, regulate immediate responses and build a sustainable personal plan",
    category: "mental-health",
    audience: ["student", "teacher", "parent", "adult", "general"],
    featured: true,
    coverUrl: "images/learning-covers/course-mental-health-v1.png",
    description: "A structured workbook that helps readers identify stress patterns, understand the body response, practise immediate coping skills, improve planning and boundaries, and build sustainable resilience habits.",
    disclaimer: "This workbook provides general wellbeing education, not medical treatment. Seek qualified support when stress is persistent, severe, linked to trauma or substantially disrupts daily functioning.",
  }),
  buildBook({
    id: "psychological-first-aid",
    courseTitle: "Psychological First Aid",
    title: "Psychological First Aid Field Guide",
    subtitle: "Look, listen and link while protecting safety, dignity and the helper's role",
    category: "mental-health",
    audience: ["teacher", "parent", "ngo-professional", "community", "adult", "general"],
    featured: true,
    coverUrl: "images/learning-covers/course-mental-health-v1.png",
    description: "An applied field guide for humane first-line support after distressing events, covering safety checks, calm listening, practical assistance, referral, special considerations and helper wellbeing.",
    disclaimer: "Psychological first aid is humane practical support, not psychotherapy, diagnosis, forced disclosure or emergency treatment. Follow local safeguarding and emergency procedures and work within your training and role.",
  }),
  buildBook({
    id: "leadership-foundations",
    courseTitle: "Leadership Foundations",
    title: "Leadership Foundations Handbook",
    subtitle: "Purpose, decisions, communication, teams, execution and reflective practice",
    category: "leadership",
    audience: ["student", "teacher", "ngo-professional", "community", "adult", "general"],
    featured: true,
    coverUrl: "images/learning-covers/course-leadership-v1.png",
    description: "A comprehensive leadership handbook that moves from values and purpose through decision-making, communication, delegation, conflict, execution, change and a practical personal leadership plan.",
  }),
  buildBook({
    id: "conflict-resolution",
    courseTitle: "Conflict Resolution",
    title: "Conflict Resolution Practice Guide",
    subtitle: "Listen, de-escalate, uncover interests, negotiate and prevent recurring conflict",
    category: "leadership",
    audience: ["student", "teacher", "parent", "ngo-professional", "community", "adult", "general"],
    featured: true,
    coverUrl: "images/learning-covers/course-leadership-v1.png",
    description: "An in-depth practical guide to understanding conflict, managing escalation, listening for needs and interests, solving problems collaboratively, negotiating agreements and strengthening prevention systems.",
    disclaimer: "This guide supports everyday conflict skills. It is not a substitute for safeguarding, legal advice or specialist intervention where there is abuse, coercion, violence or an unsafe power imbalance.",
  }),
  buildBook({
    id: "student-leadership",
    courseTitle: "Student Leadership",
    title: "Student Leadership Practice Handbook",
    subtitle: "Build confidence, teamwork, problem-solving and meaningful school impact",
    category: "leadership",
    audience: ["student", "secondary", "university"],
    featured: true,
    coverUrl: "images/learning-covers/course-leadership-v1.png",
    description: "A practical leadership handbook for students, covering responsible influence, confident voice, teamwork, collaborative problem-solving, peer conflict and the design of a realistic student impact project.",
  }),
  buildBook({
    id: "community-leadership",
    courseTitle: "Community Leadership",
    title: "Community Leadership Field Guide",
    subtitle: "Listen, map stakeholders, mobilise participation and deliver accountable projects",
    category: "leadership",
    audience: ["teacher", "ngo-professional", "community", "adult", "general"],
    featured: true,
    coverUrl: "images/learning-covers/course-leadership-v1.png",
    description: "An applied guide to understanding communities, listening before acting, mapping influence and interest, mobilising participation, delivering projects and building transparent accountability into community leadership.",
  }),
  buildBook({
    id: "team-leadership",
    courseTitle: "Team Leadership",
    title: "Team Leadership and Performance Handbook",
    subtitle: "Clarify purpose, delegate well, sustain motivation and address conflict fairly",
    category: "leadership",
    audience: ["teacher", "ngo-professional", "community", "adult", "general"],
    featured: true,
    coverUrl: "images/learning-covers/course-leadership-v1.png",
    description: "A detailed team-leadership handbook covering team foundations, responsible delegation, motivation, communication rhythms, conflict and performance conversations, and the habits of sustainable high-performing teams.",
  }),
  buildBook({
    id: "computer-basics",
    courseTitle: "Computer Basics",
    title: "Computer Basics Practical Guide",
    subtitle: "Files, internet search, email, productivity and safe everyday computing",
    category: "digital-skills",
    audience: ["student", "teacher", "parent", "adult", "general"],
    featured: true,
    coverUrl: "images/learning-covers/course-digital-skills-v1.png",
    description: "A complete beginner-friendly guide to computer hardware and software, file organisation, effective internet search, professional email, everyday productivity and essential digital-safety habits.",
  }),
  buildBook({
    id: "microsoft-excel",
    courseTitle: "Microsoft Excel",
    title: "Microsoft Excel Applied Workbook",
    subtitle: "Organise data, build formulas, use functions and communicate insights with charts",
    category: "digital-skills",
    audience: ["student", "teacher", "ngo-professional", "adult", "general"],
    featured: true,
    coverUrl: "images/learning-covers/course-digital-skills-v1.png",
    description: "A hands-on spreadsheet workbook that develops confidence with worksheets, formulas, data organisation, useful functions, charts and a complete practical reporting project.",
    disclaimer: "Interface details can vary across spreadsheet versions. Focus on the underlying concepts and verify sensitive calculations before using them for financial, operational or reporting decisions.",
  }),
];

await writeFile(new URL("firestore-seed/priority-library-books.json", root), `${JSON.stringify(books, null, 2)}\n`, "utf8");
console.log(books.map(({ id, title, contentWordCount, chapters }) => ({ id, title, contentWordCount, chapters: chapters.length })));
