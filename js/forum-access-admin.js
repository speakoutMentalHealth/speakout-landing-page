import { db } from "../firebase-config.js";
import { requireRoles } from "../launch-role-guard.js";
import { doc, getDoc, writeBatch, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const $ = id => document.getElementById(id);
const status = $("status");
let adminUid = "";
let selectedUid = "";
let currentGrant = null;
let accountEligible = false;
let busy = false;

function notify(message, error = false) {
  status.textContent = message;
  status.classList.toggle("error", Boolean(error));
}
function setBusy(flag) {
  busy = flag;
  $("adminUI").querySelectorAll("button,input,select").forEach(control => control.disabled = flag);
}
function parseRoomIds(value) {
  const rooms = [...new Set(String(value || "").split(",").map(x => x.trim()).filter(Boolean))];
  if (rooms.length > 20 || rooms.some(id => !/^[a-z][a-z0-9-]{2,55}$/.test(id))) {
    throw Error("Provide up to 20 valid room IDs, separated by commas.");
  }
  return rooms;
}
async function loadUser(uid) {
  if (!/^[a-zA-Z0-9_-]{5,128}$/.test(uid)) throw Error("Invalid user UID format.");
  const snapshot = await getDoc(doc(db, "users", uid));
  if (!snapshot.exists()) throw Error("No matching portal account.");
  const profile = snapshot.data();
  accountEligible = profile.status === "approved" && profile.role !== "student";
  selectedUid = uid;
  $("userSummary").textContent = "Account: " + uid + " · Role: " + (profile.role || "unknown") +
    " · Status: " + (profile.status || "unknown") +
    (accountEligible ? " · Eligible for manual adult verification" : " · Cannot approve forum membership");
  const grantSnap = await getDoc(doc(db, "forumAccessGrants", uid));
  currentGrant = grantSnap.exists() ? grantSnap.data() : null;
  $("grantPanel").hidden = !accountEligible;
  $("adultReview").checked = false;
  $("reason").value = "";
  $("memberRole").value = currentGrant?.memberRole || "member";
  $("grantActive").value = String(currentGrant?.active === true);
  $("privateRoomIds").value = (currentGrant?.privateRoomIds || []).join(", ");
  $("moderatedRoomIds").value = (currentGrant?.moderatedRoomIds || []).join(", ");
  notify(accountEligible ? "Account loaded. Confirm adult eligibility before saving." : "Account is not eligible.", !accountEligible);
}
async function saveGrant() {
  if (!accountEligible || !selectedUid || !$("adultReview").checked) throw Error("Adult verification and approved portal status are required.");
  const memberRole = $("memberRole").value;
  const active = $("grantActive").value === "true";
  const privateRoomIds = parseRoomIds($("privateRoomIds").value);
  const moderatedRoomIds = parseRoomIds($("moderatedRoomIds").value);
  const reason = $("reason").value.trim();
  if (reason.length < 8 || reason.length > 160) throw Error("Provide a concise decision reason.");
  if (memberRole !== "moderator" && moderatedRoomIds.length > 0) throw Error("Only moderators may receive assigned moderation rooms.");
  const grantRef = doc(db, "forumAccessGrants", selectedUid);
  const auditRef = doc(db, "forumGrantAudits", crypto.randomUUID());
  const version = (currentGrant?.version || 0) + 1;
  const next = {
    uid: selectedUid, active, adultVerified: true, memberRole,
    privateRoomIds, moderatedRoomIds,
    createdAt: currentGrant?.createdAt || serverTimestamp(),
    reviewedAt: serverTimestamp(), reviewedBy: adminUid,
    version, auditId: auditRef.id, reason
  };
  const audit = {
    uid: selectedUid, actorUid: adminUid,
    previousActive: currentGrant?.active || false, nextActive: active,
    version, changedAt: serverTimestamp(), reason
  };
  const batch = writeBatch(db);
  if (currentGrant) batch.update(grantRef, next);
  else batch.set(grantRef, next);
  batch.set(auditRef, audit);
  await batch.commit();
  // Rehydrate server timestamps before the next edit; never reuse a local sentinel
  // for immutable grant.createdAt or calculate revisions from stale data.
  const fresh = await getDoc(grantRef);
  if (!fresh.exists()) throw Error("Grant saved but could not be reloaded.");
  currentGrant = fresh.data();
}
$("lookup").addEventListener("submit", async event => {
  event.preventDefault();
  if (busy) return;
  setBusy(true);
  try { await loadUser($("userId").value.trim()); }
  catch (error) { $("grantPanel").hidden = true; notify(error?.message || "Could not load user.", true); }
  finally { setBusy(false); }
});
$("grantForm").addEventListener("submit", async event => {
  event.preventDefault();
  if (busy) return;
  if (!confirm("Save this user's adult eligibility and access decision? This will be recorded in the forum audit history.")) return;
  setBusy(true);
  try {
    await saveGrant();
    notify("Access decision saved. No forum rooms have been published.");
    $("adultReview").checked = false;
  } catch (error) { notify(error?.message || "Permission change failed.", true); }
  finally { setBusy(false); }
});
requireRoles(["admin", "super_admin"], user => {
  adminUid = user.uid;
  $("adminUI").hidden = false;
  notify("Administrator access confirmed. Search for an existing approved portal account.");
});
