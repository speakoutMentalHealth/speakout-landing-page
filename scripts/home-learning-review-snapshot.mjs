// Trusted-server read-model adapter only: Firestore document IDs are authoritative.
// Do not call this on untrusted HTTP payloads or browser-supplied objects.
const isObject = value => value !== null && typeof value === "object" && !Array.isArray(value);
const docId = value => typeof value === "string" && /^[A-Za-z0-9_-]{1,120}$/.test(value);
export function normalizeStoredReview({ assignmentDocument, submissionDocument } = {}) {
  if (!isObject(assignmentDocument) || !isObject(submissionDocument) ||
      !docId(assignmentDocument.id) || assignmentDocument.id !== submissionDocument.id ||
      !isObject(assignmentDocument.data) || !isObject(submissionDocument.data)) {
    return {valid:false,error:"Review document identity mismatch",assignment:null,submission:null};
  }
  const id = assignmentDocument.id;
  const assignment = assignmentDocument.data;
  const submission = submissionDocument.data;
  // IDs are Firestore document path identities, never editable document fields.
  if (Object.hasOwn(assignment,"id") || Object.hasOwn(submission,"assignmentId") ||
      !["reviewerUid","resourceId","resourceVersion","assignedAt"].every(key=>Object.hasOwn(assignment,key)) ||
      !["reviewerUid","resourceId","resourceVersion","reviewStatus","findings","submittedAt"].every(key=>Object.hasOwn(submission,key)) ||
      submission.reviewerUid !== assignment.reviewerUid ||
      submission.resourceId !== assignment.resourceId ||
      submission.resourceVersion !== assignment.resourceVersion ||
      submission.reviewStatus !== "submitted_for_verification") {
    return {valid:false,error:"Stored review evidence does not match assignment",assignment:null,submission:null};
  }
  return {valid:true,error:null,
    assignment:{...assignment,id},submission:{...submission,assignmentId:id}};
}
