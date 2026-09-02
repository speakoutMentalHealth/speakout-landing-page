const menuBtn = document.querySelector(".menu");
const navHeader = document.querySelector(".nav");

if (menuBtn) {
  menuBtn.addEventListener("click", () => {
    const isOpen = document.body.classList.toggle("menu-open");
    menuBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");

    if (isOpen && navHeader) {
      document.documentElement.style.setProperty("--nav-panel-top", navHeader.getBoundingClientRect().bottom + "px");
    }
  });
}

document.querySelectorAll(".drop-toggle").forEach((btn) => {
  btn.addEventListener("click", (event) => {
    event.preventDefault();

    const drop = btn.closest(".drop");
    if (!drop) return;

    const isOpen = drop.classList.toggle("open");
    btn.setAttribute("aria-expanded", isOpen ? "true" : "false");

    if (window.innerWidth <= 1180 && isOpen) {
      document.querySelectorAll(".drop.open").forEach((otherDrop) => {
        if (otherDrop !== drop) {
          otherDrop.classList.remove("open");
          const otherBtn = otherDrop.querySelector(".drop-toggle");
          if (otherBtn) otherBtn.setAttribute("aria-expanded", "false");
        }
      });
    }
  });
});

document.addEventListener("click", (event) => {
  const clickedInsideNav = event.target.closest(".nav");

  if (!clickedInsideNav) {
    document.body.classList.remove("menu-open");

    if (menuBtn) {
      menuBtn.setAttribute("aria-expanded", "false");
    }

    document.querySelectorAll(".drop.open").forEach((drop) => {
      drop.classList.remove("open");

      const btn = drop.querySelector(".drop-toggle");
      if (btn) btn.setAttribute("aria-expanded", "false");
    });
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    document.body.classList.remove("menu-open");

    if (menuBtn) {
      menuBtn.setAttribute("aria-expanded", "false");
    }

    document.querySelectorAll(".drop.open").forEach((drop) => {
      drop.classList.remove("open");

      const btn = drop.querySelector(".drop-toggle");
      if (btn) btn.setAttribute("aria-expanded", "false");
    });
  }
});

document.querySelectorAll(".links a, .nav-actions a").forEach((link) => {
  link.addEventListener("click", () => {
    document.body.classList.remove("menu-open");

    if (menuBtn) {
      menuBtn.setAttribute("aria-expanded", "false");
    }
  });
});

/* Filter Cards */
document.querySelectorAll("[data-filter]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const filter = btn.dataset.filter;

    document.querySelectorAll("[data-filter]").forEach((item) => {
      item.classList.remove("active");
    });

    btn.classList.add("active");

    document.querySelectorAll("[data-category]").forEach((card) => {
      const category = card.dataset.category;
      const shouldShow = filter === "all" || category === filter;

      card.style.display = shouldShow ? "block" : "none";
    });
  });
});

/* Reveal Animation */
const revealItems = document.querySelectorAll(".reveal");

if (revealItems.length) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("show");
        }
      });
    },
    { threshold: 0.15 }
  );

  revealItems.forEach((item) => revealObserver.observe(item));
}

/* Animated Counters */
const counters = document.querySelectorAll("[data-count]");

if (counters.length) {
  const counterObserver = new IntersectionObserver(
    (entries) => {
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

          if (progress < 1) {
            requestAnimationFrame(tick);
          } else {
            entry.target.textContent = target.toLocaleString() + "+";
          }
        }

        requestAnimationFrame(tick);
      });
    },
    { threshold: 0.6 }
  );

  counters.forEach((counter) => counterObserver.observe(counter));
}