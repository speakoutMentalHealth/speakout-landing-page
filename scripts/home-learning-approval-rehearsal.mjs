// Staging integration contract. This read-only rehearsal NEVER writes or publishes.
// Only an authenticated server can supply the provider; browser payloads contain
// identifiers only, and cannot supply decisions, flags or trusted database state.
import { prepareApprovalProposal } from "./home-learning-approval-proposal.mjs";
import { inspectApprovalCommit } from "./home-learning-approval-commit-guard.mjs";

const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const allowedKeys = ["resourceId", "assignmentId"];
function validRequest(request) {
  return request && Object.keys(request).length === allowedKeys.length &&
    allowedKeys.every(key => typeof request[key] === "string" && idPattern.test(request[key]));
}
function validAdapter(adapter) {
  return adapter && typeof adapter.withReadOnlySnapshot === "function";
}
// The snapshot callback must be backed by trusted server reads. Never wire
// this into a public route without independently authenticating the caller.
export async function rehearseApproval({ request, adapter } = {}) {
  if (!validRequest(request)) return { ready: false, errors: ["Invalid rehearsal identifiers"] };
  if (!validAdapter(adapter)) return { ready: false, errors: ["Trusted snapshot provider unavailable"] };
  try {
    return await adapter.withReadOnlySnapshot(request, async snapshot => {
      if (!snapshot || snapshot.isolatedStaging !== true ||
          snapshot.authenticatedServerPrincipal !== true ||
          snapshot.resource?.id !== request.resourceId ||
          snapshot.assignment?.id !== request.assignmentId) {
        return {ready:false,errors:["Staging identity or snapshot mismatch"]};
      }
      const prepared = prepareApprovalProposal({
        resource:snapshot.resource, assignment:snapshot.assignment,
        submission:snapshot.submission, decision:snapshot.decision,
        lessonContent:snapshot.lessonContent, verified:snapshot.verified,
        actor:snapshot.actor, approvedAt:snapshot.approvedAt,
        previousAuditHash:snapshot.trustedState?.auditHead ?? null
      });
      if (!prepared.ready) return {ready:false,errors:prepared.errors};
      const preflight = inspectApprovalCommit({
        proposal:prepared.proposal, trustedState:snapshot.trustedState
      });
      if (!preflight.readyForTransactionalWrite) return {ready:false,errors:preflight.errors};
      // Never return the private review record, rationale or student information.
      return {ready:true,errors:[],resourceId:prepared.proposal.resourceId,
        resourceVersion:prepared.proposal.resourceVersion,approvalKey:prepared.proposal.approvalKey};
    });
  } catch {
    return {ready:false,errors:["Trusted rehearsal unavailable"]};
  }
}
