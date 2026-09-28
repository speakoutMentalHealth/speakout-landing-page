import { requireRoles, renderRoleNav } from "../../launch-role-guard.js";
import { db } from "../../firebase-config.js";
import {
  addDoc,
  collection,
  getDoc,
  getDocs,
  doc,
  query,
  serverTimestamp,
  where
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
import { roleApi } from "../platform-api.js";
import { escapeHtml, normalize, statusPill as pill } from "../learner/ui-utils.js";

const $ = id => document.getElementById(id);

let currentUser = null;
let profile = null;
let school = null;
let schoolUsers = [];
let programmes = [];
let approvedTeachers = [];
let templates = [];

const STARTER_TEMPLATES = [
  {
    key:"stem",
    selected:true,
    name:"STEM Programme",
    type:"club",
    category:"STEM",
    source:"existing_school",
    description:"Strengthen the school’s existing STEM activities through practical projects, guided problem-solving and enrichment while preserving the school’s current structure and coordinators.",
    objectives:"Build practical problem-solving, teamwork, curiosity and project-based STEM skills.",
    expectedOutcomes:"Students complete practical STEM activities and demonstrate measurable participation and project progress.",
    scheduleDay:"",
    scheduleTime:"",
    frequency:"Weekly",
    venue:"",
    membershipMode:"teacher_add",
    parentVisibility:"progress_feedback"
  },
  {
    key:"ict",
    selected:true,
    name:"ICT & Digital Skills",
    type:"course",
    category:"ICT & Digital Skills",
    source:"existing_school",
    description:"Build on the school’s existing ICT lessons with hands-on digital skills, practical assignments and supervised access to the SpeakOut portal.",
    objectives:"Strengthen computer fundamentals, productivity tools, digital research, online safety and age-appropriate modern digital skills.",
    expectedOutcomes:"Students complete practical digital tasks and can use school systems safely for programme work and assignments.",
    scheduleDay:"Monday / Wednesday / Friday",
    scheduleTime:"",
    frequency:"3 times weekly",
    venue:"ICT Lab",
    membershipMode:"school_assign",
    parentVisibility:"progress_feedback"
  },
  {
    key:"wellness",
    selected:true,
    name:"Mental Health & Wellness Club",
    type:"club",
    category:"Wellbeing",
    source:"speakout_supported",
    description:"A voluntary wellbeing and personal-development club focused on age-appropriate psychoeducation, resilience, healthy coping, communication and help-seeking.",
    objectives:"Improve emotional literacy, confidence, healthy coping, peer communication and appropriate help-seeking.",
    expectedOutcomes:"Interested students participate in structured wellbeing activities while serious concerns follow the school’s safeguarding and referral pathway.",
    scheduleDay:"",
    scheduleTime:"",
    frequency:"Weekly",
    venue:"",
    membershipMode:"voluntary",
    parentVisibility:"progress"
  },
  {
    key:"literary",
    selected:true,
    name:"Literary, Debate & Spelling",
    type:"club",
    category:"Literacy & Communication",
    source:"existing_school",
    description:"Support the school’s existing literary, debate and spelling activities with structured themes, public speaking, reading challenges, competitions and selected youth-development topics.",
    objectives:"Strengthen reading, spelling, public speaking, reasoning and communication.",
    expectedOutcomes:"Students participate in structured speaking, reading and spelling activities and selected competitions.",
    scheduleDay:"",
    scheduleTime:"",
    frequency:"Weekly",
    venue:"",
    membershipMode:"voluntary",
    parentVisibility:"progress_feedback"
  },
  {
    key:"culture",
    selected:true,
    name:"Cultural & Drama",
    type:"club",
    category:"Arts & Culture",
    source:"existing_school",
    description:"Support the school’s existing cultural and drama activities through documentation, storytelling, selected awareness themes, performances and media support.",
    objectives:"Encourage creative expression, teamwork, cultural learning and responsible storytelling.",
    expectedOutcomes:"Students contribute to documented performances, scripts, stories or school awareness activities.",
    scheduleDay:"",
    scheduleTime:"",
    frequency:"Weekly",
    venue:"",
    membershipMode:"voluntary",
    parentVisibility:"progress"
  }
];

function cloneTemplates(){
  return STARTER_TEMPLATES.map(item=>Object.assign({},item,{facilitatorId:""}));
}

function show(message,type){
  $("statusBox").textContent = message;
  $("statusBox").className = "program-note" + (type ? " " + type : "");
}

function userName(item){
  return item.fullName ||
    [item.firstName,item.lastName].filter(Boolean).join(" ") ||
    item.email ||
    "Teacher / Facilitator";
}

async function resolveSchool(){
  if(profile.schoolId){
    const snap = await getDoc(doc(db,"schools",profile.schoolId));
    if(snap.exists()) return Object.assign({id:snap.id},snap.data());
  }
  if(profile.schoolCode){
    const snap = await getDocs(query(collection(db,"schools"),where("schoolCode","==",profile.schoolCode)));
    if(!snap.empty) return Object.assign({id:snap.docs[0].id},snap.docs[0].data());
  }
  return null;
}

async function schoolUsersByField(field,value){
  if(!value) return [];
  const snap = await getDocs(query(collection(db,"users"),where(field,"==",value)));
  return snap.docs.map(document=>Object.assign({id:document.id},document.data()));
}

async function loadSchoolUsers(){
  let items = [];
  if(school.id){
    try{
      items = await schoolUsersByField("schoolId",school.id);
    }catch(error){
      console.warn("schoolId user query failed",error);
    }
  }
  if(!items.length && school.schoolCode){
    items = await schoolUsersByField("schoolCode",school.schoolCode);
  }
  const unique = new Map(items.map(item=>[item.id,item]));
  schoolUsers = [...unique.values()];
  approvedTeachers = schoolUsers
    .filter(item=>normalize(item.role)==="teacher" && normalize(item.status)==="approved")
    .sort((a,b)=>userName(a).localeCompare(userName(b)));
}

async function loadProgrammes(){
  const snap = await getDocs(query(collection(db,"programmes"),where("schoolId","==",school.id)));
  programmes = snap.docs.map(document=>Object.assign({id:document.id},document.data()));
}

async function loadParentLinks(){
  let snap = null;
  try{
    snap = await getDocs(query(
      collection(db,"parentStudentLinks"),
      where("schoolId","==",school.id),
      where("status","==","approved")
    ));
  }catch(error){
    console.warn("schoolId parent link query failed",error);
  }

  if((!snap || snap.empty) && school.schoolCode){
    try{
      snap = await getDocs(query(
        collection(db,"parentStudentLinks"),
        where("schoolCode","==",school.schoolCode),
        where("status","==","approved")
      ));
    }catch(error){
      console.warn("schoolCode parent link query failed",error);
    }
  }

  return snap ? snap.size : 0;
}

function renderReadiness(data){
  const rosterCount = data.rosterCount || 0;
  const parentLinks = data.parentLinks || 0;
  const approvedStudents = schoolUsers.filter(item=>normalize(item.role)==="student" && normalize(item.status)==="approved").length;
  const approvedParents = schoolUsers.filter(item=>normalize(item.role)==="parent" && normalize(item.status)==="approved").length;
  const pendingUsers = schoolUsers.filter(item=>["pending","pending_school_approval"].includes(normalize(item.status))).length;
  const activeProgrammes = programmes.filter(item=>normalize(item.status)==="active").length;

  $("rosterCount").textContent = rosterCount;
  $("approvedStudentCount").textContent = approvedStudents;
  $("teacherCount").textContent = approvedTeachers.length;
  $("activeProgrammeCount").textContent = activeProgrammes;
  $("parentCount").textContent = approvedParents;
  $("parentLinkCount").textContent = parentLinks;
  $("pendingUserCount").textContent = pendingUsers;

  const pilotReady = approvedStudents >= 1 && approvedTeachers.length >= 1 && activeProgrammes >= 1;
  $("pilotState").textContent = pilotReady ? "Ready" : "Not ready";

  const checks = [
    {
      title:"School account verified",
      ok:Boolean(school && (school.id || school.schoolCode)),
      detail:school ? (school.schoolName || school.name || "School")+" • "+(school.schoolCode || "No school code") : "School record not found.",
      href:"school-profile.html"
    },
    {
      title:"Student roster imported",
      ok:rosterCount > 0,
      detail:rosterCount ? rosterCount+" student roster record"+(rosterCount===1?"":"s")+" available." : "Import the school roster before full student activation.",
      href:"school-students.html"
    },
    {
      title:"At least one approved facilitator",
      ok:approvedTeachers.length > 0,
      detail:approvedTeachers.length ? approvedTeachers.length+" approved facilitator"+(approvedTeachers.length===1?"":"s")+" available for assignment." : "Approve one Teacher / Facilitator account for the pilot.",
      href:"school-teachers.html"
    },
    {
      title:"At least one approved student",
      ok:approvedStudents > 0,
      detail:approvedStudents ? approvedStudents+" approved student account"+(approvedStudents===1?"":"s")+" available." : "Activate one student account for the pilot test.",
      href:"school-students.html"
    },
    {
      title:"Programmes active",
      ok:activeProgrammes > 0,
      detail:activeProgrammes ? activeProgrammes+" active programme"+(activeProgrammes===1?"":"s")+" currently configured." : "Create the launch programmes below.",
      href:"programmes.html"
    },
    {
      title:"Family access pathway available",
      ok:approvedParents > 0 && parentLinks > 0,
      detail:parentLinks ? parentLinks+" approved parent-child link"+(parentLinks===1?"":"s")+" available." : "Parent linking can be added during or after the pilot; it does not block programme commencement.",
      href:"school-parents.html",
      optional:true
    },
    {
      title:"3-account pilot",
      ok:pilotReady,
      detail:pilotReady ? "Admin + facilitator + student prerequisites are available. Run the end-to-end workflow below." : "Needs one approved facilitator, one approved student and one active programme.",
      href:"programmes.html"
    }
  ];

  $("launchChecklist").innerHTML = checks.map(item=>
    '<a class="program-item" href="'+item.href+'">'+
      '<div class="program-item-head">'+
        '<div><strong>'+escapeHtml(item.title)+'</strong><p>'+escapeHtml(item.detail)+'</p></div>'+
        pill(item.ok ? "ready" : (item.optional ? "optional" : "pending"))+
      '</div>'+
    '</a>'
  ).join("");
}

function option(value,label,current){
  return '<option value="'+escapeHtml(value)+'"'+(current===value?' selected':'')+'>'+escapeHtml(label)+'</option>';
}

function templateCard(item,index){
  const teacherOptions = '<option value="">Assign facilitator later</option>' +
    approvedTeachers.map(teacher=>option(teacher.id,userName(teacher),item.facilitatorId)).join("");

  return '<article class="program-item" data-template-index="'+index+'">'+
    '<div class="program-item-head">'+
      '<label style="display:flex;gap:9px;align-items:center;font-weight:850">'+
        '<input type="checkbox" data-field="selected"'+(item.selected?' checked':'')+'>'+
        ' Include in launch'+
      '</label>'+
      pill(item.source)+
    '</div>'+
    '<div class="program-form" style="margin-top:12px">'+
      '<input class="full" data-field="name" value="'+escapeHtml(item.name)+'" placeholder="Programme name">'+
      '<select data-field="type">'+
        option("club","Club",item.type)+
        option("course","Course",item.type)+
        option("workshop","Workshop",item.type)+
        option("cohort","Cohort",item.type)+
        option("campaign","Campaign",item.type)+
        option("competition","Competition",item.type)+
        option("other","Other",item.type)+
      '</select>'+
      '<input data-field="category" value="'+escapeHtml(item.category)+'" placeholder="Category">'+
      '<select data-field="source">'+
        option("existing_school","Existing school programme",item.source)+
        option("new_school","New school programme",item.source)+
        option("speakout_supported","SpeakOut-supported programme",item.source)+
      '</select>'+
      '<select data-field="membershipMode">'+
        option("voluntary","Voluntary / interest-based",item.membershipMode)+
        option("open","Open membership",item.membershipMode)+
        option("approval","Application requires approval",item.membershipMode)+
        option("teacher_add","Teacher adds students",item.membershipMode)+
        option("school_assign","School assignment",item.membershipMode)+
      '</select>'+
      '<textarea class="full" data-field="description">'+escapeHtml(item.description)+'</textarea>'+
      '<textarea data-field="objectives">'+escapeHtml(item.objectives)+'</textarea>'+
      '<textarea data-field="expectedOutcomes">'+escapeHtml(item.expectedOutcomes)+'</textarea>'+
      '<input data-field="scheduleDay" value="'+escapeHtml(item.scheduleDay)+'" placeholder="Meeting day(s)">'+
      '<input data-field="scheduleTime" value="'+escapeHtml(item.scheduleTime)+'" placeholder="Meeting time">'+
      '<input data-field="frequency" value="'+escapeHtml(item.frequency)+'" placeholder="Frequency">'+
      '<input data-field="venue" value="'+escapeHtml(item.venue)+'" placeholder="Venue / room">'+
      '<select data-field="facilitatorId">'+teacherOptions+'</select>'+
      '<select data-field="parentVisibility">'+
        option("progress","Parent: progress only",item.parentVisibility)+
        option("progress_feedback","Parent: progress + feedback",item.parentVisibility)+
        option("hidden","Parent: hidden",item.parentVisibility)+
      '</select>'+
    '</div>'+
  '</article>';
}

function readTemplateCards(){
  return [...document.querySelectorAll("[data-template-index]")].map(card=>{
    const index = Number(card.dataset.templateIndex);
    const original = templates[index] || {};
    const read = field => card.querySelector('[data-field="'+field+'"]');
    return Object.assign({},original,{
      selected:Boolean(read("selected") && read("selected").checked),
      name:read("name") ? read("name").value.trim() : "",
      type:read("type") ? read("type").value : "club",
      category:read("category") ? read("category").value.trim() : "",
      source:read("source") ? read("source").value : "existing_school",
      membershipMode:read("membershipMode") ? read("membershipMode").value : "voluntary",
      description:read("description") ? read("description").value.trim() : "",
      objectives:read("objectives") ? read("objectives").value.trim() : "",
      expectedOutcomes:read("expectedOutcomes") ? read("expectedOutcomes").value.trim() : "",
      scheduleDay:read("scheduleDay") ? read("scheduleDay").value.trim() : "",
      scheduleTime:read("scheduleTime") ? read("scheduleTime").value.trim() : "",
      frequency:read("frequency") ? read("frequency").value.trim() : "",
      venue:read("venue") ? read("venue").value.trim() : "",
      facilitatorId:read("facilitatorId") ? read("facilitatorId").value : "",
      parentVisibility:read("parentVisibility") ? read("parentVisibility").value : "progress"
    });
  });
}

function renderTemplates(){
  $("templateList").innerHTML = templates.map(templateCard).join("");
}

async function createSelectedProgrammes(){
  templates = readTemplateCards();
  const selected = templates.filter(item=>item.selected);

  if(!selected.length){
    show("Select at least one programme to create.","bad");
    return;
  }

  for(const item of selected){
    if(!item.name || !item.category || !item.description){
      show("Every selected programme needs a name, category and description.","bad");
      return;
    }
  }

  const button = $("createSelectedButton");
  button.disabled = true;
  button.textContent = "Creating programmes...";

  try{
    await loadProgrammes();

    const existingNames = new Set(programmes.map(item=>normalize(item.name)));
    const toCreate = selected.filter(item=>!existingNames.has(normalize(item.name)));
    const skipped = selected.length - toCreate.length;
    const created = [];

    for(const item of toCreate){
      const result = await addDoc(collection(db,"programmes"),{
        name:item.name,
        type:item.type,
        category:item.category,
        source:item.source,
        description:item.description,
        objectives:item.objectives,
        expectedOutcomes:item.expectedOutcomes,
        scheduleDay:item.scheduleDay,
        scheduleTime:item.scheduleTime,
        frequency:item.frequency,
        venue:item.venue,
        membershipMode:item.membershipMode,
        parentVisibility:item.parentVisibility,
        schoolId:school.id,
        schoolCode:school.schoolCode || "",
        schoolName:school.schoolName || school.name || "",
        createdBy:currentUser.uid,
        createdByRole:"school_admin",
        createdByName:profile.fullName || [profile.firstName,profile.lastName].filter(Boolean).join(" ") || currentUser.email || "School Administrator",
        facilitatorIds:item.facilitatorId ? [item.facilitatorId] : [],
        status:"active",
        approvedBy:currentUser.uid,
        approvedAt:serverTimestamp(),
        launchTemplateKey:item.key || "",
        createdAt:serverTimestamp(),
        updatedAt:serverTimestamp()
      });
      created.push({id:result.id,name:item.name});
    }

    await loadProgrammes();
    const roster = await roleApi.schoolRoster().catch(()=>({students:[],count:0}));
    const parentLinks = await loadParentLinks();
    renderReadiness({
      rosterCount:Array.isArray(roster.students) ? roster.students.length : Number(roster.count || 0),
      parentLinks
    });

    if(created.length){
      let message = created.length+" programme"+(created.length===1?"":"s")+" created and activated";
      if(skipped){
        message += "; "+skipped+" existing programme"+(skipped===1?" was":"s were")+" skipped";
      }
      show(message+".","ok");
    }else{
      show("All selected programme names already exist for this school. Nothing was duplicated.","ok");
    }
  }catch(error){
    console.error(error);
    show(error.message || "Could not create the selected programmes.","bad");
  }finally{
    button.disabled = false;
    button.textContent = "Create selected programmes";
  }
}

$("resetTemplatesButton").addEventListener("click",()=>{
  templates = cloneTemplates();
  renderTemplates();
  show("Starter templates reset. Review and edit them before creating programmes.");
});

$("createSelectedButton").addEventListener("click",createSelectedProgrammes);

requireRoles(["school_admin"],async (user,data)=>{
  currentUser = user;
  profile = data;
  renderRoleNav(profile,"Launch");

  try{
    school = await resolveSchool();
    if(!school) throw new Error("No school record is linked to this administrator account.");

    $("pageTitle").textContent = (school.schoolName || school.name || "School") + " launch center";
    $("schoolPills").innerHTML = pill(school.schoolCode || "School") + pill(profile.role || "school_admin");

    show("Loading live school readiness...");

    templates = cloneTemplates();

    const results = await Promise.all([
      roleApi.schoolRoster().catch(error=>{
        console.warn("Roster readiness lookup failed",error);
        return {students:[],count:0};
      }),
      loadParentLinks(),
      loadSchoolUsers(),
      loadProgrammes()
    ]);

    const roster = results[0];
    const parentLinks = results[1];

    renderTemplates();
    renderReadiness({
      rosterCount:Array.isArray(roster.students) ? roster.students.length : Number(roster.count || 0),
      parentLinks
    });

    show("Launch center loaded. Review the starter programmes before creating them.","ok");
  }catch(error){
    console.error(error);
    show(error.message || "Could not load the school launch center.","bad");
  }
});