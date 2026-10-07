import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldPath, FieldValue } from "firebase-admin/firestore";

initializeApp();
const db = getFirestore();

const mode = String(process.env.APPROVAL_PREFLIGHT_MODE || "audit").trim().toLowerCase();
const confirmation = String(process.env.APPROVAL_PREFLIGHT_CONFIRM || "").trim();
const pageSize = 400;

if (!["audit", "normalize"].includes(mode)) {
  throw new Error("APPROVAL_PREFLIGHT_MODE must be audit or normalize.");
}
if (mode === "normalize" && confirmation !== "NORMALIZE_APPROVAL_FLAGS") {
  throw new Error("Normalization requires APPROVAL_PREFLIGHT_CONFIRM=NORMALIZE_APPROVAL_FLAGS.");
}

const counters = {
  scanned: 0,
  canonicalApproved: 0,
  deniedOrUnapproved: 0,
  staleLegacyGrant: 0,
  missingStatus: 0,
  legacyFlagOutOfSync: 0,
  normalized: 0
};
const statusCounts = {};
let cursor = null;

do {
  let query = db.collection("users").orderBy(FieldPath.documentId()).limit(pageSize);
  if (cursor) query = query.startAfter(cursor);
  const snap = await query.get();
  if (snap.empty) break;

  const batch = db.batch();
  let batchWrites = 0;

  for (const docSnap of snap.docs) {
    const profile = docSnap.data() || {};
    const status = typeof profile.status === "string" ? profile.status : "";
    const canonicalApproved = status === "approved";
    const legacyApproved = profile.approved === true;
    const desiredLegacyApproved = canonicalApproved;

    counters.scanned += 1;
    statusCounts[status || "(missing)"] = (statusCounts[status || "(missing)"] || 0) + 1;

    if (canonicalApproved) counters.canonicalApproved += 1;
    else counters.deniedOrUnapproved += 1;

    if (!status) counters.missingStatus += 1;
    if (!canonicalApproved && legacyApproved) counters.staleLegacyGrant += 1;
    if (profile.approved !== desiredLegacyApproved) counters.legacyFlagOutOfSync += 1;

    if (mode === "normalize" && profile.approved !== desiredLegacyApproved) {
      batch.set(docSnap.ref, {
        approved: desiredLegacyApproved,
        approvalFlagNormalizedAt: FieldValue.serverTimestamp(),
        approvalFlagNormalizationSource: "github-actions-preflight"
      }, { merge: true });
      batchWrites += 1;
    }
  }

  if (mode === "normalize" && batchWrites) {
    await batch.commit();
    counters.normalized += batchWrites;
  }

  cursor = snap.docs.length === pageSize ? snap.docs[snap.docs.length - 1].id : null;
} while (cursor);

const summary = {
  mode,
  ...counters,
  statusCounts: Object.fromEntries(Object.entries(statusCounts).sort(([a],[b]) => a.localeCompare(b)))
};

console.log(JSON.stringify(summary, null, 2));

if (mode === "audit" && counters.staleLegacyGrant > 0) {
  console.log("Preflight finding: stale approved=true flags exist on non-approved canonical statuses.");
}
if (counters.missingStatus > 0) {
  console.log("Preflight finding: profiles without canonical status require manual ownership review before access is granted.");
}
