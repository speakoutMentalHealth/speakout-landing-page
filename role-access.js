// role-access.js

const ALL_APPROVED_USERS = [
  "admin",
  "student",
  "school",
  "teacher",
  "parent",
  "ambassador"
];

const ADMIN_ONLY = [
  "admin"
];

const ACCESS_MAP = {
  // Main dashboards
  "portal.html": ALL_APPROVED_USERS,
  "student-dashboard.html": ["admin", "student"],
  "school-dashboard.html": ["admin", "school"],
  "teacher-dashboard.html": ["admin", "teacher"],
  "parent-dashboard.html": ["admin", "parent"],
  "ambassador.html": ["admin", "ambassador", "student"],

  // Protected learning areas
  "e-library.html": ALL_APPROVED_USERS,
  "book-details.html": ALL_APPROVED_USERS,
  "book-reader.html": ALL_APPROVED_USERS,

  "speakhub.html": ALL_APPROVED_USERS,
  "course-details.html": ALL_APPROVED_USERS,
  "course-player.html": ALL_APPROVED_USERS,

  "kiddies.html": ALL_APPROVED_USERS,

  // Progress and certificates
  "progress.html": ALL_APPROVED_USERS,
  "certificates.html": ALL_APPROVED_USERS,
  "profile.html": ALL_APPROVED_USERS,

  // Admin only
  "admin-books.html": ADMIN_ONLY,
  "admin-courses.html": ADMIN_ONLY,
  "admin-contributors.html": ADMIN_ONLY,
  "admin-dashboard.html": ADMIN_ONLY,
  "admin-users.html": ADMIN_ONLY
};

export function canAccessPage(role, pageName) {
  const normalizedRole = (role || "").toLowerCase().trim();
  const normalizedPage = (pageName || "").toLowerCase().trim();

  const allowedRoles = ACCESS_MAP[normalizedPage];

  // If page is not listed, allow approved logged-in users by default.
  if (!allowedRoles) {
    return ALL_APPROVED_USERS.includes(normalizedRole);
  }

  return allowedRoles.includes(normalizedRole);
}
