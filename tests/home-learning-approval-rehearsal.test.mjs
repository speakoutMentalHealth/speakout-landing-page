import assert from "node:assert/strict";
import {test} from "node:test";
import {hashLessonContent} from "../scripts/home-learning-approval-evidence.mjs";
import {rehearseApproval} from "../scripts/home-learning-approval-rehearsal.mjs";

function fixture() {
  const lessonContent="Synthetic material for an offline rehearsal.";
  const resource={id:"primary-1-3-maths",version:"draft-1",authorUid:"author-a",
    curriculumReference:"Synthetic source, not approval evidence",
    curriculumOutcome:"Synthetic outcome",sha256:hashLessonContent(lessonContent)};
  const assignment={id:"assignment-1",reviewerUid:"reviewer-b",resourceId:resource.id,resourceVersion:resource.version};
  const submission={assignmentId:assignment.id,reviewerUid:assignment.reviewerUid,
    resourceId:resource.id,resourceVersion:resource.version,
    reviewStatus:"submitted_for_verification",findings:"Synthetic content checks completed."};
  const decision={outcome:"approve",approverUid:"approver-c",rationale:"Synthetic review decision",
    contentSha256:resource.sha256,resourceVersion:resource.version,reviewerCredentialVerified:true,
    curriculumChecked:true,safeguardingChecked:true,accessibilityChecked:true,
    licensingChecked:true,answerKeyChecked:true};
  const verified={serverAuthenticated:true,reviewerAssignmentVerified:true,
    reviewerQualificationVerified:true,independentApprovalVerified:true,
    contentSnapshotVerified:true,curriculumSourceVerified:true,
    securityReviewComplete:true,authenticatedActorUid:"approver-c"};
  const trustedState={transactional:true,resourceId:resource.id,resourceVersion:resource.version,
    contentSha256:resource.sha256,recordedApprovalKeys:[],
    activeApprovalExists:false,resourceIsRetired:false,auditHead:null};
  const {id:assignmentId,...assignmentData}=assignment;
  const {assignmentId:storedAssignmentId,...submissionData}=submission;
  return {isolatedStaging:true,authenticatedServerPrincipal:true,resource,
    assignmentDocument:{id:assignmentId,data:assignmentData},
    submissionDocument:{id:storedAssignmentId,data:submissionData},
    decision,lessonContent,verified,actor:{uid:"approver-c",authorization:"editor"},
    approvedAt:"2026-10-24T12:00:00.000Z",trustedState};
}
const request={resourceId:"primary-1-3-maths",assignmentId:"assignment-1"};
const adapter=snapshot=>({withReadOnlySnapshot:async (_,read)=>read(snapshot)});
test("synthetic staging snapshot rehearses a valid proposal without writes",async()=>{
  const result=await rehearseApproval({request,adapter:adapter(fixture())});
  assert.equal(result.ready,true);
  assert.deepEqual(Object.keys(result).sort(),["approvalKey","errors","ready","resourceId","resourceVersion"].sort());
});
test("request rejects supplied approval flags and private evidence",async()=>{
  const result=await rehearseApproval({request:{...request,verified:{serverAuthenticated:true}},adapter:adapter(fixture())});
  assert.equal(result.ready,false);
});
test("nonstaging or unauthenticated snapshots fail closed",async()=>{
  const x=fixture();x.isolatedStaging=false;
  assert.equal((await rehearseApproval({request,adapter:adapter(x)})).ready,false);
  const y=fixture();y.authenticatedServerPrincipal=false;
  assert.equal((await rehearseApproval({request,adapter:adapter(y)})).ready,false);
});
test("snapshot identity mismatch is denied",async()=>{
  const x=fixture();x.assignmentDocument.id="other-assignment";
  assert.equal((await rehearseApproval({request,adapter:adapter(x)})).ready,false);
});
test("replayed or obsolete versions fail",async()=>{
  const x=fixture();x.trustedState.activeApprovalExists=true;
  assert.equal((await rehearseApproval({request,adapter:adapter(x)})).ready,false);
  const y=fixture();y.trustedState.resourceVersion="draft-2";
  assert.equal((await rehearseApproval({request,adapter:adapter(y)})).ready,false);
});
test("provider outage fails closed without leaking details",async()=>{
  const failing={withReadOnlySnapshot:async()=>{throw Error("Private account information")}};
  const result=await rehearseApproval({request,adapter:failing});
  assert.equal(result.ready,false);
  assert.equal(JSON.stringify(result).includes("Private account information"),false);
});


test("provider cannot manufacture success without calling validation",async()=>{
  const forged={withReadOnlySnapshot:async()=>({ready:true,approvalKey:"forged"})};
  const result=await rehearseApproval({request,adapter:forged});
  assert.equal(result.ready,false);
});
test("provider cannot invoke trusted validation callback twice",async()=>{
  const repeated={withReadOnlySnapshot:async (_,read)=>{
    await read(fixture());
    return read(fixture());
  }};
  const result=await rehearseApproval({request,adapter:repeated});
  assert.equal(result.ready,false);
});
