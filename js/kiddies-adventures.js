// Original practice questions. Stars recognise participation, not mastery or certification.
const q=(prompt,choices,answer,explanation,picture='')=>({prompt,choices,answer,explanation,picture});
export const ADVENTURES={
 'nursery-unit-01':[
  {name:'Word explorer',icon:'Aa',intro:'Look around! A book, a cup and a cloth each have a name. Ask your grown-up to say the words with you.',questions:[q('Which one is a book?',['Book','Cup','Cloth'],0,'A book has pages. We can look at pictures or read together.'),q('Which object can feel soft?',['A cloth','A hard book cover'],0,'A cloth can feel soft. Touch is optional: you can look or ask an adult to describe it.')]},
  {name:'Turn-taking buddy',icon:'↔',intro:'You choose, then your grown-up chooses. A point, a sign or a word can be your turn.',questions:[q('Amina opens a book. What did Amina open?',['A cup','A book'],1,'The story says that Amina opens a book.'),q('You need a pause. What can you do?',['Use an agreed pause sign','Keep going even when uncomfortable'],0,'You can ask for a pause. Your grown-up can help you choose a comfortable way to join in.')]},
  {name:'Counting explorer',icon:'123',intro:'Point to each circle once. Say one number for each circle, then say how many there are.',questions:[q('How many circles can you see?',['One','Two','Three'],2,'Count each circle once: one, two, three. There are three.',3),q('Now how many circles can you see?',['Two','Three'],0,'One, two. There are two circles in this picture.',2)]},
  {name:'Shape detective',icon:'◯',intro:'Some shapes are round. Squares have four equal sides. Look for shapes that belong together.',questions:[q('Which shape belongs with a circle?',['Another circle','A square'],0,'Two circles belong together because they have the same shape.','circle'),q('Which shape belongs with a square?',['A circle','Another square'],1,'Two squares belong together because they have the same shape.','square')]}
 ],
 'primary1-unit-01':[
  {name:'Story detective',icon:'ABC',intro:'Listen: Sade has a red book. She puts it on a table. Tunde brings a pencil. They look at the book together.',questions:[q('Who has the red book?',['Sade','Tunde'],0,'The first sentence tells us that Sade has the red book.'),q('What colour is Tunde’s pencil?',['Red','Blue','The story does not say'],2,'We know Tunde brings a pencil. Its colour is not stated, so we do not guess.')]},
  {name:'Sentence builder',icon:'Aa',intro:'Words work together to tell us something. A written sentence starts with a capital letter and ends with a full stop.',questions:[q('Choose the sentence that tells us where the book is.',['The book is on the table.','table book the on'],0,'“The book is on the table.” gives us a clear message.'),q('Which word changes the position in “The cup is under the table”?',['Cup','Under','The'],1,'“Under” tells us the position. Compare it with “on” using a drawing or a safe object.')]},
  {name:'Sound explorer',icon:'sat',intro:'Ask your grown-up to model the sounds in s-a-t and t-a-p. Blend the sounds gently; letter names and sounds are different.',questions:[q('Blend the sounds s-a-t. Choose the word.',['sat','tap'],0,'s-a-t blends into “sat”, as in “Sade sat beside the table”.'),q('Blend the sounds t-a-p. Choose the word.',['sat','tap'],1,'t-a-p blends into “tap”: a gentle touch or knocking action. This small set is only an introduction.')]},
  {name:'Number explorer',icon:'123',intro:'Count each circle once. An empty picture has zero circles. Moving circles apart does not change how many there are.',questions:[q('How many circles are in this picture?',['Three','Four','Five'],1,'One, two, three, four. There are four circles.',4),q('There are no circles in this picture. How many is that?',['Zero','One','Two'],0,'Zero means no circles in the picture. The picture box still exists.',0)]},
  {name:'Group detective',icon:'< >',intro:'Count or pair the circles to compare groups. More space between circles does not mean more circles.',questions:[q('Group A has two circles. Group B has four. Which has more?',['Group A','Group B'],1,'Four is more than two. Group B has more circles.','groups24'),q('Both groups have three circles. One group is spread out. Do they have the same number?',['Yes','No'],0,'Yes. Each group has three circles; their spacing does not change the number.','groups33')]},
  {name:'Number builder',icon:'+ −',intro:'Join groups to add. Take some away to subtract. Draw the starting circles and keep track of the change.',questions:[q('Two circles join two more. How many altogether?',['Three','Four','Five'],1,'2 + 2 = 4. Count all four circles in your drawing.','join22'),q('Start with five circles. Cross out one. How many remain?',['Three','Four','Five'],1,'5 − 1 = 4. Count only the four circles that are not crossed out.','remove51')]}
 ],
 'nursery-unit-02':[
  {name:'Describing explorer',icon:'Aa',intro:'Look at the two book pictures. One is big and one is small. A useful describing word tells us more about an object.',questions:[q('Which word describes the larger book?',['Big','Small'],0,'The larger book is big compared with the smaller book beside it.','size-books'),q('Which word describes the smaller book?',['Big','Small'],1,'The smaller book is small compared with the larger book beside it.','size-books')]},
  {name:'First-and-next buddy',icon:'1 2',intro:'Listen: Amina opens a book. Next, Amina looks at a picture. Talk together about what happens first and what happens next.',questions:[q('What does Amina do first?',['Opens the book','Looks at a picture'],0,'The first event is opening the book. Looking at a picture comes next.'),q('What does Amina do next?',['Opens the book','Looks at a picture'],1,'Next, Amina looks at a picture. We use the order stated in the story.')]},
  {name:'Five-circle explorer',icon:'123',intro:'Count each circle once. Try four and five when counting one to three feels comfortable; smaller groups are always welcome.',questions:[q('How many circles can you see?',['Three','Four','Five'],1,'One, two, three, four. There are four circles in this picture.',4),q('How many circles can you see now?',['Four','Five'],1,'One, two, three, four, five. There are five circles in this picture.',5)]},
  {name:'Pattern detective',icon:'◯ ■',intro:'A pattern repeats a little group. Say circle, square, circle, square together. Notice the pair that repeats.',questions:[q('Circle, square, circle, square. What comes next?',['A circle','A square'],0,'A circle begins the repeating circle-square pair again.',{type:'pattern',shapes:['circle','square','circle','square']}),q('Square, circle, square, circle. What comes next?',['A circle','A square'],1,'A square begins the repeating square-circle pair again.',{type:'pattern',shapes:['square','circle','square','circle']})]}
 ],
 'primary1-unit-02':[
  {name:'Story-order detective',icon:'1 2 3',intro:'Listen: Bala picks up a book. He opens the book. Zainab looks at a picture with him. Retell the three events together.',questions:[q('What happens first in the story?',['Bala opens the book','Bala picks up the book','Zainab looks at a picture'],1,'Bala picks up the book first, opens it next, then looks at a picture with Zainab.'),q('What colour is the book?',['Red','Blue','The story does not say'],2,'The story gives us the event order. It does not tell us the book’s colour.')]},
  {name:'Describing sentence builder',icon:'Aa',intro:'“The big book is on the table.” is a clear message. Big tells us about size; on tells us the book’s position.',questions:[q('Which word describes size in “The small book is on the table”?',['Small','On','Table'],0,'Small describes the book’s size compared with another book.'),q('Choose a clear sentence about the big book under the table.',['The big book is under the table.','table big book under the'],0,'The first choice gives a clear message, with a capital at the start and a full stop at the end.')]},
  {name:'Mat sound explorer',icon:'mat',intro:'Ask your grown-up to model m-a-t and s-a-t. Blend the sounds gently and compare the first sound of the two words.',questions:[q('Blend the modelled sounds m-a-t. Choose the word.',['sat','mat'],1,'m-a-t blends into mat, the word for a covering placed on the floor.'),q('Which letter starts mat in this example?',['s','m','t'],1,'The letter m represents the starting sound in mat in this example. Letter names and sounds are different.')]},
  {name:'Ten-circle explorer',icon:'123',intro:'Count slowly and track each picture once. Work towards ten only when smaller groups feel comfortable; ask for support when needed.',questions:[q('How many circles are in this picture?',['Six','Seven','Eight'],1,'Count each circle once. This picture contains seven circles.',7),q('How many circles are in this picture now?',['Eight','Nine','Ten'],2,'Count the complete group. There are ten circles; a new row does not restart the total.',10)]},
  {name:'Bigger-group detective',icon:'< >',intro:'Count or pair the circles in two groups. The number of circles matters, not the space used by the picture.',questions:[q('Group A has seven circles. Group B has nine. Which has more?',['Group A','Group B'],1,'Nine is more than seven, so Group B has more circles.',{type:'groups',counts:[7,9]}),q('Both groups have eight circles. Do they have the same number?',['Yes','No'],0,'Yes. Each group has eight circles, even when their spacing differs.',{type:'groups',counts:[8,8],spread:true})]},
  {name:'Joining and taking away',icon:'+ −',intro:'Show the starting group and the change. Count all joined circles for addition, and only uncrossed circles for the remaining group.',questions:[q('Five circles join two more. How many altogether?',['Six','Seven','Eight'],1,'5 + 2 = 7. Count all seven circles in the two joined groups.',{type:'groups',counts:[5,2]}),q('Start with eight circles. Cross out two. How many remain?',['Five','Six','Seven'],1,'8 − 2 = 6. The two crossed-out circles are not included in the remaining group.',{type:'groups',counts:[8],removed:2})]}
 ]
};
ADVENTURES['nursery-unit-03']=[
 {name:'Noticing explorer',icon:'Aa',intro:'A book has pages. A familiar cloth can fold. Ask your grown-up to show or describe one detail, and choose what you notice.',questions:[q('Which familiar object has pages?',['Book','Cloth'],0,'A book has pages. Your grown-up can show or describe them; touching is optional.'),q('We have not described the book’s colour. Do we know its colour from these words?',['Yes','The words do not say'],1,'The words name the object and its pages, but do not give its colour. We do not guess.')]},
 {name:'Leaf explorer',icon:'LEAF',intro:'Look at this example plant drawing with your grown-up. The broad parts are leaves; the middle connecting part is the stem.',questions:[q('What do we call a broad leafy part in this drawing?',['A leaf','A book'],0,'A broad leafy part is a leaf. Plants can have different leaf shapes and numbers.',{type:'plant'}),q('How can we learn about an unfamiliar plant here?',['Pick and taste a leaf','Use a drawing with a grown-up'],1,'Use the drawing with your grown-up. We do not pick, taste or smell unfamiliar plants.')]},
 {name:'Leaf-group detective',icon:'< >',intro:'Two leaf pictures can be different sizes and still both show leaves. Say the grouping rule with your grown-up before choosing.',questions:[q('A big leaf picture and a small leaf picture: which belong in the leaf group?',['Only the big leaf','Both leaf pictures'],1,'Both pictures show leaves. Their different sizes do not change the object-name grouping rule.'),q('Which belongs with another leaf picture?',['A leaf picture','A book picture'],0,'A leaf picture belongs with the other leaf when the rule is to group leaf pictures.')]},
 {name:'Learning-space helper',icon:'HELP',intro:'Amina finishes with a book that belongs on a shelf. Musa sees an unknown object on the floor. A grown-up can help with both routines.',questions:[q('Where can Amina’s finished book go?',['On its agreed shelf','Blocking the walkway'],0,'Return the book to its agreed shelf, or ask an adult to do it with your direction.'),q('Who should check an unknown object on the floor?',['The supervising grown-up','A child picking it up alone'],0,'The supervising grown-up checks it. Children do not handle unknown objects or rubbish for this activity.')]}
];
ADVENTURES['primary1-unit-03']=[
 {name:'Observation detective',icon:'LOOK',intro:'Listen: Zainab sees a small plant beside a table. The drawing has three leaves. Bala has a book. The note leaves some details unknown.',questions:[q('Where is the plant in the note?',['Beside a table','Under a bed'],0,'The note says the plant is beside a table. We use the stated observation.'),q('Who planted it?',['Bala','Zainab','The note does not say'],2,'The note names observers and a book, but does not identify who planted the plant.')]},
 {name:'Material explorer',icon:'WHAT',intro:'In a metal cup, cup names the object and metal names its material. An adult supplies the material information; a drawing may not show it.',questions:[q('In “a metal cup”, which word names the material?',['Metal','Cup'],0,'Metal names the material in this stated example; cup names the object.'),q('A plastic cup and a metal cup: are both cups?',['Yes','No'],0,'Yes. Both objects are cups even though their stated materials differ.')]},
 {name:'Living-world detective',icon:'LIFE',intro:'A growing plant and a goat are living things. A chair and a toy car are made objects. A toy moving when pushed does not make it living.',questions:[q('Which is a living example?',['A growing plant','A chair'],0,'A growing plant is living. It does not need to walk for us to recognise it as living.'),q('A toy car moves when pushed. Does that make it living?',['Yes','No'],1,'No. Movement alone does not prove life; the toy car is a non-living made object.')]},
 {name:'Plant-part explorer',icon:'LEAF',intro:'This simplified drawing shows leaves, a stem and roots below a soil line. Real roots can be hidden in soil; we do not pull up plants.',questions:[q('Which part is drawn below the soil line?',['Roots','Leaves'],0,'The roots are shown below the soil line in this example. The drawing lets us discuss a hidden part.',{type:'plant'}),q('Must roots be visible above the soil for a plant to have roots?',['Yes','No'],1,'No. Roots may be hidden in the soil. We can learn from a drawing without digging up the plant.')]},
 {name:'Fair-comparison explorer',icon:'< >',intro:'Compare the length of two drawn strips from the same start line. A wider shape is not automatically longer; first agree the rule.',questions:[q('Both strips start at the same line. Which is longer?',['Strip A','Strip B'],1,'Strip B reaches farther from the shared start line, so it is longer in this drawing.',{type:'strips',lengths:[45,85],widths:[18,18]}),q('Both strips have the same length, but B is wider. Is B longer?',['Yes','No'],1,'No. The lengths are the same. Width and length are different features.',{type:'strips',lengths:[75,75],widths:[18,32]})]},
 {name:'Record-and-wonder explorer',icon:'NOTE',intro:'A fictional first drawing shows two leaves; a later drawing shows three. Notice the recorded change, and separate it from unanswered questions.',questions:[q('First drawing two leaves, later drawing three. What does the later drawing show?',['Two leaves','Three leaves'],1,'The later fictional drawing shows three leaves. This is a stated detail, not a real experiment result.'),q('Do these two drawings tell us exactly when the next leaf will appear?',['Yes','No'],1,'No. Two drawings do not establish the next leaf’s timing or a growth schedule for all plants.')]}
];
ADVENTURES['nursery-unit-04']=[
 {name:'Line explorer',icon:'DRAW',intro:'A straight line does not bend in our example. A curved line bends smoothly. Ask your grown-up to trace or describe each route.',questions:[q('Which drawn line bends smoothly?',['Line A','Line B'],1,'Line B is the curved example. Line A is straight; your grown-up can describe both routes.',{type:'lines'}),q('Can you choose your own mark for a creative design?',['Yes','Only an exact copy is allowed'],0,'Yes. Your own intended mark is welcome; this creative activity has no single correct picture.')]},
 {name:'Shape maker',icon:'MAKE',creativeBoard:true,intro:'Choose circles, squares or lines in the optional studio below, or direct a grown-up on paper. There is no best arrangement to copy.',questions:[q('You move a circle to a new space. Is it still a circle?',['Yes','No'],0,'Yes. Moving the circle changes its position, not its shape name.','circle'),q('Two people choose different shape arrangements. Can both be valid designs?',['Yes','Only one can be right'],0,'Yes. Original creative arrangements can differ. Ask the maker about their intention.')]},
 {name:'Tap-and-pause explorer',icon:'PAUSE',intro:'Our gentle repeating pair is tap, pause. Choose or point quietly if movement or sound is uncomfortable; a pause is part of the sequence.',questions:[q('Tap, pause; tap, pause. What comes after the next tap?',['Pause','Another tap'],0,'Pause follows tap in this repeating pair. You can indicate the word without making sound.',{type:'rhythm',actions:['TAP','PAUSE','TAP','PAUSE']}),q('During the pause part, do we need to make a tap?',['Yes','No'],1,'No tap is made in the pause part. Quiet pointing is a welcome response throughout.')]},
 {name:'Pretend-story buddy',icon:'TELL',intro:'Listen: Amina draws a circle. Musa asks to add a square beside it. Amina agrees. They look at their shared design together.',questions:[q('What does Musa ask to add?',['A square','A cup'],0,'Musa asks to add a square beside Amina’s circle. We use the stated story detail.'),q('Do you have to perform the story in front of others?',['Yes','No, I can choose a supported way'],1,'No. You can direct a grown-up, narrate, use an aid or watch a retelling; public performance is optional.')]}
];
ADVENTURES['primary1-unit-04']=[
 {name:'Line-choice explorer',icon:'DRAW',intro:'Straight and curved lines make different routes. A straight line stays straight when its direction changes. Choose your own marks too.',questions:[q('Which example is curved?',['Line A','Line B'],1,'Line B bends smoothly in this drawing. Line A is the straight example.',{type:'lines'}),q('A straight line is drawn vertically. Is it still straight?',['Yes','No'],0,'Yes. A different direction does not make an unbending straight line curved.')]},
 {name:'Shape-composition maker',icon:'MAKE',creativeBoard:true,intro:'Arrange familiar shapes in the optional studio or on paper. Explain one choice, such as beside or above, without needing a realistic picture.',questions:[q('A circle is moved beside a square. Has the circle become a square?',['Yes','No'],1,'No. Its position changes, while the circle remains a circle.'),q('Which explains an intended design choice?',['I chose a circle beside a square.','Only my picture is allowed.'],0,'The first choice describes an arrangement. Different makers may choose different valid designs.')]},
 {name:'Repeating-border detective',icon:'◯ ■',creativeBoard:true,intro:'Our example repeats a circle-square pair. Continue its rule, then choose whether to make your own repeating or changing arrangement.',questions:[q('Circle, square, circle, square. Which shape comes next under this rule?',['A circle','A square'],0,'The circle-square pair begins again with a circle. Your own design may use a different stated rule.',{type:'pattern',shapes:['circle','square','circle','square']}),q('Square, circle, square, circle. Which shape comes next under this rule?',['A circle','A square'],1,'A square begins the square-circle pair again. We follow the rule of this example.',{type:'pattern',shapes:['square','circle','square','circle']})]},
 {name:'Beat-and-pause explorer',icon:'BEAT',intro:'The original four-position sequence is tap, tap, pause, tap. Indicate each position evenly with a grown-up; audible tapping is optional.',questions:[q('Which position is the pause in this sequence?',['The second','The third','The fourth'],1,'The third position is PAUSE. We still indicate that position but make no tap there.',{type:'rhythm',actions:['TAP','TAP','PAUSE','TAP']}),q('How many tap positions are in tap, tap, pause, tap?',['Two','Three','Four'],1,'There are three TAP positions and one PAUSE position. The pause belongs to the four-position sequence.')]},
 {name:'Pretend-workshop narrator',icon:'TELL',intro:'Listen: Bala draws a circle. Zainab asks to add a square beside it. Bala agrees. Their teacher asks them to describe the design.',questions:[q('Who draws the circle?',['Bala','Zainab'],0,'Bala draws the circle. Zainab asks before adding a square beside it.'),q('What colour is the paper in the story?',['White','Blue','The story does not say'],2,'The story describes actions and characters, but does not give the paper’s colour.')]},
 {name:'Respectful-art explorer',icon:'SHARE',intro:'Describe a visible choice and ask the maker about their intention. Different designs can have value; permission matters before changing or displaying work.',questions:[q('Which invites the maker to share their intention respectfully?',['What would you like to tell us?','Your design is wrong because it is different.'],0,'Ask what the maker wants to share, without requiring a particular design or a private explanation.'),q('Should you ask before publicly displaying someone else’s work?',['Yes','No'],0,'Yes. Ask permission before changing or publicly displaying another person’s work. Sharing is a choice.')]}
];
ADVENTURES['nursery-unit-05']=[
 {name:'Help-and-pause buddy',icon:'HELP',intro:'Agree a help sign or word with your grown-up. You can ask for a pause too; help and breaks do not depend on saying a special phrase.',questions:[q('Which choice communicates that you want help?',['Use my agreed help sign','Point to an unrelated picture'],0,'An agreed help sign tells your grown-up that you want help. Words, signs and familiar communication aids are welcome.'),q('You use your agreed pause sign. What are you asking for?',['A pause','A new drawing'],0,'Your pause sign asks for a break. Your grown-up should respond to the request, without requiring a special word first.')]},
 {name:'On-and-under explorer',icon:'WHERE',intro:'Look at the book and table drawings. On means the book rests on the tabletop; under means it is beneath the tabletop.',questions:[q('Where is the book in this drawing?',['On the table','Under the table'],0,'The book rests on the tabletop in this drawing. On describes its position relative to the table.',{type:'position',position:'on'}),q('Where is the book in this new drawing?',['On the table','Under the table'],1,'The book is beneath the tabletop, between the legs. It is under the table; no one needs to crawl under furniture.',{type:'position',position:'under'})]},
 {name:'Two-step explorer',icon:'1 2',intro:'Try a comfortable picture task: first show the book, then show the circle. You can direct your grown-up and ask for the words again.',questions:[q('First show the book. Then show the circle. Which comes second?',['The book','The circle'],1,'The circle is second in this stated instruction. You can hear the whole instruction again and respond with support.'),q('You want to hear the instruction again. Can you ask your grown-up to repeat it?',['Yes','No'],0,'Yes. Asking for a repeat is useful communication; this activity does not require remembering without support.')]},
 {name:'Little-story narrator',icon:'TELL',intro:'Listen: Amina chooses a book. Musa opens the book. They look at a picture together. Retell the pretend story in a comfortable way.',questions:[q('Who opens the book?',['Amina','Musa'],1,'The story says that Musa opens the book. Amina chooses it first.'),q('What happens last in the story?',['Amina chooses the book','They look at a picture together'],1,'Looking at a picture together happens last, after choosing and opening the book. Retelling may be supported.')]}
];
ADVENTURES['primary1-unit-05']=[
 {name:'Story-evidence detective',icon:'READ',intro:'Listen: Bala has a book. Zainab asks to look at it. Bala puts the book on the table. They look at one picture together.',questions:[q('Who asks to look at the book?',['Bala','Zainab'],1,'The second sentence says that Zainab asks to look at the book. We check the words instead of guessing.'),q('What colour is the book in the story?',['Red','Blue','The story does not say'],2,'The story tells us about the book and actions, but does not state the book’s colour. A drawing does not add a fact to the text.')]},
 {name:'Question builder',icon:'ASK',intro:'A statement tells us something; a question asks for information. Compare “The book is on the table.” with “Where is the book?”',questions:[q('Which end mark completes the written question “Where is the book”?',['A full stop (.)','A question mark (?)'],1,'This written question uses a question mark: Where is the book? It asks for information about position.'),q('Which sentence asks for information?',['Where is the book?','The book is under the table.'],0,'Where is the book? asks for its position. The other sentence gives information about where the book is.')]},
 {name:'Short-i sound explorer',icon:'pin',intro:'Ask your grown-up to model p-i-n and t-i-n. Blend the short i gently and talk about the words using safe drawings, without real pins.',questions:[q('Blend the modelled sounds p-i-n. Choose the word.',['pin','tin','pit'],0,'p-i-n blends into pin. We use a drawing to explain the meaning and do not handle a sharp pin.'),q('Which sound changes when pin becomes tin?',['The first sound','The last sound'],0,'The first sound changes from p to t. The i and n sounds stay the same in these examples.')]},
 {name:'Number-order detective',icon:'0–10',intro:'Use a number strip from zero to ten. Immediately before or after means the neighbouring number; keep the strip available for support.',questions:[q('Which number is immediately after 7 on the zero-to-ten strip?',['6','8','9'],1,'The next number is 8: the strip reads 6, 7, 8, 9 around this position.',{type:'number-strip',start:7}),q('Which number is immediately before 4 on the strip?',['3','5','2'],0,'The previous number is 3. We can check the ordered strip: 2, 3, 4, 5.',{type:'number-strip',start:4})]},
 {name:'Two-parts-of-ten explorer',icon:'6 + 4',intro:'Count the circles in both groups. Six and four make ten; seven and three make ten too. Track each circle once and explain with support.',questions:[q('Group A has six circles. Group B has four. How many altogether?',['Eight','Nine','Ten'],2,'6 + 4 = 10. Count all six circles in A and all four in B, tracking each circle once.',{type:'groups',counts:[6,4]}),q('Seven circles and three circles make how many altogether?',['Nine','Ten','Seven'],1,'7 + 3 = 10. Both groups together contain ten circles; changing their positions would not change the total.',{type:'groups',counts:[7,3]})]},
 {name:'Draw-and-solve explorer',icon:'+ −',intro:'Show the problem with drawings before choosing a calculation. Count both groups when joining, and only uncrossed circles when taking away.',questions:[q('Bala draws six circles, then two more. How many altogether?',['Eight','Four','Six'],0,'6 + 2 = 8. The action adds two circles to the six already drawn, so we count both groups.',{type:'groups',counts:[6,2]}),q('Zainab draws nine circles and crosses out three. How many are not crossed out?',['Nine','Three','Six'],2,'9 − 3 = 6. Count only the six circles that are not crossed out; the three crossed circles are the change.',{type:'groups',counts:[9],removed:3})]}
];
export function isCorrect(question,index){return Number.isInteger(index)&&index===question.answer;}
export function readExploration(storage,key,allowed){try{const value=JSON.parse(storage.getItem(key));return new Set(Array.isArray(value)?value.filter(id=>allowed.includes(id)):[]);}catch{return new Set();}}
export function saveExploration(storage,key,completed){try{storage.setItem(key,JSON.stringify([...completed]));return true;}catch{return false;}}

// Unit 6: original, facilitator-supported social learning practice.
ADVENTURES["nursery-unit-06"]=[
  {
    "name": "Welcome explorer",
    "icon": "HELLO",
    "intro": "Amina says hello. Musa waves. Both ways can show a greeting.",
    "questions": [
      {
        "prompt": "Which can be a greeting?",
        "choices": [
          "A friendly wave",
          "Pushing someone"
        ],
        "answer": 0,
        "explanation": "A friendly wave is one possible greeting.",
        "picture": ""
      },
      {
        "prompt": "Does everyone need to speak to greet?",
        "choices": [
          "Yes",
          "No"
        ],
        "answer": 1,
        "explanation": "People may greet through a wave, sign or spoken words.",
        "picture": ""
      }
    ]
  },
  {
    "name": "Turn-taking buddy",
    "icon": "↔",
    "intro": "Zainab wants to look at a book that Bala is using. They can ask and agree on a turn.",
    "questions": [
      {
        "prompt": "What could Zainab ask?",
        "choices": [
          "May I look when you finish?",
          "Give me the book now!"
        ],
        "answer": 0,
        "explanation": "Asking respectfully helps people agree on turns.",
        "picture": ""
      },
      {
        "prompt": "If the book is busy, what can help?",
        "choices": [
          "Ask an adult for another choice",
          "Take the book from Bala"
        ],
        "answer": 0,
        "explanation": "A grown-up can help arrange a turn or find another resource.",
        "picture": ""
      }
    ]
  },
  {
    "name": "Pause explorer",
    "icon": "PAUSE",
    "intro": "A break can help when an activity feels tiring. You can use a word, sign or agreed card.",
    "questions": [
      {
        "prompt": "What can Musa say when tired?",
        "choices": [
          "I need a break",
          "I must never stop"
        ],
        "answer": 0,
        "explanation": "Requesting a pause is okay; an adult can help you take a comfortable break.",
        "picture": ""
      },
      {
        "prompt": "Can a learner point to a pause card?",
        "choices": [
          "Yes",
          "No"
        ],
        "answer": 0,
        "explanation": "Pointing, signing and words are all useful ways to ask.",
        "picture": ""
      }
    ]
  },
  {
    "name": "Kindness helper",
    "icon": "HELP",
    "intro": "Books go on their safe shelf. Unknown sharp things should be left to responsible adults.",
    "questions": [
      {
        "prompt": "Where can a finished book go?",
        "choices": [
          "Its agreed shelf",
          "Across the walkway"
        ],
        "answer": 0,
        "explanation": "Keeping shared materials in their agreed place makes the space easier to use.",
        "picture": ""
      },
      {
        "prompt": "Who should handle an unfamiliar sharp object?",
        "choices": [
          "A responsible adult",
          "A child alone"
        ],
        "answer": 0,
        "explanation": "Do not handle an unfamiliar sharp object; ask a trusted adult.",
        "picture": ""
      }
    ]
  }
];
ADVENTURES["primary1-unit-06"]=[
  {
    "name": "Community explorer",
    "icon": "ALL",
    "intro": "Learners, facilitators and helpers may have different roles in a community.",
    "questions": [
      {
        "prompt": "Who belongs in a school community?",
        "choices": [
          "Learners and school helpers",
          "Only one person"
        ],
        "answer": 0,
        "explanation": "Different people contribute to a shared learning space.",
        "picture": ""
      },
      {
        "prompt": "Can people contribute in different ways?",
        "choices": [
          "Yes",
          "No"
        ],
        "answer": 0,
        "explanation": "People have different roles and needs.",
        "picture": ""
      }
    ]
  },
  {
    "name": "Greeting detective",
    "icon": "Aa",
    "intro": "People can greet respectfully through words, gestures or agreed communication aids.",
    "questions": [
      {
        "prompt": "Which is an appropriate greeting in some settings?",
        "choices": [
          "A friendly wave",
          "Making fun of a person"
        ],
        "answer": 0,
        "explanation": "Friendly waves are a respectful option in many settings.",
        "picture": ""
      },
      {
        "prompt": "Do all families use exactly the same greeting?",
        "choices": [
          "No",
          "Yes"
        ],
        "answer": 0,
        "explanation": "Customs and accessibility needs differ.",
        "picture": ""
      }
    ]
  },
  {
    "name": "Safe walkway",
    "icon": "PATH",
    "intro": "An agreed rule keeps walkways clear so everyone can move through.",
    "questions": [
      {
        "prompt": "Why keep a walkway clear?",
        "choices": [
          "To help people move safely",
          "To store books on the floor"
        ],
        "answer": 0,
        "explanation": "A clear walkway supports safe access.",
        "picture": ""
      },
      {
        "prompt": "Whose access matters?",
        "choices": [
          "Everyone's",
          "Only the fastest learners'"
        ],
        "answer": 0,
        "explanation": "Rules should support different people, including mobility-aid users.",
        "picture": ""
      }
    ]
  },
  {
    "name": "Fair-turn detective",
    "icon": "↔",
    "intro": "A shared book is in use. Ask for a turn or adult support rather than taking it.",
    "questions": [
      {
        "prompt": "Before moving someone's belongings, we should...",
        "choices": [
          "Ask permission",
          "Take them without asking"
        ],
        "answer": 0,
        "explanation": "Respect ownership and consult an adult if needed.",
        "picture": ""
      },
      {
        "prompt": "If two children need one book, what can help?",
        "choices": [
          "Agree on turns or find another copy",
          "Push for it"
        ],
        "answer": 0,
        "explanation": "Working together can make participation fairer.",
        "picture": ""
      }
    ]
  },
  {
    "name": "Book-care explorer",
    "icon": "BOOK",
    "intro": "Shared learning materials need careful handling and agreed storage.",
    "questions": [
      {
        "prompt": "If a book is torn, what should a learner do?",
        "choices": [
          "Tell a responsible adult",
          "Hide the damage"
        ],
        "answer": 0,
        "explanation": "Adults can help decide how to repair or replace it.",
        "picture": ""
      },
      {
        "prompt": "Which place better protects a book?",
        "choices": [
          "A dry agreed shelf",
          "A wet floor"
        ],
        "answer": 0,
        "explanation": "An agreed dry storage area helps protect paper books.",
        "picture": ""
      }
    ]
  },
  {
    "name": "Trusted-help explorer",
    "icon": "HELP",
    "intro": "An unknown bottle or object is not for children to open, taste or touch.",
    "questions": [
      {
        "prompt": "Should a child open an unknown bottle?",
        "choices": [
          "No",
          "Yes"
        ],
        "answer": 0,
        "explanation": "Leave unknown substances alone and seek a responsible adult.",
        "picture": ""
      },
      {
        "prompt": "If worried, who can a learner ask?",
        "choices": [
          "An available trusted adult",
          "Nobody"
        ],
        "answer": 0,
        "explanation": "Ask an available trusted adult for support.",
        "picture": ""
      }
    ]
  }
];
