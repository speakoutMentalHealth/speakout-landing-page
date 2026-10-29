import test from "node:test";
import assert from "node:assert/strict";
import {volunteerNextActions} from "../js/volunteer-next-actions.js";

const base={reviewStage:"intake_received",assessmentStatus:"not_verified",safeguardingStatus:"pending",placementStatus:"not_assigned"};
test("new volunteer sees profile step",()=>{
 assert.equal(volunteerNextActions(null,null)[0].id,"intake");
});
test("existing certificate pending review does not require another assessment",()=>{
 assert.deepEqual(volunteerNextActions(base,{reviewStatus:"pending"}).map(x=>x.id),["pending"]);
});
test("new volunteer can submit existing certificate or train",()=>{
 assert.deepEqual(volunteerNextActions(base,null).map(x=>x.id),["credential","training"]);
});
test("a verified assessment does not skip safeguarding",()=>{
 assert.deepEqual(volunteerNextActions({...base,assessmentStatus:"passed"},null).map(x=>x.id),["safeguarding"]);
});
test("active volunteer sees only assigned role, unless it is unpublished",()=>{
 const active={...base,reviewStage:"active",assessmentStatus:"passed",safeguardingStatus:"cleared",placementStatus:"assigned"};
 assert.equal(volunteerNextActions(active,null,true)[0].id,"active");
 assert.equal(volunteerNextActions(active,null,false)[0].id,"contact");
});
