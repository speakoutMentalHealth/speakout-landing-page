import assert from "node:assert/strict";
import {test} from "node:test";
import {hashLessonContent} from "../scripts/home-learning-approval-evidence.mjs";
import {prepareApprovalProposal} from "../scripts/home-learning-approval-proposal.mjs";

const evidence = () => {
  const lessonContent = "This is synthetic learning content. No real approvals.";
  const resource = {id:"primary-1-3-maths",version:"v1",authorUid:"author-a",
    curriculumReference:"Fake test-only citation",curriculumOutcome:"Synthetic learning outcome",
    sha256:hashLessonContent(lessonContent)};
  const assignment = {id:"assignment-1",resourceId:resource.id,resourceVersion:resource.version,reviewerUid:"teacher-b"};
  const submission = {assignmentId:assignment.id,resourceId:resource.id,resourceVersion:resource.version,
    reviewerUid:assignment.reviewerUid,reviewStatus:"submitted_for_verification",findings:"Test-only independent findings"};
  const decision = {outcome:"approve",approverUid:"editor-c",rationale:"Test-only formal decision",
    contentSha256:resource.sha256,resourceVersion:resource.version,
    reviewerCredentialVerified:true,curriculumChecked:true,safeguardingChecked:true,
    accessibilityChecked:true,licensingChecked:true,answerKeyChecked:true};
  const verified = {serverAuthenticated:true,reviewerAssignmentVerified:true,reviewerQualificationVerified:true,
    independentApprovalVerified:true,contentSnapshotVerified:true,curriculumSourceVerified:true,
    securityReviewComplete:true,authenticatedActorUid:"editor-c"};
  return {resource,assignment,submission,decision,lessonContent,verified,
    actor:{uid:"editor-c",authorization:"editor"},approvedAt:"2026-10-24T12:00:00.000Z"};
};

test("builds a deterministic dry-run proposal for synthetic trusted evidence",()=>{
  const a=prepareApprovalProposal(evidence());
  const b=prepareApprovalProposal(evidence());
  assert.equal(a.ready,true);
  assert.equal(a.proposal.auditHash,b.proposal.auditHash);
  assert.match(a.proposal.auditHash,/^[a-f0-9]{64}$/);
});
test("no trusted server evidence means no proposal",()=>{
  const input=evidence();delete input.verified;
  const result=prepareApprovalProposal(input);
  assert.equal(result.ready,false);assert.equal(result.proposal,null);
});
test("missing independent reviewer qualification blocks proposal",()=>{
  const input=evidence();input.verified.reviewerQualificationVerified=false;
  assert.equal(prepareApprovalProposal(input).ready,false);
});
test("spoofed actor or unauthorized role blocks proposal",()=>{
  for (const role of ["teacher","student","admin"]) {
    const input=evidence();input.actor.authorization=role;
    assert.equal(prepareApprovalProposal(input).ready,false);
  }
  const spoof=evidence();spoof.verified.authenticatedActorUid="another-user";
  assert.equal(prepareApprovalProposal(spoof).ready,false);
});
test("edited content and stale version block proposal",()=>{
  const changed=evidence();changed.lessonContent+=" altered";
  assert.equal(prepareApprovalProposal(changed).ready,false);
  const stale=evidence();stale.assignment.resourceVersion="v0";
  assert.equal(prepareApprovalProposal(stale).ready,false);
});
test("previous audit hash must be well formed and affects chain",()=>{
  const input=evidence();
  assert.equal(prepareApprovalProposal({...input,previousAuditHash:"bad"}).ready,false);
  const chained=prepareApprovalProposal({...input,previousAuditHash:"a".repeat(64)});
  assert.equal(chained.ready,true);
  assert.notEqual(chained.proposal.auditHash,prepareApprovalProposal(input).proposal.auditHash);
});
test("invalid timestamp or missing decision prevents proposal",()=>{
  const badTime=evidence();badTime.approvedAt="tomorrow";
  assert.equal(prepareApprovalProposal(badTime).ready,false);
  const missing=evidence();delete missing.decision;
  assert.equal(prepareApprovalProposal(missing).ready,false);
});
