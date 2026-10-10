// Academic placement is separate from course difficulty and account approval.
export const EDUCATION_STAGES = Object.freeze([
  { id: "nursery", label: "Nursery", classes: ["Nursery 1", "Nursery 2", "Nursery 3"] },
  { id: "primary", label: "Primary", classes: Array.from({ length: 6 }, (_, i) => `Primary ${i + 1}`) },
  { id: "secondary", label: "Secondary", classes: ["JSS 1", "JSS 2", "JSS 3", "SS 1", "SS 2", "SS 3"] },
  { id: "tertiary", label: "Tertiary", classes: ["100 Level", "200 Level", "300 Level", "400 Level", "500 Level", "600 Level", "ND 1", "ND 2", "HND 1", "HND 2", "NCE 1", "NCE 2", "NCE 3", "Postgraduate"] }
]);
const clean = value => String(value ?? "").trim().toLowerCase();
const list = value => Array.isArray(value) ? value : (typeof value === "string" ? value.split(",") : []);

export function educationStage(value) {
  const raw = clean(value);
  if (["university", "college", "higher-education"].includes(raw)) return "tertiary";
  return EDUCATION_STAGES.some(stage => stage.id === raw) ? raw : "";
}

export function academicClass(value) {
  let raw = clean(value).replace(/[\s_-]+/g, "");
  if (/^[1-6]00$/.test(raw)) raw += "level";
  raw = raw.replace(/^sss([1-3])$/, "ss$1");
  return EDUCATION_STAGES.flatMap(stage => stage.classes)
    .find(label => label.toLowerCase().replace(/[\s_-]+/g, "") === raw) || "";
}

export function placementForClass(value) {
  const classLevel = academicClass(value);
  const stage = EDUCATION_STAGES.find(item => item.classes.includes(classLevel));
  return stage ? { educationStage: stage.id, classLevel } : null;
}

export function validPlacement(placement) {
  const stage = EDUCATION_STAGES.find(item => item.id === placement?.educationStage);
  return Boolean(stage && stage.classes.includes(placement?.classLevel));
}

export function schoolPlacement(profile = {}) {
  const inferred = placementForClass(profile.classLevel || profile.level);
  const explicit = educationStage(profile.educationStage);
  if (!inferred || (explicit && explicit !== inferred.educationStage)) return null;
  return inferred;
}

export function contentStages(item = {}) {
  // An explicit empty list means deliberately unclassified. Never infer an age
  // from "student", "general" or a difficulty such as "beginner".
  const source = item.educationStages !== undefined ? list(item.educationStages) : list(item.audience);
  return [...new Set(source.map(educationStage).filter(Boolean))];
}

export function matchesPlacement(item, placement, { allClasses = false } = {}) {
  if (!contentStages(item).includes(placement?.educationStage)) return false;
  const rawClasses = list(item.classLevels);
  if (!rawClasses.length) return true; // Explicit stage-wide material.
  if (rawClasses.some(value => !academicClass(value))) return false;
  return allClasses || rawClasses.map(academicClass).includes(placement.classLevel);
}

export function parseEducationMetadata(stagesText, classesText, subject = "") {
  const stages = list(stagesText).map(clean).filter(Boolean);
  if (stages.some(stage => !EDUCATION_STAGES.some(item => item.id === stage))) {
    throw new Error("Use nursery, primary, secondary or tertiary for education sections.");
  }
  const classes = list(classesText).map(value => String(value).trim()).filter(Boolean);
  if (classes.some(value => !academicClass(value))) throw new Error("Use a supported class, for example Primary 3, JSS 2 or 100 Level.");
  if (classes.some(value => !stages.includes(placementForClass(value).educationStage))) {
    throw new Error("Each class must belong to one of the selected education sections.");
  }
  return { educationStages: [...new Set(stages)], classLevels: [...new Set(classes.map(academicClass))], subject: String(subject).trim().slice(0,120) };
}
