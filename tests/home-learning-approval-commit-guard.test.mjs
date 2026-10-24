import assert from "node:assert/strict";
import {test} from "node:test";
import {prepareApprovalProposal} from "../scripts/home-learning-approval-proposal.mjs";
import {hashLessonContent} from "../scripts/home-learning-approval-evidence.mjs";
import {inspectApprovalCommit} from "../scripts/home-learning-approval-commit-guard.mjs";

function sample(){
  const lessonContent="Synthetic math lesson; no child records.";
  const resource={id:"primary-1-3-maths",version:"v1",authorUid:"author-a",
    curriculumReference:"Synthetic source only",curriculumOutcome:"Synthetic outcome",
    sha256:hashLessonContent(lessonContent)};
  const assignment={id:"review-1",reviewerUid:"teacher-b",resourceId:resource.id,resourceVersion:resource.version};
  const submission={assignmentId:assignment.id,reviewerUid:assignment.reviewerUid,
    resourceId:resource.id,resourceVersion:resource.version,reviewStatus:"submitted_for_verification",
    findings:"Synthetic review findings completed."};
  const decision={outcome:"approve",approverUid:"editor-c",resourceVersion:resource.version,
    contentSha256:resource.sha256,rationale:"Synthetic signoff only",reviewerCredentialVerified:true,
    curriculumChecked:true,safeguardingChecked:true,accessibilityChecked:true,licensingChecked:true,answerKeyChecked:true};
  const verified={serverAuthenticated:true,reviewerAssignmentVerified:true,reviewerQualificationVerified:true,
    independentApprovalVerified:true,contentSnapshotVerified:true,curriculumSourceVerified:true,
    securityReviewComplete:true,authenticatedActorUid:"editor-c"};
  const prepared=prepareApprovalProposal({resource,assignment,submission,decision,lessonContent,verified,
    actor:{uid:"editor-c",authorization:"editor"},approvedAt:"2026-10-24T12:00:00.000Z"});
  assert.equal(prepared.ready,true);
  return {proposal:prepared.proposal,trustedState:{transactional:true,resourceId:resource.id,
    resourceVersion:resource.version,contentSha256:resource.sha256,
    recordedApprovalKeys:[],activeApprovalExists:false,resourceIsRetired:false,auditHead:null}};
}
test("valid synthetic pending record passes transactional preflight only",()=>{
  const data=sample();assert.deepEqual(inspectApprovalCommit(data),{readyForTransactionalWrite:true,errors:[]});
});
test("rejects absent trusted transaction",()=>{
  const data=sample();delete data.trustedState;assert.equal(inspectApprovalCommit(data).readyForTransactionalWrite,false);
});
test("rejects replayed approval key",()=>{
  const data=sample();data.trustedState.recordedApprovalKeys.push(data.proposal.approvalKey);
  assert.equal(inspectApprovalCommit(data).readyForTransactionalWrite,false);
});
test("rejects concurrent audit head change",()=>{
  const data=sample();data.trustedState.auditHead="a".repeat(64);
  assert.equal(inspectApprovalCommit(data).readyForTransactionalWrite,false);
});
test("rejects stale and retired content",()=>{
  const changed=sample();changed.trustedState.resourceVersion="v2";
  assert.equal(inspectApprovalCommit(changed).readyForTransactionalWrite,false);
  const retired=sample();retired.trustedState.resourceIsRetired=true;
  assert.equal(inspectApprovalCommit(retired).readyForTransactionalWrite,false);
});
test("rejects already approved resource",()=>{
  const data=sample();data.trustedState.activeApprovalExists=true;
  assert.equal(inspectApprovalCommit(data).readyForTransactionalWrite,false);
});
test("rejects tampered audit body and approval key",()=>{
  const data=sample();data.proposal.reviewerUid="forged";
  assert.equal(inspectApprovalCommit(data).readyForTransactionalWrite,false);
  const key=sample();key.proposal.approvalKey="b".repeat(64);
  assert.equal(inspectApprovalCommit(key).readyForTransactionalWrite,false);
});
test("requires transaction snapshot completeness",()=>{
  const data=sample();delete data.trustedState.recordedApprovalKeys;
  assert.equal(inspectApprovalCommit(data).readyForTransactionalWrite,false);
});
