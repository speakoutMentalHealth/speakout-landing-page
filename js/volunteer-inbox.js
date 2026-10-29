import { collection, doc, limit, onSnapshot, orderBy, query, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const categoryLabels = {
  onboarding: "Onboarding", assignment: "Assignment", programme: "Programme", general: "SpeakOut update"
};

export function subscribeVolunteerInbox(db, volunteerUid) {
  const list = document.getElementById("notificationList");
  const unread = document.getElementById("notificationUnread");
  const state = document.getElementById("notificationState");
  const ref = collection(db, "volunteerNotifications", volunteerUid, "messages");
  const inbox = query(ref, orderBy("createdAt", "desc"), limit(25));
  return onSnapshot(inbox, snapshot => {
    list.replaceChildren();
    let pending = 0;
    snapshot.forEach(record => {
      const message = record.data();
      if (!message.readAt) pending++;
      const item = document.createElement("article");
      item.className = "notice-item" + (!message.readAt ? " is-unread" : "");
      const header = document.createElement("div");
      header.className = "notice-item-header";
      const title = document.createElement("strong");
      title.textContent = message.title || "SpeakOut update";
      const label = document.createElement("span");
      label.className = "notice-category";
      label.textContent = categoryLabels[message.category] || categoryLabels.general;
      header.append(title, label);
      const body = document.createElement("p");
      body.textContent = message.body || "";
      item.append(header, body);
      const foot = document.createElement("div");
      foot.className = "notice-footer";
      const time = document.createElement("span");
      const date = message.createdAt?.toDate?.();
      time.textContent = date instanceof Date && !Number.isNaN(date.getTime())
        ? date.toLocaleString(undefined, {dateStyle:"medium", timeStyle:"short"})
        : "Recently";
      foot.append(time);
      if (!message.readAt) {
        const action = document.createElement("button");
        action.type = "button";
        action.className = "notice-read";
        action.textContent = "Mark as read";
        action.addEventListener("click", async () => {
          action.disabled = true;
          try {
            await updateDoc(doc(db, "volunteerNotifications", volunteerUid, "messages", record.id), {
              readAt: serverTimestamp()
            });
          } catch {
            action.disabled = false;
            state.textContent = "Could not mark the message as read. Please try again.";
          }
        });
        foot.append(action);
      }
      item.append(foot);
      list.append(item);
    });
    unread.textContent = String(pending);
    unread.hidden = pending === 0;
    const shortcutCount = document.getElementById("notificationNavCount");
    if (shortcutCount) {
      shortcutCount.textContent = String(pending);
      shortcutCount.hidden = pending === 0;
    }
    state.textContent = snapshot.empty
      ? "No notifications yet. SpeakOut will post your next updates here."
      : pending
        ? pending + " unread update" + (pending === 1 ? "" : "s") + "."
        : "You're up to date.";
  }, () => {
    state.textContent = "Notifications could not be loaded. Please check your connection and refresh.";
  });
}
