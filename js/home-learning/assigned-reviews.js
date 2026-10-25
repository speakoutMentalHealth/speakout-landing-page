const status=document.getElementById('status'),container=document.getElementById('assignments');
let generation=0;
const element=(tag,value)=>{const n=document.createElement(tag);n.textContent=value;return n};
try{
 const [{auth,db},{onAuthStateChanged},{doc,getDocFromServer,collection,query,where,getDocs,serverTimestamp,setDoc}]=await Promise.all([
 import('../firebase-config.js'),
 import('https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js'),
 import('https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js')
 ]);
 onAuthStateChanged(auth,async user=>{
  const token=++generation;container.replaceChildren();
  if(!user){status.replaceChildren(element('span','Please '));const link=element('a','sign in with an approved teacher account');link.href='auth/auth.html#login';status.append(link);return}
  status.textContent='Verifying teacher access…';
  try{
   const profile=await getDocFromServer(doc(db,'users',user.uid));
   if(token!==generation||auth.currentUser?.uid!==user.uid)return;
   if(!profile.exists()||profile.data().status!=='approved'||profile.data().role!=='teacher'){status.textContent='This workspace requires an approved teacher account.';return}
   const assignments=await getDocs(query(collection(db,'homeLearningReviewerAssignments'),where('reviewerUid','==',user.uid)));
   if(token!==generation||auth.currentUser?.uid!==user.uid)return;
   status.textContent=assignments.size+' assigned review'+(assignments.size===1?'':'s')+' found.';
   for(const snapshot of assignments.docs){
    const data=snapshot.data(),id=snapshot.id;
    const card=element('article','');card.className='item';
    card.append(element('small','Assignment ID: '+id),element('h2','Resource: '+String(data.resourceId||'Unknown')),element('p','Version: '+String(data.resourceVersion||'Unknown')));
    const existing=await getDocFromServer(doc(db,'homeLearningReviewSubmissions',id));
    if(token!==generation||auth.currentUser?.uid!==user.uid)return;
    if(existing.exists()){card.append(element('p','Findings submitted for independent verification. This assignment is locked.'));container.append(card);continue}
    const form=document.createElement('form'),label=element('label','Review findings and curriculum evidence');label.htmlFor='findings-'+id;
    const textarea=document.createElement('textarea');textarea.id=label.htmlFor;textarea.required=true;textarea.minLength=10;textarea.maxLength=4000;textarea.placeholder='Describe the curriculum source and edition, accuracy checks, accessibility, safeguarding, licensing, and any corrections needed.';
    const button=element('button','Submit findings for verification');button.type='submit';
    const message=element('p','');message.setAttribute('role','status');message.setAttribute('aria-live','polite');
    form.append(label,textarea,button,message);
    form.addEventListener('submit',async event=>{
     event.preventDefault();if(!form.reportValidity()||button.disabled||auth.currentUser?.uid!==user.uid||token!==generation)return;
     button.disabled=true;message.textContent='Submitting immutable review findings…';
     try{
      await setDoc(doc(db,'homeLearningReviewSubmissions',id),{reviewerUid:user.uid,resourceId:data.resourceId,resourceVersion:data.resourceVersion,reviewStatus:'submitted_for_verification',findings:textarea.value.trim(),submittedAt:serverTimestamp()});
      if(token!==generation)return;
      form.replaceWith(element('p','Submitted for independent editorial verification. No approval has been granted.'));
     }catch{if(token===generation){message.textContent='Submission was not confirmed. Check your connection and retry.';button.disabled=false}}
    });
    card.append(form);container.append(card);
   }
  }catch{if(token===generation){container.replaceChildren();status.textContent='Unable to verify assignments. Please retry later. No data has been submitted.'}}
 });
}catch{status.textContent='The secure review service is unavailable. Please retry later.'}
