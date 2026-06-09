// role-access.js
// Controls which sections each approved role can see in portal.html.

export const ROLE_ACCESS = {
  student: {
    label: "Student Portal",
    welcome: "Access student-friendly resources, books, courses, certificates and Kiddies Corner.",
    cards: [
      { title:"E-Library", icon:"📚", description:"Mental health, academic, leadership and personal development books.", href:"e-library.html", access:"Approved students" },
      { title:"SpeakHub", icon:"🎓", description:"Skill acquisition, digital skills and youth development courses.", href:"speakhub.html", access:"Approved students" },
      { title:"Kiddies Corner", icon:"🧒", description:"Primary and secondary school resources for younger learners.", href:"kiddies.html", access:"Approved students" },
      { title:"Certificates", icon:"🏆", description:"View earned certificates and recognition records.", href:"#certificates", access:"Approved students" }
    ]
  },

  school: {
    label: "School Portal",
    welcome: "Manage school club activities, student resources, reports, visibility support and learning tools.",
    cards: [
      { title:"School Dashboard", icon:"🏫", description:"View school activity, enrolled users, reports and partnership records.", href:"#school-dashboard", access:"Approved schools" },
      { title:"E-Library", icon:"📚", description:"Access curated school resources, guides, books and learning materials.", href:"e-library.html", access:"Approved schools" },
      { title:"SpeakHub", icon:"🎓", description:"Training programs for students, teachers and school ambassadors.", href:"speakhub.html", access:"Approved schools" },
      { title:"Kiddies Corner", icon:"🧒", description:"Age-appropriate resources for primary and secondary school students.", href:"kiddies.html", access:"Approved schools" },
      { title:"Submit Reports", icon:"📝", description:"Submit activity reports, attendance, photos and Google Drive evidence links.", href:"#reports", access:"Approved schools" },
      { title:"Visibility Support", icon:"📣", description:"Social media caption packs, school promotion and website/social page support.", href:"#visibility", access:"Approved schools" }
    ]
  },

  teacher: {
    label: "Teacher Coordinator Portal",
    welcome: "Coordinate school activities, guide student ambassadors and access teaching resources.",
    cards: [
      { title:"Teacher Coordinator Guide", icon:"👩‍🏫", description:"Guides for running SpeakOut school club activities.", href:"#resources", access:"Approved teachers" },
      { title:"E-Library", icon:"📚", description:"Teaching, wellness, student support and leadership materials.", href:"e-library.html", access:"Approved teachers" },
      { title:"SpeakHub", icon:"🎓", description:"Teacher training, mental health basics and leadership modules.", href:"speakhub.html", access:"Approved teachers" },
      { title:"Submit Reports", icon:"📝", description:"Submit termly activity updates and evidence.", href:"#reports", access:"Approved teachers" }
    ]
  },

  parent: {
    label: "Parent Portal",
    welcome: "Access parent-friendly mental health guides, school updates and child support resources.",
    cards: [
      { title:"Parent Resources", icon:"👨‍👩‍👧", description:"Guides for supporting children’s emotional wellbeing at home.", href:"#resources", access:"Approved parents" },
      { title:"E-Library", icon:"📚", description:"Parent guides, student wellness books and learning materials.", href:"e-library.html", access:"Approved parents" },
      { title:"Kiddies Corner", icon:"🧒", description:"Simple resources for children and young learners.", href:"kiddies.html", access:"Approved parents" }
    ]
  },

  ambassador: {
    label: "Ambassador Portal",
    welcome: "Lead school clubs, submit outreach reports, access training and track recognition.",
    cards: [
      { title:"Ambassador Center", icon:"👑", description:"Ambassador handbook, tasks, recognition pathway and reporting tools.", href:"ambassador.html", access:"Approved ambassadors" },
      { title:"SpeakHub", icon:"🎓", description:"Leadership, advocacy and digital skills training.", href:"speakhub.html", access:"Approved ambassadors" },
      { title:"E-Library", icon:"📚", description:"Leadership, wellness and personal development materials.", href:"e-library.html", access:"Approved ambassadors" },
      { title:"Submit Activity Report", icon:"📝", description:"Submit school club activities, reach numbers and evidence links.", href:"#reports", access:"Approved ambassadors" },
      { title:"Certificates", icon:"🏆", description:"View ambassador certificates and recognition records.", href:"#certificates", access:"Approved ambassadors" }
    ]
  },

  admin: {
    label: "Admin Portal",
    welcome: "Full administrative access. Manage users, schools, content, certificates, payments and reports.",
    cards: [
      { title:"Admin Console", icon:"🛠️", description:"Manage users, schools, books, courses, certificates, activities, reports and payments.", href:"admin.html", access:"Admins only" },
      { title:"E-Library", icon:"📚", description:"Review protected library experience.", href:"e-library.html", access:"Admins only" },
      { title:"SpeakHub", icon:"🎓", description:"Review protected training center experience.", href:"speakhub.html", access:"Admins only" },
      { title:"Ambassador Center", icon:"👑", description:"Review ambassador resources and pathway.", href:"ambassador.html", access:"Admins only" },
      { title:"Kiddies Corner", icon:"🧒", description:"Review children and school resources.", href:"kiddies.html", access:"Admins only" }
    ]
  }
};

export function getRoleAccess(role){
  return ROLE_ACCESS[role] || ROLE_ACCESS.student;
}

export function canAccessPage(role, pageName){
  const normalized = pageName.toLowerCase();
  if(role === "admin") return true;
  const access = getRoleAccess(role);
  return access.cards.some(card => card.href.toLowerCase() === normalized);
}
