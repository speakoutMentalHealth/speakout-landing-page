import { auth, db } from "../firebase-config.js";
import { STARTER_ROOMS } from "./forum-room-state.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { collection, doc, getDoc, getDocs, query, where, limit, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const $ = id => document.getElementById(id);
const SAFE_ID = /^[a-z][a-z0-9-]{2,55}$/;
let actor = null;
let adultGrant = false;
let room = null;
let currentRoomId = null;
function filterRooms() {
  const search = ($("roomSearch")?.value || "").trim().toLocaleLowerCase();
  document.querySelectorAll("#rooms .room-button").forEach(button => {
    button.hidden = Boolean(search) && !button.textContent.toLocaleLowerCase().includes(search);
  });
}
function filterTopics() {
  const search = ($("topicSearch")?.value || "").trim().toLocaleLowerCase();
  document.querySelectorAll("#topics .post.topic-post").forEach(post => {
    post.hidden = Boolean(search) && !post.dataset.searchText.includes(search);
  });
}
$("roomSearch")?.addEventListener("input", filterRooms);
$("topicSearch")?.addEventListener("input", filterTopics);
function notice(message, error = false) {
  $("status").textContent = message;
  $("status").classList.toggle("error", Boolean(error));
}
function txt(tag, value) {
  const element = document.createElement(tag);
  element.textContent = String(value || "");
  return element;
}
async function isEligibleAdult(user) {
  if (!user) return { allowed: false, privateRooms: [] };
  try {
    const [profile, grant] = await Promise.all([
      getDoc(doc(db, "users", user.uid)),
      getDoc(doc(db, "forumAccessGrants", user.uid))
    ]);
    const valid = profile.exists() && profile.data().status === "approved" &&
      profile.data().role !== "student" && grant.exists() &&
      grant.data().active === true && grant.data().adultVerified === true;
    return { allowed: valid, privateRooms: valid ? grant.data().privateRoomIds || [] : [] };
  } catch {
    return { allowed: false, privateRooms: [] };
  }
}
async function loadRooms() {
  const grant = await isEligibleAdult(actor);
  adultGrant = grant.allowed;
  const possible = new Set(STARTER_ROOMS.map(r => r.id));
  for (const id of grant.privateRooms) if (SAFE_ID.test(id)) possible.add(id);
  const available = [];
  for (const id of possible) {
    try {
      const snap = await getDoc(doc(db, "forumRooms", id));
      if (snap.exists() && snap.data().published === true && snap.data().status !== "locked") {
        available.push({ id, ...snap.data() });
      }
    } catch {
      // No room details shown on denied lookups.
    }
  }
  const container = $("rooms");
  container.replaceChildren();
  if (!available.length) {
    container.append(txt("p", "No rooms have been published for your account."));
    $("discussion").hidden = true;
    $("communityEmpty").hidden = false;
    container.querySelector("p")?.classList.add("no-rooms");
    notice("Forum launch is pending. No discussions are open.");
    return;
  }
  for (const item of available) {
    const button = document.createElement("button");
    button.className = "room-button";
    button.type = "button";
    button.dataset.roomId = item.id;
    button.setAttribute("aria-current", "false");
    button.append(txt("span", item.title));
    button.addEventListener("click", () => showRoom(item));
    container.append(button);
  }
  filterRooms();
  notice(adultGrant ? "Verified adult forum access active." : "You can view public approved discussions. Adult approval is required to post.");
  const requested = new URLSearchParams(location.search).get("room");
  await showRoom(available.find(x => x.id === requested) || available[0]);
}
async function showRoom(item) {
  room = item;
  currentRoomId = item.id;
  $("discussion").hidden = false;
  $("communityEmpty").hidden = true;
  document.querySelectorAll("#rooms .room-button").forEach(button => {
    button.setAttribute("aria-current", String(button.dataset.roomId === item.id));
  });
  $("topicSearch").value = "";
  $("roomTitle").textContent = item.title;
  $("roomDescription").textContent = item.description;
  $("newTopic").hidden = !adultGrant || item.status !== "open";
  const list = $("topics");
  list.replaceChildren(txt("p", "Loading approved discussions…"));
  try {
    const q = query(collection(db, "forumTopics"),
      where("roomId", "==", item.id), where("moderationStatus", "==", "approved"), limit(40));
    const result = await getDocs(q);
    if (currentRoomId !== item.id) return;
    list.replaceChildren();
    if (result.empty) list.append(txt("p", "No approved discussions yet."));
    result.forEach(record => {
      const topic = record.data();
      const post = document.createElement("article");
      post.className = "post topic-post";
      post.dataset.searchText = (String(topic.title || "") + " " + String(topic.body || "")).toLocaleLowerCase();
      post.append(txt("h3", topic.title), txt("p", topic.body));
      post.lastChild.className = "post-body";
      post.append(txt("small", "Shared by a community member. Replies are moderated."));
      if (adultGrant) {
        const report = document.createElement("button");
        report.type = "button";
        report.textContent = "Report content";
        report.addEventListener("click", () => fileReport("topic", record.id, item.id));
        post.append(report);
      }
      const replies = document.createElement("div");
      replies.setAttribute("aria-label", "Approved replies");
      const show = document.createElement("button");
      show.textContent = "Show approved replies";
      show.type = "button";
      show.addEventListener("click", async () => {
        show.disabled = true;
        try {
          const result = await getDocs(query(collection(db, "forumReplies"),
            where("roomId", "==", item.id),
            where("topicId", "==", record.id),
            where("moderationStatus", "==", "approved"), limit(30)));
          replies.replaceChildren();
          if (result.empty) replies.append(txt("p", "No approved replies yet."));
          result.forEach(replyItem => {
            const response = document.createElement("div");
            response.className = "post";
            response.append(txt("p", replyItem.data().body));
            response.lastChild.className = "post-body";
            if (adultGrant) {
              const flag = document.createElement("button");
              flag.type = "button";
              flag.textContent = "Report reply";
              flag.addEventListener("click", () => fileReport("reply", replyItem.id, item.id));
              response.append(flag);
            }
            replies.append(response);
          });
        } catch { replies.replaceChildren(txt("p", "Replies are not available.")); }
        finally { show.disabled = false; }
      });
      post.append(show, replies);
      if (adultGrant && item.status === "open") {
        const form = document.createElement("form");
        const label = txt("label", "Write a reply");
        const input = document.createElement("textarea");
        input.required = true;
        input.minLength = 5;
        input.maxLength = 4000;
        const send = document.createElement("button");
        send.type = "submit";
        send.textContent = "Submit reply for review";
        form.append(label, input, send);
        form.addEventListener("submit", async event => {
          event.preventDefault();
          const body = input.value.trim();
          if (body.length < 5 || body.length > 4000) return;
          send.disabled = true;
          try {
            await addDoc(collection(db, "forumReplies"), {
              roomId: item.id, topicId: record.id, body,
              authorUid: actor.uid, moderationStatus: "pending",
              moderationAuditId: "none", createdAt: serverTimestamp(), updatedAt: serverTimestamp()
            });
            form.reset();
            notice("Reply submitted for moderator approval.");
          } catch { notice("Reply could not be submitted.", true); }
          finally { send.disabled = false; }
        });
        post.append(form);
      }
      list.append(post);
    });
    filterTopics();
  } catch {
    list.replaceChildren(txt("p", "Discussions are not available. Access may have changed."));
  }
}
async function fileReport(kind, targetId, roomId) {
  if (!adultGrant) return;
  const reason = prompt("Report reason: spam, harassment, privacy, unsafe or other");
  if (reason === null) return;
  const selected = reason.trim().toLowerCase();
  if (!["spam", "harassment", "privacy", "unsafe", "other"].includes(selected)) {
    notice("Please choose one of the listed report reasons.", true); return;
  }
  try {
    await addDoc(collection(db, "forumReports"), {
      roomId, targetType: kind, targetId, reason: selected,
      reporterUid: actor.uid, createdAt: serverTimestamp()
    });
    notice("Report received for moderation. If there is immediate danger, contact appropriate local emergency help.");
  } catch { notice("Report could not be submitted.", true); }
}
$("newTopic").addEventListener("submit", async event => {
  event.preventDefault();
  if (!adultGrant || !room || room.status !== "open" || room.published !== true || !actor) {
    notice("Room is unavailable for posting.", true);
    return;
  }
  const title = $("topicTitle").value.trim();
  const body = $("topicBody").value.trim();
  if (title.length < 5 || title.length > 140 || body.length < 5 || body.length > 4000) return;
  const submit = $("newTopic").querySelector("button[type=submit]");
  submit.disabled = true;
  try {
    await addDoc(collection(db, "forumTopics"), {
      roomId: room.id, title, body, authorUid: actor.uid,
      moderationStatus: "pending", moderationAuditId: "none",
      createdAt: serverTimestamp(), updatedAt: serverTimestamp()
    });
    $("newTopic").reset();
    notice("Discussion submitted. It will not appear publicly until a human moderator approves it.");
  } catch {
    notice("Discussion could not be submitted. Please check access and try again.", true);
  } finally { submit.disabled = false; }
});
onAuthStateChanged(auth, async user => {
  actor = user;
  try { await loadRooms(); }
  catch { notice("Community preview unavailable.", true); }
});
