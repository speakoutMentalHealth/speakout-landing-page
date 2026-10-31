import test from 'node:test';
import assert from 'node:assert/strict';
import {linkFacilitatorSchool} from '../workers/platform-api/src/facilitator-school.js';
function fixture() {
  const records = new Map(Object.entries({
    'users/facilitator': {role:'teacher',status:'approved',email:'synthetic@example.test',certificateName:'Existing name'},
    'schools/school': {status:'approved',schoolName:'Synthetic School',schoolCode:'TEST001'},
    'programmes/club': {schoolId:'school',status:'active',facilitatorIds:['other']}
  }));
  const actor = {uid:'admin',profile:{role:'super_admin'}};
  const deps = {safeId(value) { if (!/^[\w-]+$/.test(value || '')) throw new Error('Invalid ID'); return value; },
    async runTransaction(env, fn) {
      const pending = [];
      const result = await fn({get: async path => records.get(path),
        patch: (path,data) => pending.push([path,{...records.get(path),...data}]),
        set: (path,data) => pending.push([path,data])});
      for (const [path,data] of pending) records.set(path,data);
      return result;
    }};
  const data = {userId:'facilitator',schoolId:'school',programmeId:'club'};
  return {records,actor,deps,data,run:()=>linkFacilitatorSchool({},actor,data,deps)};
}
test('links same account and assigns active club atomically, preserving records and existing facilitators', async()=>{
  const f=fixture(); await f.run(); await f.run();
  assert.equal(f.records.get('users/facilitator').certificateName,'Existing name');
  assert.equal(f.records.get('users/facilitator').schoolId,'school');
  assert.deepEqual(f.records.get('programmes/club').facilitatorIds,['other','facilitator']);
  assert.equal([...f.records.keys()].filter(p=>p.startsWith('users/')).length,1);
  assert.ok([...f.records.values()].some(v=>v.action==='facilitator_school_linked'&&v.actorUid==='admin'));
});
test('allows school-only link without changing programme',async()=>{
 const f=fixture();delete f.data.programmeId;await f.run();
 assert.deepEqual(f.records.get('programmes/club').facilitatorIds,['other']);
});
for(const role of ['teacher','school_admin','student'])test(`rejects ${role} before any reads`,async()=>{
 const f=fixture();f.actor.profile.role=role;f.deps.runTransaction=()=>{throw Error('Unexpected transaction')};
 await assert.rejects(f.run(),e=>e.status===403);
});
test('rejects organisation changes from school support mode',async()=>{
 const f=fixture();f.actor.profile.supportMode=true;await assert.rejects(f.run(),e=>e.status===403);
});
for(const [label,mutate] of [
 ['different school',f=>f.records.get('users/facilitator').schoolId='other'],
 ['different school code',f=>f.records.get('users/facilitator').schoolCode='OTHER'],
 ['inactive club',f=>f.records.get('programmes/club').status='archived'],
 ['cross-school club',f=>f.records.get('programmes/club').schoolId='other'],
 ['unapproved account',f=>f.records.get('users/facilitator').status='pending'],
 ['wrong role',f=>f.records.get('users/facilitator').role='student'],
 ['unapproved school',f=>f.records.get('schools/school').status='pending'],
 ['missing club',f=>f.records.delete('programmes/club')]
])test(`rejects ${label} without partial updates`,async()=>{
 const f=fixture();mutate(f);const before=JSON.stringify([...f.records]);
 await assert.rejects(f.run());assert.equal(JSON.stringify([...f.records]),before);
});
