import assert from "node:assert/strict";
import { chromium } from "playwright";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";

const require = createRequire(import.meta.url);
const base = process.env.PORTAL_BASE_URL || "http://127.0.0.1:4173";
const evidence = "artifacts/education-sections";
await mkdir(evidence, { recursive: true });
const browser = await chromium.launch();
const editorial = "This reviewed test course teaches a clear subject through structured learning activities with practical exercises and reflection. Learners work through a sequence of examples, check their understanding and apply ideas at an appropriate academic level. The course is delivered by a test provider and its own enrolment requirements apply. Teachers should review the material before using it with a class. This fixture exists only for browser verification and does not represent published curriculum or a real provider endorsement.";
const course = (id, stages, classes = []) => ({ id, title: id, educationStages: stages, classLevels: classes, status: "active", category: "digital-skills", courseType: "external", provider: "Test provider", externalUrl: "https://example.test/course", description: editorial });
const book = (id, stages, classes = []) => ({ id, title: id, educationStages: stages, classLevels: classes, status: "active", category: "reading", author: "Test author", coverUrl: "images/logo.png", shortDescription: "A browser fixture, not a published school textbook.", chapters: [1,2,3].map(i => ({title:`Chapter ${i}`,content:"A meaningful test reading passage. ".repeat(200)})) });
const courses = [course("Primary 2 course", ["primary"], ["Primary 2"]), course("Primary 3 course", ["primary"], ["Primary 3"]), course("Primary shared course", ["primary"]), course("Secondary course", ["secondary"]), course("Tertiary course", ["tertiary"]), { ...course("Unclassified course", []), audience: "student" }, { ...course("Draft course", ["primary"]), status: "draft" }];
const books = [book("Primary 2 material", ["primary"], ["Primary 2"]), book("Primary 3 material", ["primary"], ["Primary 3"]), book("Secondary material", ["secondary"])];
courses[0].contentTrack='school-curriculum';courses[0].curriculumAlignment='verified';
courses[2].contentTrack='supplementary';books[0].contentTrack='supplementary';
async function setup(options = {}, width = 390, hash = "") {
  const context = await browser.newContext({ viewport: { width, height: 844 } });
  await context.addInitScript(data => { window.fixture = data; window.writes = []; }, { courses: options.withdrawCourse ? [...courses, { id: "harvard-cs50-scratch", status: "draft" }] : courses, books, profile: { role:"student", status:"approved", schoolId:"", schoolCode:"", ...options.profile }, preference: options.preference || null, failSave: options.failSave || false, failCourses: options.failCourses || false });
  await context.route("**/launch-role-guard.js", route => route.fulfill({contentType:"application/javascript",body:`export function renderRoleNav(){document.getElementById('roleNav').innerHTML='<a href="student-dashboard.html">Dashboard</a>'} export function requireRoles(roles,callback){if(window.fixture.profile.status==='approved')callback({uid:'fixture-user'},window.fixture.profile);else location.href='/auth.html'}` }));
  await context.route("**/firebase-config.js", route => route.fulfill({contentType:"application/javascript",body:"export const db={};"}));
  await context.route("**/firebase-firestore.js", route => route.fulfill({contentType:"application/javascript",body:`export const doc=(_db,path,id)=>({path,id});export const collection=(_db,path)=>({path});export const serverTimestamp=()=> 'server-time';export async function getDoc(ref){const value=window.fixture.preference;return{exists:()=>Boolean(value),data:()=>value}};export async function setDoc(ref,value){if(window.fixture.failSave)throw Error('save failed');window.writes.push({ref,value});window.fixture.preference=value};export async function getDocs(ref){if(window.fixture.failCourses&&ref.path==='courses')throw Error('offline');const data=ref.path==='courses'?window.fixture.courses:window.fixture.books;return{forEach:callback=>data.forEach(item=>callback({id:item.id,data:()=>item}))}};` }));
  const page = await context.newPage();
  await page.goto(`${base}/my-learning.html${hash}`);
  await page.getByText(options.preference || options.profile?.classLevel || hash.includes("?stage=") ? "Your learning section is ready." : "Choose your education level and class to get started.", { exact:true }).waitFor();
  return { context, page };
}
const reports = [];
try {
  for(const width of [320,390,768,1280]) {
    const {context,page}=await setup({},width,'?stage=nursery');
    assert.equal(await page.getByRole('link',{name:'Open learning unit',exact:true}).count(),5);
    await page.getByRole('heading',{name:'Patterns and Little Stories',exact:true}).waitFor();
    await page.getByRole('heading',{name:'Little World Explorers',exact:true}).waitFor();
    await page.getByRole('heading',{name:'Make, Move and Tell',exact:true}).waitFor();
    await page.getByRole('heading',{name:'Talk, Listen and Tell',exact:true}).waitFor();
    await page.getByRole('radio',{name:'Primary',exact:true}).check();
    await page.getByLabel('Class / level',{exact:true}).selectOption('Primary 1');
    await page.getByRole('heading',{name:'Stories, Sounds and Numbers to Ten',exact:true}).waitFor();
    await page.getByRole('heading',{name:'Observe, Compare and Care',exact:true}).waitFor();
    await page.getByRole('heading',{name:'Our Creative Workshop',exact:true}).waitFor();
    await page.getByRole('heading',{name:'Read, Ask and Solve',exact:true}).waitFor();
    await page.getByLabel('Class / level',{exact:true}).selectOption('Primary 2');
    assert.equal(await page.getByRole('heading',{name:'Stories, Sounds and Numbers to Ten',exact:true}).count(),0);
    assert.equal(await page.getByRole('heading',{name:'Observe, Compare and Care',exact:true}).count(),0);
    assert.equal(await page.getByRole('heading',{name:'Our Creative Workshop',exact:true}).count(),0);
    assert.equal(await page.getByRole('heading',{name:'Read, Ask and Solve',exact:true}).count(),0);
    for(const id of ['nursery-unit-02','primary1-unit-02','nursery-unit-03','primary1-unit-03','nursery-unit-04','primary1-unit-04','nursery-unit-05','primary1-unit-05']) {
      await page.goto(`${base}/kiddies-unit.html?id=${id}`);
      const unitNumber=Number(id.slice(-2));
      await page.getByText(`Unit ${unitNumber} · suggested learning sequence`,{exact:true}).waitFor();
      assert.equal(await page.locator('#unitSequence a').count(),5);
      const adventures=(await import('../js/kiddies-adventures.js')).ADVENTURES[id];
      for(let i=0;i<adventures.length;i++) {
        await page.locator('.journey-stop').nth(i).click();
        if(i===adventures.length-1||id.endsWith('04')||id.endsWith('05')) {
          await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
          assert.deepEqual(await page.evaluate(async()=>{const r=await axe.run(document.querySelector('main'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa']}});return r.violations.map(v=>v.id)}),[],`Unit accessibility ${id} lesson ${i+1} at ${width}`);
          assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
          await page.screenshot({path:`${evidence}/${id}-practice-${width}.png`,fullPage:true});
          if(id==='primary1-unit-02')assert.equal(await page.locator('.circle-row .counting-circle').count(),7);
          else if(id==='nursery-unit-02')assert.equal(await page.locator('.pattern-shape').count(),4);
        }
        if(adventures[i].creativeBoard){
          await page.getByRole('button',{name:'Make your own design',exact:true}).click();assert.equal(await page.evaluate(()=>document.activeElement.id),'studioHeading');
          const studio=page.locator('#creativeStudio');await studio.getByRole('heading',{name:'Your shape studio'}).waitFor();
          assert.equal(await studio.locator('.studio-space').count(),9);const starsBefore=await page.locator('#explorationCount').textContent();
          await studio.getByRole('button',{name:'Space 1: empty',exact:true}).focus();await page.keyboard.press('Enter');
          await studio.getByRole('button',{name:'Square',exact:true}).click();await studio.getByRole('button',{name:'Space 2: empty',exact:true}).click();
          await studio.getByRole('button',{name:'Line',exact:true}).click();await studio.getByRole('button',{name:'Space 3: empty',exact:true}).click();
          await studio.getByRole('button',{name:'Erase',exact:true}).click();await studio.getByRole('button',{name:'Space 2: Square',exact:true}).click();
          await studio.getByRole('button',{name:'Undo last change',exact:true}).click();await studio.getByRole('button',{name:'Space 2: Square',exact:true}).waitFor();
          await studio.getByRole('button',{name:'Clear this design',exact:true}).click();assert.equal(await studio.locator('.studio-shape').count(),0);
          await studio.getByRole('button',{name:'Undo last change',exact:true}).click();assert.equal(await studio.locator('.studio-shape').count(),3);
          assert.equal(await page.locator('#explorationCount').textContent(),starsBefore);
          await page.locator('.journey-stop').first().click();assert.equal(await studio.isVisible(),false);await page.locator('.journey-stop').nth(i).click();
          assert.equal(await studio.locator('.studio-shape').count(),3);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
          await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});assert.deepEqual(await page.evaluate(async()=>{const r=await axe.run(document.querySelector('#creativeStudio'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa']}});return r.violations.map(v=>v.id)}),[]);
          await studio.screenshot({path:`${evidence}/${id}-studio-${i}-${width}.png`});
          await page.emulateMedia({media:'print'});assert.equal(await studio.isVisible(),false);assert.equal(await page.locator('.studio-launch').isVisible(),false);await page.waitForFunction(()=>document.querySelector('.teaching-notes')?.open===true);assert.equal(await page.locator('.teaching-notes').evaluate(el=>el.open),true);await page.emulateMedia({media:'screen'});assert.equal(await studio.isVisible(),true);
        }
        for(let j=0;j<adventures[i].questions.length;j++){
          const question=adventures[i].questions[j];
          if(id.endsWith('05')){
            if(question.picture?.type==='position'){
              const geometry=await page.locator('.position-picture').evaluate(el=>{const book=el.querySelector('.position-book').getBoundingClientRect(),table=el.querySelector('.position-table').getBoundingClientRect();return{bookTop:book.top,bookBottom:book.bottom,tableTop:table.top,tableBottom:table.bottom};});
              if(question.picture.position==='on')assert.ok(Math.abs(geometry.bookBottom-geometry.tableTop)<1);else{assert.ok(geometry.bookTop>geometry.tableTop);assert.ok(geometry.bookBottom<geometry.tableBottom);}
              assert.match(await page.locator('.position-picture').getAttribute('aria-label'),question.picture.position==='on'?/rests on/:/beneath/);
              await page.screenshot({path:`${evidence}/${id}-position-${j}-${width}.png`,fullPage:true});
            }
            if(question.picture?.type==='number-strip'){
              assert.deepEqual(await page.locator('.number-token').allTextContents(),Array.from({length:11},(_,n)=>String(n)));
              assert.equal(await page.locator('.start-number').textContent(),String(question.picture.start));
              assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
              await page.screenshot({path:`${evidence}/${id}-number-order-${j}-${width}.png`,fullPage:true});
            }
            if(question.picture?.type==='groups'){
              assert.equal(await page.locator('.counting-circle').count(),question.picture.counts.reduce((a,b)=>a+b,0));
              assert.equal(await page.locator('.crossed-circle').count(),question.picture.removed||0);
            }
            if(j===0){const before=await page.locator('#explorationCount').textContent();await page.getByRole('button',{name:question.choices[(question.answer+1)%question.choices.length],exact:true}).click();await page.locator('#gameFeedback.retry').waitFor();assert.equal(await page.locator('#explorationCount').textContent(),before);}
          }
          if(id==='primary1-unit-03'&&i===4){assert.equal(await page.locator('.comparison-strip').count(),2);const sizes=await page.locator('.comparison-strip').evaluateAll(els=>els.map(el=>({width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height,left:el.getBoundingClientRect().left})));assert.equal(sizes[0].left,sizes[1].left);if(j===0)assert.ok(sizes[1].width>sizes[0].width);else{assert.equal(sizes[0].width,sizes[1].width);assert.ok(sizes[1].height>sizes[0].height);}await page.screenshot({path:`${evidence}/${id}-comparison-${j}-${width}.png`,fullPage:true});}
          if(question.picture?.type==='lines')assert.equal(await page.locator('.line-example svg').count(),2);
          if(question.picture?.type==='rhythm'){assert.equal(await page.locator('.rhythm-position').count(),4);assert.equal(await page.locator('.pause-position').count(),id.startsWith('nursery')?2:1);}
          if(id.endsWith('03')&&question.picture?.type==='plant')assert.equal(await page.locator('.plant-leaf').count(),2);
          await page.getByRole('button',{name:question.choices[question.answer],exact:true}).click();
          if(id==='primary1-unit-02'&&i===5&&j===1)assert.equal(await page.locator('.crossed-circle').count(),2);
          await page.getByRole('button',{name:j+1===adventures[i].questions.length?'Collect my exploration star':'Next activity',exact:true}).click();
        }
      }
      await page.getByText(`${adventures.length} of ${adventures.length} exploration stars`,{exact:true}).waitFor();
      if(id.endsWith('05')){
        await page.goto(`${base}/kiddies-unit.html?id=${id}&mode=materials`);await page.getByRole('heading',{name:id.startsWith('nursery')?'Reusable activity sheet':'English practice sheet',exact:true}).waitFor();
        if(id.startsWith('primary')){assert.equal(await page.locator('#lessonContent p').filter({hasText:/^Task E[1-3]:/}).count(),3);await page.locator('#unitSection').selectOption({label:'Mathematics practice sheet'});assert.equal(await page.locator('#lessonContent p').filter({hasText:/^Task M[1-3]:/}).count(),3);}
        await page.emulateMedia({media:'print'});assert.equal(await page.locator('#lessonContent').isVisible(),true);assert.equal(await page.locator('#playPanel').isVisible(),false);await page.screenshot({path:`${evidence}/${id}-worksheet-${width}.png`,fullPage:true});await page.emulateMedia({media:'screen'});
      }
      if(id.endsWith('03')){await page.goto(`${base}/kiddies-unit.html?id=${id}&mode=materials`);await page.getByRole('heading',{name:id.startsWith('nursery')?'Reusable activity sheet':'Science practice sheet',exact:true}).waitFor();if(id.startsWith('primary'))assert.equal(await page.locator('#lessonContent p').filter({hasText:/^Task S[1-6]:/}).count(),6);await page.emulateMedia({media:'print'});assert.equal(await page.locator('#lessonContent').isVisible(),true);assert.equal(await page.locator('#playPanel').isVisible(),false);await page.screenshot({path:`${evidence}/${id}-worksheet-${width}.png`,fullPage:true});await page.emulateMedia({media:'screen'});}
      if(id.endsWith('04')){
        await page.locator('.journey-stop').nth(1).click();await page.locator('#creativeStudio .studio-shape').first().waitFor();
        await page.reload();await page.getByText(`${adventures.length} of ${adventures.length} exploration stars`,{exact:true}).waitFor();await page.locator('.journey-stop').nth(1).click();assert.equal(await page.locator('#creativeStudio .studio-shape').count(),0);
        assert.equal(await page.evaluate(()=>Object.keys(localStorage).filter(key=>!/speakout-exploration/.test(key)).length),0);
        await page.goto(`${base}/kiddies-unit.html?id=${id}&mode=materials`);await page.getByRole('heading',{name:id.startsWith('nursery')?'Reusable activity sheet':'Creative arts practice sheet',exact:true}).waitFor();
        if(id.startsWith('primary'))assert.equal(await page.locator('#lessonContent p').filter({hasText:/^Task A[1-6]:/}).count(),6);
        await page.emulateMedia({media:'print'});assert.equal(await page.locator('#creativeStudio').isVisible(),false);assert.equal(await page.locator('#playPanel').isVisible(),false);await page.screenshot({path:`${evidence}/${id}-worksheet-${width}.png`,fullPage:true});await page.emulateMedia({media:'screen'});
      }
      await page.getByRole('link',{name:/Unit 1:/}).click();
      await page.getByText(`0 of ${adventures.length} exploration stars`,{exact:true}).waitFor();
      const second=page.getByRole('link',{name:new RegExp(`Unit ${unitNumber}:`)});await second.click();
      await page.getByText(`${adventures.length} of ${adventures.length} exploration stars`,{exact:true}).waitFor();
    }
    assert.equal(await page.evaluate(()=>window.writes.length),0);await context.close();
  }
  for(const width of [320,390,768,1280]) {
    const {context,page}=await setup({},width,'?stage=nursery');
    await page.getByRole('link',{name:'Open learning unit',exact:true}).first().click();
    await page.getByRole('heading',{name:'Lesson 1: Notice and name',exact:true}).waitFor();
    assert.equal(await page.locator('.journey-stop').count(),4);
    await page.getByRole('button',{name:'Cup',exact:true}).click();
    await page.getByText(/Let’s look again/).waitFor();
    assert.equal(await page.getByRole('button',{name:'Next activity',exact:true}).count(),0);
    await page.getByRole('button',{name:'Book',exact:true}).click();
    await page.getByRole('button',{name:'Next activity',exact:true}).click();
    await page.getByRole('button',{name:'A cloth',exact:true}).click();
    await page.getByRole('button',{name:'Collect my exploration star',exact:true}).click();
    await page.getByText('1 of 4 exploration stars',{exact:true}).waitFor();
    await page.reload();await page.getByText('1 of 4 exploration stars',{exact:true}).waitFor();
    await page.getByRole('button',{name:/3. Counting explorer/}).click();
    await page.getByRole('img',{name:'3 circles',exact:true}).waitFor();
    await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
    assert.deepEqual(await page.evaluate(async()=>{const r=await axe.run(document.querySelector('main'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa']}});return r.violations.map(v=>v.id)}),[],`Adventure accessibility at ${width}`);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.screenshot({path:`${evidence}/gamified-nursery-${width}.png`,fullPage:true});
    await page.getByRole('button',{name:'Start a fresh star collection',exact:true}).click();
    await page.getByText('1 of 4 exploration stars',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Confirm: clear this unit’s stars',exact:true}).click();
    await page.getByText('0 of 4 exploration stars',{exact:true}).waitFor();
    if(width===320){
      const nursery=(await import('../js/kiddies-adventures.js')).ADVENTURES['nursery-unit-01'];
      for(let i=0;i<nursery.length;i++){
        await page.getByRole('button',{name:new RegExp(`${i+1}. ${nursery[i].name}`)}).click();
        for(let j=0;j<nursery[i].questions.length;j++){
          const question=nursery[i].questions[j];await page.getByRole('button',{name:question.choices[question.answer],exact:true}).click();
          await page.getByRole('button',{name:j+1===nursery[i].questions.length?'Collect my exploration star':'Next activity',exact:true}).click();
        }
      }
      await page.getByText('4 of 4 exploration stars',{exact:true}).waitFor();
      await page.getByRole('button',{name:/3. Counting explorer/}).click();
    }
    await page.emulateMedia({media:'print'});
    assert.equal(await page.locator('#playPanel').isVisible(),false);
    await page.getByText(/Aim: the learner practises counting/).waitFor({state:'visible'});
    assert.equal(await page.evaluate(()=>window.writes.length),0);
    await context.close();
  }
  {
    const {context,page}=await setup({},390,'?stage=primary&class=Primary%201');
    await page.getByRole('link',{name:'Open learning unit',exact:true}).first().click();
    const adventures=(await import('../js/kiddies-adventures.js')).ADVENTURES['primary1-unit-01'];
    for(let i=0;i<adventures.length;i++) {
      const current=adventures[i];await page.getByRole('button',{name:new RegExp(`${i+1}. ${current.name}`)}).click();
      for(let j=0;j<current.questions.length;j++) {
        const question=current.questions[j];await page.getByRole('button',{name:question.choices[question.answer],exact:true}).click();
        await page.getByRole('button',{name:j+1===current.questions.length?'Collect my exploration star':'Next activity',exact:true}).click();
      }
    }
    await page.getByText('6 of 6 exploration stars',{exact:true}).waitFor();
    await page.getByText('★ Curious Explorer — you explored every activity!',{exact:true}).waitFor();
    await page.screenshot({path:`${evidence}/gamified-primary-complete-390.png`,fullPage:true});
    await context.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw Error('blocked')}}));
    await page.reload();await page.getByText('0 of 6 exploration stars',{exact:true}).waitFor();
    await page.getByRole('button',{name:/1. Story detective/}).click();
    await page.getByRole('button',{name:'Sade',exact:true}).click();await page.getByRole('button',{name:'Next activity',exact:true}).click();
    await page.getByRole('button',{name:'The story does not say',exact:true}).click();await page.getByRole('button',{name:'Collect my exploration star',exact:true}).click();
    await page.getByText('Exploration star added for this visit. Browser storage is unavailable.',{exact:true}).waitFor();
    await context.close();
  }
  {
    const {context,page}=await setup({},390,'?stage=nursery');
    await context.route('**/auth-guard.js',r=>r.fulfill({contentType:'application/javascript',body:''}));
    await context.route('**/protected-page-guard.js',r=>r.fulfill({contentType:'application/javascript',body:''}));
    await page.goto(`${base}/kiddies.html`,{waitUntil:'domcontentloaded'});
    await page.getByRole('link',{name:'Play Our Learning Space',exact:true}).waitFor();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.screenshot({path:`${evidence}/kiddies-adventure-hub-390.png`,fullPage:true});
    await context.close();
  }
  for(const width of [320,390,768,1280]) {
    const {context,page}=await setup({},width,'?stage=nursery');
    await page.getByRole('heading',{name:'Our Learning Space',exact:true}).waitFor();
    await page.getByRole('radio',{name:'Primary',exact:true}).check();
    await page.getByRole('heading',{name:'Words and Numbers Around Us',exact:true}).waitFor();
    assert.equal(await page.getByRole('heading',{name:'Our Learning Space',exact:true}).count(),0);
    await page.getByLabel('Class / level',{exact:true}).selectOption('Primary 2');
    assert.equal(await page.getByRole('heading',{name:'Words and Numbers Around Us',exact:true}).count(),0);
    await page.getByLabel('Class / level',{exact:true}).selectOption('Primary 1');
    await page.getByRole('button',{name:/Materials/}).click();
    await page.getByRole('link',{name:'Open practice materials',exact:true}).first().click();
    await page.getByRole('heading',{name:'English practice sheet',exact:true}).waitFor();
    await page.getByLabel('Choose a lesson or practice sheet').selectOption({label:'Mathematics practice sheet'});
    await page.getByText(/M1 four; M2 zero/).waitFor();
    await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
    assert.deepEqual(await page.evaluate(async()=>{const r=await axe.run(document.querySelector('main'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa']}});return r.violations.map(v=>v.id)}),[]);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.emulateMedia({media:'print'});
    assert.equal(await page.locator('#lessonContent').isVisible(),true);
    assert.equal(await page.locator('.unit-tools').isVisible(),false);
    assert.equal(await page.evaluate(()=>window.writes.length),0);
    await page.screenshot({path:`${evidence}/published-primary-unit-${width}.png`,fullPage:true});
    await context.close();
  }
  {
    const {context,page}=await setup({failCourses:true},390,'?stage=nursery');
    await page.getByRole('heading',{name:'Could not load courses',exact:true}).waitFor();
    await page.getByRole('link',{name:'Open learning unit',exact:true}).first().click();
    await page.getByRole('heading',{name:'Lesson 1: Notice and name',exact:true}).waitFor();
    await page.goto(`${base}/kiddies-unit.html?id=missing`);
    await page.getByText('This learning unit is unavailable. Return to My Learning to choose another.',{exact:true}).waitFor();
    assert.equal(await page.locator('#unitContent').isVisible(),false);
    await context.addInitScript(()=>window.fixture.profile.status='pending');
    await context.route('**/auth.html',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Sign in</title><h1>Sign in</h1>'}));
    await page.goto(`${base}/kiddies-unit.html?id=nursery-unit-01`);
    await page.waitForURL('**/auth.html');
    await context.close();
  }
  for(const width of [320,390,768,1280]){
    const page=await browser.newPage({viewport:{width,height:844}});await page.goto(`${base}/national-curriculum.html`);
    await page.getByRole('heading',{name:'SS 1–3',exact:true}).waitFor();
    assert.equal(await page.locator('#nationalGroups article').count(),4);
    await page.getByText('Business Studies',{exact:true}).waitFor();
    assert.equal(await page.locator('#sharedSubjects li').count(),8);
    assert.match(await page.locator('#nationalGroups article').first().getByRole('link').getAttribute('href'),/stage=primary/);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
    const violations=await page.evaluate(async()=>{const r=await axe.run(document.querySelector('main'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa']}});return r.violations.map(v=>v.id)});
    assert.deepEqual(violations,[],`National guide accessibility at ${width}`);
    await page.emulateMedia({media:'print'});assert.equal(await page.locator('#nationalGroups').isVisible(),true);await page.close();
  }
  for(const kind of ['books','courses']) {
    const context=await browser.newContext();
    const record={id:'track-fixture',title:'Track fixture',status:'draft',educationStages:['primary'],classLevels:['Primary 2'],curriculum:{track:'school-curriculum',status:'mapping-in-progress',mappings:[{chapterId:'chapter-1'}]}};
    await context.addInitScript(record=>{window.editorRecord=record;window.writes=[];},record);
    await context.route('**/launch-role-guard.js',route=>route.fulfill({contentType:'application/javascript',body:'export function requireRoles(roles,callback){window.editorRoles=roles;callback({uid:"fixture-admin"},{role:"admin"})}'}));
    await context.route('**/firebase-config.js',route=>route.fulfill({contentType:'application/javascript',body:'export const db={};export const auth={};'}));
    await context.route('**/firebase-auth.js',route=>route.fulfill({contentType:'application/javascript',body:'export async function signOut(){}'}));
    await context.route('**/js/platform-api.js',route=>route.fulfill({contentType:'application/javascript',body:'export async function adminApi(){throw Error("No external writes in browser fixtures")}' }));
    await context.route('**/firebase-firestore.js',route=>route.fulfill({contentType:'application/javascript',body:`export const doc=(_db,path,id)=>({path,id});export const collection=(_db,path)=>({path});export const serverTimestamp=()=> 'server-time';const snapshot=()=>({id:window.editorRecord.id,exists:()=>true,data:()=>window.editorRecord});export async function getDoc(){return snapshot()};export async function getDocs(){return {forEach:fn=>fn(snapshot())}};export function onSnapshot(ref,callback){callback({forEach:fn=>{if(ref.path==='courses')fn(snapshot())}});return()=>{}};export async function setDoc(ref,value,options){window.writes.push({ref,value,options});window.editorRecord={...window.editorRecord,...value}};export async function updateDoc(){};export function writeBatch(){throw Error('No batch imports in fixture')}`}));
    const page=await context.newPage();await page.goto(`${base}/admin-${kind}.html`);
    if(kind==='courses')await page.getByRole('button',{name:'Existing Courses',exact:true}).click();
    await page.locator('#adminList button').filter({hasText:'Edit'}).click();
    assert.equal(await page.locator('#contentTrack').inputValue(),'school-curriculum');
    await page.locator('#status').selectOption('draft');
    await page.locator('#contentTrack').selectOption('supplementary');
    await page.locator(kind==='books'?'#bookForm button[type=submit]':'#courseForm button[type=submit]').click();
    await page.waitForFunction(()=>window.writes.length===1);
    assert.equal(await page.evaluate(()=>window.editorRecord.contentTrack),'supplementary');
    assert.deepEqual(await page.evaluate(()=>window.editorRecord.curriculum),record.curriculum);
    assert.equal(await page.evaluate(()=>window.writes[0].options.merge),true);
    assert.deepEqual(await page.evaluate(()=>window.editorRoles),['admin','super_admin']);
    await page.locator('#contentTrack').selectOption('');
    await page.locator(kind==='books'?'#bookForm button[type=submit]':'#courseForm button[type=submit]').click();
    await page.waitForFunction(()=>window.writes.length===2);
    assert.equal(await page.evaluate(()=>window.editorRecord.contentTrack),'');
    await context.close();
  }
  for (const width of [320,390,768,1280]) {
    const {context,page} = await setup({preference:{educationStage:"primary",classLevel:"Primary 2"}},width);
    await page.getByRole("heading",{name:"Primary 2 course",exact:true}).waitFor();
    assert.equal(await page.getByRole("heading",{name:"Primary 3 course",exact:true}).count(),0);
    assert.equal(await page.getByRole("heading",{name:"Unclassified course",exact:true}).count(),0);
    await page.getByRole("button",{name:/Materials/}).click();
    await page.getByRole("heading",{name:"Primary 2 material",exact:true}).waitFor();
    assert.equal(await page.getByRole("heading",{name:"Primary 3 material",exact:true}).count(),0);
    await page.addScriptTag({path:require.resolve("axe-core/axe.min.js")});
    const issues = await page.evaluate(async()=>{const result=await window.axe.run(document.querySelector('main'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa']}});return result.violations.map(v=>({id:v.id,impact:v.impact}));});
    assert.deepEqual(issues,[],`Accessibility failed at ${width}px`);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`Horizontal overflow at ${width}px`);
    await page.screenshot({path:`${evidence}/primary-materials-${width}.png`,fullPage:true});
    reports.push({width,accessibilityViolations:issues.length});await context.close();
  }
  {
    const {context,page}=await setup({preference:{educationStage:'primary',classLevel:'Primary 2'}});
    await page.getByLabel('Content type',{exact:true}).selectOption('school-curriculum');
    await page.getByRole('heading',{name:'Primary 2 course',exact:true}).waitFor();
    assert.equal(await page.locator('.learning-card').count(),1);
    await page.getByText('School-curriculum material · alignment not established',{exact:true}).waitFor();
    await page.getByLabel('Content type',{exact:true}).selectOption('supplementary');
    await page.getByRole('heading',{name:'Primary shared course',exact:true}).waitFor();
    assert.equal(await page.getByRole('heading',{name:'Primary 2 course',exact:true}).count(),0);
    await page.getByRole('button',{name:/Materials/}).click();
    await page.getByRole('heading',{name:'Primary 2 material',exact:true}).waitFor();
    await page.getByLabel('Content type',{exact:true}).selectOption('unclassified');
    assert.equal(await page.locator('.learning-card').count(),0);
    await page.getByLabel('Content type',{exact:true}).selectOption('');
    await page.getByRole('heading',{name:'Primary 2 material',exact:true}).waitFor();
    assert.equal(await page.evaluate(()=>window.writes.length),0);await context.close();
  }
  {
    const {context,page}=await setup();
    await page.getByRole('radio',{name:'Nursery',exact:true}).check();await page.getByLabel('Class / level',{exact:true}).selectOption('Nursery 2');
    await page.getByRole('button',{name:'Save as my default'}).click();
    await page.getByText('Your default learning level has been saved.',{exact:true}).waitFor();
    await page.getByRole('heading',{name:'Our Learning Space',exact:true}).waitFor();
    assert.equal(await page.getByRole('heading',{name:'Tertiary course',exact:true}).count(),0);
    assert.equal((await page.evaluate(()=>window.writes))[0].value.educationStage,'nursery');
    await context.close();
  }
  {
    const {context,page}=await setup({profile:{schoolId:'school-a',classLevel:'SS2'},preference:{educationStage:'primary',classLevel:'Primary 2'}});
    await page.getByRole('heading',{name:'Secondary course',exact:true}).waitFor();
    assert.equal(await page.getByLabel('Class / level',{exact:true}).isDisabled(),false);
    assert.equal(await page.getByRole('button',{name:'Save as my default'}).isVisible(),false);
    await page.getByRole('radio',{name:'Primary',exact:true}).check();
    await page.getByLabel('Class / level',{exact:true}).selectOption('Primary 2');
    await page.getByRole('button',{name:'Browse learning',exact:true}).click();
    await page.getByRole('heading',{name:'Primary 2 course',exact:true}).waitFor();
    assert.equal(await page.evaluate(()=>window.fixture.profile.classLevel),'SS2');
    assert.equal(await page.evaluate(()=>window.writes.length),0);
    await context.close();
  }
  {
    const {context,page}=await setup({failSave:true});
    await page.getByRole('radio',{name:'Primary',exact:true}).check();await page.getByLabel('Class / level',{exact:true}).selectOption('Primary 2');await page.getByRole('button',{name:'Save as my default'}).click();
    await page.getByText('Could not save your learning level. Please try again.',{exact:true}).waitFor();
    assert.equal(await page.getByRole('button',{name:'Save as my default'}).isEnabled(),true);assert.equal(await page.locator('#catalogue').isVisible(),true);await context.close();
  }
  {
    const {context,page}=await setup({preference:{educationStage:'primary',classLevel:'Primary 2'},failCourses:true});
    await page.getByRole('heading',{name:'Could not load courses'}).waitFor();await page.getByRole('button',{name:/Materials/}).click();await page.getByRole('heading',{name:'Primary 2 material',exact:true}).waitFor();await context.close();
  }
  {
    const {context,page}=await setup({preference:{educationStage:'primary',classLevel:'Primary 2'}},390,'#materials');
    await page.getByRole('heading',{name:'Primary 2 material',exact:true}).waitFor();await page.getByLabel('Find a subject or title').fill('not-in-the-catalogue');await page.getByRole('heading',{name:'No matching titles'}).waitFor();await context.close();
  }

  {
    const {context,page}=await setup({preference:{educationStage:'primary',classLevel:'Primary 2'}});
    await page.getByRole('radio',{name:'Secondary',exact:true}).check();
    await page.getByRole('button',{name:'Browse learning',exact:true}).click();
    const card=page.locator('.learning-card').filter({has:page.getByRole('heading',{name:'Secondary course',exact:true})});
    await card.waitFor();
    assert.equal(await card.locator('.education-label').textContent(),'Secondary');
    assert.match(await card.getByRole('link',{name:'View course pathway'}).getAttribute('href'),/course-details.html/);
    assert.equal(await page.evaluate(()=>window.fixture.preference.classLevel),'Primary 2');
    assert.equal(await page.evaluate(()=>window.writes.length),0);
    await page.getByRole('button',{name:/Materials/}).click();
    await page.getByRole('heading',{name:'Secondary material',exact:true}).waitFor();
    await context.close();
  }
  for (const stage of ['nursery','primary']) {
    const {context,page}=await setup({profile:{schoolId:'school-a',classLevel:'SS2'}},390,`?stage=${stage}#materials`);
    assert.match(await page.locator('#learningTitle').textContent(),/Kiddies Corner/);
    assert.equal(await page.getByRole('radio',{name:stage==='nursery'?'Nursery':'Primary',exact:true}).isChecked(),true);
    assert.equal(await page.evaluate(()=>window.writes.length),0);
    if(stage==='primary') {
      await page.getByRole('heading',{name:'Primary 3 material',exact:true}).waitFor();
      await page.getByRole('heading',{name:'Primary 2 material',exact:true}).waitFor();
    }
    await context.close();
  }
  for (const withdrawCourse of [false, true]) {
    const {context,page}=await setup({preference:{educationStage:'tertiary',classLevel:'100 Level'},withdrawCourse});
    await page.getByRole('heading',{name:'Tertiary course',exact:true}).waitFor();
    assert.equal(await page.getByRole('heading',{name:'Primary 2 course',exact:true}).count(),0);
    const bundled=page.getByRole('heading',{name:"CS50's Introduction to Programming with Scratch",exact:true});
    if(withdrawCourse) assert.equal(await bundled.count(),0); else await bundled.waitFor();
    await context.close();
  }
  await writeFile(`${evidence}/summary.json`,JSON.stringify({scope:'Mocked Firebase browser checks; live persistence is verified separately by emulator rules tests.',reports},null,2));
  console.log('Education sections: class filtering, open cross-level browsing, school default unchanged, optional saved preference, save failure, partial catalogue failure and responsive accessibility passed.');
} finally { await browser.close(); }
