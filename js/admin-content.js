
import { db } from "./firebase-config.js";
import { collection, addDoc, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const pageType = document.body.dataset.cmsType;
const collectionMap = {
  news: "newsEvents",
  media: "homepageMedia",
  resources: "studentResources",
  settings: "siteSettings"
};

const colName = collectionMap[pageType];
const form = document.getElementById("contentForm");
const tbody = document.getElementById("contentTable");

async function loadItems(){
  if(!colName || !tbody) return;
  const snap = await getDocs(collection(db, colName));
  const items = snap.docs.map(d => ({id:d.id, ...d.data()}));

  if(!items.length){
    tbody.innerHTML = `<tr><td colspan="5" class="empty">No items yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = items.map(i => `
    <tr>
      <td>${i.title || i.key || "—"}</td>
      <td>${i.category || i.type || "—"}</td>
      <td>${i.status || "active"}</td>
      <td>${i.url || i.value || "—"}</td>
      <td>${i.featured ? "Yes" : "No"}</td>
    </tr>
  `).join("");
}

form?.addEventListener("submit", async e => {
  e.preventDefault();

  const data = {
    title: document.getElementById("title")?.value.trim(),
    category: document.getElementById("category")?.value.trim(),
    type: document.getElementById("type")?.value.trim(),
    url: document.getElementById("url")?.value.trim(),
    description: document.getElementById("description")?.value.trim(),
    status: document.getElementById("status")?.value || "active",
    featured: document.getElementById("featured")?.checked || false,
    createdAt: serverTimestamp()
  };

  if(pageType === "settings"){
    data.key = document.getElementById("title")?.value.trim();
    data.value = document.getElementById("url")?.value.trim();
  }

  await addDoc(collection(db, colName), data);
  form.reset();
  await loadItems();
});

loadItems();
