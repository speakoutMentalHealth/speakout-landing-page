import { auth, db } from "../firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { collection, doc, getDoc, getDocs, query, where, limit, writeBatch, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

// This is a delegated moderator UI, not an authorization service. Firestore rules
// enforce verified adulthood, exact room assignment, gate validity and audit pairing.
const $ = id => document.getElementById(id);
const SAFE_ID = /^[a-z][a-z0-9-]{2,55}$/;
let actorUid = "";
let rooms = new Map();
let busy = false;
let generation = 0;

function notice(message, error = false) {
  $("status").textContent = message;
  $("status").classList.toggle("error", Boolean(error));
}
function node(tag, content, cls = "") {
  const el = document.createElement(tag);
  el.className = cls;
  el.textContent = String(content ?? "");
  return el;
}
function control(text, action, danger = false) {
  const el = node("button", text, danger ? "danger" : "primary");
  el.type = "button";
  el.addEventListener("click", action);
  return el;
}
function selectedRoom() {
  const id = $("roomChoice").value;
  return rooms.has(id) ? id : "";
}
function setBusy(value) {
  busy = value;
  $("workspace").querySelectorAll("button,select").forEach(el => { el.disabled = value; });
}
async function inspectModeratorAccount(user) {
  if (!user) throw Error("Sign in to your approved SpeakOut adult account before opening moderation.");
  const [profile, grant] = await Promise.all([
    getDoc(doc(db, "users", user.uid)),
    getDoc(doc(db, "forumAccessGrants", user.uid))
  ]);
  if (!profile.exists() || profile.data().status !== "approved" ||
    profile.data().role === "student" || !grant.exists()) {
    throw Error("An approved non-student account is required.");
  }
  const g = grant.data();
  if (g.active !== true || g.adultVerified !== true ||
    g.memberRole !== "moderator" || !Array.isArray(g.moderatedRoomIds)) {
    throw Error("Your adult moderator assignment is not active.");
  }
  rooms = new Map();
  for (const id of [...new Set(g.moderatedRoomIds)].filter(x => SAFE_ID.test(x))) {
    try {
      const record = await getDoc(doc(db, "forumRooms", id));
      const r = record.data();
      if (record.exists() && r?.published === true && r?.visibility === "private" &&
        r?.status !== "locked") rooms.set(id, r);
    } catch {
      // Never reveal unpublished or unauthorised room details.
    }
  }
  if (!rooms.size) throw Error("No authorised private pilot rooms are currently available. The release may be closed or expired.");
  const select = $("roomChoice");
  select.replaceChildren();
  for (const [id, r] of rooms) {
    const option = node("option", r.title);
    option.value = id;
    select.append(option);
  }
}
async function decide(kind, itemId, data, decision) {
  if (busy || !selectedRoom() || data.roomId !== selectedRoom()) return;
  const reason = window.prompt("Reason for the " + decision + " decision (8–240 characters, no private information):",
    decision === "removed" ? "Removed under community safety guidelines" : "Reviewed and approved under community guidelines");
  if (reason === null) return;
  const clean = reason.trim();
  if (clean.length < 8 || clean.length > 240) {
    notice("Review reason must be between 8 and 240 characters.", true);
    return;
  }
  const collectionName = kind === "topic" ? "forumTopics" : "forumReplies";
  const itemRef = doc(db, collectionName, itemId);
  const auditRef = doc(collection(db, "forumModerationAudits"));
  const batch = writeBatch(db);
  batch.update(itemRef, {
    moderationStatus: decision,
    moderationAuditId: auditRef.id,
    updatedAt: serverTimestamp()
  });
  batch.set(auditRef, {
    kind, itemId, roomId: data.roomId, actorUid,
    previousStatus: data.moderationStatus, nextStatus: decision,
    changedAt: serverTimestamp(), reason: clean
  });
  setBusy(true);
  notice("Saving moderated decision and immutable audit…");
  let saved = false;
  try {
    await batch.commit();
    saved = true;
  } catch {
    notice("Could not save decision. Your assignment or pilot may have expired. Refresh and try again.", true);
  } finally { setBusy(false); }
  if (saved) {
    await refreshQueue();
    if (!$("status").classList.contains("error")) {
      notice("Moderation decision recorded in the assigned room.");
    }
  }
}
function showPending(kind, snap, container) {
  if (snap.empty) {
    container.append(node("p", "No pending " + (kind === "topic" ? "discussions." : "replies."), "muted"));
    return;
  }
  snap.forEach(record => {
    const d = record.data();
    const card = node("article", "", "record");
    card.append(node("h3", d.title || (kind === "topic" ? "Discussion" : "Reply")),
      node("p", d.body));
    const meta = node("small", "Awaiting review · Assigned private room");
    card.append(meta);
    const actions = node("div", "", "actions");
    actions.append(
      control("Approve", () => decide(kind, record.id, d, "approved")),
      control("Remove", () => decide(kind, record.id, d, "removed"), true)
    );
    card.append(actions);
    container.append(card);
  });
}
async function showReports(snap, container) {
  if (snap.empty) { container.append(node("p", "No reports in this private room.", "muted")); return; }
  snap.forEach(record => {
    const d = record.data();
    const card = node("article", "", "record");
    card.append(node("h3", "Reported " + d.targetType),
      node("p", "Reason: " + d.reason),
      node("small", "Review the reported content before taking action."));
    if (["topic", "reply"].includes(d.targetType) && typeof d.targetId === "string") {
      const box = node("div", "", "actions");
      box.append(control("Inspect reported content", async () => {
        if (busy) return;
        const collectionName = d.targetType === "topic" ? "forumTopics" : "forumReplies";
        try {
          const target = await getDoc(doc(db, collectionName, d.targetId));
          if (!target.exists() || target.data().roomId !== selectedRoom()) {
            notice("Reported item is unavailable in this room.", true); return;
          }
          const item = target.data();
          const shown = card.querySelector(".reported-content") || node("p", "", "reported-content");
          shown.textContent = item.body;
          card.insertBefore(shown, box);
          if (item.moderationStatus !== "removed" && !box.querySelector("[data-remove]")) {
            const action = control("Remove reported content", () => decide(d.targetType, d.targetId, item, "removed"), true);
            action.dataset.remove = "true";
            box.append(action);
          }
        } catch {
          notice("Could not inspect the report. Check your room assignment.", true);
        }
      }));
      card.append(box);
    }
    container.append(card);
  });
}
async function refreshQueue() {
  const roomId = selectedRoom();
  if (!roomId || busy) return;
  const serial = ++generation;
  const selectors = ["topics","replies","reports"];
  selectors.forEach(id => $(id).replaceChildren(node("p", "Loading…", "muted")));
  $("roomStatus").textContent = "Only this assigned private room is queried; other rooms are not visible.";
  try {
    const room = await getDoc(doc(db, "forumRooms", roomId));
    if (!room.exists() || room.data().published !== true ||
      room.data().visibility !== "private" || room.data().status === "locked") {
      throw Error("Private room no longer open.");
    }
    const [topics, replies, reports] = await Promise.all([
      getDocs(query(collection(db, "forumTopics"), where("roomId", "==", roomId),
        where("moderationStatus", "==", "pending"), limit(30))),
      getDocs(query(collection(db, "forumReplies"), where("roomId", "==", roomId),
        where("moderationStatus", "==", "pending"), limit(30))),
      getDocs(query(collection(db, "forumReports"), where("roomId", "==", roomId), limit(30)))
    ]);
    if (serial !== generation) return;
    selectors.forEach(id => $(id).replaceChildren());
    showPending("topic", topics, $("topics"));
    showPending("reply", replies, $("replies"));
    await showReports(reports, $("reports"));
    notice("Your assigned moderator queue is ready. Refresh to see new submissions.");
  } catch {
    if (serial !== generation) return;
    selectors.forEach(id => $(id).replaceChildren());
    notice("Could not load the restricted queue. The pilot may be closed, or a database index may still be building.", true);
  }
}
$("roomChoice").addEventListener("change", refreshQueue);
$("refresh").addEventListener("click", refreshQueue);
onAuthStateChanged(auth, async user => {
  generation++;
  actorUid = "";
  $("workspace").hidden = true;
  $("roomChoice").replaceChildren();
  try {
    await inspectModeratorAccount(user);
    actorUid = user.uid;
    $("workspace").hidden = false;
    await refreshQueue();
  } catch (error) {
    notice(error?.message || "Restricted moderator access unavailable.", true);
  }
});
