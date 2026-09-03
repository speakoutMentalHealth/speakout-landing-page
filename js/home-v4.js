const menuBtn = document.querySelector(".menu");
const nav = document.getElementById("siteNav");

if (menuBtn) {
  menuBtn.addEventListener("click", () => {
    const isOpen = document.body.classList.toggle("menu-open");
    menuBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");

    if (isOpen && nav) {
      document.documentElement.style.setProperty("--nav-panel-top", nav.getBoundingClientRect().bottom + "px");
    }
  });
}

document.querySelectorAll(".drop > button").forEach((btn) => {
  btn.addEventListener("click", () => {
    const parent = btn.parentElement;
    parent.classList.toggle("open");
    btn.setAttribute("aria-expanded", parent.classList.contains("open") ? "true" : "false");
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    document.body.classList.remove("menu-open");
    document.querySelectorAll(".drop.open").forEach((drop) => drop.classList.remove("open"));
    if (menuBtn) menuBtn.setAttribute("aria-expanded", "false");
  }
});

document.querySelectorAll(".links a, .nav-actions a").forEach((link) => {
  link.addEventListener("click", () => {
    document.body.classList.remove("menu-open");
    if (menuBtn) menuBtn.setAttribute("aria-expanded", "false");
  });
});

window.addEventListener("scroll", () => {
  if (!nav) return;
  nav.classList.toggle("shrink", window.scrollY > 40);
}, { passive: true });

document.querySelectorAll(".links > a, .drop-menu a").forEach((link) => {
  const href = link.getAttribute("href") || "";
  if (href.startsWith("#")) return;

  if (link.pathname === location.pathname) {
    link.classList.add("active");
    const parentDrop = link.closest(".drop");
    if (parentDrop) {
      const toggle = parentDrop.querySelector("button");
      if (toggle) toggle.classList.add("active");
    }
  }
});

const revealItems = document.querySelectorAll(".reveal");
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add("show");
  });
}, { threshold: 0.15 });

revealItems.forEach((item) => revealObserver.observe(item));

const counters = document.querySelectorAll("[data-count]");
const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting || entry.target.dataset.done) return;

    entry.target.dataset.done = "true";
    const target = Number(entry.target.dataset.count || "0");
    const duration = 1200;
    const start = performance.now();

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.floor(target * eased);
      entry.target.textContent = value.toLocaleString() + "+";

      if (progress < 1) requestAnimationFrame(tick);
      else entry.target.textContent = target.toLocaleString() + "+";
    }

    requestAnimationFrame(tick);
  });
}, { threshold: 0.6 });

counters.forEach((counter) => counterObserver.observe(counter));
