// Pure matching and validation. Gemini may draft text and break ties, but never grants
// safeguarding clearance or overrides coordinator capacity, language or availability.
export const FOCUS_AREAS = [
  "mental_health_education","research","outreach","programme_support",
  "technology","media","fundraising"
];
export const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const safeText = (value,max=100) => String(value||"").trim().replace(/\s+/g," ").slice(0,max);
export function validateCoordinator(input) {
  const c={
    name:safeText(input?.name,120),
    email:safeText(input?.email,160).toLowerCase(),
    active:input?.active===true,
    capacity:Number(input?.capacity),
    baselineLoad:Number(input?.baselineLoad??0),
    assignedCount:Number(input?.assignedCount??0),
    focusAreas:Array.isArray(input?.focusAreas)?input.focusAreas:[],
    availabilityDays:Array.isArray(input?.availabilityDays)?input.availabilityDays:[],
    participationModes:Array.isArray(input?.participationModes)?input.participationModes:[],
    languages:Array.isArray(input?.languages)?input.languages.map(x=>safeText(x,30)):[],
    city:safeText(input?.city,80),state:safeText(input?.state,80)
  };
  if(c.name.length<2||!/^[-.\w+]+@[-.\w]+\.[A-Za-z]{2,}$/u.test(c.email))throw Error("Coordinator name or work email is invalid.");
  if(!Number.isInteger(c.capacity)||c.capacity<1||c.capacity>100)throw Error("Capacity must be from 1 to 100.");
  if(!Number.isInteger(c.baselineLoad)||c.baselineLoad<0||c.baselineLoad>c.capacity)throw Error("Existing assignments exceed coordinator capacity.");
  if(!Number.isInteger(c.assignedCount)||c.assignedCount<0||c.assignedCount>c.capacity-c.baselineLoad)throw Error("Allocated assignments exceed capacity.");
  if(!c.focusAreas.length||c.focusAreas.length>7||c.focusAreas.some(x=>!FOCUS_AREAS.includes(x)))throw Error("Choose approved areas of expertise.");
  if(!c.availabilityDays.length||c.availabilityDays.some(x=>!DAYS.includes(x)))throw Error("Choose valid available days.");
  if(!c.participationModes.length||c.participationModes.some(x=>!["remote","hybrid","in_person"].includes(x)))throw Error("Choose valid work arrangements.");
  return c;
}
export function fairCandidates(volunteer, coordinators) {
  const focus=Array.isArray(volunteer?.focusAreas)?volunteer.focusAreas.filter(x=>FOCUS_AREAS.includes(x)):[];
  const days=Array.isArray(volunteer?.availabilityDays)?volunteer.availabilityDays:[];
  const mode=volunteer?.participationMode;
  const eligible=coordinators.flatMap(raw=>{
    let c;try{c=validateCoordinator(raw);}catch{return [];}
    if(!c.active||c.baselineLoad+c.assignedCount>=c.capacity)return [];
    const overlap=focus.filter(x=>c.focusAreas.includes(x)).length;
    const dayOverlap=days.some(x=>c.availabilityDays.includes(x));
    const modeCompatible=c.participationModes.includes(mode)||
      (mode==="remote" && c.participationModes.includes("hybrid"))||
      (mode==="hybrid" && c.participationModes.includes("remote"));
    // In-person/hybrid volunteers must have local supervision when that is required.
    const locationMatch=mode==="remote" || !c.state || c.state.toLowerCase()===String(volunteer.state||"").toLowerCase();
    if(!overlap||!dayOverlap||!modeCompatible||!locationMatch)return [];
    return [{
      id:String(raw.id),name:c.name,email:c.email,
      expertise:c.focusAreas,overlap,capacity:c.capacity,
      load:c.baselineLoad+c.assignedCount,
      ratio:(c.baselineLoad+c.assignedCount)/c.capacity
    }];
  }).filter(x=>/^[A-Za-z0-9_-]{1,180}$/.test(x.id));
  eligible.sort((a,b)=>a.ratio-b.ratio||b.overlap-a.overlap||a.load-b.load||a.id.localeCompare(b.id));
  if(!eligible.length)return [];
  // Gemini can only break ties among equally loaded, qualified coordinators.
  return eligible.filter(c=>Math.abs(c.ratio-eligible[0].ratio)<0.000001 && c.overlap===eligible[0].overlap);
}
export function modelInput(volunteer,candidates) {
  // Never send the volunteer's name, UID, email, medical information,
  // free-text experience or any coordinator contact details to Gemini.
  return {
    interests:volunteer.focusAreas.filter(x=>FOCUS_AREAS.includes(x)),
    mode:volunteer.participationMode,
    weeklyHours:volunteer.weeklyHours,
    availableDays:volunteer.availabilityDays.filter(x=>DAYS.includes(x)),
    options:candidates.map(x=>({coordinatorId:x.id,expertise:x.expertise,load:x.load,capacity:x.capacity}))
  };
}
export function validateModelDraft(result,candidates) {
  if(!result||typeof result!=="object")throw Error("Gemini returned an invalid draft.");
  const coordinatorId=safeText(result.coordinatorId,180);
  if(!candidates.some(x=>x.id===coordinatorId))throw Error("Gemini selected a coordinator outside the approved allocation shortlist.");
  const roleTitle=safeText(result.roleTitle,100);
  const scope=safeText(result.scope,700);
  const reportingInstructions=safeText(result.reportingInstructions,700);
  if(roleTitle.length<8||scope.length<30||reportingInstructions.length<12)throw Error("Gemini draft is incomplete.");
  if(/(?:diagnos|prescrib|independent counsel|clinical treatment)/i.test(roleTitle+" "+scope))throw Error("A clinical duty was suggested for an unlicensed volunteer.");
  return {coordinatorId,roleTitle,scope,reportingInstructions};
}
