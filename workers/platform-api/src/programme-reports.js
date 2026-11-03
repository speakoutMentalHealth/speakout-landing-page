// Private operational reports for school clubs. Never collect student names,
// case notes, assessment scores or safeguarding incident narratives here.
const fail = (message, status = 400) => Object.assign(new Error(message), {status});
const str = value => String(value ?? "").trim();
const role = user => str(user?.profile?.actualRole || user?.profile?.role).toLowerCase();
const safeId = value => {
  const id = str(value);
  if (!/^[A-Za-z0-9_-]{1,180}$/.test(id)) throw fail("Invalid identifier.");
  return id;
};
const textField = (value, maximum, label, minimum = 0) => {
  const text = str(value);
  if (text.length < minimum || text.length > maximum) throw fail(label + " must contain " + minimum + " to " + maximum + " characters.");
  return text;
};
const sameSchool = (user, programme) => {
  if (str(user?.profile?.schoolId)) return str(user.profile.schoolId) === str(programme.schoolId);
  return Boolean(str(user?.profile?.schoolCode) && str(user.profile.schoolCode) === str(programme.schoolCode));
};
const facilitator = (user, programme) =>
  role(user) === "teacher" && sameSchool(user, programme) &&
  Array.isArray(programme.facilitatorIds) && programme.facilitatorIds.includes(user.uid);
const manager = (user, programme) =>
  role(user) === "super_admin" ||
  (["school_admin","school"].includes(role(user)) && sameSchool(user, programme));
const assignedSupervisor = (user, programme) =>
  Array.isArray(programme.supervisorIds) && programme.supervisorIds.includes(user?.uid) &&
  ["teacher","volunteer","school_admin","school"].includes(role(user));
export const canSubmitWeeklyReport = (user, programme) => facilitator(user, programme);
export const canReviewWeeklyReport = (user, programme) =>
  Boolean(user?.uid && programme && (manager(user, programme) || assignedSupervisor(user, programme)));
export const canViewWeeklyReports = (user, programme) =>
  canSubmitWeeklyReport(user, programme) || canReviewWeeklyReport(user, programme);
const validDate = value => {
  const date = str(value);
  if (!/^20\d{2}-\d{2}-\d{2}$/.test(date) ||
      Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0,10) !== date ||
      Date.parse(date) > Date.now() + 86400000) throw fail("Enter a valid session date.");
  return date;
};
const termKey = value => {
  const key = str(value).toUpperCase();
  if (!/^20\d{2}-(T[1-3]|S[1-2])$/.test(key)) throw fail("Use a term such as 2026-T1 or 2026-S1.");
  return key;
};
const validWeek = value => {
  const week = Number(value);
  if (!Number.isInteger(week) || week < 1 || week > 24) throw fail("Choose a week from 1 to 24.");
  return week;
};
const attendanceCount = value => {
  const count = Number(value);
  if (!Number.isInteger(count) || count < 0 || count > 10000) throw fail("Enter a valid non-negative attendance count.");
  return count;
};
const expose = item => ({
  id:item.id,programmeId:item.programmeId,schoolId:item.schoolId,
  facilitatorId:item.facilitatorId,facilitatorName:item.facilitatorName,
  termKey:item.termKey,week:item.week,sessionDate:item.sessionDate,
  topic:item.topic,activities:item.activities,learningOutcomes:item.learningOutcomes,
  challenges:item.challenges,nextSteps:item.nextSteps,attendanceCount:item.attendanceCount,
  safetyEscalated:item.safetyEscalated===true,status:item.status,revision:Number(item.revision||1),
  submittedAt:item.submittedAt,updatedAt:item.updatedAt,reviewedAt:item.reviewedAt || "",
  reviewedBy:item.reviewedBy || "",reviewNote:item.reviewNote || ""
});
export async function programmeReportsRoute({
  path,data,user,env,getDocument,queryDocumentsByField,runTransaction
}) {
  const id=safeId(data.programmeId);
  const programme=await getDocument(env,"programmes/"+id);
  if(!programme)throw fail("Programme not found.",404);
  if(!canViewWeeklyReports(user,programme))throw fail("No current assignment for this programme.",403);
  const isManager=manager(user,programme);
  const isReviewer=canReviewWeeklyReport(user,programme);
  if(path==="/v1/programme-reports/list"){
    const page=await queryDocumentsByField(env,"programmeWeeklyReports","programmeId",id,300);
    const reports=page.documents
      .filter(item=>item.programmeId===id && item.schoolId===programme.schoolId)
      .filter(item=>isReviewer || item.facilitatorId===user.uid)
      .map(expose)
      .sort((a,b)=>String(b.sessionDate).localeCompare(String(a.sessionDate)) || b.week-a.week);
    return {ok:true,programmeName:str(programme.name),reports,truncated:page.truncated,
      permissions:{submit:canSubmitWeeklyReport(user,programme),review:isReviewer,manage:isManager},
      supervisors:isManager ? (Array.isArray(programme.supervisorIds)?programme.supervisorIds:[]) : []};
  }
  if(path==="/v1/programme-reports/submit"){
    if(!canSubmitWeeklyReport(user,programme) || str(programme.status).toLowerCase()!=="active")
      throw fail("Only currently assigned facilitators can submit for an active programme.",403);
    if(data.privacyAttested!==true) throw fail("Confirm that no student-identifying or confidential wellbeing details are included.");
    const term=termKey(data.termKey),week=validWeek(data.week),sessionDate=validDate(data.sessionDate);
    const reportId=safeId(id+"__"+term+"__w"+week+"__"+safeId(user.uid));
    const now=new Date().toISOString();
    const payload={
      programmeId:id,schoolId:str(programme.schoolId),termKey:term,week,sessionDate,
      topic:textField(data.topic,160,"Topic",3),
      activities:textField(data.activities,1500,"Activities",10),
      learningOutcomes:textField(data.learningOutcomes,1000,"Learning outcomes"),
      challenges:textField(data.challenges,800,"Operational challenges"),
      nextSteps:textField(data.nextSteps,800,"Next-week plan"),
      attendanceCount:attendanceCount(data.attendanceCount),
      safetyEscalated:data.safetyEscalated===true
    };
    return runTransaction(env,async tx=>{
      const latest=await tx.get("programmes/"+id);
      if(!canSubmitWeeklyReport(user,latest) || str(latest.status).toLowerCase()!=="active")
        throw fail("Facilitator assignment is no longer active.",403);
      const previous=await tx.get("programmeWeeklyReports/"+reportId);
      if(previous && (previous.facilitatorId!==user.uid || previous.programmeId!==id || previous.schoolId!==programme.schoolId))
        throw fail("Report ownership conflict.",409);
      if(previous && previous.status!=="revision_requested")
        throw fail("This week was already submitted. Submit a revision only after a reviewer requests changes.",409);
      const revision=previous?Number(previous.revision||1)+1:1;
      tx.set("programmeWeeklyReports/"+reportId,{
        ...payload,facilitatorId:user.uid,
        facilitatorName:textField(user.profile?.fullName || [user.profile?.firstName,user.profile?.lastName].filter(Boolean).join(" ") || "Facilitator",120,"Facilitator",1),
        status:"submitted",revision,submittedAt:now,updatedAt:now,
        createdAt:previous?.createdAt||now,reviewedBy:"",reviewedAt:"",reviewNote:""
      });
      tx.set("programmeWeeklyReportAudits/"+safeId("report_"+crypto.randomUUID()),{
        reportId,programmeId:id,schoolId:str(programme.schoolId),
        actorUid:user.uid,action:previous?"revised":"submitted",revision,createdAt:now
      });
      return {ok:true,reportId,status:"submitted",revision};
    });
  }
  if(path==="/v1/programme-reports/review"){
    if(!isReviewer)throw fail("Supervisor or administrator approval required.",403);
    const reportId=safeId(data.reportId);
    const decision=str(data.decision).toLowerCase();
    if(!["approved","revision_requested"].includes(decision))throw fail("Choose approve or request revision.");
    const note=textField(data.note,800,"Review note",decision==="revision_requested"?5:0);
    const now=new Date().toISOString();
    return runTransaction(env,async tx=>{
      const latest=await tx.get("programmes/"+id);
      if(!canReviewWeeklyReport(user,latest))throw fail("Supervisor assignment was revoked.",403);
      const current=await tx.get("programmeWeeklyReports/"+reportId);
      if(!current || current.programmeId!==id || current.schoolId!==latest.schoolId)throw fail("Report not found.",404);
      if(current.facilitatorId===user.uid)throw fail("You cannot review your own report.",403);
      if(current.status!=="submitted")throw fail("Only submitted reports can be reviewed.",409);
      tx.patch("programmeWeeklyReports/"+reportId,{
        status:decision,reviewNote:note,reviewedBy:user.uid,reviewedAt:now,updatedAt:now
      });
      tx.set("programmeWeeklyReportAudits/"+safeId("review_"+crypto.randomUUID()),{
        reportId,programmeId:id,schoolId:str(latest.schoolId),
        actorUid:user.uid,action:decision,revision:current.revision||1,createdAt:now
      });
      return {ok:true,reportId,status:decision};
    });
  }
  if(path==="/v1/programme-reports/supervisor"){
    if(!isManager)throw fail("Programme administrator required.",403);
    const supervisorId=safeId(data.supervisorId);
    const action=str(data.action);
    if(!["assign","remove"].includes(action))throw fail("Choose assign or remove.");
    const now=new Date().toISOString();
    return runTransaction(env,async tx=>{
      const latest=await tx.get("programmes/"+id);
      if(!manager(user,latest))throw fail("Programme administration was revoked.",403);
      const current=Array.isArray(latest.supervisorIds)?latest.supervisorIds:[];
      if(action==="assign"){
        const person=await tx.get("users/"+supervisorId);
        if(!person || !["approved","active"].includes(str(person.status).toLowerCase()) ||
            !["teacher","volunteer","school_admin"].includes(str(person.actualRole||person.role).toLowerCase()))
          throw fail("Select an approved facilitator, volunteer or school administrator.",400);
        const personSchool=str(person.schoolId),personCode=str(person.schoolCode);
        if(!manager(user,latest) || (role(user)!=="super_admin" &&
           ((personSchool && personSchool!==str(latest.schoolId)) ||
            (!personSchool && personCode!==str(latest.schoolCode)))))
          throw fail("School administrators may assign only their own school staff.",403);
      }
      const next=action==="assign" ? [...new Set([...current,supervisorId])] : current.filter(uid=>uid!==supervisorId);
      if(next.length>20)throw fail("A programme may have at most 20 supervisors.",409);
      tx.patch("programmes/"+id,{supervisorIds:next,updatedAt:now});
      tx.set("programmeWeeklyReportAudits/"+safeId("supervisor_"+crypto.randomUUID()),{
        programmeId:id,schoolId:str(latest.schoolId),actorUid:user.uid,
        subjectUid:supervisorId,action:"supervisor_"+action,createdAt:now
      });
      return {ok:true,supervisors:next};
    });
  }
  throw fail("Unknown report action.",404);
}
