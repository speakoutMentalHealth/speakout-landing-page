import {before,after,beforeEach,test} from 'node:test';
import {readFileSync} from 'node:fs';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {collection,doc,getDoc,getDocs,query,where,setDoc,updateDoc,deleteDoc,serverTimestamp} from 'firebase/firestore';
const projectId='demo-kiddies-tv-admin';
let env;
const sample=(status='draft')=>({
 youtubeId:'G0F2PiVP_FI',title:'Africa Countries for Kids',description:'Children explore the countries of Africa through music and maps.',
 source:'Bino and Fino',category:'Geography & Culture',ages:['6-9'],status,
 approved:status==='published',reviewConfirmed:status==='published',
 reviewer:status==='published'?'SpeakOut editor':'',reviewDate:status==='published'?'2026-11-01':'',
 createdAt:'2026-11-01T12:00:00.000Z',updatedAt:'2026-11-01T12:00:00.000Z',
 createdBy:'admin-k',updatedBy:'admin-k'
});
before(async()=>{env=await initializeTestEnvironment({projectId,firestore:{rules:readFileSync('firebase/firestore.rules','utf8')}});});
after(async()=>{await env.cleanup();});
beforeEach(async()=>{
 await env.clearFirestore();
 await env.withSecurityRulesDisabled(async c=>{
  await setDoc(doc(c.firestore(),'users/admin-k'),{uid:'admin-k',role:'super_admin',status:'approved',approved:true,email:'admin@example.test'});
  await setDoc(doc(c.firestore(),'users/student-k'),{uid:'student-k',role:'student',status:'approved',approved:true,email:'student@example.test'});
 });
});
test('Public can read only published Kiddies TV documents; not drafts or archives',async()=>{
 const admin=env.authenticatedContext('admin-k').firestore();
 await assertSucceeds(setDoc(doc(admin,'kiddiesTvVideos/G0F2PiVP_FI'),sample('draft')));
 const visitor=env.unauthenticatedContext().firestore();
 await assertFails(getDoc(doc(visitor,'kiddiesTvVideos/G0F2PiVP_FI')));
 await assertFails(getDocs(collection(visitor,'kiddiesTvVideos')));
 await assertSucceeds(setDoc(doc(admin,'kiddiesTvVideos/G0F2PiVP_FI'),sample('published')));
 await assertSucceeds(getDoc(doc(visitor,'kiddiesTvVideos/G0F2PiVP_FI')));
 await assertSucceeds(getDocs(query(collection(visitor,'kiddiesTvVideos'),where('status','==','published'))));
 await assertSucceeds(updateDoc(doc(admin,'kiddiesTvVideos/G0F2PiVP_FI'),{status:'archived',approved:false}));
 await assertFails(getDoc(doc(visitor,'kiddiesTvVideos/G0F2PiVP_FI')));
});
test('Only approved admin can create, edit or archive; deletion is forbidden',async()=>{
 const admin=env.authenticatedContext('admin-k').firestore();
 const learner=env.authenticatedContext('student-k').firestore();
 const visitor=env.unauthenticatedContext().firestore();
 await assertFails(setDoc(doc(learner,'kiddiesTvVideos/G0F2PiVP_FI'),sample('published')));
 await assertFails(setDoc(doc(visitor,'kiddiesTvVideos/G0F2PiVP_FI'),sample('draft')));
 await assertSucceeds(setDoc(doc(admin,'kiddiesTvVideos/G0F2PiVP_FI'),sample('published')));
 await assertFails(updateDoc(doc(learner,'kiddiesTvVideos/G0F2PiVP_FI'),{status:'archived',approved:false}));
 await assertFails(deleteDoc(doc(admin,'kiddiesTvVideos/G0F2PiVP_FI')));
});
test('Publishing without real review metadata is blocked by database rules',async()=>{
 const admin=env.authenticatedContext('admin-k').firestore();
 await assertFails(setDoc(doc(admin,'kiddiesTvVideos/G0F2PiVP_FI'),{...sample('published'),reviewConfirmed:false}));
 await assertFails(setDoc(doc(admin,'kiddiesTvVideos/G0F2PiVP_FI'),{...sample('published'),ages:['0-2']}));
 await assertFails(setDoc(doc(admin,'kiddiesTvVideos/G0F2PiVP_FI'),{...sample('published'),category:'Not a subject'}));
 await assertFails(setDoc(doc(admin,'kiddiesTvVideos/G0F2PiVP_FI'),{...sample('published'),youtubeId:'another-id'}));
});
test('Public config read is allowed but only admin can hide legacy video IDs',async()=>{
 const admin=env.authenticatedContext('admin-k').firestore(),learner=env.authenticatedContext('student-k').firestore(),anon=env.unauthenticatedContext().firestore();
 const cfg={mode:'overlay',hiddenLegacyIds:['xg4_gWt8N_Q'],updatedAt:'2026-11-01T12:00:00.000Z',updatedBy:'admin-k'};
 await assertFails(setDoc(doc(learner,'kiddiesTvConfig/live'),cfg));
 await assertSucceeds(setDoc(doc(admin,'kiddiesTvConfig/live'),cfg));
 await assertSucceeds(getDoc(doc(anon,'kiddiesTvConfig/live')));
 await assertFails(updateDoc(doc(learner,'kiddiesTvConfig/live'),{hiddenLegacyIds:[]}));
 await assertFails(deleteDoc(doc(admin,'kiddiesTvConfig/live')));
});

test('Kiddies editorial audit is append-only, admin-only and actor-bound',async()=>{
 const admin=env.authenticatedContext('admin-k').firestore();
 const learner=env.authenticatedContext('student-k').firestore();
 const guest=env.unauthenticatedContext().firestore();
 const id='abcdefghijklmnopqrst';
 const ref=doc(admin,'kiddiesTvAudit',id);
 const event={youtubeId:'G0F2PiVP_FI',action:'create_draft',actorUid:'admin-k',
   at:serverTimestamp(),previousStatus:'none',nextStatus:'draft',
   title:'African Countries for Kids',batchId:''};
 await assertFails(setDoc(doc(learner,'kiddiesTvAudit/abcdefghijklmnopqrst'),event));
 await assertSucceeds(setDoc(ref,event));
 await assertFails(getDoc(doc(guest,'kiddiesTvAudit',id)));
 await assertFails(getDoc(doc(learner,'kiddiesTvAudit',id)));
 await assertSucceeds(getDoc(ref));
 await assertFails(updateDoc(ref,{action:'publish'}));
 await assertFails(deleteDoc(ref));
 await assertFails(setDoc(doc(admin,'kiddiesTvAudit','abcdefghijklmnopqrsu'),{...event,actorUid:'student-k'}));
});
