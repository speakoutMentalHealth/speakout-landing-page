import { db } from "../firebase-config.js";
import { requireRoles } from "../launch-role-guard.js";
import { collection, doc, getDocs, query, where, writeBatch, serverTimestamp, limit } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const $ = id => document.getElementById(id);
let actorUid = "";
let busy = false;
function notice(message, bad = false) {
  $("status").textContent = message;
  $("status").classList.toggle("error", Boolean(bad));
}
function text(tag, value, className = "") {
  const n = document.createElement(tag);
  n.className = className;
  n.textContent = String(value ?? "");
  return n;
}
function button(label, click, danger = false) {
  const el = document.createElement("button");
  el.type = "button";
  if (danger) el.className = "danger";
  el.textContent = label;
  el.addEventListener("click", click);
  return el;
}
async function review(kind, id, data, next) {
  if (busy) return;
  const reason = window.prompt("Enter a review reason (8–240 characters). Avoid personal/sensitive details.", next === "removed" ? "Removed for community safety" : "Reviewed against community guidelines");
  if (reason === null) return;
  const cleanReason = reason.trim();
  if (cleanReason.length < 8 || cleanReason.length > 240) {
    notice("Decision reason must be between 8 and 240 characters.", true);
    return;
  }
  const roomRef = kind === "topic" ? "forumTopics" : "forumReplies";
  const docRef = doc(db, roomRef, id);
  const eventRef = doc(collection(db, "forumModerationAudits"));
  const batch = writeBatch(db);
  batch.update(docRef, {
    moderationStatus: next,
    moderationAuditId: eventRef.id,
    updatedAt: serverTimestamp()
  });
  batch.set(eventRef, {
    kind, itemId: id, roomId: data.roomId,
    actorUid, previousStatus: data.moderationStatus, nextStatus: next,
    changedAt: serverTimestamp(), reason: cleanReason
  });
  busy = true;
  notice("Saving review and audit record…");
  try {
    await batch.commit();
    await refresh();
    notice("Moderation decision recorded.");
  } catch (error) {
    notice("Review failed: " + (error.message || "Try again."), true);
  } finally { busy = false; }
}
async function loadContent(kind, collectionName, container) {
  const snap = await getDocs(query(collection(db, collectionName), where("moderationStatus", "==", "pending"), limit(40)));
  if (snap.empty) {
    container.append(text("p", "No pending " + kind + "s."));
    return;
  }
  snap.forEach(item => {
    const data = item.data();
    const card = document.createElement("article");
    card.className = "card";
    card.append(text("h3", data.title || (kind === "reply" ? "Reply" : "Discussion")),
      text("small", "Room: " + data.roomId + " • Author UID: " + data.authorUid),
      text("p", data.body, "content"));
    const actions = document.createElement("div");
    actions.className = "actions";
    actions.append(
      button("Approve", () => review(kind, item.id, data, "approved")),
      button("Remove", () => review(kind, item.id, data, "removed"), true)
    );
    card.append(actions);
    container.append(card);
  });
}
async function loadReports() {
  const box = $("reports");
  box.replaceChildren();
  const snap = await getDocs(query(collection(db, "forumReports"), limit(40)));
  if (snap.empty) { box.append(text("p", "No safety reports.")); return; }
  snap.forEach(item => {
    const report = item.data();
    const card = document.createElement("article");
    card.className = "card";
    card.append(
      text("strong", report.reason || "Report"),
      text("p", "Room: " + report.roomId + " · Target: " + report.targetType + " · ID: " + report.targetId),
      text("small", "Reporter account: " + report.reporterUid)
    );
    box.append(card);
  });
}
async function refresh() {
  $("pending").replaceChildren();
  $("reports").replaceChildren();
  try {
    await Promise.all([
      loadContent("topic", "forumTopics", $("pending")),
      loadContent("reply", "forumReplies", $("pending")),
      loadReports()
    ]);
    notice("Review queue loaded. All rooms remain unpublished.");
  } catch (error) {
    notice("Could not load review queue: " + (error.message || "Unknown error."), true);
  }
}
$("refresh").addEventListener("click", () => { if (!busy) refresh(); });
requireRoles(["admin", "super_admin"], async user => {
  actorUid = user.uid;
  $("adminUI").hidden = false;
  await refresh();
});
