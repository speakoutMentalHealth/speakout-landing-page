import assert from "node:assert/strict";
import { test } from "node:test";
import { assessApprovalEvidence, hashLessonContent } from "../scripts/home-learning-approval-evidence.mjs";

function fixture() {
  const lessonContent = "<h1>Verified sample lesson for test only</h1>";
  const resource = { id:"primary-1-3-maths", version:"draft-v1", authorUid:"author-a",
    curriculumReference:"Verified official publication, edition and page",
    curriculumOutcome:"Recognise the specified learning outcome", sha256:hashLessonContent(lessonContent) };
  const assignment = { id:"review-001", resourceId:resource.id, resourceVersion:resource.version, reviewerUid:"teacher-b" };
  const submission = { assignmentId:assignment.id, resourceId:resource.id,
    resourceVersion:resource.version, reviewerUid:assignment.reviewerUid,
    reviewStatus:"submitted_for_verification", findings:"The factual material has been checked." };
  const decision = { outcome:"approve", approverUid:"editor-c", rationale:"Independent content verification completed",
    contentSha256:resource.sha256, resourceVersion:resource.version,
    reviewerCredentialVerified:true, curriculumChecked:true, safeguardingChecked:true,
    accessibilityChecked:true, licensingChecked:true, answerKeyChecked:true };
  return {resource,assignment,submission,decision,lessonContent};
}

test("matching independently attested synthetic evidence is structurally eligible",()=>{
  assert.deepEqual(assessApprovalEvidence(fixture()),{eligibleForServerReview:true,errors:[]});
});
test("rejects modified lesson content",()=>{
  const e=fixture();e.lessonContent+=" modified";
  assert.equal(assessApprovalEvidence(e).eligibleForServerReview,false);
});
test("rejects author reviewing own lesson",()=>{
  const e=fixture();e.assignment.reviewerUid=e.resource.authorUid;
  e.submission.reviewerUid=e.resource.authorUid;
  assert.equal(assessApprovalEvidence(e).eligibleForServerReview,false);
});
test("rejects approver who authored or reviewed",()=>{
  for(const who of ["author-a","teacher-b"]){
    const e=fixture();e.decision.approverUid=who;
    assert.equal(assessApprovalEvidence(e).eligibleForServerReview,false);
  }
});
test("rejects stale assignment and submission",()=>{
  const e=fixture();e.resource.version="draft-v2";
  assert.equal(assessApprovalEvidence(e).eligibleForServerReview,false);
});
test("rejects missing checked safeguards or credentials",()=>{
  const e=fixture();e.decision.safeguardingChecked=false;
  assert.equal(assessApprovalEvidence(e).eligibleForServerReview,false);
  const f=fixture();f.decision.reviewerCredentialVerified=false;
  assert.equal(assessApprovalEvidence(f).eligibleForServerReview,false);
});
test("rejects decisions bound to a different content digest",()=>{
  const e=fixture();e.decision.contentSha256="0".repeat(64);
  assert.equal(assessApprovalEvidence(e).eligibleForServerReview,false);
});
test("rejects incomplete or missing evidence",()=>{
  assert.equal(assessApprovalEvidence({}).eligibleForServerReview,false);
});
