// Keep gateway navigation available even when Firebase cannot load.
const tabs = [...document.querySelectorAll("[data-tab-target]")];

export function selectPanel(panelId) {
  if (!tabs.some(tab => tab.dataset.tabTarget === panelId)) return;
  document.querySelectorAll(".access-panel").forEach(panel => {
    panel.classList.toggle("active", panel.id === panelId);
  });
  tabs.forEach(tab => {
    const selected = tab.dataset.tabTarget === panelId;
    tab.classList.toggle("active", selected);
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });
}

function activate(tab) {
  selectPanel(tab.dataset.tabTarget);
  const hash = { loginPanel: "login", joinPanel: "join", schoolPanel: "school" }[tab.dataset.tabTarget];
  history.replaceState(null, "", `${location.pathname}${location.search}#${hash}`);
}

tabs.forEach((tab, index) => {
  tab.addEventListener("click", () => activate(tab));
  tab.addEventListener("keydown", event => {
    const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1
      : event.key === "ArrowRight" ? (index + 1) % tabs.length
      : event.key === "ArrowLeft" ? (index - 1 + tabs.length) % tabs.length : null;
    if (next === null) return;
    event.preventDefault();
    activate(tabs[next]);
    tabs[next].focus();
  });
});

function selectFromLocation() {
  const params = new URLSearchParams(location.search);
  selectPanel(params.get("schoolInvite") || location.hash === "#school" ? "schoolPanel"
    : params.get("school") || location.hash === "#join" ? "joinPanel" : "loginPanel");
}
selectFromLocation();
window.addEventListener("hashchange", selectFromLocation);
