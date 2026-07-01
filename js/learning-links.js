// SpeakOut dashboard learning link helper.
// Use this if you want to dynamically route any dashboard button into the shared learning platform.

export function learningUrl(type = "library", audience = "all") {
  const safeType = type === "courses" ? "courses" : "library";
  const safeAudience = encodeURIComponent(audience || "all");
  return `../../learning/${safeType}.html?audience=${safeAudience}`;
}

document.querySelectorAll("[data-learning-link]").forEach((link) => {
  const type = link.dataset.learningType || "library";
  const audience = link.dataset.learningAudience || "all";
  link.href = learningUrl(type, audience);
});
