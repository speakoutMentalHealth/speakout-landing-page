import { db } from "../firebase-config.js";
import { requireRoles } from "../launch-role-guard.js";
import { collection, doc, getDocs, serverTimestamp, writeBatch } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
import { normalizedSlug, privacyWarning, roomState, STARTER_ROOMS, VISIBILITIES, STATUSES } from "./forum-room-state.js";

const statusBox = document.getElementById("status");
const adminUI = document.getElementById("adminUI");
const form = document.getElementById("newRoomForm");
const list = document.getElementById("roomList");
const seedButton = document.getElementById("seedRooms");
let activeUser = null;
let rooms = new Map();
let busy = false;

function notice(message, error = false) {
  statusBox.textContent = message;
  statusBox.classList.toggle("error", error);
}
function setBusy(flag) {
  busy = flag;
  for (const control of adminUI.querySelectorAll("button,input,select,textarea")) control.disabled = flag;
}
function field(tag, labelText, values, initial) {
  const label = document.createElement("label");
  label.textContent = labelText;
  const input = document.createElement(tag);
  input.setAttribute("aria-label", labelText);
  for (const value of values) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value.replaceAll("_", " ");
    input.append(option);
  }
  input.value = initial;
  const wrapper = document.createElement("div");
  wrapper.append(label, input);
  return { wrapper, input };
}
function button(label, action, className = "") {
  const element = document.createElement("button");
  element.type = "button";
  element.className = className;
  element.textContent = label;
  element.addEventListener("click", action);
  return element;
}
async function refresh() {
  // This reads only unpublished configuration for approved admin/super_admin.
  const snapshot = await getDocs(collection(db, "forumRooms"));
  rooms = new Map(snapshot.docs.map(record => [record.id, { ...record.data(), id: record.id }]));
  renderRooms();
}
function renderRooms() {
  list.replaceChildren();
  if (!rooms.size) {
    const empty = document.createElement("p");
    empty.textContent = "No rooms created. Use the starter-room button or create a new room.";
    list.append(empty);
    return;
  }
  for (const room of [...rooms.values()].sort((a, b) => a.title.localeCompare(b.title))) {
    const article = document.createElement("article");
    article.className = "room";
    const heading = document.createElement("div");
    heading.className = "room-head";
    const name = document.createElement("h3");
    name.className = "room-title";
    name.textContent = room.title;
    const badge = document.createElement("span");
    badge.className = "pill";
    badge.textContent = "Not published · " + room.id;
    heading.append(name, badge);
    const summary = document.createElement("p");
    summary.className = "muted";
    summary.textContent = room.description || "No description yet.";
    const controls = document.createElement("div");
    controls.className = "grid";
    const visibility = field("select", "Visibility", VISIBILITIES, room.visibility);
    const state = field("select", "Room status", STATUSES, room.status);
    controls.append(visibility.wrapper, state.wrapper);
    const actions = document.createElement("div");
    actions.className = "actions";
    actions.append(
      button("Save controls", async () => {
        if (busy) return;
        const next = roomState({ ...room, visibility: visibility.input.value, status: state.input.value });
        if (next.visibility === room.visibility && next.status === room.status) {
          notice("There are no changes to save."); return;
        }
        if (privacyWarning(room.visibility, next.visibility) &&
          !window.confirm("This room is currently private. This changes its intended audience, but no existing private discussions will be published. Continue?")) return;
        await handleAction(async () => updateRoom(room, next, "Administrator changed room controls"));
      }),
      button(room.status === "locked" ? "Reopen room" : "Lock room", async () => {
        if (busy) return;
        const status = room.status === "locked" ? "open" : "locked";
        const reason = status === "locked" ? "Room locked by administrator" : "Room reopened by administrator";
        await handleAction(async () => updateRoom(room, { ...room, status }, reason));
      }, room.status === "locked" ? "outline" : "danger")
    );
    const note = document.createElement("small");
    note.textContent = "All access remains admin-only until the safeguarding release gate. Reopening does not change visibility.";
    article.append(heading, summary, controls, actions, note);
    list.append(article);
  }
}
function writeAudit(batch, roomRef, before, after, revision, reason) {
  const auditRef = doc(collection(db, "forumRoomAudits"));
  const record = {
    roomId: roomRef.id,
    actorUid: activeUser.uid,
    previousVisibility: before?.visibility ?? "none",
    nextVisibility: after.visibility,
    previousStatus: before?.status ?? "none",
    nextStatus: after.status,
    revision,
    reason,
    changedAt: serverTimestamp()
  };
  batch.set(auditRef, record);
  return auditRef.id;
}
async function createRoom(data, id = normalizedSlug(data.title), reason = "Administrator created room") {
  const safe = roomState(data);
  if (rooms.has(id)) throw new Error("A room already uses this address.");
  const roomRef = doc(db, "forumRooms", id);
  const batch = writeBatch(db);
  const auditId = writeAudit(batch, roomRef, null, safe, 1, reason);
  batch.set(roomRef, {
    ...safe,
    published: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    updatedBy: activeUser.uid,
    version: 1,
    auditId
  });
  await batch.commit();
}
async function updateRoom(room, next, reason) {
  const safe = roomState(next);
  const roomRef = doc(db, "forumRooms", room.id);
  const batch = writeBatch(db);
  const revision = room.version + 1;
  const auditId = writeAudit(batch, roomRef, room, safe, revision, reason);
  batch.update(roomRef, {
    ...safe,
    published: false,
    updatedAt: serverTimestamp(),
    updatedBy: activeUser.uid,
    version: revision,
    auditId
  });
  await batch.commit();
}
async function handleAction(action) {
  setBusy(true);
  notice("Saving securely…");
  try {
    await action();
    await refresh();
    notice("Room controls saved. The room remains unpublished.");
  } catch (error) {
    notice("Could not save: " + (error?.message || "Please retry."), true);
  } finally {
    setBusy(false);
  }
}
form.addEventListener("submit", event => {
  event.preventDefault();
  if (busy) return;
  const title = document.getElementById("newTitle").value;
  const newRoom = {
    title,
    description: document.getElementById("newDescription").value,
    visibility: document.getElementById("newVisibility").value,
    status: document.getElementById("newStatus").value
  };
  handleAction(async () => {
    await createRoom(newRoom);
    form.reset();
  });
});
seedButton.addEventListener("click", () => {
  if (busy) return;
  const pending = STARTER_ROOMS.filter(room => !rooms.has(room.id));
  if (!pending.length) { notice("All six starter rooms already exist."); return; }
  if (!window.confirm("Create " + pending.length + " unpublished starter room(s)? No member will gain access.")) return;
  handleAction(async () => {
    for (const starter of pending) await createRoom(starter, starter.id, "Starter room created by administrator");
  });
});
requireRoles(["admin", "super_admin"], async user => {
  activeUser = user;
  adminUI.hidden = false;
  try {
    await refresh();
    notice("Admin access confirmed. Forum rooms are in closed setup mode.");
  } catch (error) {
    notice("Unable to load rooms. Check database access before continuing: " + (error?.message || "Unknown error."), true);
  }
});
