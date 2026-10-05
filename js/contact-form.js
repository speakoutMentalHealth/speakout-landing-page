(() => {
  "use strict";

  const form = document.getElementById("contactForm");
  if (!form) return;

  const status = document.getElementById("contactFormStatus");
  const submitButton = form.querySelector('button[type="submit"]');
  let handingOff = false;

  const field = (name) => form.elements.namedItem(name);
  const clean = (value, max = 1000) =>
    String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

  const setBusy = (busy) => {
    handingOff = busy;
    form.setAttribute("aria-busy", busy ? "true" : "false");
    if (submitButton) submitButton.disabled = busy;
  };

  form.addEventListener("input", () => {
    if (!handingOff && status) status.textContent = "";
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (handingOff) return;

    if (!form.reportValidity()) return;

    const name = clean(field("full_name")?.value, 120);
    const email = clean(field("email")?.value, 160);
    const phone = clean(field("phone")?.value, 80);
    const reason = clean(field("reason")?.value, 120);
    const message = clean(field("message")?.value, 1200);

    const body = [
      "Hello SpeakOut, I am contacting you through the website.",
      "",
      `Name: ${name}`,
      `Email: ${email}`,
      phone ? `Phone / WhatsApp: ${phone}` : "",
      `Reason: ${reason}`,
      "",
      "Message:",
      message
    ].filter(Boolean).join("\n");

    const whatsappUrl = "https://wa.me/2348118103510?text=" + encodeURIComponent(body);

    if (status) status.textContent = "Opening WhatsApp with your message. Review it before sending.";
    setBusy(true);

    window.speakoutMarketing?.track?.("contact_form_handoff", { channel: "whatsapp", reason });

    const opened = window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    if (!opened) window.location.assign(whatsappUrl);

    window.setTimeout(() => setBusy(false), 1200);
  });
})();