import { db } from './firebase-config.js';
import { collection, doc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js';

const form=document.getElementById('otmForm');
const message=document.getElementById('formMessage');
const submit=document.getElementById('submitBtn');

function clean(value,max=1500){return String(value||'').trim().slice(0,max);}
function makeId(){
  const date=new Date().toISOString().slice(0,10).replaceAll('-','');
  const bytes=new Uint8Array(4); crypto.getRandomValues(bytes);
  const suffix=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('').toUpperCase();
  return `SOM-${date}-${suffix}`;
}

form?.addEventListener('submit',async(event)=>{
  event.preventDefault();
  if(!form.reportValidity()) return;
  submit.disabled=true; message.textContent='Submitting your request…'; message.className='form-message';
  const fd=new FormData(form); const id=makeId();
  const data={
    applicationId:id,
    organizationName:clean(fd.get('organizationName'),120), organizationType:clean(fd.get('organizationType'),80), website:clean(fd.get('website'),250),
    country:clean(fd.get('country'),80), state:clean(fd.get('state'),80), city:clean(fd.get('city'),100),
    contactName:clean(fd.get('contactName'),120), contactRole:clean(fd.get('contactRole'),100), email:clean(fd.get('email'),160).toLowerCase(), phone:clean(fd.get('phone'),40),
    program:clean(fd.get('program'),100), audience:clean(fd.get('audience'),120), ageRange:clean(fd.get('ageRange'),60), expectedReach:Number(fd.get('expectedReach')),
    reason:clean(fd.get('reason')), needs:clean(fd.get('needs')), preferredDate:clean(fd.get('preferredDate'),10), alternativeDate:clean(fd.get('alternativeDate'),10),
    venue:clean(fd.get('venue'),40), logistics:clean(fd.get('logistics'),60), facilities:clean(fd.get('facilities'),300), funding:clean(fd.get('funding'),100),
    clubInterest:clean(fd.get('clubInterest'),20), partnershipInterest:clean(fd.get('partnershipInterest'),20),
    declaration:fd.get('declaration')==='on', status:'new', source:'on-the-move-web', createdAt:serverTimestamp(), updatedAt:serverTimestamp()
  };
  try{
    await setDoc(doc(collection(db,'onTheMoveApplications'),id),data);
    form.reset(); message.className='form-message success'; message.innerHTML=`Request received. Your application reference is <strong>${id}</strong>. Please keep this reference. Submission does not constitute program confirmation.`;
  }catch(error){
    console.error('On The Move submission failed',error); message.className='form-message error'; message.textContent='We could not submit your request right now. Please try again later or contact SpeakOut.';
  }finally{submit.disabled=false;}
});