import { db } from './firebase-config.js';
import { collection, doc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js';

const form=document.getElementById('otmForm');
const message=document.getElementById('formMessage');
const submit=document.getElementById('submitBtn');
const preferredDate=form?.elements?.preferredDate;
const alternativeDate=form?.elements?.alternativeDate;
const today=new Date(); today.setMinutes(today.getMinutes()-today.getTimezoneOffset());
const todayIso=today.toISOString().slice(0,10);
if(preferredDate) preferredDate.min=todayIso;
if(alternativeDate) alternativeDate.min=todayIso;

function clean(value,max=1500){return String(value||'').trim().slice(0,max);}
function makeId(){
  const date=new Date().toISOString().slice(0,10).replaceAll('-','');
  const bytes=new Uint8Array(4); crypto.getRandomValues(bytes);
  const suffix=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('').toUpperCase();
  return `SOM-${date}-${suffix}`;
}
function validateDates(){
  if(preferredDate?.value && preferredDate.value<todayIso){preferredDate.setCustomValidity('Please choose today or a future date.');return false;}
  preferredDate?.setCustomValidity('');
  if(alternativeDate?.value && alternativeDate.value<todayIso){alternativeDate.setCustomValidity('Please choose today or a future date.');return false;}
  alternativeDate?.setCustomValidity('');
  if(preferredDate?.value && alternativeDate?.value && preferredDate.value===alternativeDate.value){alternativeDate.setCustomValidity('Please choose a different alternative date.');return false;}
  return true;
}
preferredDate?.addEventListener('change',validateDates); alternativeDate?.addEventListener('change',validateDates);

form?.addEventListener('submit',async(event)=>{
  event.preventDefault();
  if(!validateDates()||!form.reportValidity()) return;
  submit.disabled=true; submit.setAttribute('aria-busy','true'); message.textContent='Submitting your request…'; message.className='form-message';
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
    form.reset(); message.className='form-message success'; message.innerHTML=`Request received. Your application reference is <strong>${id}</strong>. Please save this reference. Our team will review your request before any program is confirmed.`; message.scrollIntoView({behavior:'smooth',block:'center'});
  }catch(error){
    console.error('On The Move submission failed',error); message.className='form-message error'; message.textContent='We could not submit your request right now. Your information has not been confirmed as received. Please try again later or contact SpeakOut through our main website.';
  }finally{submit.disabled=false; submit.removeAttribute('aria-busy');}
});