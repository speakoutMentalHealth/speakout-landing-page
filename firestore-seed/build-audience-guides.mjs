import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const parse = async file => JSON.parse((await readFile(new URL(file, root), "utf8")).replace(/^\uFEFF/, ""));
const courses = await parse("courses-seed.json");
const studentSource = await parse("firestore-seed/student-wellbeing-book.json");

const byTitle = title => {
  const course = courses.find(item => item.title === title);
  if (!course) throw new Error(`Missing course: ${title}`);
  return course;
};

const selectLesson = (courseTitle, moduleIndex, lessonIndex, guideTitle, introduction) => {
  const lesson = byTitle(courseTitle).modules?.[moduleIndex]?.lessons?.[lessonIndex];
  if (!lesson?.content) throw new Error(`Missing lesson ${courseTitle} ${moduleIndex}:${lessonIndex}`);
  return {
    title: guideTitle,
    content: `<p>${introduction}</p>${lesson.content}${lesson.activity ? `<h3>Put it into practice</h3><p>${lesson.activity}</p>` : ""}`,
  };
};

const countWords = value => (String(value).replace(/<[^>]*>/g, " ").match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu) || []).length;
const finish = book => {
  const content = book.content || book.chapters.map(chapter => `<h2>${chapter.title}</h2>${chapter.content}`).join("\n");
  const contentWordCount = countWords(content);
  return {
    ...book,
    content,
    contentWordCount,
    readingTime: `${Math.max(1, Math.ceil(contentWordCount / 220))} minutes`,
    editorialStandard: "SpeakOut Audience Guide Standard v1",
    reviewedAgainst: [
      "WHO: Mental health of adolescents (2025)",
      "UNICEF: Helping Adolescents Thrive facilitator guide",
      "UNICEF: Parenting of Adolescents Programming Guidance",
    ],
    disclaimer: "This guide provides general education, not diagnosis or treatment. Follow local safeguarding procedures and contact qualified or emergency support when someone may be at immediate risk.",
  };
};

const studentGuide = finish({
  ...studentSource,
  id: "student-wellbeing-guide-v1",
  title: "SpeakOut Student Wellbeing Guide",
  status: "active",
  featured: true,
  coverUrl: "images/learning-covers/student-wellbeing-guide-v1.png",
  audience: ["student", "school", "general"],
});

const teacherGuide = finish({
  id: "teacher-wellbeing-safeguarding-guide-v1",
  title: "Teacher Wellbeing and Safeguarding Guide",
  subtitle: "A practical classroom guide to prevention, early support, safe conversations and referral",
  author: "SpeakOut Mental Health Outreach",
  status: "active",
  featured: true,
  accessType: "free",
  category: "teacher-training",
  audience: ["teacher", "educator", "school", "school-admin"],
  coverUrl: "images/learning-covers/teacher-wellbeing-guide-v1.png",
  description: "An in-depth field guide for educators who want to build psychologically safer classrooms, notice changes early, respond without diagnosing, follow safeguarding duties and protect their own wellbeing.",
  chapters: [
    selectLesson("Mental Health Foundations",0,0,"Mental health belongs in everyday teaching","Teachers influence the climate in which young people learn and seek help. This chapter establishes a practical, non-clinical understanding of mental health so educators can promote wellbeing without stepping outside their role."),
    selectLesson("Mental Health Foundations",1,1,"Emotions, behaviour and the learning environment","Behaviour communicates needs, but it never tells the whole story. Use this chapter to distinguish observation from assumption and to respond with curiosity, predictable boundaries and dignity."),
    selectLesson("Stress Management",0,0,"Recognising stress before it becomes a crisis","Stress can affect attendance, concentration, memory, relationships and conduct. The teacher's task is to notice meaningful change, document facts and open a safe route to support—not to diagnose."),
    selectLesson("Anxiety Management",2,0,"Teaching practical regulation skills","Short grounding and breathing practices can help a class settle and can give an overwhelmed learner enough space to make a safer next choice. They should be offered, not forced, and never used as punishment."),
    selectLesson("Psychological First Aid",0,0,"A calm first response","When a learner is distressed, a teacher can provide humane first-line support by prioritising safety, listening without pressure and connecting the learner with appropriate help."),
    selectLesson("Psychological First Aid",2,0,"Listening without interrogation","A supportive conversation is not an investigation or counselling session. Learn how to create privacy, ask open questions, avoid promises of secrecy and record only what safeguarding procedures require."),
    selectLesson("Psychological First Aid",3,0,"Linking learners to the right support","Effective support includes a clear hand-off. Map the people and services available in your school, know who receives safeguarding concerns and explain each next step to the learner as far as safety allows."),
    selectLesson("Psychological First Aid",5,0,"Educator wellbeing and sustainable care","Teachers cannot carry every learner's pain alone. Supervision, role boundaries, rest and collegial support protect both the educator and the quality of care students receive."),
  ],
  emergencyNote: "If a learner describes abuse, self-harm, suicidal intent or immediate danger, stay with them as appropriate, follow the school's safeguarding and emergency procedure immediately, and involve the designated responsible professional or emergency service.",
});

const parentGuide = finish({
  id: "parent-caregiver-wellbeing-guide-v1",
  title: "Parent and Caregiver Wellbeing Guide",
  subtitle: "Connection, communication, boundaries and support through adolescence",
  author: "SpeakOut Mental Health Outreach",
  status: "active",
  featured: true,
  accessType: "free",
  category: "parent-training",
  audience: ["parent", "caregiver", "family", "general"],
  coverUrl: "images/learning-covers/parent-wellbeing-guide-v1.png",
  description: "A practical, in-depth guide to understanding adolescent development, listening well, setting respectful boundaries, supporting healthy routines, navigating digital life and responding when a young person may need professional help.",
  chapters: [
    selectLesson("Mental Health Foundations",0,0,"Understanding adolescent mental health","Every adolescent has mental health, just as every adolescent has physical health. This chapter helps families use clear, non-stigmatising language and recognise that wellbeing changes across situations and seasons."),
    selectLesson("Mental Health Foundations",1,0,"Making room for emotions","Parents do not need to eliminate every difficult feeling. Young people benefit when adults can name emotions calmly, accept the feeling, maintain safe limits and model how to respond rather than react."),
    selectLesson("Anxiety Management",0,0,"When worry becomes disruptive","Worry is common, but persistent anxiety can interfere with sleep, school, relationships and daily life. Learn what to observe, how to ask without leading and when everyday support is no longer enough."),
    selectLesson("Anxiety Management",2,0,"Practising calm together","Regulation skills work best when they are practised before a crisis and modelled by adults. Invite your adolescent to choose techniques that feel useful rather than turning coping into another command."),
    selectLesson("Stress Management",3,0,"Boundaries, routines and shared problem-solving","Predictable routines and respectful boundaries can reduce avoidable conflict. Good limits explain the safety reason, make room for the adolescent's view and use proportionate consequences instead of humiliation or fear."),
    selectLesson("Cybersecurity Awareness",4,0,"Digital wellbeing, privacy and trust","Online life is part of adolescent life. Effective family safety combines practical privacy habits with ongoing conversation, so a young person can ask for help after a mistake without fearing an explosive response."),
    selectLesson("Mental Health Foundations",3,0,"Responding to persistent low mood","A parent should take sustained changes seriously without rushing to label them. Focus on observable changes, listen, reduce shame and seek qualified support when symptoms persist or daily functioning declines."),
    selectLesson("Psychological First Aid",3,0,"Building a family support and referral plan","Support is easier to access when families identify trusted adults, school contacts, health professionals and emergency routes before a crisis. Make the plan visible, specific and appropriate to your location."),
  ],
  emergencyNote: "If a young person may harm themselves or someone else, reports abuse, or is in immediate danger, do not leave them alone when it is safe for you to stay, reduce access to obvious means of harm, and contact local emergency or qualified crisis support immediately.",
});

const output = [studentGuide, teacherGuide, parentGuide];
await writeFile(new URL("firestore-seed/audience-guides.json", root), `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(output.map(({ id, title, contentWordCount }) => ({ id, title, contentWordCount })));
