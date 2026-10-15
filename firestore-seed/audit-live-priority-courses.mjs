// Read-only comparison of six canonical internal SpeakHub courses against Firestore.
// Usage: FIREBASE_TOKEN=<access token> node firestore-seed/audit-live-priority-courses.mjs
// Does not write to Firestore, log bearer tokens, or retrieve student records.
import {readFile} from 'node:fs/promises';
const projectId=process.env.FIREBASE_PROJECT_ID || 'speaakout-portal';
const token=process.env.FIREBASE_TOKEN;
if(!token) throw new Error('FIREBASE_TOKEN is required (read-only Firestore access).');
const expected=JSON.parse(await readFile(new URL('./priority-courses.json',import.meta.url),'utf8'))
  .filter(c=>c.courseType==='internal');
if(expected.length!==6) throw new Error('Unexpected internal source inventory count; review before audit.');
const decode=v=>{
  if(!v||'nullValue' in v)return null;
  if('stringValue' in v)return v.stringValue;
  if('integerValue' in v)return Number(v.integerValue);
  if('doubleValue' in v)return v.doubleValue;
  if('booleanValue' in v)return v.booleanValue;
  if('arrayValue' in v)return (v.arrayValue.values||[]).map(decode);
  if('mapValue' in v)return Object.fromEntries(Object.entries(v.mapValue.fields||{}).map(([k,val])=>[k,decode(val)]));
  return null;
};
const base=`https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents`;
const result=[];
for(const local of expected){
  const url=`${base}/courses/${encodeURIComponent(local.id)}`;
  const response=await fetch(url,{headers:{authorization:`Bearer ${token}`}});
  if(response.status===404){result.push({id:local.id,state:'missing',expectedModules:local.modules.length,expectedLessons:local.lessonCount});continue;}
  if(!response.ok)throw new Error(`Firestore read failed for ${local.id}: HTTP ${response.status}`);
  const doc=await response.json();
  const fields=Object.fromEntries(Object.entries(doc.fields||{}).map(([k,v])=>[k,decode(v)]));
  const modules=Array.isArray(fields.modules)?fields.modules:[];
  const lessonCount=modules.reduce((n,m)=>n+(Array.isArray(m.lessons)?m.lessons.length:0),0);
  const final=fields.finalAssessment||fields.finalQuiz||null;
  const hasExposedQuestions=modules.some(m=>Array.isArray(m.quiz?.questions)&&m.quiz.questions.length>0)||
    Array.isArray(final?.questions)&&final.questions.length>0;
  const expectedFinal=local.finalAssessment?.questionCount??null;
  const observedFinal=typeof final?.questionCount==='number'?final.questionCount:
    Array.isArray(final?.questions)?final.questions.length:null;
  const issues=[];
  if(modules.length!==local.modules.length)issues.push('module_count_mismatch');
  if(lessonCount!==local.lessonCount)issues.push('lesson_count_mismatch');
  if(expectedFinal!==observedFinal)issues.push('final_assessment_count_mismatch');
  if(hasExposedQuestions)issues.push('answers_present_in_course_document');
  result.push({id:local.id,state:issues.length?'review_needed':'metadata_matches',expectedModules:local.modules.length,liveModules:modules.length,expectedLessons:local.lessonCount,liveLessons:lessonCount,expectedFinalQuestions:expectedFinal,liveFinalQuestions:observedFinal,assessmentSecurityVersion:fields.assessmentSecurityVersion??null,issues});
}
console.log(JSON.stringify({projectId,mode:'READ_ONLY',checked:result.length,summary:{matches:result.filter(x=>x.state==='metadata_matches').length,missing:result.filter(x=>x.state==='missing').length,needsReview:result.filter(x=>x.state==='review_needed').length},results:result},null,2));
console.error('Read-only metadata check complete; secure assessment store, learner permissions and live scoring still need separate authorised tests.');
