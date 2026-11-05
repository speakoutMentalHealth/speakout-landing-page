import { db } from "../firebase-config.js";
import { requireRoles } from "../launch-role-guard.js";
import { SO } from "../dashboard-shared.js";
import { adminApi } from "./platform-api.js";
import { collection, getDocs, orderBy, query, limit, startAfter } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
import { cmsErrorMessage } from "./cms-error-guidance.js";

const humanize = value => String(value || "")
  .replace(/([a-z])([A-Z])/g, "$1 $2")
  .replace(/^./, letter => letter.toUpperCase());

export function createAdminCmsController({ collectionName, fieldIds, libraryFields = [], thumbnailField = "", pageSize = 0 }) {
  const rows = document.getElementById("rows");
  const form = document.getElementById("cmsForm");
  const statusBox = document.getElementById("statusBox");
  const submitButton = form.querySelector('button[type="submit"]');
  let items = [];
  let editingId = null;
  let busy = false;
  let lastDoc = null;
  let hasMore = false;

  statusBox.setAttribute("role", "status");
  statusBox.setAttribute("aria-live", "polite");
  form.setAttribute("aria-busy", "false");
  document.querySelectorAll(".side a,.studio-side a").forEach(link => {
    if (new URL(link.href, window.location.href).pathname === window.location.pathname) {
      link.setAttribute("aria-current", "page");
    }
  });

  for (const id of fieldIds) {
    const control = document.getElementById(id);
    if (!control || control.closest("label")) continue;
    const label = document.createElement("label");
    label.className = `cms-field cms-field-${id}`;
    const labelText = document.createElement("span");
    labelText.textContent = control.placeholder || humanize(id);
    control.removeAttribute("placeholder");
    control.setAttribute("aria-label", labelText.textContent);
    control.parentNode.insertBefore(label, control);
    label.append(labelText, control);
  }
  document.getElementById(fieldIds[0])?.setAttribute("required", "");

  const cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.className = "btn soft cms-cancel";
  cancelButton.textContent = "Cancel edit";
  cancelButton.hidden = true;
  submitButton.insertAdjacentElement("afterend", cancelButton);

  const table = rows.closest("table");
  const toolbar = document.createElement("div");
  toolbar.className = "cms-toolbar";
  toolbar.innerHTML = '<strong id="recordCount">0 records</strong><span>Newest changes are saved securely.</span>';
  table.parentElement.insertBefore(toolbar, table);
  const recordCount = toolbar.querySelector("#recordCount");
  const loadMoreButton = document.createElement("button");
  loadMoreButton.type = "button";
  loadMoreButton.className = "btn soft cms-load-more";
  loadMoreButton.textContent = "Load more records";
  loadMoreButton.hidden = true;
  table.parentElement.append(loadMoreButton);

  const show = (message, tone = "") => {
    statusBox.textContent = message;
    statusBox.className = `notice ${tone}`.trim();
  };

  function setBusy(value, message = "") {
    busy = value;
    form.setAttribute("aria-busy", String(value));
    form.querySelectorAll("input,select,textarea,button").forEach(control => { control.disabled = value; });
    rows.querySelectorAll("button").forEach(button => { button.disabled = value; });
    if (message) show(message);
  }

  function resetEditor() {
    const previousId = editingId;
    editingId = null;
    form.reset();
    submitButton.textContent = "Save record";
    cancelButton.hidden = true;
    document.querySelectorAll("[data-edit]").forEach(button => button.removeAttribute("aria-current"));
    document.dispatchEvent(new CustomEvent("cms:edit-reset", { detail: { collectionName, previousId } }));
  }

  function startEditing(item, button) {
    editingId = item.id;
    for (const id of fieldIds) {
      const control = document.getElementById(id);
      if (control) control.value = item[id] ?? "";
    }
    submitButton.textContent = "Update record";
    cancelButton.hidden = false;
    document.querySelectorAll("[data-edit]").forEach(candidate => candidate.removeAttribute("aria-current"));
    button.setAttribute("aria-current", "true");
    show(`Editing ${item.title || "record"}.`, "ok");
    document.dispatchEvent(new CustomEvent("cms:edit-start", { detail: { collectionName, item: { ...item } } }));
    form.scrollIntoView({ behavior: "smooth", block: "center" });
    document.getElementById(fieldIds[0])?.focus();
  }

  function render() {
    recordCount.textContent = `${items.length} ${items.length === 1 ? "record" : "records"}${hasMore ? " loaded; more available" : ""}`;
    loadMoreButton.hidden = !hasMore;
    rows.innerHTML = items.map(item => {
      const title = item.title || item.name || item.label || "Untitled";
      const thumbnail = thumbnailField && /^https?:\/\//iu.test(String(item[thumbnailField] || "")) ? String(item[thumbnailField]) : "";
      const titleCell = '<td data-label="Title"><div class="cms-title-cell">'+(thumbnail?'<img class="cms-row-thumb" src="'+SO.safe(thumbnail)+'" alt="" loading="lazy">':'')+'<div><strong>'+SO.safe(title)+'</strong><small class="cms-row-sub" data-record-sub="'+SO.safe(item.id)+'"></small></div></div></td>';
      const extraCells = libraryFields.map(id => '<td data-label="'+SO.safe(humanize(id))+'" data-library-field="'+SO.safe(id)+'">'+SO.safe(item[id] ?? "—")+'</td>').join("");
      return '<tr class="row" data-record-id="'+SO.safe(item.id)+'">'+titleCell+extraCells+'<td data-label="Status"><span class="cms-status cms-status-'+SO.safe(item.status || "active")+'">'+SO.safe(item.status || "active")+'</span></td><td data-label="Order">'+SO.safe(item.order ?? 0)+'</td><td data-label="Actions"><div class="actions"><button class="btn soft" data-edit="'+SO.safe(item.id)+'" type="button" aria-label="Edit '+SO.safe(title)+'">Edit</button><button class="btn dark" data-hide="'+SO.safe(item.id)+'" type="button" aria-label="Hide '+SO.safe(title)+'">Hide</button><button class="btn cms-danger" data-del="'+SO.safe(item.id)+'" type="button" aria-label="Delete '+SO.safe(title)+'">Delete</button></div></td></tr>';
    }).join("") || '<tr><td class="cms-empty" colspan="'+(4+libraryFields.length)+'">No records yet. Use the form above to create the first one.</td></tr>';

    rows.querySelectorAll("[data-edit]").forEach(button => {
      button.onclick = () => startEditing(items.find(item => item.id === button.dataset.edit), button);
    });
    rows.querySelectorAll("[data-hide]").forEach(button => {
      button.onclick = async () => {
        try {
          setBusy(true, "Hiding record…");
          await adminApi.setContentStatus(collectionName, button.dataset.hide, "hidden");
          items = items.map(item => item.id === button.dataset.hide ? { ...item, status: "hidden" } : item);
          render();
          show("Record hidden.", "ok");
        } catch (error) {
          console.error("CMS hide failed", { code: error?.code, status: error?.status });
          show(cmsErrorMessage(error, "save"), "bad");
        } finally { setBusy(false); }
      };
    });
    document.dispatchEvent(new CustomEvent("cms:render", {
      detail: { collectionName, items: items.map(item => ({ ...item })) }
    }));

    rows.querySelectorAll("[data-del]").forEach(button => {
      button.onclick = async () => {
        const item = items.find(candidate => candidate.id === button.dataset.del);
        if (!confirm(`Delete “${item?.title || "this record"}”? This cannot be undone.`)) return;
        try {
          setBusy(true, "Deleting record…");
          await adminApi.deleteContent(collectionName, button.dataset.del);
          if (editingId === button.dataset.del) resetEditor();
          items = items.filter(item => item.id !== button.dataset.del);
          render();
          show("Record deleted.", "ok");
        } catch (error) {
          console.error("CMS delete failed", { code: error?.code, status: error?.status });
          show(cmsErrorMessage(error, "save"), "bad");
        } finally { setBusy(false); }
      };
    });
  }

  async function load({ append = false } = {}) {
    try {
      let request = query(collection(db, collectionName), orderBy("order", "asc"));
      if (pageSize > 0) {
        const constraints = [orderBy("order", "asc")];
        if (append && lastDoc) constraints.push(startAfter(lastDoc));
        constraints.push(limit(pageSize + 1));
        request = query(collection(db, collectionName), ...constraints);
      }
      const snapshot = await getDocs(request);
      const docs = snapshot.docs;
      const visible = pageSize > 0 ? docs.slice(0, pageSize) : docs;
      const loaded = visible.map(document => ({ id: document.id, ...document.data() }));
      items = append ? [...items, ...loaded.filter(item => !items.some(old => old.id === item.id))] : loaded;
      lastDoc = visible.at(-1) || null;
      hasMore = pageSize > 0 && docs.length > pageSize;
      render();
      return true;
    } catch (error) {
      console.error("CMS load failed", { code: error?.code, status: error?.status });
      show(cmsErrorMessage(error, "load"), "bad");
      return false;
    }
  }

  loadMoreButton.onclick = async () => {
    if (busy || !hasMore) return;
    loadMoreButton.disabled = true;
    try { await load({ append: true }); }
    finally { loadMoreButton.disabled = false; }
  };

  form.onsubmit = async event => {
    event.preventDefault();
    if (busy) return;
    const payload = Object.fromEntries(fieldIds.map(id => [id, document.getElementById(id)?.value?.trim() || ""]));
    payload.order = Number(payload.order || 0);
    try {
      setBusy(true, editingId ? "Updating record…" : "Saving record…");
      const result = await adminApi.upsertContent(collectionName, editingId, payload);
      const id = String(result?.id || editingId || "");
      if (id) {
        const previous = items.find(item => item.id === id);
        items = [{ ...(previous || {}), ...payload, id }, ...items.filter(item => item.id !== id)];
        if (pageSize > 0 && items.length > pageSize) items.length = pageSize;
        render();
      }
      resetEditor();
      show("Saved. The record was confirmed by the secure publishing service.", "ok");
    } catch (error) {
      console.error("CMS save failed", { code: error?.code, status: error?.status });
      show(cmsErrorMessage(error, "save"), "bad");
    } finally { setBusy(false); }
  };

  cancelButton.onclick = () => {
    resetEditor();
    show("Edit cancelled.");
  };

  setBusy(true);
  requireRoles(["admin", "super_admin"], async () => {
    const loaded = await load();
    setBusy(false);
    if (loaded) show("Content ready.", "ok");
  });
}
