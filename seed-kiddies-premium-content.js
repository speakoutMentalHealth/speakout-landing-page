import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { doc, getDoc, writeBatch, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const KIDDIES_RESOURCES = [];

/* =========================
   BOOK 1: ABC ADVENTURES
========================= */

KIDDIES_RESOURCES.push({
  id: "abc-adventures",
  title: "ABC Adventures",
  category: "literacy",
  ageGroup: "ages-3-5",
  status: "active",
  featured: true,
  readingTime: "25–35 min",
  level: "Beginner",
  author: "SpeakOut Mental Health Outreach",
  description: "A complete early-literacy mini-book that teaches letters, sounds, words, vocabulary, reading confidence, and communication.",
  contentHtml: `
    <h1>ABC Adventures</h1>
    <p><strong>Published by SpeakOut Mental Health Outreach.</strong></p>

    <h2>Welcome to the World of Letters</h2>
    <p>Every book, sign, story, message, and name is built from letters. Letters help people communicate ideas, feelings, stories, and information. When children learn letters, they unlock the door to reading, writing, speaking, learning, and imagination.</p>

    <h2>Learning Objectives</h2>
    <ul>
      <li>Recognize the 26 letters of the alphabet.</li>
      <li>Understand that letters have names and sounds.</li>
      <li>Build simple words from letters.</li>
      <li>Improve listening, speaking, and vocabulary.</li>
      <li>Develop confidence in early reading.</li>
    </ul>

    <h2>Chapter 1: Meet the Alphabet Family</h2>
    <p>The English alphabet has 26 letters. Each letter has a name, a shape, and a sound. Some letters are tall, some are round, some have curves, and some have straight lines.</p>

    <table border="1" cellpadding="8">
      <tr><th>Letter</th><th>Example</th></tr>
      <tr><td>A</td><td>Apple</td></tr>
      <tr><td>B</td><td>Ball</td></tr>
      <tr><td>C</td><td>Cat</td></tr>
      <tr><td>D</td><td>Dog</td></tr>
      <tr><td>E</td><td>Egg</td></tr>
      <tr><td>F</td><td>Fish</td></tr>
      <tr><td>G</td><td>Goat</td></tr>
      <tr><td>H</td><td>Hat</td></tr>
      <tr><td>I</td><td>Ice</td></tr>
      <tr><td>J</td><td>Jam</td></tr>
      <tr><td>K</td><td>Kite</td></tr>
      <tr><td>L</td><td>Lion</td></tr>
      <tr><td>M</td><td>Milk</td></tr>
      <tr><td>N</td><td>Nest</td></tr>
      <tr><td>O</td><td>Orange</td></tr>
      <tr><td>P</td><td>Pen</td></tr>
      <tr><td>Q</td><td>Queen</td></tr>
      <tr><td>R</td><td>Rabbit</td></tr>
      <tr><td>S</td><td>Sun</td></tr>
      <tr><td>T</td><td>Tree</td></tr>
      <tr><td>U</td><td>Umbrella</td></tr>
      <tr><td>V</td><td>Van</td></tr>
      <tr><td>W</td><td>Water</td></tr>
      <tr><td>X</td><td>Xylophone</td></tr>
      <tr><td>Y</td><td>Yam</td></tr>
      <tr><td>Z</td><td>Zebra</td></tr>
    </table>

    <h2>Chapter 2: Letter Sounds</h2>
    <p>Letters make sounds. Before children become good readers, they need to hear sounds clearly. This helps them build words later.</p>
    <ul>
      <li>B says /b/ as in ball.</li>
      <li>C says /k/ as in cat.</li>
      <li>D says /d/ as in dog.</li>
      <li>M says /m/ as in milk.</li>
      <li>S says /s/ as in sun.</li>
    </ul>

    <h2>Story Time: Ava and the Lost Alphabet</h2>
    <p>One morning Ava opened her favorite book and discovered that all the letters had disappeared. The words were gone. The pages looked empty.</p>
    <p>A tiny blue bird appeared and said, “To bring back the story, you must find the alphabet.” Ava found A beside an apple tree, B bouncing inside a ball, C hiding behind a cat, and D sleeping beside a dog.</p>
    <p>By sunset, Ava had found all 26 letters. Her book came alive again. Ava learned that every story begins with letters.</p>

    <h2>Chapter 3: Building Words</h2>
    <p>Letters join together to form words.</p>
    <ul>
      <li>C + A + T = CAT</li>
      <li>D + O + G = DOG</li>
      <li>S + U + N = SUN</li>
      <li>P + E + N = PEN</li>
    </ul>

    <h2>Workbook</h2>
    <ul>
      <li>A __ C</li>
      <li>D __ F</li>
      <li>G __ I</li>
      <li>J __ L</li>
    </ul>

    <h2>Mini Quiz</h2>
    <ol>
      <li>How many letters are in the English alphabet?</li>
      <li>What letter comes after B?</li>
      <li>What word starts with C?</li>
      <li>Spell your first name.</li>
      <li>Why is reading important?</li>
    </ol>

    <h2>Parent Guide</h2>
    <p>Read with your child for 15 minutes daily. Praise effort. Make reading fun. Never use reading as punishment.</p>

    <h2>Teacher Guide</h2>
    <p>Use songs, flashcards, storytelling, group reading, and role play. Allow children to learn at different speeds.</p>
  `
});


/* =========================
   BOOK 2: NUMBERS FUN
========================= */

KIDDIES_RESOURCES.push({
  id: "numbers-fun",
  title: "Numbers Fun",
  category: "numeracy",
  ageGroup: "ages-3-5",
  status: "active",
  featured: true,
  readingTime: "25–35 min",
  level: "Beginner",
  author: "SpeakOut Mental Health Outreach",
  description: "A complete early-numeracy mini-book that teaches counting, comparison, addition, subtraction, patterns, time, money, and confidence.",
  contentHtml: `
    <h1>Numbers Fun</h1>
    <p><strong>Published by SpeakOut Mental Health Outreach.</strong></p>

    <h2>Welcome to Numbers Fun</h2>
    <p>Numbers are everywhere. We use numbers when we count toys, tell time, buy things, measure ingredients, play games, and celebrate birthdays.</p>

    <h2>Learning Objectives</h2>
    <ul>
      <li>Recognize numbers 1–100.</li>
      <li>Count accurately.</li>
      <li>Compare more, less, and equal.</li>
      <li>Practice simple addition and subtraction.</li>
      <li>Understand patterns, time, and money basics.</li>
    </ul>

    <h2>Chapter 1: Meet the Number Family</h2>
    <p>Numbers tell us how many things there are. Every number has a special job.</p>

    <table border="1" cellpadding="8">
      <tr><th>Number</th><th>Word</th></tr>
      <tr><td>1</td><td>One</td></tr>
      <tr><td>2</td><td>Two</td></tr>
      <tr><td>3</td><td>Three</td></tr>
      <tr><td>4</td><td>Four</td></tr>
      <tr><td>5</td><td>Five</td></tr>
      <tr><td>6</td><td>Six</td></tr>
      <tr><td>7</td><td>Seven</td></tr>
      <tr><td>8</td><td>Eight</td></tr>
      <tr><td>9</td><td>Nine</td></tr>
      <tr><td>10</td><td>Ten</td></tr>
    </table>

    <h2>Chapter 2: Counting to 100</h2>
    <p>Counting by tens helps children count faster:</p>
    <p>10, 20, 30, 40, 50, 60, 70, 80, 90, 100.</p>

    <h2>Story Time: Timi and the Missing Mangoes</h2>
    <p>Timi counted ten mangoes in a basket. Later, he found only seven. His sister had taken three.</p>
    <p>10 - 3 = 7. Timi learned subtraction.</p>
    <p>The next day, Grandma added five more mangoes. 7 + 5 = 12. Timi learned addition too.</p>

    <h2>Chapter 3: Addition Adventure</h2>
    <p>Addition means putting things together.</p>
    <ul>
      <li>2 + 3 = 5</li>
      <li>4 + 4 = 8</li>
      <li>5 + 5 = 10</li>
      <li>7 + 3 = 10</li>
    </ul>

    <h2>Chapter 4: Subtraction Adventure</h2>
    <p>Subtraction means taking away.</p>
    <ul>
      <li>5 - 2 = 3</li>
      <li>8 - 3 = 5</li>
      <li>10 - 4 = 6</li>
      <li>9 - 2 = 7</li>
    </ul>

    <h2>Chapter 5: Patterns Everywhere</h2>
    <ul>
      <li>Red, Blue, Red, Blue, what comes next?</li>
      <li>Circle, Square, Circle, Square, what comes next?</li>
      <li>2, 4, 6, 8, what comes next?</li>
    </ul>

    <h2>Chapter 6: Time and Money</h2>
    <ul>
      <li>60 seconds = 1 minute</li>
      <li>60 minutes = 1 hour</li>
      <li>24 hours = 1 day</li>
      <li>If you save ₦100 daily for 10 days, you will have ₦1,000.</li>
    </ul>

    <h2>Workbook</h2>
    <ul>
      <li>1, 2, __, 4, 5</li>
      <li>6, 7, __, 9, 10</li>
      <li>Draw 5 stars.</li>
      <li>Draw 8 circles.</li>
      <li>Solve: 5 + 3 = ___</li>
      <li>Solve: 10 - 2 = ___</li>
    </ul>

    <h2>Mini Quiz</h2>
    <ol>
      <li>What comes after 15?</li>
      <li>What comes before 20?</li>
      <li>What is 5 + 4?</li>
      <li>What is 10 - 3?</li>
      <li>How many minutes are in one hour?</li>
    </ol>

    <h2>Parent Guide</h2>
    <p>Use fruits, shoes, cups, books, toys, and money examples to teach numbers. Children understand math better when they can touch and count real things.</p>

    <h2>Teacher Guide</h2>
    <p>Use games, songs, flashcards, movement, counting objects, and real-life word problems. Help children understand concepts before memorizing answers.</p>
  `
});
/* =========================
   BOOK 3: COLORS AND SHAPES
========================= */

KIDDIES_RESOURCES.push({
  id: "colors-and-shapes",
  title: "Colors and Shapes",
  category: "early-learning",
  ageGroup: "ages-3-5",
  status: "active",
  featured: true,
  readingTime: "25–35 min",
  level: "Beginner",
  author: "SpeakOut Mental Health Outreach",
  description: "A complete visual-learning mini-book that teaches colors, shapes, patterns, observation, sorting, creativity, and early problem-solving.",
  contentHtml: `
    <h1>Colors and Shapes</h1>
    <p><strong>Published by SpeakOut Mental Health Outreach.</strong></p>

    <h2>Welcome to the World of Colors and Shapes</h2>
    <p>Colors and shapes are everywhere. We see them in clothes, food, toys, books, houses, flowers, school bags, roads, classrooms, and nature.</p>
    <p>When children learn colors and shapes, they learn how to observe, describe, compare, sort, draw, and think carefully.</p>

    <h2>Learning Objectives</h2>
    <ul>
      <li>Identify common colors.</li>
      <li>Recognize basic shapes.</li>
      <li>Describe objects using color and shape words.</li>
      <li>Sort objects by color, shape, and size.</li>
      <li>Create simple patterns.</li>
      <li>Use colors and shapes in drawing and storytelling.</li>
    </ul>

    <h2>Chapter 1: What Are Colors?</h2>
    <p>Colors help us describe the world. A child can say, “I have a red bag,” “The sky is blue,” or “The grass is green.” Colors help children speak more clearly and observe more carefully.</p>

    <table border="1" cellpadding="8">
      <tr><th>Color</th><th>Examples</th></tr>
      <tr><td>Red</td><td>Apple, tomato, stop sign</td></tr>
      <tr><td>Blue</td><td>Sky, water, school bag</td></tr>
      <tr><td>Yellow</td><td>Sun, banana, corn</td></tr>
      <tr><td>Green</td><td>Grass, leaves, vegetables</td></tr>
      <tr><td>Orange</td><td>Orange fruit, carrot, sunset</td></tr>
      <tr><td>Purple</td><td>Grapes, flowers, clothes</td></tr>
      <tr><td>Black</td><td>Shoes, tyres, hair</td></tr>
      <tr><td>White</td><td>Clouds, paper, chalk</td></tr>
    </table>

    <h2>Chapter 2: What Are Shapes?</h2>
    <p>Shapes are the forms or outlines of things. Many objects around us have shapes.</p>

    <table border="1" cellpadding="8">
      <tr><th>Shape</th><th>Examples</th></tr>
      <tr><td>Circle</td><td>Plate, clock, ball, coin</td></tr>
      <tr><td>Square</td><td>Tiles, boxes, windows</td></tr>
      <tr><td>Rectangle</td><td>Door, phone, book, table</td></tr>
      <tr><td>Triangle</td><td>Roof, party hat, road sign</td></tr>
      <tr><td>Oval</td><td>Egg, balloon, face shape</td></tr>
      <tr><td>Star</td><td>Badge, decoration, drawing</td></tr>
    </table>

    <h2>Story Time: Naya the Shape Detective</h2>
    <p>Naya loved looking around her classroom. One morning her teacher said, “Today, we are becoming shape detectives.”</p>
    <p>Naya looked carefully. The clock was a circle. The door was a rectangle. The window was a square. The roof in her drawing was a triangle.</p>
    <p>She smiled and said, “Shapes are hiding everywhere!”</p>
    <p>Her teacher replied, “Yes, and when you notice shapes, you are learning how to observe the world.”</p>

    <h2>Chapter 3: Color Feelings</h2>
    <p>Colors can sometimes remind us of feelings. This does not mean every color has only one meaning, but children can use colors to express emotions.</p>
    <ul>
      <li>Yellow can feel bright, happy, and cheerful.</li>
      <li>Blue can feel calm, peaceful, or sometimes sad.</li>
      <li>Red can feel strong, excited, or angry.</li>
      <li>Green can feel fresh, safe, and natural.</li>
    </ul>

    <h2>Chapter 4: Sorting and Grouping</h2>
    <p>Sorting means putting things into groups. Children can sort by color, shape, size, or type.</p>
    <ol>
      <li>Sort bottle tops by color.</li>
      <li>Sort blocks by shape.</li>
      <li>Sort toys by size.</li>
      <li>Count how many objects are in each group.</li>
    </ol>

    <h2>Chapter 5: Patterns</h2>
    <p>A pattern is something that repeats in a predictable way.</p>
    <ul>
      <li>Red, Blue, Red, Blue, what comes next?</li>
      <li>Circle, Square, Circle, Square, what comes next?</li>
      <li>Big, Small, Big, Small, what comes next?</li>
    </ul>

    <h2>Creative Activity: Shape House</h2>
    <p>Draw a house using shapes:</p>
    <ul>
      <li>Square for the house.</li>
      <li>Triangle for the roof.</li>
      <li>Rectangle for the door.</li>
      <li>Circle for the sun.</li>
    </ul>

    <h2>Workbook</h2>
    <ul>
      <li>My favorite color is: ______</li>
      <li>I found a circle on/in: ______</li>
      <li>I found a rectangle on/in: ______</li>
      <li>I can make this pattern: ______</li>
      <li>Today I learned: ______</li>
    </ul>

    <h2>Mini Quiz</h2>
    <ol>
      <li>What color is the sky on a clear day?</li>
      <li>What shape is a plate?</li>
      <li>What shape is a door?</li>
      <li>Name two things that are green.</li>
      <li>Complete the pattern: red, blue, red, blue, ____.</li>
    </ol>

    <h2>Parent Guide</h2>
    <p>Use daily life to teach colors and shapes. Ask children about clothes, food, toys, books, doors, windows, and objects around them.</p>

    <h2>Teacher Guide</h2>
    <p>Use sorting games, drawing, object hunts, flashcards, group work, and pattern practice. Encourage children to speak and describe what they see.</p>
  `
});


/* =========================
   BOOK 4: CREATIVE DRAWING
========================= */

KIDDIES_RESOURCES.push({
  id: "creative-drawing",
  title: "Creative Drawing",
  category: "creativity",
  ageGroup: "ages-3-5",
  status: "active",
  featured: false,
  readingTime: "25–35 min",
  level: "Beginner",
  author: "SpeakOut Mental Health Outreach",
  description: "A complete creativity mini-book that helps children express ideas, emotions, imagination, stories, and confidence through drawing.",
  contentHtml: `
    <h1>Creative Drawing</h1>
    <p><strong>Published by SpeakOut Mental Health Outreach.</strong></p>

    <h2>Welcome to Creative Drawing</h2>
    <p>Drawing is a powerful way for children to express thoughts, feelings, memories, dreams, and stories. A child does not need to draw perfectly. The goal is expression, imagination, and confidence.</p>

    <h2>Learning Objectives</h2>
    <ul>
      <li>Use drawing to express ideas and feelings.</li>
      <li>Build fine motor skills.</li>
      <li>Tell stories using pictures.</li>
      <li>Use colors to show mood and imagination.</li>
      <li>Develop confidence through creativity.</li>
    </ul>

    <h2>Chapter 1: Drawing Is Communication</h2>
    <p>Before children can write long sentences, they can draw. A drawing can say, “This is my family,” “This is how I feel,” or “This is something I imagine.”</p>

    <h2>Chapter 2: Lines and Shapes</h2>
    <p>Most drawings begin with simple lines and shapes.</p>
    <ul>
      <li>Straight lines can become roads, doors, or tables.</li>
      <li>Curved lines can become smiles, rivers, or clouds.</li>
      <li>Circles can become faces, suns, balls, or wheels.</li>
      <li>Squares and rectangles can become houses, books, or windows.</li>
    </ul>

    <h2>Story Time: Kosi’s Yellow Sun</h2>
    <p>Kosi drew a big yellow sun and three people holding hands. Her teacher asked, “Tell me about your picture.”</p>
    <p>Kosi smiled and said, “This is my happy place. The sun is bright, and my family is together.”</p>
    <p>Her teacher learned something important: Kosi’s drawing was not just a picture. It was a story.</p>

    <h2>Chapter 3: Drawing Feelings</h2>
    <p>Sometimes children feel things they cannot explain with words. Drawing can help them express those feelings safely.</p>
    <ul>
      <li>Draw happiness as sunshine.</li>
      <li>Draw sadness as rain.</li>
      <li>Draw anger as red lines or a storm.</li>
      <li>Draw calmness as water, trees, or soft colors.</li>
    </ul>

    <h2>Chapter 4: Story Drawing</h2>
    <p>A child can use three pictures to tell a story:</p>
    <ol>
      <li>Beginning: Who is in the story?</li>
      <li>Middle: What happened?</li>
      <li>End: How did it finish?</li>
    </ol>

    <h2>Creative Activities</h2>
    <ol>
      <li>Draw your family.</li>
      <li>Draw your favorite food.</li>
      <li>Draw a safe place.</li>
      <li>Draw how you feel today.</li>
      <li>Draw a story with three pictures.</li>
    </ol>

    <h2>Workbook</h2>
    <ul>
      <li>My picture is about: ______</li>
      <li>The colors I used are: ______</li>
      <li>The feeling in my picture is: ______</li>
      <li>One thing I want to draw next is: ______</li>
    </ul>

    <h2>Mini Quiz</h2>
    <ol>
      <li>Can drawing help children express feelings?</li>
      <li>Should every drawing be perfect?</li>
      <li>Name one thing a circle can become.</li>
      <li>What can blue sometimes represent?</li>
      <li>Why should adults ask children to explain their pictures?</li>
    </ol>

    <h2>Parent Guide</h2>
    <p>Do not over-correct drawings. Ask gentle questions like, “What is happening here?” or “Tell me about your picture.” Praise effort and imagination.</p>

    <h2>Teacher Guide</h2>
    <p>Use drawing for storytelling, emotional expression, vocabulary building, and confidence. Display children’s work respectfully and avoid comparison.</p>
  `
});


/* =========================
   BOOK 5: SHARING AND TEAMWORK
========================= */

KIDDIES_RESOURCES.push({
  id: "sharing-and-teamwork",
  title: "Sharing and Teamwork",
  category: "character",
  ageGroup: "ages-3-5",
  status: "active",
  featured: false,
  readingTime: "25–35 min",
  level: "Beginner",
  author: "SpeakOut Mental Health Outreach",
  description: "A complete social-skills mini-book that teaches sharing, turn-taking, cooperation, patience, helping, and respectful group play.",
  contentHtml: `
    <h1>Sharing and Teamwork</h1>
    <p><strong>Published by SpeakOut Mental Health Outreach.</strong></p>

    <h2>Welcome to Sharing and Teamwork</h2>
    <p>Children grow socially when they learn how to share, wait, help, listen, and work with others. Sharing and teamwork help children build friendship, patience, kindness, and confidence.</p>

    <h2>Learning Objectives</h2>
    <ul>
      <li>Understand what sharing means.</li>
      <li>Practice taking turns.</li>
      <li>Use polite words when asking.</li>
      <li>Work with others during group activities.</li>
      <li>Build patience and kindness.</li>
    </ul>

    <h2>Chapter 1: What Is Sharing?</h2>
    <p>Sharing means allowing others to use, enjoy, or take turns with something. Sharing does not always mean giving everything away. It can mean being fair and kind.</p>

    <ul>
      <li>Sharing toys.</li>
      <li>Sharing books.</li>
      <li>Sharing space.</li>
      <li>Sharing ideas.</li>
      <li>Sharing time.</li>
    </ul>

    <h2>Chapter 2: What Is Teamwork?</h2>
    <p>Teamwork means people work together to complete a task, solve a problem, or help one another.</p>

    <ul>
      <li>Everyone has a role.</li>
      <li>Everyone listens.</li>
      <li>Everyone helps.</li>
      <li>Everyone celebrates the result.</li>
    </ul>

    <h2>Story Time: The Toy Truck Turn</h2>
    <p>Two children wanted the same toy truck. One child grabbed it and the other started crying.</p>
    <p>The teacher brought a timer and said, “You can each have a turn.”</p>
    <p>The first child played for five minutes. Then the truck was passed to the second child.</p>
    <p>Both children learned that taking turns can be fair.</p>

    <h2>Chapter 3: Words That Help Us Share</h2>
    <ul>
      <li>Please may I have a turn?</li>
      <li>You can use it after me.</li>
      <li>Let us do it together.</li>
      <li>Thank you for sharing.</li>
      <li>Please may I join?</li>
    </ul>

    <h2>Chapter 4: Patience and Waiting</h2>
    <p>Waiting can be hard for young children. But waiting helps children learn self-control.</p>
    <ul>
      <li>Use a timer.</li>
      <li>Take deep breaths.</li>
      <li>Watch and wait.</li>
      <li>Use kind words.</li>
    </ul>

    <h2>Team Activities</h2>
    <ol>
      <li>Build a tower together.</li>
      <li>Draw one picture as a group.</li>
      <li>Clean one area together.</li>
      <li>Pass a ball around and say one kind word.</li>
      <li>Take turns telling a story.</li>
    </ol>

    <h2>Workbook</h2>
    <ul>
      <li>I shared: ______</li>
      <li>I waited for: ______</li>
      <li>My team built: ______</li>
      <li>One kind team word is: ______</li>
    </ul>

    <h2>Mini Quiz</h2>
    <ol>
      <li>What does sharing mean?</li>
      <li>What does teamwork mean?</li>
      <li>How can you ask for a turn politely?</li>
      <li>Why is waiting important?</li>
      <li>Name one team activity.</li>
    </ol>

    <h2>Parent Guide</h2>
    <p>Young children are still learning impulse control. Use timers, calm reminders, and praise when children share or wait. Do not shame them when they struggle.</p>

    <h2>Teacher Guide</h2>
    <p>Use small group activities, clear turn-taking rules, helper roles, and praise for cooperation. Teach sharing with structure, not force.</p>
  `
});
/* =========================
   BOOK 6: GOOD MANNERS
========================= */

KIDDIES_RESOURCES.push({
  id: "good-manners",
  title: "Good Manners",
  category: "character",
  ageGroup: "ages-6-9",
  status: "active",
  featured: true,
  readingTime: "30–40 min",
  level: "Beginner",
  author: "SpeakOut Mental Health Outreach",
  description: "A complete character-building mini-book that teaches respect, greetings, gratitude, apology, patience, kindness, and responsible behavior.",
  contentHtml: `
    <h1>Good Manners</h1>
    <p><strong>Published by SpeakOut Mental Health Outreach.</strong></p>

    <h2>Welcome to Good Manners</h2>
    <p>Good manners help children build respect, friendship, confidence, and peace. Manners are not just rules. They are ways of showing people that they matter.</p>

    <h2>Learning Objectives</h2>
    <ul>
      <li>Understand why manners matter.</li>
      <li>Use polite words correctly.</li>
      <li>Practice greetings, gratitude, and apology.</li>
      <li>Show respect at home, school, and in the community.</li>
      <li>Build kindness and responsibility.</li>
    </ul>

    <h2>Chapter 1: What Are Good Manners?</h2>
    <p>Good manners are respectful words and actions. They help people feel valued, safe, and appreciated.</p>
    <ul>
      <li>Greeting people kindly.</li>
      <li>Waiting for your turn.</li>
      <li>Saying please and thank you.</li>
      <li>Listening when others speak.</li>
      <li>Apologizing when you hurt someone.</li>
    </ul>

    <h2>Chapter 2: Polite Words</h2>
    <table border="1" cellpadding="8">
      <tr><th>Polite Word</th><th>When to Use It</th></tr>
      <tr><td>Please</td><td>When asking for something.</td></tr>
      <tr><td>Thank you</td><td>When someone helps you.</td></tr>
      <tr><td>Excuse me</td><td>When interrupting or passing.</td></tr>
      <tr><td>I am sorry</td><td>When you hurt or offend someone.</td></tr>
      <tr><td>May I?</td><td>When asking permission.</td></tr>
    </table>

    <h2>Story Time: Chika Learns to Ask</h2>
    <p>Chika saw a pencil on his friend’s desk. He picked it up without asking. His friend became upset.</p>
    <p>The teacher said, “Chika, try again with good manners.”</p>
    <p>Chika returned the pencil and said, “Please, may I borrow your pencil?” His friend smiled and said yes.</p>
    <p>Chika learned that manners can change the way people feel.</p>

    <h2>Chapter 3: Respect at Home</h2>
    <ul>
      <li>Greet parents and family members.</li>
      <li>Help with simple chores.</li>
      <li>Speak calmly.</li>
      <li>Ask before taking someone’s things.</li>
    </ul>

    <h2>Chapter 4: Respect at School</h2>
    <ul>
      <li>Listen to teachers.</li>
      <li>Do not laugh at mistakes.</li>
      <li>Raise your hand before speaking.</li>
      <li>Keep shared spaces clean.</li>
    </ul>

    <h2>Chapter 5: Apology and Repair</h2>
    <p>A good apology does not only say “sorry.” It shows understanding and a desire to do better.</p>
    <ol>
      <li>Say what you did.</li>
      <li>Say sorry sincerely.</li>
      <li>Ask how to make it better.</li>
      <li>Try not to repeat the behavior.</li>
    </ol>

    <h2>Workbook</h2>
    <ul>
      <li>One polite word I used today: ______</li>
      <li>Someone I thanked today: ______</li>
      <li>One behavior I need to improve: ______</li>
      <li>A good apology sounds like: ______</li>
    </ul>

    <h2>Mini Quiz</h2>
    <ol>
      <li>Why do manners matter?</li>
      <li>When should you say thank you?</li>
      <li>What should you say when asking for something?</li>
      <li>What makes an apology good?</li>
      <li>Name one way to show respect at school.</li>
    </ol>

    <h2>Parent Guide</h2>
    <p>Children copy what adults model. Use polite words with children and others. Correct calmly and praise visible improvement.</p>

    <h2>Teacher Guide</h2>
    <p>Use role-play, classroom routines, praise, and reflection. Teach manners as respect, not fear.</p>
  `
});


/* =========================
   BOOK 7: MY FEELINGS
========================= */

KIDDIES_RESOURCES.push({
  id: "my-feelings",
  title: "My Feelings",
  category: "emotions",
  ageGroup: "ages-6-9",
  status: "active",
  featured: true,
  readingTime: "30–40 min",
  level: "Beginner",
  author: "SpeakOut Mental Health Outreach",
  description: "A complete emotional-literacy mini-book that helps children name feelings, understand body signals, express emotions safely, and ask for help.",
  contentHtml: `
    <h1>My Feelings</h1>
    <p><strong>Published by SpeakOut Mental Health Outreach.</strong></p>

    <h2>Welcome to My Feelings</h2>
    <p>Every child has feelings. Feelings are not bad. They help us understand what is happening inside us. What matters is how we respond to those feelings.</p>

    <h2>Learning Objectives</h2>
    <ul>
      <li>Name common feelings.</li>
      <li>Understand body signals.</li>
      <li>Express emotions safely.</li>
      <li>Use calming tools.</li>
      <li>Ask trusted adults for help.</li>
    </ul>

    <h2>Chapter 1: What Are Feelings?</h2>
    <p>Feelings are emotions we experience inside. We may feel happy, sad, angry, scared, worried, excited, lonely, proud, or confused.</p>
    <ul>
      <li>Happiness may feel light and energetic.</li>
      <li>Sadness may feel heavy.</li>
      <li>Anger may feel hot or tight.</li>
      <li>Fear may feel shaky.</li>
      <li>Worry may feel like too many thoughts at once.</li>
    </ul>

    <h2>Story Time: Zara Names Her Feeling</h2>
    <p>Zara’s pencil broke during class. Her face became hot, and her chest felt tight. She wanted to shout.</p>
    <p>Her teacher asked, “What feeling is visiting you?”</p>
    <p>Zara said, “I feel angry.”</p>
    <p>After naming the feeling, she took three slow breaths and asked for another pencil.</p>

    <h2>Chapter 2: Feelings Are Messages</h2>
    <p>Feelings tell us something. Sadness may tell us we lost something. Anger may tell us something feels unfair. Fear may tell us we need safety.</p>

    <h2>Chapter 3: Feelings and Actions Are Different</h2>
    <p>You can feel angry without hitting. You can feel sad without giving up. You can feel scared and still ask for help.</p>

    <h2>Chapter 4: Safe Ways to Express Feelings</h2>
    <ul>
      <li>Use words: “I feel ___ because ___.”</li>
      <li>Draw the feeling.</li>
      <li>Talk to a trusted adult.</li>
      <li>Take deep breaths.</li>
      <li>Ask for a break.</li>
    </ul>

    <h2>Feeling Thermometer</h2>
    <p>Rate your feeling from 1 to 5:</p>
    <ul>
      <li>1 = Calm</li>
      <li>2 = A little uncomfortable</li>
      <li>3 = Upset</li>
      <li>4 = Very upset</li>
      <li>5 = Too big to handle alone</li>
    </ul>

    <h2>Workbook</h2>
    <ul>
      <li>Today I felt: ______</li>
      <li>I felt it in my body here: ______</li>
      <li>One thing that helped me: ______</li>
      <li>One person I can talk to: ______</li>
    </ul>

    <h2>Mini Quiz</h2>
    <ol>
      <li>Are feelings bad?</li>
      <li>Name three feelings.</li>
      <li>What can anger feel like in the body?</li>
      <li>What sentence can you use to express a feeling?</li>
      <li>Who can you talk to when feelings feel too big?</li>
    </ol>

    <h2>Safety Note</h2>
    <p>If a child says they want to die, disappear, hurt themselves, or hurt someone else, tell a trusted adult immediately and seek urgent help.</p>

    <h2>Parent Guide</h2>
    <p>Do not dismiss emotions with “stop crying” or “you are fine.” Help the child name the feeling and choose a safe action.</p>

    <h2>Teacher Guide</h2>
    <p>Use feeling charts, calm corners, drawing, journaling, and role-play. Create a safe environment where children can talk respectfully.</p>
  `
});


/* =========================
   BOOK 8: SAFETY FIRST
========================= */

KIDDIES_RESOURCES.push({
  id: "safety-first",
  title: "Safety First",
  category: "safety",
  ageGroup: "ages-6-9",
  status: "active",
  featured: true,
  readingTime: "30–40 min",
  level: "Beginner",
  author: "SpeakOut Mental Health Outreach",
  description: "A complete child-safety mini-book that teaches body safety, trusted adults, unsafe secrets, bullying, online safety, and help-seeking.",
  contentHtml: `
    <h1>Safety First</h1>
    <p><strong>Published by SpeakOut Mental Health Outreach.</strong></p>

    <h2>Welcome to Safety First</h2>
    <p>Every child deserves to feel safe at home, in school, online, and in the community. Safety means protecting your body, feelings, mind, and environment.</p>

    <h2>Learning Objectives</h2>
    <ul>
      <li>Understand personal safety.</li>
      <li>Know safe and unsafe touch.</li>
      <li>Identify trusted adults.</li>
      <li>Recognize unsafe secrets.</li>
      <li>Know how to ask for help.</li>
    </ul>

    <h2>Chapter 1: My Body Belongs to Me</h2>
    <p>Your body belongs to you. No one should touch your private parts except for health, hygiene, or safety reasons with proper adult care.</p>

    <ul>
      <li>You can say no to unsafe touch.</li>
      <li>You can move away from unsafe situations.</li>
      <li>You can tell a trusted adult.</li>
      <li>You are not bad for speaking up.</li>
    </ul>

    <h2>Chapter 2: Safe Secrets and Unsafe Secrets</h2>
    <p>A safe secret is happy and temporary, like a birthday surprise. An unsafe secret makes you feel scared, confused, ashamed, threatened, or uncomfortable.</p>

    <h2>Story Time: Bola Speaks Up</h2>
    <p>Bola was told to keep a secret that made her stomach feel uncomfortable. She remembered her safety lesson and told her teacher.</p>
    <p>The teacher listened and helped Bola stay safe. Bola learned that unsafe secrets should never be carried alone.</p>

    <h2>Chapter 3: Trusted Adults</h2>
    <p>A trusted adult listens, protects, and acts responsibly.</p>
    <ul>
      <li>Parent or caregiver</li>
      <li>Teacher</li>
      <li>School counsellor</li>
      <li>Responsible relative</li>
      <li>Health worker</li>
    </ul>

    <h2>Chapter 4: Bullying Safety</h2>
    <p>Bullying is repeated hurtful behavior. It can be physical, verbal, social, or online.</p>
    <ul>
      <li>Report bullying.</li>
      <li>Stay close to safe people.</li>
      <li>Do not join others in bullying.</li>
      <li>Support classmates who are being hurt.</li>
    </ul>

    <h2>Chapter 5: Online Safety</h2>
    <ul>
      <li>Do not share your address online.</li>
      <li>Do not send private pictures.</li>
      <li>Do not chat secretly with strangers.</li>
      <li>Tell an adult if something online feels wrong.</li>
    </ul>

    <h2>Workbook</h2>
    <ul>
      <li>My trusted adults are: ______</li>
      <li>If I feel unsafe, I can go to: ______</li>
      <li>An unsafe secret feels like: ______</li>
      <li>One safety rule I will remember: ______</li>
    </ul>

    <h2>Mini Quiz</h2>
    <ol>
      <li>Who owns your body?</li>
      <li>What is an unsafe secret?</li>
      <li>Name one trusted adult.</li>
      <li>What should you do if bullied?</li>
      <li>Name one online safety rule.</li>
    </ol>

    <h2>Safety Note</h2>
    <p>If a child reports abuse, threats, self-harm, or immediate danger, get trusted adult, safeguarding, or emergency support immediately.</p>

    <h2>Parent Guide</h2>
    <p>Teach safety calmly, not fearfully. Children must know they will be believed, protected, and not blamed for reporting danger.</p>

    <h2>Teacher Guide</h2>
    <p>Teach reporting pathways clearly. Make sure children know where to go and who to talk to when they feel unsafe.</p>
  `
});
/* =========================
   BOOK 9: HEALTHY HABITS
========================= */

KIDDIES_RESOURCES.push({
  id: "healthy-habits",
  title: "Healthy Habits",
  category: "wellness",
  ageGroup: "ages-6-9",
  status: "active",
  featured: false,
  readingTime: "30–40 min",
  level: "Beginner",
  author: "SpeakOut Mental Health Outreach",
  description: "A complete wellness mini-book that teaches sleep, food, water, hygiene, movement, rest, screen balance, and daily self-care.",
  contentHtml: `
    <h1>Healthy Habits</h1>
    <p><strong>Published by SpeakOut Mental Health Outreach.</strong></p>

    <h2>Welcome to Healthy Habits</h2>
    <p>Healthy habits are small things we do often to help our body and mind feel better. Children do not need perfect routines. They need simple daily actions that help them grow, learn, play, rest, and feel safe.</p>

    <h2>Learning Objectives</h2>
    <ul>
      <li>Understand why habits matter.</li>
      <li>Learn the importance of sleep, water, food, hygiene, and movement.</li>
      <li>Practice screen balance.</li>
      <li>Build simple daily self-care routines.</li>
      <li>Notice how habits affect mood and learning.</li>
    </ul>

    <h2>Chapter 1: Why Habits Matter</h2>
    <p>Habits are actions we repeat. A good habit helps us. A poor habit can make things harder. Healthy habits support energy, focus, mood, confidence, and physical health.</p>
    <ul>
      <li>Sleeping well helps the brain remember.</li>
      <li>Drinking water helps the body work properly.</li>
      <li>Moving the body improves energy and mood.</li>
      <li>Washing hands helps prevent sickness.</li>
      <li>Rest helps children recover after busy activities.</li>
    </ul>

    <h2>Story Time: Emeka’s Strong Day</h2>
    <p>Emeka used to feel sleepy in class. He stayed up late watching cartoons and often skipped breakfast.</p>
    <p>One week, his mother helped him build a new routine. He slept earlier, drank water, washed his hands, ate breakfast, and played outside.</p>
    <p>By Friday, Emeka noticed something different. He could listen better in class, play with more energy, and felt happier during the day.</p>
    <p>Emeka learned that small habits can make a big difference.</p>

    <h2>Chapter 2: Sleep and Rest</h2>
    <p>Sleep helps children grow, remember, focus, and manage feelings. A tired child may feel irritated, distracted, or sad.</p>
    <ul>
      <li>Sleep early when possible.</li>
      <li>Avoid too much screen time before bed.</li>
      <li>Keep bedtime calm.</li>
      <li>Rest after busy activities.</li>
    </ul>

    <h2>Chapter 3: Food and Water</h2>
    <p>Food gives the body energy. Water helps the body stay strong and active. Children should learn to notice when they are hungry, thirsty, tired, or full.</p>
    <ul>
      <li>Drink water during the day.</li>
      <li>Eat fruits and vegetables when available.</li>
      <li>Eat slowly and calmly.</li>
      <li>Ask an adult if you feel weak or unwell.</li>
    </ul>

    <h2>Chapter 4: Hygiene</h2>
    <p>Hygiene means keeping the body clean and safe. It protects children and people around them.</p>
    <ul>
      <li>Wash hands before eating.</li>
      <li>Wash hands after using the toilet.</li>
      <li>Brush teeth daily.</li>
      <li>Bathe regularly.</li>
      <li>Keep nails clean.</li>
    </ul>

    <h2>Chapter 5: Movement and Screen Balance</h2>
    <p>Children need movement. Running, jumping, dancing, stretching, sweeping, walking, and playing safe games can help the body and mood.</p>
    <p>Screens can be useful, but too much screen time can affect sleep, attention, and behavior.</p>

    <h2>Healthy Day Checklist</h2>
    <ul>
      <li>I drank water.</li>
      <li>I washed my hands.</li>
      <li>I moved my body.</li>
      <li>I rested when tired.</li>
      <li>I ate something nourishing.</li>
      <li>I spoke kindly to myself.</li>
    </ul>

    <h2>Workbook</h2>
    <ul>
      <li>One healthy habit I already do well: ______</li>
      <li>One habit I want to improve: ______</li>
      <li>My bedtime goal is: ______</li>
      <li>One way I can move my body is: ______</li>
      <li>One hygiene habit I will practice is: ______</li>
    </ul>

    <h2>Mini Quiz</h2>
    <ol>
      <li>Why is sleep important?</li>
      <li>Name two hygiene habits.</li>
      <li>Why should children drink water?</li>
      <li>Name one way to move your body.</li>
      <li>Why should screen time be balanced?</li>
    </ol>

    <h2>Parent Guide</h2>
    <p>Teach habits as care, not punishment. Avoid body-shaming or fear-based health messages. Use routines, reminders, and praise.</p>

    <h2>Teacher Guide</h2>
    <p>Use charts, songs, movement breaks, hygiene reminders, and simple reflection questions. Connect healthy habits to learning and emotional wellbeing.</p>
  `
});


/* =========================
   BOOK 10: STORY TIME
========================= */

KIDDIES_RESOURCES.push({
  id: "story-time",
  title: "Story Time",
  category: "literacy",
  ageGroup: "ages-6-9",
  status: "active",
  featured: false,
  readingTime: "30–40 min",
  level: "Beginner",
  author: "SpeakOut Mental Health Outreach",
  description: "A complete reading and reflection mini-book that uses stories to teach vocabulary, empathy, values, listening, and problem-solving.",
  contentHtml: `
    <h1>Story Time</h1>
    <p><strong>Published by SpeakOut Mental Health Outreach.</strong></p>

    <h2>Welcome to Story Time</h2>
    <p>Stories help children imagine, listen, speak, think, and learn. A good story can teach kindness, courage, patience, honesty, safety, and emotional awareness.</p>

    <h2>Learning Objectives</h2>
    <ul>
      <li>Understand parts of a story.</li>
      <li>Build vocabulary through reading.</li>
      <li>Retell stories in simple words.</li>
      <li>Identify characters, problems, feelings, and lessons.</li>
      <li>Connect stories to real life.</li>
    </ul>

    <h2>Chapter 1: Why Stories Matter</h2>
    <p>Stories help children learn without feeling like they are being lectured. Through characters, children can see choices, feelings, mistakes, and lessons.</p>

    <h2>Chapter 2: Parts of a Story</h2>
    <table border="1" cellpadding="8">
      <tr><th>Story Part</th><th>Meaning</th></tr>
      <tr><td>Character</td><td>The person, animal, or being in the story.</td></tr>
      <tr><td>Setting</td><td>Where and when the story happens.</td></tr>
      <tr><td>Problem</td><td>The challenge in the story.</td></tr>
      <tr><td>Action</td><td>What the characters do.</td></tr>
      <tr><td>Lesson</td><td>What we learn from the story.</td></tr>
    </table>

    <h2>Story: The Friend at the Gate</h2>
    <p>One morning, Nneka saw a new girl standing quietly at the school gate. The girl held her bag tightly and looked worried.</p>
    <p>Some children walked past her, but Nneka remembered a story her teacher had read about kindness.</p>
    <p>Nneka walked over and said, “Hello, my name is Nneka. Would you like to sit with us?”</p>
    <p>The new girl smiled. “My name is Maryam,” she said.</p>
    <p>That day, Nneka learned that a story can become an action.</p>

    <h2>Chapter 3: Asking Good Questions</h2>
    <ul>
      <li>Who is the main character?</li>
      <li>Where did the story happen?</li>
      <li>What problem happened?</li>
      <li>How did the character feel?</li>
      <li>What lesson did the story teach?</li>
    </ul>

    <h2>Chapter 4: Retelling a Story</h2>
    <p>Retelling means saying the story again in your own words.</p>
    <ol>
      <li>Say what happened at the beginning.</li>
      <li>Say what happened in the middle.</li>
      <li>Say how the story ended.</li>
      <li>Say one lesson you learned.</li>
    </ol>

    <h2>Chapter 5: Vocabulary Builder</h2>
    <table border="1" cellpadding="8">
      <tr><th>Word</th><th>Meaning</th></tr>
      <tr><td>Kindness</td><td>Treating people with care.</td></tr>
      <tr><td>Courage</td><td>Doing what is right even when afraid.</td></tr>
      <tr><td>Friendship</td><td>A caring relationship between people.</td></tr>
      <tr><td>Problem</td><td>Something that needs a solution.</td></tr>
      <tr><td>Lesson</td><td>Something useful we learn.</td></tr>
    </table>

    <h2>Activities</h2>
    <ol>
      <li>Read a short story and retell it.</li>
      <li>Draw the beginning, middle, and end.</li>
      <li>Describe one character’s feeling.</li>
      <li>Create a new ending.</li>
      <li>Act out the story with friends.</li>
    </ol>

    <h2>Workbook</h2>
    <ul>
      <li>The main character is: ______</li>
      <li>The problem was: ______</li>
      <li>The lesson is: ______</li>
      <li>I can use this lesson by: ______</li>
    </ul>

    <h2>Mini Quiz</h2>
    <ol>
      <li>What is a character?</li>
      <li>What is the setting?</li>
      <li>Why should we retell stories?</li>
      <li>What lesson did Nneka learn?</li>
      <li>Name one new vocabulary word.</li>
    </ol>

    <h2>Parent Guide</h2>
    <p>Ask children questions after reading. Do not only focus on pronunciation. Use stories to build confidence, empathy, and language.</p>

    <h2>Teacher Guide</h2>
    <p>Use storytelling circles, drawing, role-play, vocabulary cards, and reflection. Let children connect stories to real life.</p>
  `
});


/* =========================
   BOOK 11: MATHEMATICS FUN
========================= */

KIDDIES_RESOURCES.push({
  id: "mathematics-fun",
  title: "Mathematics Fun",
  category: "numeracy",
  ageGroup: "ages-6-9",
  status: "active",
  featured: false,
  readingTime: "30–45 min",
  level: "Beginner",
  author: "SpeakOut Mental Health Outreach",
  description: "A complete mathematics confidence mini-book that teaches addition, subtraction, word problems, sharing, patterns, and real-life maths.",
  contentHtml: `
    <h1>Mathematics Fun</h1>
    <p><strong>Published by SpeakOut Mental Health Outreach.</strong></p>

    <h2>Welcome to Mathematics Fun</h2>
    <p>Mathematics is not only for the classroom. We use mathematics when we count money, share food, tell time, measure things, cook, buy items, and solve problems.</p>

    <h2>Learning Objectives</h2>
    <ul>
      <li>Build confidence with numbers.</li>
      <li>Practice addition and subtraction.</li>
      <li>Solve simple word problems.</li>
      <li>Understand sharing and fairness.</li>
      <li>See mathematics in daily life.</li>
    </ul>

    <h2>Chapter 1: Math Is Everywhere</h2>
    <ul>
      <li>Counting plates before dinner.</li>
      <li>Sharing oranges with friends.</li>
      <li>Buying pencils at the shop.</li>
      <li>Measuring water while cooking.</li>
      <li>Reading numbers on a calendar.</li>
    </ul>

    <h2>Story Time: Sade and the Orange Basket</h2>
    <p>Sade had eight oranges. She gave three to her friends.</p>
    <p>Instead of guessing, she counted what remained.</p>
    <p>8 - 3 = 5</p>
    <p>Later, her aunt added four more oranges.</p>
    <p>5 + 4 = 9</p>
    <p>Sade smiled. Mathematics helped her understand what happened.</p>

    <h2>Chapter 2: Addition</h2>
    <p>Addition means putting things together.</p>
    <table border="1" cellpadding="8">
      <tr><th>Problem</th><th>Answer</th></tr>
      <tr><td>4 + 3</td><td>7</td></tr>
      <tr><td>6 + 2</td><td>8</td></tr>
      <tr><td>9 + 1</td><td>10</td></tr>
      <tr><td>10 + 5</td><td>15</td></tr>
    </table>

    <h2>Chapter 3: Subtraction</h2>
    <p>Subtraction means taking away.</p>
    <table border="1" cellpadding="8">
      <tr><th>Problem</th><th>Answer</th></tr>
      <tr><td>7 - 2</td><td>5</td></tr>
      <tr><td>10 - 4</td><td>6</td></tr>
      <tr><td>12 - 3</td><td>9</td></tr>
      <tr><td>15 - 5</td><td>10</td></tr>
    </table>

    <h2>Chapter 4: Word Problems</h2>
    <ol>
      <li>If you have 5 pencils and get 2 more, how many pencils do you have?</li>
      <li>If there are 10 biscuits and 4 are eaten, how many remain?</li>
      <li>If 3 children each have 2 books, how many books are there?</li>
    </ol>

    <h2>Chapter 5: Sharing Fairly</h2>
    <p>Fair sharing means each person gets the same amount when possible.</p>
    <p>If 6 oranges are shared between 3 children, each child gets 2 oranges.</p>

    <h2>Chapter 6: Math Confidence</h2>
    <p>Some children feel afraid of mathematics. But mistakes are part of learning. A child is not “bad at math.” A child may simply need more practice, more examples, or a calmer explanation.</p>

    <h2>Workbook</h2>
    <ul>
      <li>5 + 3 = ______</li>
      <li>9 + 2 = ______</li>
      <li>10 - 4 = ______</li>
      <li>15 - 5 = ______</li>
      <li>I used math today when: ______</li>
    </ul>

    <h2>Mini Quiz</h2>
    <ol>
      <li>What does addition mean?</li>
      <li>What does subtraction mean?</li>
      <li>What is 6 + 4?</li>
      <li>What is 12 - 2?</li>
      <li>Why should children not fear mistakes in math?</li>
    </ol>

    <h2>Parent Guide</h2>
    <p>Never call a child “bad at math.” Use objects, snacks, toys, coins, and real-life examples. Praise effort and explanation.</p>

    <h2>Teacher Guide</h2>
    <p>Ask learners to explain how they got answers. Use group work, objects, drawings, number lines, and practical problem-solving.</p>
  `
});
/* =========================
   BOOK 12: ENVIRONMENTAL AWARENESS
========================= */

KIDDIES_RESOURCES.push({
  id: "environmental-awareness",
  title: "Environmental Awareness",
  category: "environment",
  ageGroup: "ages-6-9",
  status: "active",
  featured: false,
  readingTime: "35–45 min",
  level: "Beginner",
  author: "SpeakOut Mental Health Outreach",
  description: "A complete mini-book teaching children how to care for nature, protect the environment, reduce waste, and become responsible community members.",
  contentHtml: `
    <h1>Environmental Awareness</h1>

    <p><strong>Published by SpeakOut Mental Health Outreach.</strong></p>

    <h2>Welcome Young Earth Protectors</h2>

    <p>The environment is everything around us. It includes trees, rivers, animals, air, water, soil, homes, schools, roads, parks, and communities.</p>

    <p>When we care for the environment, we help people, animals, and future generations live healthier lives.</p>

    <h2>Learning Objectives</h2>

    <ul>
      <li>Understand what the environment is.</li>
      <li>Learn why nature is important.</li>
      <li>Practice environmental responsibility.</li>
      <li>Reduce waste and littering.</li>
      <li>Become a community helper.</li>
    </ul>

    <h2>Chapter 1: What Is the Environment?</h2>

    <p>The environment includes:</p>

    <ul>
      <li>The air we breathe.</li>
      <li>The water we drink.</li>
      <li>The soil where plants grow.</li>
      <li>The animals we share the world with.</li>
      <li>The trees that provide shade and oxygen.</li>
    </ul>

    <h2>Story: Chidi and the School Yard</h2>

    <p>Chidi loved football. Every afternoon he played in the school yard.</p>

    <p>One day he noticed plastic bottles, papers, and food wrappers everywhere.</p>

    <p>Instead of complaining, he invited his friends to help clean.</p>

    <p>The following week, the school yard looked beautiful.</p>

    <p>The principal thanked them and introduced a weekly clean-up team.</p>

    <p>Chidi learned that even children can improve their community.</p>

    <h2>Chapter 2: Why Trees Matter</h2>

    <ul>
      <li>Trees give shade.</li>
      <li>Trees help clean the air.</li>
      <li>Trees provide homes for animals.</li>
      <li>Trees help reduce heat.</li>
      <li>Trees protect the soil.</li>
    </ul>

    <h2>Chapter 3: Waste and Recycling</h2>

    <p>Waste becomes a problem when people throw things anywhere.</p>

    <p>Some waste can be reused or recycled.</p>

    <table border="1" cellpadding="8">
      <tr>
        <th>Item</th>
        <th>Possible Action</th>
      </tr>
      <tr>
        <td>Plastic Bottles</td>
        <td>Recycle</td>
      </tr>
      <tr>
        <td>Paper</td>
        <td>Reuse or recycle</td>
      </tr>
      <tr>
        <td>Cardboard</td>
        <td>Reuse</td>
      </tr>
      <tr>
        <td>Food Waste</td>
        <td>Compost when possible</td>
      </tr>
    </table>

    <h2>Chapter 4: Water Protection</h2>

    <ul>
      <li>Turn off taps after use.</li>
      <li>Do not throw waste into rivers.</li>
      <li>Report leaking taps.</li>
      <li>Use water carefully.</li>
    </ul>

    <h2>Chapter 5: Environmental Heroes</h2>

    <p>An environmental hero:</p>

    <ul>
      <li>Picks up litter.</li>
      <li>Protects plants.</li>
      <li>Saves water.</li>
      <li>Encourages others.</li>
      <li>Keeps surroundings clean.</li>
    </ul>

    <h2>Community Challenge</h2>

    <ol>
      <li>Clean one small area.</li>
      <li>Plant a seed if possible.</li>
      <li>Save water for one week.</li>
      <li>Teach a friend one environmental lesson.</li>
      <li>Create a clean-up poster.</li>
    </ol>

    <h2>Workbook</h2>

    <ul>
      <li>Three things in my environment: ______</li>
      <li>One way I can help nature: ______</li>
      <li>One environmental problem I notice: ______</li>
      <li>A solution could be: ______</li>
    </ul>

    <h2>Mini Quiz</h2>

    <ol>
      <li>What is the environment?</li>
      <li>Name two benefits of trees.</li>
      <li>Why should we avoid littering?</li>
      <li>How can children save water?</li>
      <li>Who was Chidi?</li>
    </ol>

    <h2>Parent & Teacher Guide</h2>

    <p>Use practical demonstrations. Let children participate in cleaning, planting, sorting waste, and protecting shared spaces.</p>
  `
});


/* =========================
   BOOK 13: KIND WORDS
========================= */

KIDDIES_RESOURCES.push({
  id: "kind-words",
  title: "Kind Words",
  category: "emotions",
  ageGroup: "ages-6-9",
  status: "active",
  featured: false,
  readingTime: "35–45 min",
  level: "Beginner",
  author: "SpeakOut Mental Health Outreach",
  description: "A complete communication and kindness mini-book teaching children how words affect emotions, friendships, and confidence.",
  contentHtml: `
    <h1>Kind Words</h1>

    <p><strong>Published by SpeakOut Mental Health Outreach.</strong></p>

    <h2>Welcome</h2>

    <p>Words are powerful. They can encourage people or hurt people. They can build friendships or damage relationships.</p>

    <p>Every child can learn to use words wisely.</p>

    <h2>Learning Objectives</h2>

    <ul>
      <li>Understand the power of words.</li>
      <li>Practice kindness.</li>
      <li>Improve communication skills.</li>
      <li>Build empathy.</li>
      <li>Learn respectful disagreement.</li>
    </ul>

    <h2>Story: The Two Classmates</h2>

    <p>Mary and Fatima both answered a difficult question in class.</p>

    <p>Mary laughed when Fatima made a mistake.</p>

    <p>Fatima became embarrassed and stopped participating.</p>

    <p>Later, Mary made a mistake too.</p>

    <p>Instead of laughing, Fatima said, “It is okay. We all learn by trying.”</p>

    <p>Mary realized that kind words make people feel safe and respected.</p>

    <h2>Chapter 1: Words Can Help</h2>

    <ul>
      <li>Good job.</li>
      <li>Thank you.</li>
      <li>I appreciate your help.</li>
      <li>You can try again.</li>
      <li>I believe in you.</li>
      <li>How can I help?</li>
    </ul>

    <h2>Chapter 2: Words Can Hurt</h2>

    <p>Some words make people feel:</p>

    <ul>
      <li>Embarrassed.</li>
      <li>Rejected.</li>
      <li>Sad.</li>
      <li>Afraid.</li>
      <li>Lonely.</li>
    </ul>

    <p>Calling people names, mocking them, or spreading rumors can be harmful.</p>

    <h2>Chapter 3: Speaking with Respect</h2>

    <ul>
      <li>Listen first.</li>
      <li>Wait your turn.</li>
      <li>Speak calmly.</li>
      <li>Use polite words.</li>
      <li>Disagree respectfully.</li>
    </ul>

    <h2>Chapter 4: Empathy</h2>

    <p>Empathy means trying to understand another person's feelings.</p>

    <p>Before speaking, ask:</p>

    <ul>
      <li>Would I like someone saying this to me?</li>
      <li>Will these words help?</li>
      <li>Will these words hurt?</li>
    </ul>

    <h2>Kindness Challenge</h2>

    <ol>
      <li>Say something encouraging.</li>
      <li>Thank a teacher.</li>
      <li>Help a friend.</li>
      <li>Write a kind note.</li>
      <li>Apologize if needed.</li>
    </ol>

    <h2>Workbook</h2>

    <ul>
      <li>One kind word I use often: ______</li>
      <li>One person I can encourage: ______</li>
      <li>One apology I need to make: ______</li>
      <li>One way I can be kinder: ______</li>
    </ul>

    <h2>Mini Quiz</h2>

    <ol>
      <li>What is empathy?</li>
      <li>Name three kind phrases.</li>
      <li>Why can teasing be harmful?</li>
      <li>How can we disagree respectfully?</li>
      <li>What lesson did Mary learn?</li>
    </ol>

    <h2>Parent & Teacher Guide</h2>

    <p>Model respectful communication. Children learn more from what adults do than what adults say.</p>
  `
});


/* =========================
   BOOK 14: MY SAFETY CIRCLE
========================= */

KIDDIES_RESOURCES.push({
  id: "my-safety-circle",
  title: "My Safety Circle",
  category: "safety",
  ageGroup: "ages-6-9",
  status: "active",
  featured: false,
  readingTime: "40–50 min",
  level: "Beginner",
  author: "SpeakOut Mental Health Outreach",
  description: "A complete child protection mini-book teaching trusted adults, boundaries, reporting, body safety, and help-seeking skills.",
  contentHtml: `
    <h1>My Safety Circle</h1>

    <p><strong>Published by SpeakOut Mental Health Outreach.</strong></p>

    <h2>Welcome</h2>

    <p>Every child deserves to feel safe.</p>

    <p>Children should know who to trust, when to ask for help, and how to stay protected.</p>

    <h2>Learning Objectives</h2>

    <ul>
      <li>Identify trusted adults.</li>
      <li>Understand body safety.</li>
      <li>Learn help-seeking skills.</li>
      <li>Recognize unsafe situations.</li>
      <li>Build confidence in speaking up.</li>
    </ul>

    <h2>Chapter 1: What Is a Safety Circle?</h2>

    <p>A safety circle is a group of trusted adults who help protect and support you.</p>

    <p>Trusted adults listen, care, and help when something is wrong.</p>

    <h2>Who Can Be In My Safety Circle?</h2>

    <ul>
      <li>Parent or caregiver.</li>
      <li>Teacher.</li>
      <li>School counselor.</li>
      <li>Health worker.</li>
      <li>Responsible relative.</li>
      <li>Community leader.</li>
    </ul>

    <h2>Story: Amina Speaks Up</h2>

    <p>Amina felt uncomfortable after someone asked her to keep a secret.</p>

    <p>She remembered what her teacher taught about safety circles.</p>

    <p>Amina spoke to her mother and teacher.</p>

    <p>They listened and helped her.</p>

    <p>Amina learned that asking for help is brave.</p>

    <h2>Chapter 2: Safe and Unsafe Secrets</h2>

    <table border="1" cellpadding="8">
      <tr>
        <th>Safe Secret</th>
        <th>Unsafe Secret</th>
      </tr>
      <tr>
        <td>Birthday surprise</td>
        <td>Something making you afraid</td>
      </tr>
      <tr>
        <td>Gift surprise</td>
        <td>Unsafe touching</td>
      </tr>
      <tr>
        <td>Short-term fun surprise</td>
        <td>Threats or pressure</td>
      </tr>
    </table>

    <h2>Chapter 3: Body Safety Rules</h2>

    <ul>
      <li>Your body belongs to you.</li>
      <li>You can say no to unsafe touch.</li>
      <li>Private parts are private.</li>
      <li>Tell a trusted adult if something feels wrong.</li>
      <li>Keep telling until someone helps.</li>
    </ul>

    <h2>Chapter 4: Asking for Help</h2>

    <p>Practice saying:</p>

    <ul>
      <li>I need help.</li>
      <li>I do not feel safe.</li>
      <li>Something happened.</li>
      <li>Please listen to me.</li>
    </ul>

    <h2>Safety Circle Activity</h2>

    <ol>
      <li>Draw a circle.</li>
      <li>Write five trusted adults.</li>
      <li>Practice calling one for help.</li>
      <li>Keep the list somewhere safe.</li>
    </ol>

    <h2>Workbook</h2>

    <ul>
      <li>Trusted adult #1: ______</li>
      <li>Trusted adult #2: ______</li>
      <li>Trusted adult #3: ______</li>
      <li>Trusted adult #4: ______</li>
      <li>Trusted adult #5: ______</li>
    </ul>

    <h2>Mini Quiz</h2>

    <ol>
      <li>What is a safety circle?</li>
      <li>Name three trusted adults.</li>
      <li>What is an unsafe secret?</li>
      <li>What should you do if something feels wrong?</li>
      <li>What did Amina learn?</li>
    </ol>

    <h2>Parent & Teacher Guide</h2>

    <p>Children should know they will never be punished for reporting safety concerns. Encourage openness and calm listening.</p>
  `
});
/* =========================
   BOOK 15: SHARING & TEAMWORK
========================= */

KIDDIES_RESOURCES.push({
  id: "sharing-and-teamwork",
  title: "Sharing and Teamwork",
  category: "character",
  ageGroup: "ages-3-5",
  status: "active",
  featured: false,
  readingTime: "45–55 min",
  level: "Beginner",
  author: "SpeakOut Mental Health Outreach",
  description: "A complete social skills mini-book teaching sharing, cooperation, friendship, teamwork, kindness, leadership, and conflict resolution.",
  contentHtml: `
    <h1>Sharing and Teamwork</h1>

    <p><strong>Published by SpeakOut Mental Health Outreach.</strong></p>

    <h2>Welcome</h2>

    <p>People can do many things alone, but together they can often do even more.</p>

    <p>Sharing and teamwork help children make friends, solve problems, learn patience, and build strong relationships.</p>

    <h2>Learning Objectives</h2>

    <ul>
      <li>Understand sharing.</li>
      <li>Practice cooperation.</li>
      <li>Build friendship skills.</li>
      <li>Learn teamwork.</li>
      <li>Develop empathy and patience.</li>
    </ul>

    <h2>Story: The Block Tower</h2>

    <p>Four children wanted to build a giant tower.</p>

    <p>At first they argued about who should use the blocks.</p>

    <p>The tower kept falling because nobody wanted to listen.</p>

    <p>The teacher suggested they work as a team.</p>

    <p>One child gathered blocks.</p>

    <p>One child stacked them.</p>

    <p>One child checked balance.</p>

    <p>One child encouraged everyone.</p>

    <p>Together they built the tallest tower in class.</p>

    <p>The children learned that teamwork makes difficult tasks easier.</p>

    <h2>Chapter 1: What Is Sharing?</h2>

    <p>Sharing means allowing others to enjoy, use, or participate fairly.</p>

    <ul>
      <li>Sharing toys.</li>
      <li>Sharing materials.</li>
      <li>Sharing ideas.</li>
      <li>Sharing opportunities.</li>
    </ul>

    <h2>Chapter 2: What Is Teamwork?</h2>

    <p>Teamwork means people working together toward the same goal.</p>

    <h3>Great Teams:</h3>

    <ul>
      <li>Listen to each other.</li>
      <li>Respect each other.</li>
      <li>Help each other.</li>
      <li>Work toward one goal.</li>
    </ul>

    <h2>Chapter 3: Being a Good Team Member</h2>

    <ul>
      <li>Take turns.</li>
      <li>Share responsibilities.</li>
      <li>Be honest.</li>
      <li>Encourage others.</li>
      <li>Stay respectful.</li>
    </ul>

    <h2>Chapter 4: Solving Team Problems</h2>

    <p>Sometimes people disagree.</p>

    <p>When disagreements happen:</p>

    <ol>
      <li>Stop and breathe.</li>
      <li>Listen carefully.</li>
      <li>Explain your view calmly.</li>
      <li>Look for solutions.</li>
      <li>Choose fairness.</li>
    </ol>

    <h2>Chapter 5: Friendship and Teamwork</h2>

    <p>Good friends:</p>

    <ul>
      <li>Respect each other.</li>
      <li>Keep promises.</li>
      <li>Help when needed.</li>
      <li>Tell the truth.</li>
      <li>Include others.</li>
    </ul>

    <h2>Teamwork Challenge</h2>

    <ol>
      <li>Build something together.</li>
      <li>Complete a group drawing.</li>
      <li>Clean a shared area.</li>
      <li>Play a cooperative game.</li>
      <li>Help someone complete a task.</li>
    </ol>

    <h2>Workbook</h2>

    <ul>
      <li>A good teammate is: ______</li>
      <li>I can help others by: ______</li>
      <li>One thing I can share is: ______</li>
      <li>One teamwork skill I want to improve: ______</li>
    </ul>

    <h2>Mini Quiz</h2>

    <ol>
      <li>What is teamwork?</li>
      <li>What is sharing?</li>
      <li>Name three teamwork skills.</li>
      <li>How can disagreements be solved?</li>
      <li>What lesson did the children learn from the tower?</li>
    </ol>

    <h2>Parent & Teacher Guide</h2>

    <p>Use games, projects, chores, and group activities to teach cooperation. Praise effort and collaboration, not only winning.</p>
  `
});


/* =========================
   BOOK 16: EMOTIONAL INTELLIGENCE
========================= */

KIDDIES_RESOURCES.push({
  id: "emotional-intelligence",
  title: "Emotional Intelligence",
  category: "emotions",
  ageGroup: "ages-10-13",
  status: "active",
  featured: true,
  readingTime: "60–75 min",
  level: "Intermediate",
  author: "SpeakOut Mental Health Outreach",
  description: "A complete emotional wellbeing handbook teaching self-awareness, empathy, self-control, resilience, confidence, and healthy relationships.",
  contentHtml: `
    <h1>Emotional Intelligence</h1>

    <p><strong>Published by SpeakOut Mental Health Outreach.</strong></p>

    <h2>Introduction</h2>

    <p>Emotional intelligence is the ability to understand feelings, manage reactions, build healthy relationships, and make wise decisions.</p>

    <p>Many successful people are emotionally intelligent because they know how to understand themselves and others.</p>

    <h2>Learning Objectives</h2>

    <ul>
      <li>Recognize emotions.</li>
      <li>Develop self-awareness.</li>
      <li>Build empathy.</li>
      <li>Practice self-control.</li>
      <li>Improve communication.</li>
      <li>Strengthen resilience.</li>
    </ul>

    <h2>Chapter 1: Understanding Feelings</h2>

    <p>All feelings have a purpose.</p>

    <table border="1" cellpadding="8">
      <tr><th>Feeling</th><th>Purpose</th></tr>
      <tr><td>Fear</td><td>Protects us from danger</td></tr>
      <tr><td>Sadness</td><td>Helps us process loss</td></tr>
      <tr><td>Anger</td><td>Signals unfairness</td></tr>
      <tr><td>Joy</td><td>Creates connection</td></tr>
      <tr><td>Pride</td><td>Celebrates effort</td></tr>
    </table>

    <h2>Chapter 2: Self-Awareness</h2>

    <p>Self-awareness means understanding:</p>

    <ul>
      <li>What you feel.</li>
      <li>Why you feel it.</li>
      <li>How it affects behavior.</li>
    </ul>

    <h2>Story: Musa's Angry Day</h2>

    <p>Musa became angry after losing a football match.</p>

    <p>He wanted to blame everyone.</p>

    <p>Instead, he paused and reflected.</p>

    <p>He realized he felt disappointed, not just angry.</p>

    <p>Understanding the real feeling helped him respond better.</p>

    <h2>Chapter 3: Empathy</h2>

    <p>Empathy means understanding how others feel.</p>

    <p>Ask yourself:</p>

    <ul>
      <li>What might this person be feeling?</li>
      <li>What happened to them?</li>
      <li>How would I feel in this situation?</li>
    </ul>

    <h2>Chapter 4: Self-Control</h2>

    <p>Self-control means managing actions even when emotions are strong.</p>

    <ul>
      <li>Pause before reacting.</li>
      <li>Breathe deeply.</li>
      <li>Think before speaking.</li>
      <li>Walk away from conflict.</li>
      <li>Ask for help.</li>
    </ul>

    <h2>Chapter 5: Resilience</h2>

    <p>Resilience means recovering after setbacks.</p>

    <p>Resilient people:</p>

    <ul>
      <li>Keep learning.</li>
      <li>Adapt to challenges.</li>
      <li>Try again after mistakes.</li>
      <li>Ask for support.</li>
    </ul>

    <h2>Chapter 6: Healthy Relationships</h2>

    <ul>
      <li>Respect others.</li>
      <li>Communicate honestly.</li>
      <li>Set healthy boundaries.</li>
      <li>Resolve conflict respectfully.</li>
      <li>Support each other.</li>
    </ul>

    <h2>Reflection Journal</h2>

    <ol>
      <li>What emotion do I experience most?</li>
      <li>How do I react when upset?</li>
      <li>How can I improve empathy?</li>
      <li>What coping skill works best for me?</li>
      <li>Who supports me when I struggle?</li>
    </ol>

    <h2>Mini Quiz</h2>

    <ol>
      <li>What is emotional intelligence?</li>
      <li>What is empathy?</li>
      <li>What is resilience?</li>
      <li>Name three self-control strategies.</li>
      <li>Why is self-awareness important?</li>
    </ol>

    <h2>Teacher & Parent Guide</h2>

    <p>Discuss emotions openly. Help children reflect on behavior instead of only focusing on punishment.</p>
  `
});


/* =========================
   BOOK 17: CALM DOWN TOOLBOX
========================= */

KIDDIES_RESOURCES.push({
  id: "calm-down-toolbox",
  title: "Calm Down Toolbox",
  category: "emotions",
  ageGroup: "ages-10-13",
  status: "active",
  featured: true,
  readingTime: "60–75 min",
  level: "Intermediate",
  author: "SpeakOut Mental Health Outreach",
  description: "A complete emotional regulation handbook teaching coping skills, stress management, anxiety reduction, self-soothing, and resilience.",
  contentHtml: `
    <h1>Calm Down Toolbox</h1>

    <p><strong>Published by SpeakOut Mental Health Outreach.</strong></p>

    <h2>Introduction</h2>

    <p>Everyone experiences difficult emotions.</p>

    <p>Feeling angry, worried, frustrated, embarrassed, or overwhelmed is normal.</p>

    <p>The important question is: What do we do with those feelings?</p>

    <h2>What Is a Calm Down Toolbox?</h2>

    <p>A calm down toolbox is a collection of healthy coping skills that help people manage strong emotions safely.</p>

    <h2>Chapter 1: Understanding Emotional Storms</h2>

    <p>Strong emotions can feel like storms inside the mind.</p>

    <ul>
      <li>Anger.</li>
      <li>Anxiety.</li>
      <li>Fear.</li>
      <li>Embarrassment.</li>
      <li>Disappointment.</li>
    </ul>

    <h2>Chapter 2: Breathing Techniques</h2>

    <h3>Square Breathing</h3>

    <ol>
      <li>Breathe in for 4 counts.</li>
      <li>Hold for 4 counts.</li>
      <li>Breathe out for 4 counts.</li>
      <li>Pause for 4 counts.</li>
    </ol>

    <h3>Balloon Breathing</h3>

    <p>Imagine your stomach is a balloon.</p>

    <p>Slowly fill it with air, then slowly let the air out.</p>

    <h2>Chapter 3: Grounding Skills</h2>

    <p>The 5-4-3-2-1 technique:</p>

    <ul>
      <li>5 things you see.</li>
      <li>4 things you touch.</li>
      <li>3 things you hear.</li>
      <li>2 things you smell.</li>
      <li>1 thing you appreciate.</li>
    </ul>

    <h2>Chapter 4: Positive Self-Talk</h2>

    <ul>
      <li>I can handle this.</li>
      <li>I am learning.</li>
      <li>Mistakes help me grow.</li>
      <li>I am not alone.</li>
      <li>This feeling will pass.</li>
    </ul>

    <h2>Chapter 5: Healthy Coping Skills</h2>

    <ul>
      <li>Drawing.</li>
      <li>Journaling.</li>
      <li>Exercise.</li>
      <li>Talking to someone.</li>
      <li>Prayer or reflection.</li>
      <li>Listening to calming music.</li>
    </ul>

    <h2>Chapter 6: Building Your Personal Toolbox</h2>

    <p>Create your own toolbox list:</p>

    <ul>
      <li>Three calming activities.</li>
      <li>Three trusted adults.</li>
      <li>Three encouraging phrases.</li>
      <li>Three safe places.</li>
    </ul>

    <h2>Personal Reflection</h2>

    <ol>
      <li>What emotion challenges me most?</li>
      <li>What helps me calm down?</li>
      <li>Who can I call for support?</li>
      <li>What coping skill will I practice this week?</li>
    </ol>

    <h2>Mini Quiz</h2>

    <ol>
      <li>What is a calm down toolbox?</li>
      <li>What is grounding?</li>
      <li>Name two breathing techniques.</li>
      <li>What is positive self-talk?</li>
      <li>Why are coping skills important?</li>
    </ol>

    <h2>Important Safety Note</h2>

    <p>If emotions ever become overwhelming or a young person feels unsafe, they should immediately speak with a trusted adult, counselor, parent, teacher, or mental health professional.</p>
  `
});
/* =========================
   BOOK 18: LEADERSHIP FOR KIDS
========================= */

KIDDIES_RESOURCES.push({
  id: "leadership-for-kids",
  title: "Leadership for Kids",
  category: "leadership",
  ageGroup: "ages-10-13",
  status: "active",
  featured: false,
  readingTime: "70–80 min",
  level: "Intermediate",
  author: "SpeakOut Mental Health Outreach",
  description: "A complete leadership mini-book teaching service, responsibility, honesty, courage, teamwork, problem-solving, and positive influence.",
  contentHtml: `
    <h1>Leadership for Kids</h1>
    <p><strong>Published by SpeakOut Mental Health Outreach.</strong></p>

    <h2>Welcome to Leadership for Kids</h2>
    <p>Leadership is not about shouting, controlling people, or being more important than others. True leadership is about service, responsibility, courage, honesty, kindness, and helping people move toward something good.</p>

    <h2>Learning Objectives</h2>
    <ul>
      <li>Understand what real leadership means.</li>
      <li>Identify leadership qualities.</li>
      <li>Practice responsibility and service.</li>
      <li>Learn how to solve problems respectfully.</li>
      <li>Use influence in a positive way.</li>
    </ul>

    <h2>Chapter 1: What Is Leadership?</h2>
    <p>Leadership means using your words, actions, and choices to guide, serve, support, and encourage others. A leader does not need to be the loudest person in the room. A leader can be the person who does the right thing even when no one is watching.</p>

    <h3>Good Leaders:</h3>
    <ul>
      <li>Listen before speaking.</li>
      <li>Tell the truth.</li>
      <li>Respect others.</li>
      <li>Take responsibility.</li>
      <li>Help solve problems.</li>
      <li>Encourage people.</li>
      <li>Protect those who are being treated unfairly.</li>
    </ul>

    <h2>Story Time: Amara Leads Quietly</h2>
    <p>Amara was not the loudest student in her class. She did not like shouting or forcing people to listen to her.</p>
    <p>One day, the teacher asked the class to arrange the books after a reading activity. Some students ignored the instruction and started playing.</p>
    <p>Amara quietly began arranging the books. Then she said, “Let us finish quickly so we can all enjoy break time.”</p>
    <p>Two classmates joined her. Then three more joined. Soon the whole table was clean.</p>
    <p>The teacher smiled and said, “Amara showed leadership by example.”</p>
    <p>Amara learned that leadership is not always loud. Sometimes leadership is simply doing the right thing first.</p>

    <h2>Chapter 2: Leadership Is Service</h2>
    <p>A good leader does not ask, “How can I be praised?” A good leader asks, “How can I help?”</p>
    <ul>
      <li>Helping a younger child understand a task.</li>
      <li>Welcoming a new student.</li>
      <li>Reporting bullying.</li>
      <li>Keeping promises.</li>
      <li>Encouraging a discouraged friend.</li>
    </ul>

    <h2>Chapter 3: Responsibility</h2>
    <p>Responsibility means doing what you are expected to do and accepting the result of your choices.</p>
    <table border="1" cellpadding="8">
      <tr><th>Situation</th><th>Responsible Action</th></tr>
      <tr><td>You borrowed a book.</td><td>Return it safely and on time.</td></tr>
      <tr><td>You made a mistake.</td><td>Tell the truth and correct it.</td></tr>
      <tr><td>You are assigned a duty.</td><td>Complete it without being forced.</td></tr>
      <tr><td>You hurt someone.</td><td>Apologize and repair the harm.</td></tr>
    </table>

    <h2>Chapter 4: Courage and Honesty</h2>
    <p>Leadership requires courage. Sometimes courage means speaking up when something is wrong. Sometimes courage means admitting a mistake. Sometimes courage means saying no to peer pressure.</p>
    <ul>
      <li>Tell the truth even when it is difficult.</li>
      <li>Stand against bullying.</li>
      <li>Ask for help when you need it.</li>
      <li>Choose what is right, not only what is popular.</li>
    </ul>

    <h2>Chapter 5: Team Leadership</h2>
    <p>A leader works with people, not above people. Team leadership means helping everyone contribute.</p>
    <ul>
      <li>Give everyone a role.</li>
      <li>Listen to quiet members.</li>
      <li>Respect different ideas.</li>
      <li>Keep the group focused.</li>
      <li>Celebrate group effort.</li>
    </ul>

    <h2>Chapter 6: Problem-Solving</h2>
    <p>Leaders help solve problems calmly. They do not make problems worse with insults, blame, or pride.</p>
    <ol>
      <li>Identify the problem.</li>
      <li>Listen to everyone involved.</li>
      <li>Think of possible solutions.</li>
      <li>Choose the fairest solution.</li>
      <li>Review what worked.</li>
    </ol>

    <h2>Leadership Project</h2>
    <p>Choose one project:</p>
    <ol>
      <li>Organize a clean-up activity.</li>
      <li>Welcome a new learner.</li>
      <li>Create an anti-bullying poster.</li>
      <li>Help a classmate with reading or maths.</li>
      <li>Start a kindness challenge.</li>
    </ol>

    <h2>Workbook</h2>
    <ul>
      <li>A leader I admire is: ______</li>
      <li>I admire this leader because: ______</li>
      <li>One problem I can help solve is: ______</li>
      <li>One responsibility I can take this week is: ______</li>
      <li>Leadership means: ______</li>
    </ul>

    <h2>Mini Quiz</h2>
    <ol>
      <li>Is leadership about control or service?</li>
      <li>Name three qualities of a good leader.</li>
      <li>What does responsibility mean?</li>
      <li>How did Amara show leadership?</li>
      <li>Name one leadership project you can do.</li>
    </ol>

    <h2>Parent Guide</h2>
    <p>Give children age-appropriate responsibilities. Let them make small decisions, solve small problems, and learn from mistakes. Praise honesty, service, effort, and responsibility.</p>

    <h2>Teacher Guide</h2>
    <p>Rotate leadership roles. Avoid only choosing the loudest or highest-performing children. Give quiet, thoughtful, and responsible children opportunities to lead too.</p>

    <h2>Certificate Challenge</h2>
    <p>Complete one leadership project and write three lessons learned from the experience.</p>
  `
});


/* =========================
   BOOK 19: PUBLIC SPEAKING FOR KIDS
========================= */

KIDDIES_RESOURCES.push({
  id: "public-speaking-for-kids",
  title: "Public Speaking for Kids",
  category: "confidence",
  ageGroup: "ages-10-13",
  status: "active",
  featured: false,
  readingTime: "70–80 min",
  level: "Intermediate",
  author: "SpeakOut Mental Health Outreach",
  description: "A complete confidence-building mini-book teaching speech structure, clear voice, body language, preparation, confidence, storytelling, and respectful listening.",
  contentHtml: `
    <h1>Public Speaking for Kids</h1>
    <p><strong>Published by SpeakOut Mental Health Outreach.</strong></p>

    <h2>Welcome to Public Speaking</h2>
    <p>Public speaking means sharing your thoughts, ideas, stories, or information with other people. It may happen in class, at church, in a club, during a debate, at a family event, or in the community.</p>

    <p>Many children feel nervous before speaking. That is normal. Confidence grows through practice, preparation, and encouragement.</p>

    <h2>Learning Objectives</h2>
    <ul>
      <li>Understand what public speaking means.</li>
      <li>Prepare a simple speech.</li>
      <li>Use clear voice and body language.</li>
      <li>Manage nervousness.</li>
      <li>Listen respectfully to other speakers.</li>
      <li>Build confidence through practice.</li>
    </ul>

    <h2>Chapter 1: Why Public Speaking Matters</h2>
    <p>Children who learn to speak clearly can share ideas, ask questions, explain problems, defend what is right, and express themselves with courage.</p>
    <ul>
      <li>It builds confidence.</li>
      <li>It improves communication.</li>
      <li>It helps children organize thoughts.</li>
      <li>It prepares children for leadership.</li>
      <li>It helps children speak up when they need support.</li>
    </ul>

    <h2>Story Time: Musa’s One-Minute Speech</h2>
    <p>Musa was asked to speak about his favorite subject. His hands felt cold, and his heart beat quickly.</p>
    <p>His teacher said, “Start with one minute. You do not have to be perfect.”</p>
    <p>Musa wrote three points. He practiced with his friend. He breathed slowly before standing.</p>
    <p>He said, “Good morning everyone. Today I will speak about Basic Science.”</p>
    <p>At the end, his classmates clapped. Musa learned that courage is not the absence of fear. Courage is trying even when you feel nervous.</p>

    <h2>Chapter 2: Simple Speech Structure</h2>
    <table border="1" cellpadding="8">
      <tr><th>Speech Part</th><th>Example</th></tr>
      <tr><td>Greeting</td><td>Good morning everyone.</td></tr>
      <tr><td>Topic</td><td>Today I will speak about kindness.</td></tr>
      <tr><td>Point 1</td><td>Kindness helps people feel valued.</td></tr>
      <tr><td>Point 2</td><td>Kindness can stop bullying.</td></tr>
      <tr><td>Point 3</td><td>Kindness makes school better.</td></tr>
      <tr><td>Closing</td><td>Thank you for listening.</td></tr>
    </table>

    <h2>Chapter 3: Voice and Body Language</h2>
    <p>How you speak matters. Your voice and body can help people understand you.</p>
    <ul>
      <li>Stand upright.</li>
      <li>Speak slowly.</li>
      <li>Use a clear voice.</li>
      <li>Look at friendly faces.</li>
      <li>Do not cover your mouth.</li>
      <li>Pause between important points.</li>
    </ul>

    <h2>Chapter 4: Managing Nervousness</h2>
    <p>Nervousness is not a sign of failure. It is a sign that your body is preparing for something important.</p>
    <ol>
      <li>Practice before speaking.</li>
      <li>Take slow breaths.</li>
      <li>Start with a small audience.</li>
      <li>Use short notes.</li>
      <li>Remember that mistakes are normal.</li>
    </ol>

    <h2>Chapter 5: Storytelling in Speeches</h2>
    <p>A good story can make a speech more interesting. Stories help people remember your message.</p>
    <ul>
      <li>Start with a character.</li>
      <li>Describe a problem.</li>
      <li>Explain what changed.</li>
      <li>Share the lesson.</li>
    </ul>

    <h2>Chapter 6: Respectful Listening</h2>
    <p>Public speaking is not only about talking. It is also about listening.</p>
    <ul>
      <li>Do not laugh at mistakes.</li>
      <li>Clap respectfully.</li>
      <li>Ask kind questions.</li>
      <li>Give helpful feedback.</li>
      <li>Encourage shy speakers.</li>
    </ul>

    <h2>Speech Practice Topics</h2>
    <ol>
      <li>Why kindness matters.</li>
      <li>My favorite subject.</li>
      <li>How to stay safe.</li>
      <li>Why reading is important.</li>
      <li>A leader I admire.</li>
      <li>How children can help the community.</li>
    </ol>

    <h2>Workbook</h2>
    <ul>
      <li>My speech topic is: ______</li>
      <li>My three points are: ______</li>
      <li>One story I can use is: ______</li>
      <li>One thing I did well is: ______</li>
      <li>One thing I will improve is: ______</li>
    </ul>

    <h2>Mini Quiz</h2>
    <ol>
      <li>What is public speaking?</li>
      <li>Name the six parts of a simple speech.</li>
      <li>What should you do when nervous?</li>
      <li>Why are stories useful in speeches?</li>
      <li>How can listeners show respect?</li>
    </ol>

    <h2>Parent Guide</h2>
    <p>Let children practice in safe spaces first. Do not mock mistakes. Record short speeches and celebrate progress.</p>

    <h2>Teacher Guide</h2>
    <p>Begin with pair-sharing, then small groups, then full-class presentations. Use supportive feedback and avoid public embarrassment.</p>

    <h2>Certificate Challenge</h2>
    <p>Prepare and deliver a one-minute speech to at least three people. Ask for one positive comment and one improvement suggestion.</p>
  `
});


/* =========================
   BOOK 20: SCIENCE EXPLORERS
========================= */

KIDDIES_RESOURCES.push({
  id: "science-explorers",
  title: "Science Explorers",
  category: "science",
  ageGroup: "ages-10-13",
  status: "active",
  featured: false,
  readingTime: "80–90 min",
  level: "Intermediate",
  author: "SpeakOut Mental Health Outreach",
  description: "A complete science mini-book teaching observation, curiosity, prediction, safe experiments, evidence, journaling, and problem-solving.",
  contentHtml: `
    <h1>Science Explorers</h1>
    <p><strong>Published by SpeakOut Mental Health Outreach.</strong></p>

    <h2>Welcome to Science Explorers</h2>
    <p>Science helps us understand the world. It teaches us to ask questions, observe carefully, test ideas safely, and learn from evidence.</p>

    <p>A scientist is not someone who knows everything. A scientist is someone who stays curious and investigates carefully.</p>

    <h2>Learning Objectives</h2>
    <ul>
      <li>Understand what science is.</li>
      <li>Ask strong questions.</li>
      <li>Observe carefully.</li>
      <li>Make predictions.</li>
      <li>Conduct safe experiments.</li>
      <li>Record evidence and explain findings.</li>
    </ul>

    <h2>Chapter 1: What Is Science?</h2>
    <p>Science is a way of learning about nature, people, animals, plants, weather, materials, health, and technology through observation and evidence.</p>

    <h3>Science helps us understand:</h3>
    <ul>
      <li>Why rain falls.</li>
      <li>How plants grow.</li>
      <li>Why some objects float.</li>
      <li>How the body works.</li>
      <li>How machines help people.</li>
    </ul>

    <h2>Story Time: Ibrahim and the Floating Leaf</h2>
    <p>Ibrahim dropped a leaf into a bowl of water. It floated.</p>
    <p>Then he dropped a coin into the same bowl. It sank.</p>
    <p>He wondered, “Why does one float and the other sink?”</p>
    <p>His teacher smiled and said, “That question is where science begins.”</p>

    <h2>Chapter 2: The Scientific Method</h2>
    <table border="1" cellpadding="8">
      <tr><th>Step</th><th>Meaning</th></tr>
      <tr><td>Question</td><td>What do I want to know?</td></tr>
      <tr><td>Prediction</td><td>What do I think will happen?</td></tr>
      <tr><td>Experiment</td><td>How will I test safely?</td></tr>
      <tr><td>Observation</td><td>What did I see?</td></tr>
      <tr><td>Conclusion</td><td>What did I learn?</td></tr>
    </table>

    <h2>Chapter 3: Observation Skills</h2>
    <p>Observation means looking, listening, touching safely, smelling safely, measuring, drawing, and recording details.</p>
    <ul>
      <li>What color is it?</li>
      <li>What shape is it?</li>
      <li>Is it heavy or light?</li>
      <li>Does it change over time?</li>
      <li>What do I notice first?</li>
    </ul>

    <h2>Chapter 4: Safe Experiment — Floating and Sinking</h2>
    <p>Materials:</p>
    <ul>
      <li>Bowl of water.</li>
      <li>Leaf.</li>
      <li>Coin.</li>
      <li>Plastic bottle cap.</li>
      <li>Small stick.</li>
      <li>Spoon.</li>
    </ul>

    <p>Instructions:</p>
    <ol>
      <li>Predict which objects will float.</li>
      <li>Place each object in water one by one.</li>
      <li>Record what happens.</li>
      <li>Compare your prediction with the result.</li>
    </ol>

    <h2>Chapter 5: Plant Observation Journal</h2>
    <p>Choose one plant. Observe it for seven days.</p>
    <table border="1" cellpadding="8">
      <tr><th>Day</th><th>What I Observed</th></tr>
      <tr><td>Day 1</td><td>______</td></tr>
      <tr><td>Day 2</td><td>______</td></tr>
      <tr><td>Day 3</td><td>______</td></tr>
      <tr><td>Day 4</td><td>______</td></tr>
      <tr><td>Day 5</td><td>______</td></tr>
      <tr><td>Day 6</td><td>______</td></tr>
      <tr><td>Day 7</td><td>______</td></tr>
    </table>

    <h2>Chapter 6: Weather Watch</h2>
    <p>Observe the weather for one week. Is it sunny, cloudy, rainy, windy, or hot?</p>

    <h2>Chapter 7: Science and Community</h2>
    <p>Science can help communities solve problems such as dirty water, poor sanitation, disease prevention, farming challenges, and environmental care.</p>

    <h2>Science Safety Rules</h2>
    <ul>
      <li>Do not taste experiment materials.</li>
      <li>Do not mix unknown chemicals.</li>
      <li>Do not use fire without adult supervision.</li>
      <li>Do not use sharp tools alone.</li>
      <li>Wash hands after experiments.</li>
    </ul>

    <h2>Workbook</h2>
    <ul>
      <li>My science question is: ______</li>
      <li>My prediction is: ______</li>
      <li>My observation is: ______</li>
      <li>My conclusion is: ______</li>
    </ul>

    <h2>Mini Quiz</h2>
    <ol>
      <li>What is science?</li>
      <li>What is a prediction?</li>
      <li>What is evidence?</li>
      <li>Name two science safety rules.</li>
      <li>What question did Ibrahim ask?</li>
    </ol>

    <h2>Parent Guide</h2>
    <p>Encourage curiosity. Answer questions patiently. If you do not know an answer, explore it together safely.</p>

    <h2>Teacher Guide</h2>
    <p>Use observation journals, low-cost materials, group experiments, drawings, and discussion. Emphasize safety and evidence.</p>

    <h2>Certificate Challenge</h2>
    <p>Complete one experiment, one observation journal, and one explanation of what you learned.</p>
  `
});
/* =========================
   BOOK 21: READING CLUB
========================= */

KIDDIES_RESOURCES.push({
  id: "reading-club",
  title: "Reading Club",
  category: "literacy",
  ageGroup: "ages-10-13",
  status: "active",
  featured: false,
  readingTime: "60–75 min",
  level: "Intermediate",
  author: "SpeakOut Mental Health Outreach",
  description: "A complete reading development mini-book that teaches reading habits, vocabulary, summaries, comprehension, discussion, confidence, and peer learning.",
  contentHtml: `
    <h1>Reading Club</h1>
    <p><strong>Published by SpeakOut Mental Health Outreach.</strong></p>

    <h2>Welcome to Reading Club</h2>
    <p>A reading club is a safe group where learners read, discuss, ask questions, learn new words, and grow in confidence.</p>

    <p>Reading is not only about saying words correctly. Reading helps children think, imagine, understand people, solve problems, and express ideas clearly.</p>

    <h2>Learning Objectives</h2>
    <ul>
      <li>Build a regular reading habit.</li>
      <li>Improve vocabulary and comprehension.</li>
      <li>Learn how to summarize texts.</li>
      <li>Discuss books respectfully.</li>
      <li>Build confidence in speaking and reading aloud.</li>
      <li>Use reading to learn life lessons.</li>
    </ul>

    <h2>Chapter 1: What Is a Reading Club?</h2>
    <p>A reading club is a group of learners who meet regularly to read, share ideas, learn new words, and discuss lessons from books, stories, articles, poems, or short passages.</p>

    <h3>Reading Club Rules</h3>
    <ul>
      <li>Respect every reader.</li>
      <li>Do not laugh at mistakes.</li>
      <li>Take turns speaking.</li>
      <li>Ask questions kindly.</li>
      <li>Encourage shy readers.</li>
      <li>Share one lesson from every reading.</li>
    </ul>

    <h2>Story Time: The Friday Readers</h2>
    <p>Every Friday, a small group of students gathered under a tree after school to read.</p>

    <p>At first, only two students were brave enough to read aloud. Others were afraid of making mistakes.</p>

    <p>The facilitator said, “This club is not for laughing at people. It is for helping each other grow.”</p>

    <p>By the fourth week, shy students began reading short paragraphs. Some students brought new words. Others asked questions about the story.</p>

    <p>The group became known as The Friday Readers. They learned that reading becomes easier when people feel safe, respected, and encouraged.</p>

    <h2>Chapter 2: Why Reading Matters</h2>
    <ul>
      <li>Reading improves vocabulary.</li>
      <li>Reading improves writing.</li>
      <li>Reading helps children understand emotions and choices.</li>
      <li>Reading improves school performance.</li>
      <li>Reading builds imagination.</li>
      <li>Reading helps children speak more confidently.</li>
    </ul>

    <h2>Chapter 3: How to Read Actively</h2>
    <p>Active reading means thinking while reading.</p>

    <ol>
      <li>Look at the title.</li>
      <li>Ask what the text may be about.</li>
      <li>Read slowly.</li>
      <li>Underline or write down new words.</li>
      <li>Ask questions.</li>
      <li>Summarize what you read.</li>
      <li>Share one lesson.</li>
    </ol>

    <h2>Chapter 4: Vocabulary Builder</h2>
    <p>Vocabulary means the words we know and understand. Every reader should keep learning new words.</p>

    <table border="1" cellpadding="8">
      <tr><th>Word</th><th>Meaning</th><th>Sentence</th></tr>
      <tr><td>Courage</td><td>Bravery</td><td>She showed courage by speaking the truth.</td></tr>
      <tr><td>Respect</td><td>Treating people with value</td><td>We show respect by listening.</td></tr>
      <tr><td>Honesty</td><td>Telling the truth</td><td>Honesty builds trust.</td></tr>
      <tr><td>Empathy</td><td>Understanding another person’s feelings</td><td>Empathy helps us care for others.</td></tr>
      <tr><td>Responsibility</td><td>Doing what you should do</td><td>Responsibility means completing your duty.</td></tr>
    </table>

    <h2>Chapter 5: How to Summarize</h2>
    <p>A summary is a short explanation of the main idea.</p>

    <h3>Summary Formula</h3>
    <ul>
      <li>Who was involved?</li>
      <li>What happened?</li>
      <li>What problem appeared?</li>
      <li>How was it solved?</li>
      <li>What lesson did we learn?</li>
    </ul>

    <h2>Chapter 6: Discussion Skills</h2>
    <p>A reading club is also a speaking and listening club.</p>

    <ul>
      <li>Listen before responding.</li>
      <li>Do not interrupt.</li>
      <li>Use examples from the text.</li>
      <li>Disagree respectfully.</li>
      <li>Encourage quieter members.</li>
    </ul>

    <h2>Chapter 7: Reading Aloud With Confidence</h2>
    <p>Reading aloud may feel scary at first. Confidence grows with practice.</p>

    <ul>
      <li>Start with one sentence.</li>
      <li>Read slowly.</li>
      <li>Pause at full stops.</li>
      <li>Do not panic after a mistake.</li>
      <li>Try again calmly.</li>
    </ul>

    <h2>Weekly Reading Club Plan</h2>
    <table border="1" cellpadding="8">
      <tr><th>Week</th><th>Activity</th></tr>
      <tr><td>Week 1</td><td>Choose a short story and discuss the main lesson.</td></tr>
      <tr><td>Week 2</td><td>Collect 10 new vocabulary words.</td></tr>
      <tr><td>Week 3</td><td>Practice reading aloud in pairs.</td></tr>
      <tr><td>Week 4</td><td>Present a summary to the group.</td></tr>
    </table>

    <h2>Reading Club Activities</h2>
    <ol>
      <li>Read silently for 10 minutes.</li>
      <li>Read one paragraph aloud.</li>
      <li>Write five new words.</li>
      <li>Discuss one character.</li>
      <li>Share the main lesson.</li>
      <li>Draw one scene from the reading.</li>
      <li>Act out a short part of the story.</li>
    </ol>

    <h2>Workbook</h2>
    <ul>
      <li>Title of today’s reading: ______</li>
      <li>Main character: ______</li>
      <li>Main problem: ______</li>
      <li>New words I learned: ______</li>
      <li>Main lesson: ______</li>
      <li>One question I still have: ______</li>
    </ul>

    <h2>Mini Quiz</h2>
    <ol>
      <li>What is a reading club?</li>
      <li>Name three reading club rules.</li>
      <li>What is vocabulary?</li>
      <li>What is a summary?</li>
      <li>Why should members not laugh at mistakes?</li>
      <li>Name one way to read aloud with confidence.</li>
      <li>What did The Friday Readers learn?</li>
    </ol>

    <h2>Parent Guide</h2>
    <p>Encourage reading at home. Ask your child to explain what they read instead of only asking them to pronounce words. Praise effort, curiosity, and consistency.</p>

    <h2>Teacher / Facilitator Guide</h2>
    <p>Create a safe reading culture. Do not embarrass struggling readers. Use pair reading, group discussion, vocabulary notebooks, story summaries, and role-play.</p>

    <h2>Certificate Challenge</h2>
    <p>To complete this resource, read one short text every week for four weeks, write five new words each week, and present one summary to a parent, teacher, or reading club group.</p>
  `
});


/* =====================================================
   PASTE FUTURE BOOK SECTIONS ABOVE THIS LINE
===================================================== */

const statusBox = document.getElementById("status");
const seedBtn = document.getElementById("seedBtn");

function show(message, type = "info") {
  if (!statusBox) return;
  statusBox.style.display = "block";
  statusBox.textContent = message;
  statusBox.className = "notice " + type;
}

async function isAdmin(uid) {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  return userSnap.exists() && userSnap.data().role === "admin";
}

async function seedKiddiesResources() {
  seedBtn.disabled = true;
  show("Updating Kiddies resources...", "info");

  try {
    const batch = writeBatch(db);

    KIDDIES_RESOURCES.forEach((row) => {
      const ref = doc(db, "kiddiesResources", row.id);
      batch.set(ref, {
        ...row,
        updatedAt: serverTimestamp()
      }, { merge: true });
    });

    await batch.commit();

    show(`Done. Updated ${KIDDIES_RESOURCES.length} Kiddies resources. Refresh kiddies.html.`, "success");
  } catch (error) {
    console.error(error);
    show("Failed: " + error.message, "error");
  } finally {
    seedBtn.disabled = false;
  }
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    show("You must be logged in as admin.", "error");
    seedBtn.disabled = true;
    return;
  }

  const admin = await isAdmin(user.uid);

  if (!admin) {
    show("Access denied. Admin role required.", "error");
    seedBtn.disabled = true;
    return;
  }

  show("Admin verified. Click the button to update Kiddies resources.", "info");
  seedBtn.disabled = false;
});

seedBtn?.addEventListener("click", seedKiddiesResources);
