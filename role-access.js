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
export function getRoleAccess(role) {
  const normalizedRole = (role || "").toLowerCase().trim();

  const accessByRole = {
    student: {
      label: "Student Portal",
      welcome: "Access your approved student learning tools, books, courses, Kiddies resources, progress and certificates.",
      cards: [
        { icon: "📚", title: "E-Library", description: "Read approved books and learning resources.", href: "e-library.html", access: "Approved" },
        { icon: "🎓", title: "SpeakHub", description: "Take free and premium learning courses.", href: "speakhub.html", access: "Approved" },
        { icon: "🧒", title: "Kiddies Corner", description: "Explore age-appropriate learning resources.", href: "kiddies.html", access: "Approved" },
        { icon: "🏅", title: "Certificates", description: "View your certificates and progress.", href: "certificates.html", access: "Approved" }
      ]
    },

    ambassador: {
      label: "Ambassador Portal",
      welcome: "Access ambassador resources, training, reports, learning tools and certificates.",
      cards: [
        { icon: "🎓", title: "SpeakHub", description: "Complete ambassador and leadership training.", href: "speakhub.html", access: "Approved" },
        { icon: "📚", title: "E-Library", description: "Access books and advocacy resources.", href: "e-library.html", access: "Approved" },
        { icon: "📊", title: "Reports", description: "Submit outreach or activity reports.", href: "#reports", access: "Approved" },
        { icon: "🏅", title: "Certificates", description: "View certificates.", href: "certificates.html", access: "Approved" }
      ]
    },

    teacher: {
      label: "Teacher Portal",
      welcome: "Access teaching resources, school tools, courses, books and reports.",
      cards: [
        { icon: "🎓", title: "SpeakHub", description: "Teacher training and professional learning.", href: "speakhub.html", access: "Approved" },
        { icon: "📚", title: "E-Library", description: "Books and teaching resources.", href: "e-library.html", access: "Approved" },
        { icon: "🧒", title: "Kiddies Corner", description: "Student-friendly learning materials.", href: "kiddies.html", access: "Approved" },
        { icon: "📊", title: "Reports", description: "Submit activity reports.", href: "#reports", access: "Approved" }
      ]
    },

    school: {
      label: "School Portal",
      welcome: "Access school resources, reports, student materials, courses and certificates.",
      cards: [
        { icon: "🏫", title: "School Dashboard", description: "Manage school access and resources.", href: "school-dashboard.html", access: "Approved" },
        { icon: "📚", title: "E-Library", description: "Access books and school resources.", href: "e-library.html", access: "Approved" },
        { icon: "🎓", title: "SpeakHub", description: "Courses for schools and staff.", href: "speakhub.html", access: "Approved" },
        { icon: "📊", title: "Reports", description: "Submit school activity reports.", href: "#reports", access: "Approved" }
      ]
    },

    parent: {
      label: "Parent Portal",
      welcome: "Access parenting resources, wellbeing guides, books and learning tools.",
      cards: [
        { icon: "📚", title: "E-Library", description: "Read parenting and wellbeing resources.", href: "e-library.html", access: "Approved" },
        { icon: "🎓", title: "SpeakHub", description: "Take parent and family wellness courses.", href: "speakhub.html", access: "Approved" },
        { icon: "🧒", title: "Kiddies Corner", description: "Explore child-friendly resources.", href: "kiddies.html", access: "Approved" },
        { icon: "🏅", title: "Certificates", description: "View certificates.", href: "certificates.html", access: "Approved" }
      ]
    }
  };

  return accessByRole[normalizedRole] || accessByRole.student;
}
