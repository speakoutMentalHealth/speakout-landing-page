import { readFile, writeFile } from "node:fs/promises";

const readJson = async path => JSON.parse((await readFile(path, "utf8")).replace(/^\uFEFF/, ""));
const clone = value => JSON.parse(JSON.stringify(value));

const [catalogue, starters, externalCatalogue] = await Promise.all([
  readJson(new URL("../courses-seed.json", import.meta.url)),
  readJson(new URL("./courses-starter.json", import.meta.url)),
  readJson(new URL("../speakhub-external-courses.json", import.meta.url)),
]);

const catalogueById = new Map(catalogue.map(course => [course.id, course]));
const startersById = new Map(starters.map(course => [course.id, course]));

const coverByCategory = {
  "mental-health": "images/learning-covers/course-mental-health-v1.png",
  leadership: "images/learning-covers/course-leadership-v1.png",
  "digital-skills": "images/learning-covers/course-digital-skills-v1.png",
  "teacher-training": "images/learning-covers/teacher-wellbeing-guide-v1.png",
  "parent-training": "images/learning-covers/parent-wellbeing-guide-v1.png",
  "school-club": "images/learning-covers/course-mental-health-v1.png",
  programming: "images/learning-covers/course-digital-skills-v1.png",
  "artificial-intelligence": "images/learning-covers/course-digital-skills-v1.png",
  "ai-data": "images/learning-covers/course-digital-skills-v1.png",
  "ict-cybersecurity": "images/learning-covers/course-digital-skills-v1.png",
};

const definitions = [
  {
    id: "mental-health-awareness-students",
    sources: [["mental-health-foundations", 0], ["mental-health-foundations", 1], ["mental-health-foundations", 2], ["mental-health-foundations", 3], ["mental-health-foundations", 4], ["mental-health-foundations", 5]],
    description: "A comprehensive student course for understanding mental health, emotional wellbeing, stress, anxiety, depression, help-seeking and safe peer support. Lessons combine plain-language explanations, guided reflection, realistic school scenarios and practical activities while maintaining clear boundaries between education, peer support and professional care.",
    outcomes: ["Explain mental health as a changing spectrum of wellbeing", "Recognize common stress, anxiety and low-mood patterns without diagnosing", "Practise evidence-informed coping and emotional regulation skills", "Respond safely when a peer needs adult or professional help", "Create a personal wellbeing and support plan", "Challenge stigma through responsible school-based advocacy"],
    prerequisites: ["No previous mental-health training is required", "Learners should know how to contact a trusted adult or local support service if a lesson raises a personal concern"],
  },
  {
    id: "student-leadership-foundations",
    sources: [["student-leadership", 0], ["student-leadership", 1], ["student-leadership", 2], ["student-leadership", 3], ["student-leadership", 4], ["student-leadership", 5]],
    description: "An applied leadership programme for students who want to lead with self-awareness, communicate with confidence, strengthen teams, solve school and community problems, manage peer conflict and deliver a measurable service project. Every module links leadership concepts to decisions students can practise in clubs, classrooms and community settings.",
    outcomes: ["Describe responsible, service-oriented student leadership", "Communicate ideas with confidence and respect", "Build inclusive teams and share responsibility", "Use structured problem-solving for student-led challenges", "Navigate disagreement and peer conflict constructively", "Plan, deliver and evaluate a student impact project"],
    prerequisites: ["No formal leadership role is required", "Learners should identify one school or community issue they may use for course activities"],
  },
  {
    id: "digital-literacy-essentials",
    sources: [["computer-basics", 0], ["computer-basics", 1], ["computer-basics", 2], ["cybersecurity-awareness", 1], ["cybersecurity-awareness", 2], ["cybersecurity-awareness", 4]],
    description: "A practical digital-literacy course covering computer foundations, file organization, effective web research, strong authentication, phishing awareness, privacy and responsible digital-footprint management. Learners practise everyday tasks while developing the judgment needed to use connected technology safely, efficiently and ethically.",
    outcomes: ["Identify core computer components and common operating-system tasks", "Organize, name, store and retrieve files reliably", "Search for information and evaluate online sources", "Create stronger account and authentication habits", "Recognize phishing and social-engineering attempts", "Manage privacy choices and a responsible digital footprint"],
    prerequisites: ["Access to a computer or mobile device is helpful for practice", "No previous technical training is required"],
  },
  {
    id: "teacher-mental-health-support-basics",
    sources: [["mental-health-foundations", 0], ["mental-health-foundations", 2], ["mental-health-foundations", 3], ["psychological-first-aid", 0], ["psychological-first-aid", 2], ["psychological-first-aid", 3]],
    description: "A safeguarding-aware course for teachers on promoting classroom wellbeing, noticing meaningful changes, responding calmly to distress, listening without attempting diagnosis, documenting concerns and connecting students with appropriate school, family and professional support. The course emphasizes role boundaries and escalation when safety may be at risk.",
    outcomes: ["Describe how mental health can affect learning, behaviour and relationships", "Notice patterns that may warrant a supportive check-in", "Use calm, non-judgmental listening skills", "Apply psychological-first-aid principles within a teacher's role", "Link students to safeguarding and referral pathways", "Maintain documentation, confidentiality limits and educator wellbeing"],
    prerequisites: ["Teachers should know their institution's safeguarding lead or referral contact", "This educational course does not qualify a participant to diagnose or provide therapy"],
  },
  {
    id: "parent-communication-teen-support",
    sources: [["mental-health-foundations", 0], ["mental-health-foundations", 4], ["anxiety-management", 1], ["anxiety-management", 3], ["depression-awareness", 1], ["cybersecurity-awareness", 4]],
    description: "A parent and caregiver course for strengthening connection with teenagers through attentive listening, calm boundaries, collaborative problem-solving and appropriate support for anxiety, low mood and digital pressure. It helps adults distinguish ordinary changes from concerning patterns and respond without shaming, panic or unsupported diagnosis.",
    outcomes: ["Build communication habits that make difficult conversations safer", "Set clear boundaries while preserving dignity and connection", "Recognize patterns associated with stress, anxiety and low mood", "Support coping without taking over a young person's choices", "Discuss privacy, social media and digital footprints constructively", "Know when and how to seek school, safeguarding or professional help"],
    prerequisites: ["No previous mental-health training is required", "Caregivers should identify local emergency, safeguarding and professional support contacts before beginning"],
  },
  {
    id: "mental-health-club-coordinator-training",
    sources: [["leadership-foundations", 0], ["leadership-foundations", 3], ["conflict-resolution", 0], ["conflict-resolution", 1], ["psychological-first-aid", 0], ["psychological-first-aid", 5]],
    description: "An operational training course for school mental-health club coordinators and student-support leads. It covers responsible leadership, team roles, meeting facilitation, conflict and de-escalation, psychological-first-aid boundaries, referral decisions, helper wellbeing and the practical disciplines needed to run a safe, sustainable awareness club.",
    outcomes: ["Define the purpose and limits of a school mental-health club", "Establish coordinator roles, meeting norms and adult oversight", "Facilitate inclusive activities without turning meetings into therapy", "Respond to conflict and emotional disclosures safely", "Use clear escalation and referral pathways", "Protect helper wellbeing and evaluate club activities responsibly"],
    prerequisites: ["The club must have a designated staff sponsor and safeguarding pathway", "Participants should never promise secrecy when a student's safety may be at risk"],
  },
];

function sourceCourse(id) {
  const course = catalogueById.get(id);
  if (!course) throw new Error(`Missing source course: ${id}`);
  return course;
}

function buildModules(targetId, selections) {
  return selections.map(([sourceId, moduleIndex], index) => {
    const source = sourceCourse(sourceId);
    const module = clone(source.modules[moduleIndex]);
    if (!module) throw new Error(`Missing module ${moduleIndex} in ${sourceId}`);
    const moduleOrder = index + 1;
    module.id = `${targetId}-module-${moduleOrder}`;
    module.order = moduleOrder;
    module.sourceCourseId = sourceId;
    module.lessons = module.lessons.map((lesson, lessonIndex) => ({
      ...lesson,
      id: `${targetId}-module-${moduleOrder}-lesson-${lessonIndex + 1}`,
      order: lessonIndex + 1,
    }));
    return module;
  });
}

function buildAssessment(title, sourceIds) {
  const questions = [];
  for (const sourceId of [...new Set(sourceIds)]) {
    const sourceQuestions = sourceCourse(sourceId).finalAssessment?.questions || [];
    for (const question of sourceQuestions) {
      if (questions.length >= 12) break;
      questions.push(clone(question));
    }
  }
  return { title: `${title} Final Assessment`, passMark: 70, questions };
}

function buildInternal(definition) {
  const starter = startersById.get(definition.id);
  if (!starter) throw new Error(`Missing starter course: ${definition.id}`);
  const modules = buildModules(definition.id, definition.sources);
  return {
    ...starter,
    slug: starter.id,
    instructor: starter.provider,
    level: starter.difficulty,
    accessType: starter.free ? "free" : "paid",
    coverUrl: coverByCategory[starter.category],
    shortDescription: definition.description,
    description: definition.description,
    fullDescription: definition.description,
    outcomes: definition.outcomes,
    prerequisites: definition.prerequisites,
    tags: [...new Set([starter.category, ...starter.audience, "practical", "certificate course"])],
    modules,
    lessonCount: modules.reduce((total, module) => total + module.lessons.length, 0),
    finalAssessment: buildAssessment(starter.title, definition.sources.map(([id]) => id)),
    minimumCompletion: 100,
    minimumScore: 70,
    completionRequirements: { completeAllLessons: true, passFinalAssessment: true, minimumScore: 70 },
    contentVersion: "2026.09",
    instructionalStandard: "SpeakOut in-depth curriculum standard",
    instructionalStructure: "Six modules with readings, applied activities, module checks and a final assessment",
    status: "active",
  };
}

const externalOrientation = "SpeakHub recommends reviewing the provider page before enrollment because availability, account requirements and credential rules can change. Use the listed outcomes as a preparation checklist, complete all activities on the official platform, keep your own notes and practise the skill in a small project. Provider-owned lessons remain on the provider website and are not reproduced here. If certificate evidence is enabled, submit only a genuine credential issued to you and remove unrelated personal information before upload.";

function buildExternal(course) {
  const description = `${course.description} ${externalOrientation}`;
  return {
    ...clone(course),
    slug: course.id,
    shortDescription: course.shortDescription || course.description,
    description,
    fullDescription: description,
    coverUrl: course.coverUrl || coverByCategory[course.category] || "images/learning-covers/course-digital-skills-v1.png",
    status: "active",
    editorialReview: "Provider destination and SpeakHub orientation reviewed for publication in September 2026.",
    contentVersion: "2026.09",
  };
}

const incompleteCatalogueExternals = catalogue.filter(course => course.courseType === "external" && [
  "kaggle-intro-to-programming",
  "microsoft-introduction-to-ai-concepts",
  "hubspot-sales-management-training",
  "hubspot-digital-marketing-certification",
  "hubspot-social-media-marketing-certification",
].includes(course.id));

const courses = [
  ...definitions.map(buildInternal),
  ...incompleteCatalogueExternals.map(buildExternal),
  ...externalCatalogue.map(buildExternal),
];

await writeFile(new URL("./priority-courses.json", import.meta.url), `${JSON.stringify(courses, null, 2)}\n`);
console.log(`Built ${courses.length} publishable courses (${definitions.length} internal, ${courses.length - definitions.length} external).`);
