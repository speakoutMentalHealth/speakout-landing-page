/**
 * Academy editorial manifest, not a learner-facing published course catalogue.
 * Explicit source records are required before external media may be displayed.
 */
export const PARTNER_PORTALS=Object.freeze({
 inspire:"https://inspire.education.gov.ng/",
 ignite:"https://ignite.education.gov.ng/",
 elearn:"https://elearn.education.gov.ng/"
});
export const REVIEW_STATES=Object.freeze(["discovered","source-verified","rights-cleared","curriculum-reviewed","approved"]);
export const PRIMARY_EDITORIAL_QUEUE=Object.freeze(
 Array.from({length:6},(_,i)=>i+1).flatMap(grade=>["English","Maths"].map(subject=>Object.freeze({
 id:"primary-"+grade+"-"+subject.toLowerCase(),
 grade,subject,stage:"primary",
 lessonUrl:subject==="English"
  ?(grade===1?"pages/primary-1-english-guided-lesson.html":"pages/primary-english-guided-lessons.html?class="+grade)
  :(grade===1?"pages/primary-1-maths-guided-lesson.html":null),
 practiceUrl:"pages/primary-learning-preview.html?class="+grade+"&subject="+subject,
 contentStatus:"development-preview",educatorReview:"pending",
 sources:Object.freeze(["inspire","ignite","elearn"].map(source=>Object.freeze({
  source,sourcePageUrl:null,assetUrl:null,rightsEvidenceUrl:null,
  curriculumEvidenceUrl:null,reviewedBy:null,reviewedAt:null,
  reviewStatus:"discovered",publicationStatus:"unpublished"
 })))
}))));
export function validateAssetForPublication(asset){
 const errors=[];
 if(!asset||typeof asset!=="object")return ["Missing asset record"];
 if(!Object.hasOwn(PARTNER_PORTALS,asset.source))errors.push("Unknown partner source");
 for(const field of ["sourcePageUrl","assetUrl","rightsEvidenceUrl","curriculumEvidenceUrl"]){
  if(typeof asset[field]!=="string"||!/^https:\/\//.test(asset[field]))errors.push("Missing HTTPS "+field);
 }
 if(!asset.reviewedBy||!asset.reviewedAt)errors.push("Missing educator review");
 if(asset.reviewStatus!=="approved"||asset.publicationStatus!=="approved")errors.push("Asset not approved");
 if(!Array.isArray(asset.allowedUses)||!asset.allowedUses.length)errors.push("No permitted use documented");
 return errors;
}
export function readyToPublishLesson(lesson){
 return Boolean(lesson&&lesson.educatorReview==="approved"&&lesson.contentStatus==="approved"&&
 Array.isArray(lesson.sources)&&lesson.sources.length===3&&
 ["inspire","ignite","elearn"].every(source=>lesson.sources.some(asset=>asset.source===source&&validateAssetForPublication(asset).length===0)));
}
