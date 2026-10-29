import {db} from '../firebase-config.js';
import {doc,collection,runTransaction,serverTimestamp} from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js';
// Called only by the administrator's single account review. No self-service grants.
export async function approveAccount(uid,actorUid,adultConfirmed){
 await runTransaction(db,async tx=>{
  const userRef=doc(db,'users',uid),grantRef=doc(db,'forumAccessGrants',uid);
  const [user,grant]=await Promise.all([tx.get(userRef),tx.get(grantRef)]);
  if(!user.exists())throw Error('Account no longer exists');
  const old=grant.exists()?grant.data():null;
  tx.update(userRef,{status:'approved',updatedAt:serverTimestamp()});
  if(!adultConfirmed)return;
  const auditRef=doc(collection(db,'forumGrantAudits')),version=(old?.version||0)+1;
  const reason='Adult eligibility confirmed during account approval';
  const next={uid,active:true,adultVerified:true,adultStudentVerified:user.data().role==='student',memberRole:old?.memberRole||'member',privateRoomIds:old?.privateRoomIds||[],moderatedRoomIds:old?.moderatedRoomIds||[],createdAt:old?.createdAt||serverTimestamp(),reviewedAt:serverTimestamp(),reviewedBy:actorUid,version,auditId:auditRef.id,reason};
  tx.set(grantRef,next);
  tx.set(auditRef,{uid,actorUid,previousActive:old?.active||false,nextActive:true,version,changedAt:serverTimestamp(),reason});
 });
}
