// SpeakOut Community phase 1: room metadata only. No public forum release.
export const VISIBILITIES = Object.freeze(["public", "members_only", "private"]);
export const STATUSES = Object.freeze(["open", "read_only", "locked"]);
export const STARTER_ROOMS = Object.freeze([
  { id: "start-here", title: "Start Here", description: "Community rules, help and official announcements.", visibility: "public", status: "read_only" },
  { id: "learn-build", title: "Learn & Build", description: "ICT projects, learning challenges and practical skills.", visibility: "public", status: "open" },
  { id: "opportunities-careers", title: "Opportunities & Careers", description: "Curated opportunities, scholarships and professional development.", visibility: "public", status: "read_only" },
  { id: "networking-mentorship", title: "Networking & Mentorship", description: "Adult professional introductions and mentoring discussions.", visibility: "members_only", status: "open" },
  { id: "school-leaders-educators", title: "School Leaders & Educators", description: "A verified professional space for school staff.", visibility: "private", status: "locked" },
  { id: "projects-volunteering", title: "Projects & Volunteering", description: "Approved volunteer opportunities and community projects.", visibility: "members_only", status: "open" }
]);

export function validRoomId(value) {
  return typeof value === "string" && /^[a-z][a-z0-9-]{2,55}$/.test(value);
}
export function roomState(value) {
  const title = String(value?.title ?? "").trim();
  const description = String(value?.description ?? "").trim();
  const visibility = value?.visibility;
  const status = value?.status;
  if (title.length < 3 || title.length > 80) throw new Error("Room title must contain 3–80 characters.");
  if (description.length > 240) throw new Error("Description must be under 240 characters.");
  if (!VISIBILITIES.includes(visibility)) throw new Error("Invalid room visibility.");
  if (!STATUSES.includes(status)) throw new Error("Invalid room status.");
  return { title, description, visibility, status };
}
export function privacyWarning(before, after) {
  return before === "private" && after !== "private";
}
export function normalizedSlug(value) {
  const slug = String(value ?? "").normalize("NFKD").toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-")
    .replace(/^-|-$/g, "").slice(0, 55).replace(/-+$/g, "");
  if (!validRoomId(slug)) throw new Error("Enter a longer room title with letters or numbers.");
  return slug;
}
