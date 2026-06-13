import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const statusBox = document.getElementById("statusBox");
const seedBtn = document.getElementById("seedBtn");

function show(message, type = "info") {
  statusBox.textContent = message;
  statusBox.className = "notice " + type;
}

function slug(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function isAdmin(user) {
  if (!user) return false;
  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists()) return false;
  const role = (snap.data().role || "").toLowerCase().trim();
  return role === "admin" || role === "super_admin";
}

const studentResources = [
  {
    title: "Understanding Your Feelings",
    category: "Mental Health",
    audience: "student",
    accessType: "free",
    description: "A practical emotional intelligence guide helping students identify emotions, understand triggers, and express feelings safely.",
    coverIcon: "🧠",
    chapters: [
      {
        title: "What Are Emotions?",
        content: "Emotions are signals that help us understand our experiences. Happiness, sadness, anger, fear, excitement and disappointment all carry information. This chapter teaches students that emotions are not enemies; they are messages that need understanding."
      },
      {
        title: "Emotional Triggers",
        content: "Triggers are situations that create strong reactions. Common student triggers include poor grades, peer pressure, bullying, family conflict, comparison and social media pressure. Students learn how to name their triggers before reacting."
      },
      {
        title: "Healthy Expression",
        content: "Healthy emotional expression includes talking to a trusted adult, journaling, prayer, deep breathing, physical activity and asking for help. Unhealthy responses include fighting, isolation, self-harm and substance abuse."
      },
      {
        title: "Case Study",
        content: "James failed a mathematics test and stopped talking to his friends. Students reflect on what James may be feeling, what unhealthy reactions could happen, and what support could help him recover."
      },
      {
        title: "Worksheet and Quiz",
        content: "Students complete a daily emotion check-in, identify three triggers, write one healthy response plan, and complete a 10-question assessment. Certificate pass mark: 70%."
      }
    ],
    quiz: [
      "What is emotional awareness?",
      "Name three common emotions.",
      "What is an emotional trigger?",
      "Mention two healthy ways to express emotions.",
      "What does resilience mean?"
    ]
  },
  {
    title: "Building Self-Confidence",
    category: "Personal Development",
    audience: "student",
    accessType: "free",
    description: "A confidence-building manual for students covering self-esteem, positive self-talk, strengths, failure and daily confidence habits.",
    coverIcon: "⭐",
    chapters: [
      { title: "What Confidence Means", content: "Confidence is the belief that you can learn, improve and handle challenges. It does not mean perfection or superiority. It means growth, effort and courage." },
      { title: "Self-Esteem and Identity", content: "Self-esteem is how a student sees and values themselves. This chapter helps learners separate mistakes from identity and understand that failure does not define them." },
      { title: "Confidence Killers", content: "Comparison, bullying, negative self-talk, fear of failure and social pressure can damage confidence. Students learn to recognize and challenge these patterns." },
      { title: "Confidence Habits", content: "Preparation, small wins, affirmations, supportive friendships, goal setting and trying new things build confidence over time." },
      { title: "Action Plan", content: "Students list five strengths, rewrite three negative thoughts, create a 7-day improvement plan and complete a self-confidence quiz." }
    ],
    quiz: [
      "What is self-confidence?",
      "What is self-esteem?",
      "Name three confidence killers.",
      "How can preparation improve confidence?",
      "Why is failure part of growth?"
    ]
  },
  {
    title: "Managing Stress at School",
    category: "Mental Health",
    audience: "student",
    accessType: "premium",
    description: "A stress management guide for students dealing with exams, expectations, peer pressure, social media and academic pressure.",
    coverIcon: "🌿",
    chapters: [
      { title: "Understanding Stress", content: "Stress is the body's response to pressure. Positive stress can motivate students, but unmanaged stress can harm sleep, concentration, mood and performance." },
      { title: "Common School Stressors", content: "Students explore academic pressure, family expectations, peer pressure, social media comparison, bullying and future uncertainty." },
      { title: "Warning Signs", content: "Stress can appear physically, emotionally, mentally and behaviorally. Headaches, tiredness, worry, irritability, forgetfulness and isolation may be signs." },
      { title: "Coping Strategies", content: "Deep breathing, exercise, journaling, prayer, time management and talking to a trusted adult are presented as practical tools." },
      { title: "Stress Plan", content: "Students create a personal stress management plan, support network, weekly schedule and stress journal. Certificate pass mark: 70%." }
    ],
    quiz: [
      "What is stress?",
      "Name three student stressors.",
      "List three signs of stress.",
      "Mention two coping strategies.",
      "Why is time management important?"
    ]
  },
  {
    title: "Study Skills for Academic Success",
    category: "Academic Success",
    audience: "student",
    accessType: "premium",
    description: "A structured academic success guide covering study planning, focus, note-taking, exam preparation and motivation.",
    coverIcon: "📘",
    chapters: [
      { title: "Learning How to Learn", content: "Students learn that intelligence grows through effort, strategy and consistency. The goal is not studying harder only, but studying smarter." },
      { title: "Time Management", content: "This chapter teaches weekly planning, prioritizing tasks, breaking large assignments into smaller steps and avoiding last-minute panic." },
      { title: "Focus and Concentration", content: "Students learn how sleep, environment, phone use, noise and mindset affect concentration. They create a distraction-reduction plan." },
      { title: "Revision and Exam Preparation", content: "The guide explains active recall, practice questions, summaries, spaced repetition and exam-day preparation." },
      { title: "Academic Action Plan", content: "Students create a study timetable, identify weak subjects, set academic goals and complete a self-assessment quiz." }
    ],
    quiz: [
      "What does it mean to study smarter?",
      "Name two time management strategies.",
      "What is active recall?",
      "Why is revision planning important?",
      "How can distractions be reduced?"
    ]
  },
  {
    title: "Young Leaders Handbook",
    category: "Leadership",
    audience: "student",
    accessType: "premium",
    description: "A leadership and character guide helping students build responsibility, communication, service, decision-making and influence.",
    coverIcon: "🏆",
    chapters: [
      { title: "What Leadership Is", content: "Leadership is not about title or popularity. It is the ability to influence positively, take responsibility and serve others." },
      { title: "Character and Responsibility", content: "Students explore honesty, discipline, respect, accountability and keeping promises as foundations of leadership." },
      { title: "Communication Skills", content: "Students learn listening, speaking clearly, respectful disagreement, teamwork and conflict resolution." },
      { title: "Decision Making", content: "The handbook provides a decision framework: pause, think, ask, choose, reflect. Students practice with school-life scenarios." },
      { title: "Leadership Project", content: "Students design a small school or community leadership project and complete a reflection worksheet." }
    ],
    quiz: [
      "What is leadership?",
      "Name three leadership values.",
      "Why is listening important?",
      "What steps help good decision-making?",
      "Describe one leadership project idea."
    ]
  }
];

const parentResources = [
  {
    title: "Positive Parenting Guide",
    category: "Parenting",
    audience: "parent",
    accessType: "free",
    description: "A practical parenting guide focused on trust, communication, discipline, encouragement and emotional connection.",
    coverIcon: "👨‍👩‍👧",
    chapters: [
      { title: "Understanding Positive Parenting", content: "Positive parenting balances warmth, structure and guidance. It does not mean permissiveness; it means correction with respect and emotional safety." },
      { title: "Building Trust", content: "Parents learn daily connection habits: listening, keeping promises, validating feelings and creating safe conversations." },
      { title: "Discipline Without Fear", content: "This chapter explains boundaries, consequences, consistency and correction without humiliation or violence." },
      { title: "Encouragement and Confidence", content: "Parents learn how praise, effort recognition and strength-based communication help children develop resilience." },
      { title: "Family Action Plan", content: "Includes a weekly family check-in, communication agreement and parent reflection worksheet." }
    ],
    quiz: ["What is positive parenting?", "Name two trust-building habits.", "What is healthy discipline?", "Why is encouragement important?", "What is one family action step?"]
  },
  {
    title: "Supporting Children’s Mental Health",
    category: "Mental Health at Home",
    audience: "parent",
    accessType: "free",
    description: "A parent guide for recognizing emotional warning signs, responding calmly and knowing when to seek help.",
    coverIcon: "💚",
    chapters: [
      { title: "Children and Emotional Wellbeing", content: "Children may show emotional distress differently from adults. Parents learn how behavior can communicate unmet emotional needs." },
      { title: "Warning Signs", content: "Changes in sleep, appetite, mood, school performance, social withdrawal, fearfulness or aggression may require attention." },
      { title: "How to Respond", content: "Parents learn to listen without judgment, ask open questions, avoid shaming and create space for conversation." },
      { title: "When to Seek Help", content: "This chapter explains when to involve teachers, counselors, doctors or emergency support." },
      { title: "Home Support Plan", content: "Parents create a support plan including routines, trusted adults, school communication and follow-up steps." }
    ],
    quiz: ["Name three warning signs.", "Why should parents avoid shaming?", "Who can parents contact for support?", "What is active listening?", "Why are routines helpful?"]
  },
  {
    title: "Speech and Communication Development",
    category: "Child Development",
    audience: "parent",
    accessType: "premium",
    description: "A parent-friendly guide to speech milestones, communication support, home activities and early intervention.",
    coverIcon: "🗣️",
    chapters: [
      { title: "Understanding Communication", content: "Communication includes speech, gestures, listening, understanding, eye contact, play and social interaction." },
      { title: "Developmental Milestones", content: "Parents learn general age-based communication expectations while understanding that children develop at different rates." },
      { title: "Home Activities", content: "Reading aloud, naming objects, turn-taking games, singing, storytelling and reducing passive screen time support speech." },
      { title: "When to Ask for Help", content: "Concerns may include limited words, difficulty following instructions, loss of skills, unclear speech or poor social communication." },
      { title: "Parent Tracking Sheet", content: "Includes a weekly speech activity tracker and questions to discuss with teachers or therapists." }
    ],
    quiz: ["What is communication?", "Name three home speech activities.", "Why is reading aloud useful?", "When should a parent ask for help?", "What is a communication tracker?"]
  },
  {
    title: "Managing Screen Time and Digital Safety",
    category: "Digital Safety",
    audience: "parent",
    accessType: "premium",
    description: "A modern parent guide for screen routines, online safety, boundaries, digital wellbeing and family agreements.",
    coverIcon: "📱",
    chapters: [
      { title: "Understanding Screen Time", content: "Screens can educate, entertain and connect, but unregulated use can affect sleep, attention, behavior and relationships." },
      { title: "Digital Risks", content: "Parents learn about cyberbullying, unsafe content, strangers online, comparison, addiction-like patterns and privacy." },
      { title: "Healthy Boundaries", content: "The guide explains device-free zones, sleep rules, content checks, co-viewing and age-appropriate limits." },
      { title: "Family Digital Agreement", content: "Parents create clear rules with children instead of relying only on punishment after problems happen." },
      { title: "Monitoring and Trust", content: "Parents learn how to balance supervision with trust, communication and gradual responsibility." }
    ],
    quiz: ["Name two screen-time risks.", "What is a device-free zone?", "Why is sleep important?", "What is a family digital agreement?", "How can parents build digital trust?"]
  },
  {
    title: "Helping Children Build Confidence",
    category: "Child Development",
    audience: "parent",
    accessType: "premium",
    description: "A guide for helping children develop confidence, resilience, social skills and a positive identity.",
    coverIcon: "🌟",
    chapters: [
      { title: "Confidence in Childhood", content: "Confidence grows through love, safe challenges, encouragement, responsibility and consistent support." },
      { title: "Praise That Builds Growth", content: "Parents learn to praise effort, strategy, kindness and improvement rather than only results." },
      { title: "Supporting Social Development", content: "This chapter covers friendships, sharing, conflict resolution, empathy and communication." },
      { title: "Helping Children Handle Failure", content: "Parents learn how to help children see mistakes as learning opportunities rather than identity labels." },
      { title: "Confidence Builder Plan", content: "Includes weekly confidence activities, affirmation practice and parent-child reflection questions." }
    ],
    quiz: ["How does confidence grow?", "What type of praise is helpful?", "Why are mistakes useful?", "Name two social skills.", "What is one confidence activity?"]
  }
];

const teacherResources = [
  {
    title: "Mental Health Awareness for Teachers",
    category: "Classroom Wellbeing",
    audience: "teacher",
    accessType: "free",
    description: "A practical guide helping teachers understand student mental health and respond with awareness and care.",
    coverIcon: "👩‍🏫",
    chapters: [
      { title: "Teacher Role in Student Wellbeing", content: "Teachers are not therapists, but they are often the first adults to notice changes in students. Awareness helps early support." },
      { title: "Common Student Challenges", content: "Stress, bullying, anxiety, sadness, family problems and peer pressure can affect learning and behavior." },
      { title: "Observation Skills", content: "Teachers learn to notice changes in attendance, mood, participation, concentration, aggression or withdrawal." },
      { title: "Supportive Communication", content: "This chapter teaches calm engagement, privacy, active listening and avoiding public embarrassment." },
      { title: "Referral Basics", content: "Teachers learn when to document, inform school leadership, contact parents or refer to appropriate support." }
    ],
    quiz: ["What is the teacher's role?", "Name three student challenges.", "What changes should teachers observe?", "Why is privacy important?", "When should a teacher refer?"]
  },
  {
    title: "Creating a Positive Classroom Environment",
    category: "Classroom Wellbeing",
    audience: "teacher",
    accessType: "free",
    description: "A classroom culture guide covering belonging, respect, routines, emotional safety and inclusive learning.",
    coverIcon: "🏫",
    chapters: [
      { title: "Belonging Matters", content: "Students learn better when they feel safe, respected and seen. Belonging reduces fear and improves participation." },
      { title: "Classroom Routines", content: "Clear routines reduce anxiety and confusion. Teachers learn how structure supports emotional security." },
      { title: "Respectful Communication", content: "This chapter covers tone, correction without shame, inclusive language and positive reinforcement." },
      { title: "Responding to Conflict", content: "Teachers learn de-escalation, restorative questions and fair consequences." },
      { title: "Classroom Action Plan", content: "Teachers create a simple wellbeing checklist and classroom agreement." }
    ],
    quiz: ["Why does belonging matter?", "How do routines help?", "What is respectful correction?", "What is de-escalation?", "What is one classroom wellbeing action?"]
  },
  {
    title: "Recognizing Early Warning Signs in Students",
    category: "Student Support",
    audience: "teacher",
    accessType: "premium",
    description: "A teacher guide for identifying emotional, behavioral and academic warning signs early.",
    coverIcon: "🔍",
    chapters: [
      { title: "Why Early Detection Matters", content: "Early support can prevent problems from worsening. Teachers learn the value of timely observation." },
      { title: "Academic Warning Signs", content: "Sudden drop in grades, missing assignments, poor concentration and loss of motivation may indicate distress." },
      { title: "Emotional Warning Signs", content: "Persistent sadness, anxiety, anger, fearfulness, irritability or emotional shutdown may need attention." },
      { title: "Behavioral Warning Signs", content: "Aggression, withdrawal, absenteeism, risky behavior or sudden changes in peer relationships are discussed." },
      { title: "Documentation and Referral", content: "Teachers learn to document objectively, protect privacy and escalate concerns appropriately." }
    ],
    quiz: ["Why is early detection important?", "Name two academic warning signs.", "Name two emotional warning signs.", "What is objective documentation?", "Who can teachers refer to?"]
  },
  {
    title: "Bullying Prevention and Response",
    category: "Safeguarding",
    audience: "teacher",
    accessType: "premium",
    description: "A practical anti-bullying manual for prevention, intervention, reporting and classroom culture.",
    coverIcon: "🛡️",
    chapters: [
      { title: "Understanding Bullying", content: "Bullying is repeated harmful behavior involving power imbalance. It can be physical, verbal, social or online." },
      { title: "Prevention Strategies", content: "Teachers learn classroom agreements, supervision, awareness lessons and peer inclusion strategies." },
      { title: "Responding to Incidents", content: "Teachers learn how to separate students, gather facts, avoid victim-blaming and follow school reporting procedures." },
      { title: "Supporting Affected Students", content: "Support includes safety planning, emotional reassurance, parent communication and follow-up." },
      { title: "Classroom Activity", content: "Includes a kindness campaign, reporting pathway and student reflection worksheet." }
    ],
    quiz: ["What is bullying?", "Name three types of bullying.", "Why avoid victim-blaming?", "What is a safety plan?", "Name one prevention strategy."]
  },
  {
    title: "Supporting Students in Distress",
    category: "Student Support",
    audience: "teacher",
    accessType: "premium",
    description: "A response guide for teachers when students appear overwhelmed, withdrawn, anxious or emotionally distressed.",
    coverIcon: "🤝",
    chapters: [
      { title: "Recognizing Distress", content: "Students in distress may cry easily, withdraw, become aggressive, stop submitting work or express hopelessness." },
      { title: "The ODER Framework", content: "Observe, Document, Engage, Refer. This simple framework helps teachers respond calmly and responsibly." },
      { title: "What to Say", content: "Teachers learn supportive phrases, open questions and how to avoid dismissive statements." },
      { title: "Escalation and Safety", content: "This chapter explains when concerns should be escalated urgently, especially if harm or abuse is suspected." },
      { title: "Teacher Self-Care", content: "Supporting students can be emotionally demanding. Teachers need boundaries, support and self-care routines." }
    ],
    quiz: ["What are signs of distress?", "What does ODER stand for?", "Name one helpful phrase.", "When should concerns be escalated?", "Why is teacher self-care important?"]
  }
];

const schoolResources = [
  {
    title: "Mental Health Club Implementation Guide",
    category: "Club Management",
    audience: "school_admin",
    accessType: "free",
    description: "A complete guide for schools to establish and manage a SpeakOut Mental Health Club.",
    coverIcon: "🏫",
    chapters: [
      { title: "Why Clubs Matter", content: "School mental health clubs create safe spaces for awareness, peer leadership, campaigns and early support." },
      { title: "Club Structure", content: "Suggested roles include patron, coordinator, president, vice president, secretary, welfare lead, media lead and members." },
      { title: "Annual Activities", content: "Activities may include awareness week, peer support talks, parent seminars, teacher workshops and outreach projects." },
      { title: "Safeguarding and Boundaries", content: "Club members do not act as therapists. They promote awareness, kindness, referral and safe conversations." },
      { title: "Reporting Template", content: "Schools track attendance, activities, outcomes, photos, challenges and next steps." }
    ],
    quiz: ["Why do clubs matter?", "Name three club roles.", "What can clubs do?", "Why are boundaries important?", "What should reports include?"]
  },
  {
    title: "School Wellbeing Policy Template",
    category: "Policy",
    audience: "school_admin",
    accessType: "free",
    description: "A practical policy template for school wellbeing, student support and mental health awareness.",
    coverIcon: "📄",
    chapters: [
      { title: "Policy Purpose", content: "The policy defines the school's commitment to student wellbeing, awareness, safeguarding and early support." },
      { title: "Roles and Responsibilities", content: "School leaders, teachers, parents, students and club patrons each have responsibilities." },
      { title: "Support Pathways", content: "The policy outlines how concerns move from observation to documentation, parent contact and referral." },
      { title: "Confidentiality", content: "Schools must protect privacy while acting when safety is at risk." },
      { title: "Review and Improvement", content: "The policy should be reviewed annually using reports and feedback." }
    ],
    quiz: ["What is policy purpose?", "Who has responsibilities?", "What is a support pathway?", "Why is confidentiality important?", "When should policy be reviewed?"]
  },
  {
    title: "Parent Engagement Framework",
    category: "Parent Engagement",
    audience: "school_admin",
    accessType: "premium",
    description: "A school guide for involving parents in student wellbeing, workshops, communication and follow-up.",
    coverIcon: "👨‍👩‍👧",
    chapters: [
      { title: "Why Parent Engagement Matters", content: "Students receive stronger support when school and home work together." },
      { title: "Communication Channels", content: "Schools can use meetings, SMS, WhatsApp, newsletters, portals and parent seminars." },
      { title: "Parent Workshops", content: "Suggested topics include screen time, stress, child development, bullying and emotional support." },
      { title: "Sensitive Conversations", content: "Schools learn how to contact parents respectfully when concerns arise." },
      { title: "Engagement Tracker", content: "Schools track attendance, follow-up, feedback and parent participation." }
    ],
    quiz: ["Why engage parents?", "Name two communication channels.", "Name three workshop topics.", "How should concerns be discussed?", "What should schools track?"]
  },
  {
    title: "Workshop Planning Toolkit",
    category: "Workshops",
    audience: "school_admin",
    accessType: "premium",
    description: "A toolkit for planning effective student, parent and teacher workshops.",
    coverIcon: "🗓️",
    chapters: [
      { title: "Choosing a Workshop Topic", content: "Schools should choose topics based on student needs, school calendar, incidents, feedback and age group." },
      { title: "Planning Checklist", content: "The toolkit covers venue, time, facilitator, invitations, attendance, materials and feedback forms." },
      { title: "Session Structure", content: "Recommended structure: welcome, learning objectives, teaching, activity, reflection, questions and next steps." },
      { title: "Measuring Impact", content: "Schools collect attendance, feedback, learning outcomes and follow-up actions." },
      { title: "Templates", content: "Includes invitation message, attendance sheet, feedback form and short report structure." }
    ],
    quiz: ["How choose a topic?", "Name three planning items.", "What is a good session structure?", "Why collect feedback?", "Name one template."]
  },
  {
    title: "Monitoring and Evaluation Template",
    category: "Monitoring",
    audience: "school_admin",
    accessType: "premium",
    description: "A practical M&E template for tracking school mental health club activities and outcomes.",
    coverIcon: "📊",
    chapters: [
      { title: "Why Monitoring Matters", content: "Monitoring helps schools prove impact, improve programs and report to stakeholders." },
      { title: "Key Indicators", content: "Indicators include members, attendance, workshops, certificates, referrals, parent participation and student feedback." },
      { title: "Data Collection Tools", content: "Schools use attendance sheets, feedback forms, photos, reports and portal records." },
      { title: "Monthly Reports", content: "Reports summarize activities, results, challenges, lessons and next actions." },
      { title: "Using Data for Improvement", content: "Schools use findings to improve topics, participation, follow-up and support systems." }
    ],
    quiz: ["Why monitor?", "Name three indicators.", "Name two data tools.", "What goes in reports?", "How can data improve programs?"]
  }
];

const kiddiesResources = [
  {
    title: "My Feelings Matter",
    category: "Ages 4–6",
    audience: "student",
    accessType: "free",
    type: "kiddies",
    description: "A child-friendly story and activity pack helping young children name happy, sad, angry and scared feelings.",
    coverIcon: "😊",
    slides: [
      { title: "Meet Timi", content: "Timi feels sad when his friend does not play with him. Children learn that feelings are normal." },
      { title: "Name the Feeling", content: "Happy, sad, angry and scared faces are introduced with simple examples." },
      { title: "What Can Timi Do?", content: "Timi can talk to an adult, take deep breaths or ask a friend kindly." },
      { title: "Activity", content: "Draw a happy face, sad face, angry face and calm face." },
      { title: "Teacher/Parent Guide", content: "Ask: How do you think Timi feels? What can help him? Who can he talk to?" }
    ]
  },
  {
    title: "Being Kind to Friends",
    category: "Ages 4–6",
    audience: "student",
    accessType: "free",
    type: "kiddies",
    description: "A story-based kindness lesson for young children about sharing, helping and using kind words.",
    coverIcon: "🤗",
    slides: [
      { title: "The Playground", content: "Ada sees a child sitting alone during playtime." },
      { title: "Kind Choices", content: "Ada can invite the child, share a toy and speak kindly." },
      { title: "Kind Words", content: "Children practice words like please, sorry, thank you and come play with us." },
      { title: "Activity", content: "Color a kindness badge and name one kind thing to do today." },
      { title: "Discussion", content: "What does kindness look like at home, school and church/community?" }
    ]
  },
  {
    title: "Confidence Builder",
    category: "Ages 7–10",
    audience: "student",
    accessType: "premium",
    type: "kiddies",
    description: "An activity-based confidence resource for children learning to try, speak up and believe in themselves.",
    coverIcon: "🌟",
    slides: [
      { title: "I Can Try", content: "Children learn that confidence grows when they practice." },
      { title: "My Strengths", content: "Children identify things they are good at and things they want to learn." },
      { title: "Brave Moments", content: "Examples include answering a question, making a friend or trying again after a mistake." },
      { title: "Activity", content: "Complete: I am brave when _____. I am proud that I can _____." },
      { title: "Quiz", content: "What does confidence mean? What can you say when something is hard?" }
    ]
  },
  {
    title: "Understanding Bullying",
    category: "Ages 7–10",
    audience: "student",
    accessType: "premium",
    type: "kiddies",
    description: "A simple child-friendly bullying prevention lesson about kindness, reporting and safe choices.",
    coverIcon: "🛡️",
    slides: [
      { title: "What Is Bullying?", content: "Bullying is repeated hurtful behavior. It can be words, actions or online messages." },
      { title: "How It Feels", content: "Children learn that bullying can make someone sad, scared or lonely." },
      { title: "What To Do", content: "Say stop if safe, move away, tell a trusted adult and support others." },
      { title: "Activity", content: "Circle safe adults you can talk to: teacher, parent, guardian, counselor." },
      { title: "Class Promise", content: "We will use kind words, include others and report bullying." }
    ]
  },
  {
    title: "Managing Stress and Emotions",
    category: "Ages 11–13",
    audience: "student",
    accessType: "premium",
    type: "kiddies",
    description: "A pre-teen guide to stress, emotions, peer pressure, school pressure and calming strategies.",
    coverIcon: "🌿",
    slides: [
      { title: "What Is Stress?", content: "Stress is how the body reacts to pressure. School work, friendships and expectations can cause stress." },
      { title: "Body Signs", content: "Headaches, tiredness, worry, anger and poor sleep can be signs." },
      { title: "Calm Strategies", content: "Deep breathing, walking, journaling and talking to a trusted adult can help." },
      { title: "Peer Pressure", content: "Students practice saying no respectfully and choosing safe friends." },
      { title: "Action Plan", content: "Write three stress triggers and three healthy coping choices." }
    ]
  }
];

const courses = [
  {
    title: "Mental Health Fundamentals for Students",
    audience: "student",
    accessType: "free",
    category: "Student Academy",
    description: "A beginner-friendly course teaching students emotional awareness, stress management, confidence and help-seeking.",
    modules: [
      "Understanding mental health",
      "Emotions and triggers",
      "Stress and coping skills",
      "Asking for help",
      "Final reflection and quiz"
    ]
  },
  {
    title: "Leadership and Personal Growth",
    audience: "student",
    accessType: "premium",
    category: "Student Academy",
    description: "A personal development course for young leaders focused on confidence, responsibility, communication and service.",
    modules: [
      "What leadership means",
      "Character and responsibility",
      "Communication skills",
      "Goal setting",
      "Leadership project"
    ]
  },
  {
    title: "Positive Parenting Essentials",
    audience: "parent",
    accessType: "free",
    category: "Parent Academy",
    description: "A practical course for parents on connection, discipline, emotional support and home routines.",
    modules: [
      "Understanding positive parenting",
      "Trust and communication",
      "Discipline without fear",
      "Supporting mental health",
      "Family action plan"
    ]
  },
  {
    title: "Classroom Wellbeing and Student Support",
    audience: "teacher",
    accessType: "premium",
    category: "Teacher Academy",
    description: "A course for teachers on student wellbeing, classroom culture, warning signs and referral pathways.",
    modules: [
      "Teacher role in wellbeing",
      "Classroom culture",
      "Warning signs",
      "Supportive conversations",
      "Referral and documentation"
    ]
  },
  {
    title: "Building a Mentally Healthy School",
    audience: "school_admin",
    accessType: "premium",
    category: "School Leaders Academy",
    description: "A school leadership course on building mental health systems, clubs, policies, parent engagement and reports.",
    modules: [
      "School mental health systems",
      "Club implementation",
      "Policy and safeguarding",
      "Parent and teacher engagement",
      "Monitoring and reporting"
    ]
  }
];

async function seedBooks(resources) {
  for (const item of resources) {
    const id = slug(item.audience + "-" + item.title);
    await setDoc(doc(db, "books", id), {
      ...item,
      id,
      status: "active",
      createdBy: "launch-seed",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
  }
}

async function seedKiddies(resources) {
  for (const item of resources) {
    const id = slug("kiddies-" + item.title);
    await setDoc(doc(db, "kiddiesResources", id), {
      ...item,
      id,
      status: "active",
      createdBy: "launch-seed",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
  }
}

async function seedCourses(resources) {
  for (const item of resources) {
    const courseId = slug("course-" + item.title);

    await setDoc(doc(db, "courses", courseId), {
      ...item,
      id: courseId,
      status: "active",
      createdBy: "launch-seed",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });

    for (let i = 0; i < item.modules.length; i++) {
      const moduleId = `${courseId}-module-${i + 1}`;
      await setDoc(doc(db, "courseModules", moduleId), {
        id: moduleId,
        courseId,
        title: item.modules[i],
        order: i + 1,
        status: "active",
        createdAt: serverTimestamp()
      }, { merge: true });

      const lessonId = `${moduleId}-lesson-1`;
      await setDoc(doc(db, "courseLessons", lessonId), {
        id: lessonId,
        courseId,
        moduleId,
        title: item.modules[i],
        content: `This lesson introduces ${item.modules[i]} as part of ${item.title}. Learners complete reflection activities, practical exercises, and a short knowledge check.`,
        order: 1,
        status: "active",
        createdAt: serverTimestamp()
      }, { merge: true });
    }
  }
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    show("Please login as admin first.", "bad");
    return;
  }

  const ok = await isAdmin(user);

  if (!ok) {
    show("Access denied. Admin only.", "bad");
    return;
  }

  show("Admin verified. Ready to seed launch content.", "ok");
  seedBtn.disabled = false;
});

seedBtn.addEventListener("click", async () => {
  seedBtn.disabled = true;
  show("Seeding launch content. Please wait...", "warn");

  try {
    await seedBooks(studentResources);
    await seedBooks(parentResources);
    await seedBooks(teacherResources);
    await seedBooks(schoolResources);
    await seedKiddies(kiddiesResources);
    await seedCourses(courses);

    show("Launch content seeded successfully: 20 library resources, 5 Kiddies resources, and 5 SpeakHub courses.", "ok");
  } catch (error) {
    console.error(error);
    show(error.message || "Content seeding failed.", "bad");
    seedBtn.disabled = false;
  }
});
