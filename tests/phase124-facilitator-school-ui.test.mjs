import test from 'node:test';
import assert from 'node:assert/strict';
import {setupFacilitatorSchoolLink} from '../js/admin-facilitator-school.js';
// Minimal DOM adapter exercises the real UI controller without live user data.
class Element {
  constructor() {this.listeners={};this.options=[];this.value='';this.disabled=false;this.hidden=false;this.textContent='';}
  addEventListener(type,fn){this.listeners[type]=fn;}
  replaceChildren(...items){this.options=items;this.value=items[0]?.value || '';}
  add(item){this.options.push(item);}
  get selectedOptions(){return this.options.filter(x=>x.value===this.value);}
}
function fixture() {
 const ids=['schoolLinkForm','linkSchool','linkProgramme','schoolLinkStatus','schoolLinkButton'];
 const elements=Object.fromEntries(ids.map(id=>[id,new Element()]));
 globalThis.document={getElementById:id=>elements[id]};
 globalThis.Option=class {constructor(text,value){this.textContent=text;this.value=value;}};
 globalThis.window={confirm:()=>true};
 let calls=[], fail=false;
 const rows={schools:[{id:'s1',status:'approved',schoolName:'School One'},{id:'s2',status:'active',schoolName:'School Two'},{id:'s3',status:'pending'}],programmes:[{id:'p1',schoolId:'s1',status:'active',name:'Club One'},{id:'p2',schoolId:'s2',status:'active',name:'Club Two'},{id:'p3',schoolId:'s1',status:'archived',name:'Old Club'}]};
 const controller=setupFacilitatorSchoolLink({db:{},collection:(_,name)=>name,getDocs:async name=>({docs:rows[name].map(r=>({id:r.id,data:()=>r}))}),adminApi:{linkFacilitatorSchool:async data=>{calls.push(data);if(fail)throw Error('School is no longer active');}}});
 const user={id:'teacher',role:'teacher',email:'synthetic@example.test',fullName:'Synthetic Teacher'};
 return {elements,controller,user,calls,setFail:()=>{fail=true;},submit:()=>elements.schoolLinkForm.listeners.submit({preventDefault(){}})};
}
test('administrator selects a school, sees only its active clubs and submits existing user ID',async()=>{
 const f=fixture();await f.controller.open(f.user);
 const e=f.elements; assert.equal(e.schoolLinkForm.hidden,false);assert.equal(e.linkSchool.options.length,3);
 e.linkSchool.value='s1';e.linkSchool.listeners.change();assert.deepEqual(e.linkProgramme.options.map(x=>x.value),['','p1']);
 e.linkProgramme.value='p1';await f.submit();assert.deepEqual(f.calls,[{userId:'teacher',schoolId:'s1',programmeId:'p1'}]);
 assert.match(e.schoolLinkStatus.textContent,/successfully/);
});
test('changing school clears the previous club and filters options',async()=>{
 const f=fixture();await f.controller.open(f.user);const e=f.elements;
 e.linkSchool.value='s1';e.linkSchool.listeners.change();e.linkProgramme.value='p1';
 e.linkSchool.value='s2';e.linkSchool.listeners.change();assert.equal(e.linkProgramme.value,'');assert.deepEqual(e.linkProgramme.options.map(x=>x.value),['','p2']);
});
test('cancelled confirmation performs no update',async()=>{
 const f=fixture();await f.controller.open(f.user);f.elements.linkSchool.value='s1';window.confirm=()=>false;await f.submit();assert.equal(f.calls.length,0);
});
test('server errors remain visible and permit retry',async()=>{
 const f=fixture();await f.controller.open(f.user);f.elements.linkSchool.value='s1';f.setFail();await f.submit();assert.match(f.elements.schoolLinkStatus.textContent,/no longer active/);assert.equal(f.elements.schoolLinkButton.disabled,false);
});
test('student profile hides linking and closed modal cannot submit',async()=>{
 const f=fixture();await f.controller.open({...f.user,role:'student'});assert.equal(f.elements.schoolLinkForm.hidden,true);
 f.controller.close();await f.submit();assert.equal(f.calls.length,0);
});
