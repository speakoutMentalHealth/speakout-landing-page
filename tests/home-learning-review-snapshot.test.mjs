import assert from "node:assert/strict";
import {test} from "node:test";
import {normalizeStoredReview} from "../scripts/home-learning-review-snapshot.mjs";
const fixture=()=>({
  assignmentDocument:{id:"assignment-1",path:"homeLearningReviewerAssignments/assignment-1",data:{reviewerUid:"teacher-a",resourceId:"primary-1-3-maths",resourceVersion:"draft-v1",assignedAt:"test"}},
  submissionDocument:{id:"assignment-1",path:"homeLearningReviewSubmissions/assignment-1",data:{reviewerUid:"teacher-a",resourceId:"primary-1-3-maths",resourceVersion:"draft-v1",reviewStatus:"submitted_for_verification",findings:"Synthetic teaching review findings.",submittedAt:"test"}}
});
test("derives approval review identity from matching Firestore document paths",()=>{
  const output=normalizeStoredReview(fixture());
  assert.equal(output.valid,true);
  assert.equal(output.assignment.id,"assignment-1");
  assert.equal(output.submission.assignmentId,"assignment-1");
});
test("denies mismatched stored document IDs",()=>{
  const input=fixture();input.submissionDocument.id="assignment-2";
  assert.equal(normalizeStoredReview(input).valid,false);
});
test("denies forged in-body assignment identity",()=>{
  const input=fixture();input.submissionDocument.data.assignmentId="assignment-1";
  assert.equal(normalizeStoredReview(input).valid,false);
});
test("denies forged assignment identifier within document body",()=>{
  const input=fixture();input.assignmentDocument.data.id="assignment-1";
  assert.equal(normalizeStoredReview(input).valid,false);
});
test("denies wrong reviewer, version, resource and review status",()=>{
  for(const [key,value] of [["reviewerUid","different-user"],["resourceVersion","draft-v2"],["resourceId","different-resource"],["reviewStatus","approved"]]){
    const input=fixture();input.submissionDocument.data[key]=value;
    assert.equal(normalizeStoredReview(input).valid,false,key);
  }
});
test("denies absent, malformed or partial evidence",()=>{
  assert.equal(normalizeStoredReview({}).valid,false);
  const invalid=fixture();delete invalid.assignmentDocument.data.assignedAt;
  assert.equal(normalizeStoredReview(invalid).valid,false);
});

test("rejects cross-collection or mismatched review paths",()=>{
  const f=fixture();f.assignmentDocument.path="users/assignment-1";
  assert.equal(normalizeStoredReview(f).valid,false);
  const g=fixture();g.submissionDocument.path="homeLearningReviewerAssignments/assignment-1";
  assert.equal(normalizeStoredReview(g).valid,false);
});
test("rejects unexpected stored document fields",()=>{
  const f=fixture();f.assignmentDocument.data.unexpected="data";
  assert.equal(normalizeStoredReview(f).valid,false);
  const g=fixture();g.submissionDocument.data.unexpected="data";
  assert.equal(normalizeStoredReview(g).valid,false);
});
