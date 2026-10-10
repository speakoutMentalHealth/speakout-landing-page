import { db } from '../../firebase-config.js';
import { doc, runTransaction, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js';
import { createKiddiesDrafts } from '../kiddies-starter-pack.js';
export function initialiseKiddiesDraftImport() {
const button=document.getElementById('importDrafts'),status=document.getElementById('importStatus');
button.disabled=false;status.textContent='Administrator verified. Importing creates drafts only.';
button.addEventListener('click',async()=>{
 if(!confirm('Create two activity books and two course outlines as drafts? Nothing will be published. Existing starter IDs will stop the whole import.'))return;
 button.disabled=true;status.textContent='Validating and importing draft records…';
 try {
  const response=await fetch('firestore-seed/kiddies-starter-pack.json',{cache:'no-store'});if(!response.ok)throw Error('Could not load the draft pack.');
  const result=await createKiddiesDrafts(await response.json(),{db,doc,runTransaction,serverTimestamp});
  status.textContent=`Created ${result.books} draft books and ${result.courses} course outlines. Nothing was published.`;
 }catch(error){status.textContent=error.message||'Draft import failed. Nothing was published.';}
 finally{button.disabled=false;}
});

}
