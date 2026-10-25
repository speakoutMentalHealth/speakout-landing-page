const status=document.getElementById('status'),workspace=document.getElementById('workspace'),form=document.getElementById('assignmentForm'),formStatus=document.getElementById('formStatus'),records=document.getElementById('records'),recordsStatus=document.getElementById('recordsStatus'),applications=document.getElementById('applications'),resourceSelect=document.getElementById('resourceId');
const el=(tag,text)=>{const n=document.createElement(tag);n.textContent=String(text);return n};
let generation=0,activeUser=null,loadRecords=()=>{};
try{
 const [{auth,db},{onAuthStateChanged},{doc,getDocFromServer,getDocs,collection,setDoc,serverTimestamp,query,where}]=await Promise.all([
 import('../firebase-config.js'),import('https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js'),import('https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js')]);
 const catalogResponse=await fetch('data/home-learning-catalog.json',{cache:'no-store'});
 if(!catalogResponse.ok)throw Error('Catalogue unavailable');
 const catalog=await catalogResponse.json();
 if(!Array.isArray(catalog.resources))throw Error('Invalid catalogue');
 const allowedResources=new Set();
 for(const item of catalog.resources){if(typeof item.id!=='string'||!item.id.match(/^[a-z0-9-]{3,90}$/))continue;allowedResources.add(item.id);const option=el('option',item.level+' · '+item.subject+' · '+item.topic);option.value=item.id;resourceSelect.append(option)}
 loadRecords=async token=>{
  records.replaceChildren();applications.replaceChildren();recordsStatus.textContent='Loading restricted editorial records…';
  try{
   const [assigned,submitted,applicants]=await Promise.all([
    getDocs(collection(db,'homeLearningReviewerAssignments')),
    getDocs(collection(db,'homeLearningReviewSubmissions')),
    getDocs(collection(db,'homeLearningReviewerApplications'))]);
   if(token!==generation||auth.currentUser?.uid!==activeUser)return;
   const findings=new Map(submitted.docs.map(s=>[s.id,s.data()]));
   for(const snap of assigned.docs){const data=snap.data(),card=el('article','');card.className='card';card.append(el('h3',data.resourceId||'Resource'),el('small','Assignment: '+snap.id),el('p','Reviewer UID: '+data.reviewerUid),el('p','Version: '+data.resourceVersion));const submittedReview=findings.get(snap.id);if(submittedReview){card.append(el('strong','Submitted for editorial verification'));const detail=el('details','');detail.append(el('summary','Read submitted findings'),el('pre',submittedReview.findings||''));card.append(detail)}else card.append(el('p','Awaiting reviewer submission'));records.append(card)}
   if(assigned.empty)records.append(el('p','No assignments yet.'));
   for(const snap of applicants.docs){const d=snap.data(),card=el('article','');card.className='card';card.append(el('h3',d.displayName||'Applicant'),el('p','Teacher UID: '+snap.id),el('p','Expertise: '+(d.subjectExpertise||'')),el('p','Application status: '+(d.status||'')));const detail=el('details','');detail.append(el('summary','Read applicant experience'),el('p',d.experience||''));card.append(detail);applications.append(card)}
   if(applicants.empty)applications.append(el('p','No reviewer applications yet.'));
   recordsStatus.textContent=assigned.size+' assignments, '+submitted.size+' submissions, '+applicants.size+' applications. Records are read-only here.';
  }catch{if(token===generation)recordsStatus.textContent='Unable to load records. Verify admin permissions and connection.'}
 };
 onAuthStateChanged(auth,async user=>{
  const token=++generation;activeUser=user?.uid||null;workspace.hidden=true;records.replaceChildren();applications.replaceChildren();
  if(!user){status.textContent='Sign in with an approved SpeakOut administrator account.';return}
  status.textContent='Verifying administrator access…';
  try{
   const profile=await getDocFromServer(doc(db,'users',user.uid));
   if(token!==generation||auth.currentUser?.uid!==user.uid)return;
   const d=profile.data();
   if(!profile.exists()||d.status!=='approved'||!['admin','super_admin'].includes(d.role)){status.textContent='Access restricted to approved administrators.';return}
   workspace.hidden=false;status.textContent='Administrator verified. Assignment and review oversight available.';await loadRecords(token);
  }catch{if(token===generation)status.textContent='Could not verify administrator access. Please retry later.'}
 });
 document.getElementById('refresh').addEventListener('click',()=>{if(activeUser&&auth.currentUser?.uid===activeUser)loadRecords(generation)});
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(!form.reportValidity()||!activeUser||auth.currentUser?.uid!==activeUser)return;
  const teacherUid=document.getElementById('teacherUid').value.trim(),resourceId=resourceSelect.value,resourceVersion=document.getElementById('resourceVersion').value.trim(),button=document.getElementById('assignButton');
  if(!/^[A-Za-z0-9_-]{1,128}$/.test(teacherUid)||!allowedResources.has(resourceId)||!resourceVersion||resourceVersion.length>120){formStatus.textContent='Check teacher ID, catalogue resource and version.';return}
  button.disabled=true;formStatus.textContent='Verifying teacher and creating assignment…';
  try{
   const teacher=await getDocFromServer(doc(db,'users',teacherUid));
   if(auth.currentUser?.uid!==activeUser)return;
   if(!teacher.exists()||teacher.data().role!=='teacher'||teacher.data().status!=='approved'){formStatus.textContent='Teacher account is not approved or cannot be verified.';return}
   const assignmentId=resourceId+'__'+teacherUid+'__'+resourceVersion.replace(/[^A-Za-z0-9_-]/g,'-');
   if(assignmentId.length>500)throw Error('Assignment ID too long');
   const reference=doc(db,'homeLearningReviewerAssignments',assignmentId);
   const existing=await getDocFromServer(reference);
   if(existing.exists()){formStatus.textContent='An assignment for this teacher and resource version already exists.';return}
   await setDoc(reference,{reviewerUid:teacherUid,resourceId,resourceVersion,assignedAt:serverTimestamp()});
   formStatus.textContent='Assignment created. The teacher may now submit findings; no content has been approved.';
   await loadRecords(generation);
  }catch{formStatus.textContent='Assignment was not confirmed. Check permissions and retry.'}
  finally{button.disabled=false}
 });
}catch{status.textContent='Editorial administration is temporarily unavailable. No changes have been made.'}
