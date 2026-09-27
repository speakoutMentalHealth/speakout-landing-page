(() => {
  "use strict";

  if (window.speakoutMarketing?.version) return;

  const CAMPAIGN_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];

  const cleanText = (value, max = 120) =>
    String(value ?? "")
      .replace(/[\u0000-\u001f\u007f]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, max);

  const campaignContext = () => {
    const params = new URLSearchParams(window.location.search);
    const data = {};
    for (const key of CAMPAIGN_KEYS) {
      const value = cleanText(params.get(key), 100);
      if (value) data[key] = value;
    }

    if (document.referrer) {
      try {
        const host = new URL(document.referrer).hostname;
        if (host) data.referrer_host = cleanText(host, 120);
      } catch {
        // Ignore malformed or browser-sanitized referrers.
      }
    }

    return data;
  };

  const safeDetails = (details = {}) => {
    const result = {};
    for (const [key, rawValue] of Object.entries(details)) {
      if (!/^[a-z0-9_]{1,48}$/i.test(key)) continue;
      if (typeof rawValue === "number" || typeof rawValue === "boolean") {
        result[key] = rawValue;
        continue;
      }
      const value = cleanText(rawValue, 160);
      if (value) result[key] = value;
    }
    return result;
  };

  const track = (name, details = {}) => {
    const eventName = cleanText(name, 64).replace(/[^a-z0-9_]+/gi, "_").toLowerCase();
    if (!eventName) return;

    const payload = {
      event: `speakout_${eventName}`,
      event_name: eventName,
      page_path: window.location.pathname,
      ...campaignContext(),
      ...safeDetails(details)
    };

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(payload);
    document.dispatchEvent(new CustomEvent("speakout:marketing-event", { detail: payload }));
  };

  const classifyLink = (link) => {
    const rawHref = link.getAttribute("href") || "";
    if (!rawHref || rawHref.startsWith("#") || rawHref.startsWith("javascript:")) return null;

    if (rawHref.startsWith("mailto:")) {
      return { event: "email_contact", destination_type: "email" };
    }

    let url;
    try {
      url = new URL(rawHref, window.location.href);
    } catch {
      return null;
    }

    const path = url.pathname.toLowerCase();
    const host = url.hostname.toLowerCase();

    if (host === "wa.me" || host.endsWith(".whatsapp.com")) {
      return { event: "whatsapp_contact", destination_type: "whatsapp" };
    }
    if (host.includes("paystack")) {
      return { event: "donation_start", destination_type: "payment" };
    }
    if (path.includes("school-register")) {
      return { event: "school_registration_start", destination_type: "school_registration" };
    }
    if (path.includes("/pages/donate") || path.endsWith("/donate.html")) {
      return { event: "donation_start", destination_type: "donation_page" };
    }
    if (path.includes("/pages/volunteer") || path.endsWith("/volunteer.html")) {
      return { event: "volunteer_interest", destination_type: "volunteer" };
    }
    if (path.includes("/pages/contact") || path.endsWith("/contact.html")) {
      return { event: "contact_start", destination_type: "contact" };
    }
    if (path.includes("/pages/academy") || path.endsWith("/speakhub.html")) {
      return { event: "academy_interest", destination_type: "academy" };
    }
    if (path.endsWith("/tv.html") || path.includes("/watch.html") || path.includes("/show.html")) {
      return { event: "tv_open", destination_type: "media" };
    }
    if (path.includes("/auth/") || path.endsWith("/auth.html") || path.endsWith("/login.html")) {
      return { event: "portal_open", destination_type: "portal" };
    }

    return null;
  };

  document.addEventListener(
    "click",
    (event) => {
      const link = event.target.closest?.("a[href]");
      if (!link) return;
      const classification = classifyLink(link);
      if (!classification) return;

      const rawHref = link.getAttribute("href") || "";
      let destinationPath = "";
      try {
        const url = new URL(rawHref, window.location.href);
        if (url.origin === window.location.origin) destinationPath = url.pathname;
      } catch {
        // Keep destination blank rather than recording a raw URL.
      }

      track(classification.event, {
        destination_type: classification.destination_type,
        destination_path: destinationPath,
        link_text: link.getAttribute("aria-label") || link.textContent || ""
      });
    },
    true
  );

  document.addEventListener(
    "submit",
    (event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;

      let actionPath = "";
      try {
        const action = new URL(form.getAttribute("action") || window.location.href, window.location.href);
        if (action.origin === window.location.origin) actionPath = action.pathname;
      } catch {
        // Do not record malformed or external form destinations.
      }

      track("form_submit_intent", {
        form_id: form.id || "",
        form_name: form.getAttribute("name") || "",
        action_path: actionPath
      });
    },
    true
  );

  window.speakoutMarketing = Object.freeze({
    version: "1.0.0",
    track
  });

  track("page_view", { page_title: document.title });
})();