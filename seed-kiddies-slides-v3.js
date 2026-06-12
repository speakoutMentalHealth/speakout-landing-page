import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const seedBtn = document.getElementById("seedBtn");
const statusBox = document.getElementById("status");
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

const resources = [
  {
    id: "abc-adventures",
    slides: [
      { title: "Welcome to ABC Adventures", animation: "fade-up", body: "<h2>Letters Help Us Read</h2><p>Letters are special symbols. When we learn their names and sounds, we can begin to read words.</p>", activity: "Sing the alphabet slowly and clap for each letter.", quiz: "What letter starts your name?", guide: "Use playful repetition. Keep each practice short." },
      { title: "Letter A", animation: "zoom-in", body: "<h2>A is for Apple</h2><p>The letter A can start words like apple, ant, arrow and Africa.</p>", activity: "Draw an apple and say A three times.", quiz: "Can you name one word that starts with A?", guide: "Let the child trace A with a finger." },
      { title: "Letter B", animation: "fade-left", body: "<h2>B is for Ball</h2><p>The letter B starts words like ball, bag, baby and book.</p>", activity: "Bounce or roll a ball and say B-B-Ball.", quiz: "What sound does B make?", guide: "Use objects around the room." },
      { title: "Picture Match Game", animation: "fade-up", body: "<h2>Match Letters to Pictures</h2><p>Look at a picture and say the first sound.</p>", activity: "Match A to apple, B to ball, C to cup.", quiz: "What picture starts with C?", guide: "Praise effort even when the child guesses." },
      { title: "Parent Practice", animation: "zoom-in", body: "<h2>Practice at Home</h2><p>Choose three letters each day and find objects that begin with them.</p>", activity: "Create a small letter hunt at home.", quiz: "What letter did you enjoy today?", guide: "Repeat often. Children learn through practice." }
    ]
  },
  {
    id: "my-feelings",
    slides: [
      { title: "Feelings Are Normal", animation: "fade-up", body: "<h2>Everyone Has Feelings</h2><p>We can feel happy, sad, angry, scared, excited or worried. Feelings are not bad.</p>", activity: "Make a happy face, sad face and angry face.", quiz: "Name one feeling.", guide: "Help the child name emotions without judgment." },
      { title: "Where Feelings Live", animation: "zoom-in", body: "<h2>Body Clues</h2><p>Sometimes feelings show in the body. Worry may feel like a tight tummy. Anger may feel hot.</p>", activity: "Point to where you feel worry or happiness.", quiz: "Where do you feel anger?", guide: "Use body language to teach self-awareness." },
      { title: "Safe Words", animation: "fade-left", body: "<h2>Use Words</h2><p>Instead of hitting or shouting, we can say: I feel angry because...</p>", activity: "Practice: I feel ____ because ____.", quiz: "What can you say when sad?", guide: "Model calm emotional language." },
      { title: "Calm Down Tool", animation: "fade-up", body: "<h2>Smell the Flower, Blow the Candle</h2><p>Breathe in like smelling a flower. Breathe out like blowing a candle.</p>", activity: "Practice five slow breaths.", quiz: "What helps you calm down?", guide: "Do the breathing with the child." },
      { title: "Trusted Adult", animation: "zoom-in", body: "<h2>Ask for Help</h2><p>When feelings are too big, talk to a trusted adult.</p>", activity: "Draw three trusted adults.", quiz: "Who can you talk to?", guide: "Make sure the child knows help is safe." }
    ]
  },
  {
    id: "safety-first",
    slides: [
      { title: "My Body Belongs to Me", animation: "fade-up", body: "<h2>Body Safety</h2><p>Your body is important. You can say no to unsafe touch.</p>", activity: "Practice saying: Stop. I do not like that.", quiz: "Can you say no to unsafe touch?", guide: "Teach calmly, not with fear." },
      { title: "Safe and Unsafe Secrets", animation: "zoom-in", body: "<h2>Unsafe Secrets Must Be Told</h2><p>A safe surprise makes people happy later. An unsafe secret makes a child afraid or confused.</p>", activity: "Say if examples are safe surprises or unsafe secrets.", quiz: "Should unsafe secrets be reported?", guide: "Repeat that the child will not be blamed." },
      { title: "Trusted Adults", animation: "fade-left", body: "<h2>Who Can Help?</h2><p>A trusted adult listens, protects and helps.</p>", activity: "Name three trusted adults.", quiz: "Who helps you feel safe?", guide: "Identify real people the child can contact." },
      { title: "Stranger Safety", animation: "fade-up", body: "<h2>Ask First</h2><p>Do not follow someone without permission from your caregiver or teacher.</p>", activity: "Role-play what to do if someone says follow me.", quiz: "Should you follow a stranger?", guide: "Practice safety scripts." },
      { title: "Speak Until Help Comes", animation: "zoom-in", body: "<h2>Keep Speaking</h2><p>If one adult does not listen, tell another safe adult.</p>", activity: "Practice: I need help. Something happened.", quiz: "What if the first adult does not listen?", guide: "Teach persistence and protection." }
    ]
  },
  {
    id: "healthy-habits",
    slides: [
      { title: "My Healthy Body", animation: "fade-up", body: "<h2>Healthy Habits Help Me Grow</h2><p>Water, sleep, food, movement and hygiene help children learn and play.</p>", activity: "Name one healthy habit.", quiz: "Why do we drink water?", guide: "Connect habits to daily routines." },
      { title: "Clean Hands", animation: "zoom-in", body: "<h2>Wash Hands</h2><p>Clean hands help protect the body from germs.</p>", activity: "Practice hand washing steps.", quiz: "When should you wash hands?", guide: "Use a short song while washing." },
      { title: "Move and Play", animation: "fade-left", body: "<h2>Movement Helps My Body</h2><p>Jumping, running, dancing and stretching help the body stay active.</p>", activity: "Do ten jumps and five stretches.", quiz: "Name one way to move your body.", guide: "Keep movement safe and fun." },
      { title: "Sleep and Rest", animation: "fade-up", body: "<h2>Rest Helps Me Learn</h2><p>Sleep helps the brain and body recover.</p>", activity: "Create a bedtime routine picture.", quiz: "Why is sleep important?", guide: "Encourage routine over punishment." },
      { title: "Screen Balance", animation: "zoom-in", body: "<h2>Take Screen Breaks</h2><p>Too much screen time can affect sleep and attention.</p>", activity: "Choose one screen-free game.", quiz: "What can you do instead of screens?", guide: "Offer alternatives, not only restriction." }
    ]
  },
  {
    id: "leadership-for-kids",
    slides: [
      { title: "A Leader Helps", animation: "fade-up", body: "<h2>Leadership Is Service</h2><p>A leader helps people and does what is right.</p>", activity: "Name one way you can help today.", quiz: "Is leadership the same as bossing?", guide: "Teach leadership as responsibility." },
      { title: "Kind Words", animation: "zoom-in", body: "<h2>Words Can Help</h2><p>Good leaders use words that encourage and guide.</p>", activity: "Say one kind sentence to someone.", quiz: "What kind words can you use?", guide: "Correct unkind speech early." },
      { title: "Teamwork", animation: "fade-left", body: "<h2>We Work Together</h2><p>Teamwork means sharing roles and solving problems together.</p>", activity: "Build something with a partner.", quiz: "Why should team members listen?", guide: "Assign simple roles." },
      { title: "Courage", animation: "fade-up", body: "<h2>Doing the Right Thing</h2><p>Courage means doing what is right even when it feels hard.</p>", activity: "Practice reporting bullying respectfully.", quiz: "What is one brave action?", guide: "Praise brave and safe choices." },
      { title: "My Leadership Promise", animation: "zoom-in", body: "<h2>I Can Lead With Kindness</h2><p>A young leader can be honest, helpful, respectful and responsible.</p>", activity: "Write or say your leadership promise.", quiz: "How will you lead this week?", guide: "Review the promise weekly." }
    ]
  }
];

async function install() {
  for (const resource of resources) {
    await setDoc(doc(db, "kiddiesResources", resource.id), {
      kiddiesSlides: resource.slides,
      slides: resource.slides,
      updatedAt: serverTimestamp()
    }, { merge: true });
  }
  return resources.length;
}

onAuthStateChanged(auth, async user => {
  if (!user) {
    setStatus("Please login as admin first.", "error");
    return;
  }

  adminReady = await isAdmin(user);

  if (!adminReady) {
    setStatus("Access denied. Admin role required.", "error");
    return;
  }

  setStatus("Admin verified. You can install Kiddies slides.", "success");
  seedBtn.disabled = false;
});

seedBtn.addEventListener("click", async () => {
  seedBtn.disabled = true;
  try {
    const count = await install();
    setStatus(`Done. Kiddies slide resources updated: ${count}`, "success");
  } catch (error) {
    console.error(error);
    setStatus(error.message || "Failed to install slides.", "error");
    seedBtn.disabled = false;
  }
});
