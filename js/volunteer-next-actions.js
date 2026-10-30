// Display-only guidance. The Firestore application record, not this helper,
// is the authority for approval, safeguarding and assignment.
export function volunteerNextActions(application, credential, coordinatorPublished=false) {
  if (!application) return [
    {id:"intake",title:"Complete your volunteer profile",description:"Enter your availability, location and areas of interest.",href:"#form-heading",label:"Complete profile"}
  ];
  if (application.reviewStage === "declined") return [
    {id:"closed",title:"Contact SpeakOut for clarification",description:"Your application is closed. Do not take up activities unless formally reinstated.",href:"mailto:speaaakout@gmail.com?subject=Volunteer%20Application%20Review",label:"Contact SpeakOut"}
  ];
  if (application.reviewStage === "paused" || application.placementStatus === "paused") return [
    {id:"paused",title:"Your volunteer placement is paused",description:"Do not undertake activities until your coordinator confirms reinstatement.",href:"mailto:speaaakout@gmail.com?subject=Volunteer%20Placement%20Status",label:"Contact team"}
  ];
  if (application.reviewStage === "active" && application.placementStatus === "assigned") {
    return coordinatorPublished ? [
      {id:"active",title:"Follow your assigned coordinator",description:"Your approved duties and reporting instructions appear in My assigned coordinator & role.",href:"#assignmentCard",label:"View assignment"}
    ] : [
      {id:"contact",title:"Confirm your coordinator's details",description:"You are assigned, but the coordinator contact is not published yet.",href:"#assignmentCard",label:"Request details"}
    ];
  }
  if (application.assessmentStatus === "failed") return [
    {id:"reassess",title:"Ask SpeakOut about the next assessment opportunity",description:"Your latest assessment is marked not passed. Your coordinator will explain your options.",href:"mailto:speaaakout@gmail.com?subject=Volunteer%20Assessment%20Support",label:"Contact coordinator"}
  ];
  if (application.assessmentStatus !== "passed") {
    if (credential?.reviewStatus === "pending") return [
      {id:"pending",title:"Certificate submitted — awaiting verification",description:"SpeakOut will check your existing certificate. You do not need to repeat the assessment while it is under review.",href:"#credentialCard",label:"View certificate status"}
    ];
    if (credential?.reviewStatus === "verified") return [
      {id:"verified",title:"Certificate verified — awaiting onboarding update",description:"Your certificate has been reviewed; SpeakOut will confirm the assessment milestone in your record.",href:"#credentialCard",label:"View certificate"}
    ];
    return [
      {id:"credential",title:credential?.reviewStatus==="rejected"?"Check your certificate reference":"Already have a certificate?",description:credential?.reviewStatus==="rejected"?"Your submitted reference could not be verified. Review the reason and submit a different valid reference.":"Enter your existing certificate ID for SpeakOut to verify. Do not retake a passed assessment.",href:"#credentialCard",label:"Submit certificate"},
      {id:"training",title:"New to the volunteer training?",description:"Complete the free five-lesson MindCheck training and assessment if you have not already qualified.",href:"https://mindcheck.speakoutmentalhealth.org/training-hub.html",label:"Open training"}
    ];
  }
  if (application.safeguardingStatus === "blocked") return [
    {id:"blocked",title:"Your safeguarding review needs attention",description:"Do not undertake activities. Contact the team through an approved private channel.",href:"mailto:speaaakout@gmail.com?subject=Safeguarding%20Review",label:"Contact team"}
  ];
  if (application.safeguardingStatus !== "cleared") return [
    {id:"safeguarding",title:"Await safeguarding and role review",description:"Your assessment is verified. SpeakOut must separately clear your role and supervision before placement."}
  ];
  return [
    {id:"placement",title:"Await your assigned placement",description:"Your assessment and safeguarding checks are complete. SpeakOut will confirm your actual assignment and coordinator."}
  ];
}
