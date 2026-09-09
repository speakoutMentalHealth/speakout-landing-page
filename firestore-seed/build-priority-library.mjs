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
];

await writeFile(new URL("firestore-seed/priority-library-books.json", root), `${JSON.stringify(books, null, 2)}\n`, "utf8");
console.log(books.map(({ id, title, contentWordCount, chapters }) => ({ id, title, contentWordCount, chapters: chapters.length })));
