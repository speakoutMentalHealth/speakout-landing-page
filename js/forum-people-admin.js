import {db} from '../firebase-config.js';
import {requireRoles} from '../launch-role-guard.js';
import {collection,getDocs,doc,runTransaction,serverTimestamp} from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js';
const $=id=>document.getElementById(id);
let people=[],grants=new Map(),selected=new Set(),busy=false;
const eligible=(p,g)=>p.status==='approved'&&(p.role!=='student'||g?.adultStudentVerified===true)&&g?.active===true&&g.adultVerified===true;
const name=p=>p.fullName||[p.firstName,p.lastName].filter(Boolean).join(' ')||p.email||'Unnamed account';
function visible(){const q=$('peopleSearch').value.trim().toLowerCase(),role=$('peopleRole').value;return people.filter(p=>(!role||p.role===role)&&(!q||`${name(p)} ${p.email||''}`.toLowerCase().includes(q)));}
function render(){
 const list=$('peopleList');list.replaceChildren();
 for(const p of visible()){
  const label=document.createElement('label'),box=document.createElement('input'),text=document.createElement('span');
  label.className='check';box.type='checkbox';box.checked=selected.has(p.id);box.disabled=busy||!eligible(p,grants.get(p.id));
  box.addEventListener('change',()=>{box.checked?selected.add(p.id):selected.delete(p.id);$('peopleCount').textContent=selected.size+' selected';});
  text.textContent=`${name(p)} · ${p.email||'No email'} · ${p.role||'Unknown role'}${box.disabled?' · Adult access review required':''}`;
  label.append(box,text);list.append(label);
 }
 $('peopleCount').textContent=selected.size+' selected · '+visible().length+' results';
 if(!visible().length) list.textContent='No matching accounts.';
}
requireRoles(['admin','super_admin'],async actor=>{
 try{
  const [users,access,rooms]=await Promise.all([getDocs(collection(db,'users')),getDocs(collection(db,'forumAccessGrants')),getDocs(collection(db,'forumRooms'))]);
  people=users.docs.map(d=>({...d.data(),id:d.id}));grants=new Map(access.docs.map(d=>[d.id,d.data()]));
  for(const d of rooms.docs){if(d.data().visibility!=='private')continue;const option=document.createElement('option');option.value=d.id;option.textContent=d.data().title+' · '+d.id;$('peopleRoom').append(option);}
  render();
 }catch{$('peopleResult').textContent='Unable to load people or rooms. Reload to retry.';return;}
 $('peopleSearch').addEventListener('input',()=>{selected.clear();render();});
 $('peopleRole').addEventListener('change',()=>{selected.clear();render();});
 $('selectVisible').onclick=()=>{if(busy)return;for(const p of visible())if(eligible(p,grants.get(p.id)))selected.add(p.id);render();};
 $('clearPeople').onclick=()=>{if(busy)return;selected.clear();render();};
 $('addPeople').onclick=async()=>{
  if(busy)return;const roomId=$('peopleRoom').value,ids=[...selected];
  if(!roomId||!ids.length){$('peopleResult').textContent='Choose a room and at least one eligible person.';return;}
  if(!confirm(`Add ${ids.length} selected people to ${$('peopleRoom').selectedOptions[0].textContent}? Existing memberships and moderator roles will be preserved.`))return;
  busy=true;for(const id of ['addPeople','selectVisible','clearPeople','peopleSearch','peopleRole','peopleRoom'])$(id).disabled=true;render();
  let added=0,unchanged=0;const failed=[];
  try{for(const uid of ids){
   try{
    const outcome=await runTransaction(db,async tx=>{
     const userRef=doc(db,'users',uid),grantRef=doc(db,'forumAccessGrants',uid),roomRef=doc(db,'forumRooms',roomId);
     const [u,g,r]=await Promise.all([tx.get(userRef),tx.get(grantRef),tx.get(roomRef)]);
     if(!u.exists()||!g.exists()||!eligible(u.data(),g.data())||!r.exists()||r.data().visibility!=='private')throw Error('Eligibility changed');
     const old=g.data(),roomIds=old.privateRoomIds||[];
     if(roomIds.includes(roomId))return 'unchanged';
     if(roomIds.length>=20)throw Error('Room limit');
     const auditRef=doc(collection(db,'forumGrantAudits')),version=old.version+1,reason='Administrator selected existing verified adult for private room';
     tx.update(grantRef,{privateRoomIds:[...roomIds,roomId],reviewedAt:serverTimestamp(),reviewedBy:actor.uid,version,auditId:auditRef.id,reason});
     tx.set(auditRef,{uid,actorUid:actor.uid,previousActive:old.active,nextActive:old.active,version,changedAt:serverTimestamp(),reason});
     return 'added';
    });
    outcome==='added'?added++:unchanged++;selected.delete(uid);
   }catch{failed.push(uid);}
   $('peopleResult').textContent=`${added} added · ${unchanged} already members · ${failed.length} failed. Processing…`;
  }}finally{
   busy=false;for(const id of ['addPeople','selectVisible','clearPeople','peopleSearch','peopleRole','peopleRoom'])$(id).disabled=false;render();
   $('peopleResult').textContent=`${added} added · ${unchanged} already members · ${failed.length} failed. Failed selections remain selected for retry. Room publication is unchanged.`;
  }
 };
});
