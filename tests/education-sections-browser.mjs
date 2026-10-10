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
    await page.getByRole('heading',{name:'No courses ready for this class yet'}).waitFor();
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
