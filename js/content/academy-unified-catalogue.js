/**
 * Open-ended multi-source catalogue schema. Not a claim that partner catalogues
 * have been crawled, imported, licensed or approved.
 */
export const CATALOGUE_SOURCES=Object.freeze({
 inspire:{name:"Inspire",homepage:"https://inspire.education.gov.ng/",role:"learner-media"},
 ignite:{name:"Ignite",homepage:"https://ignite.education.gov.ng/",role:"facilitator-guidance"},
 elearn:{name:"eLearn",homepage:"https://elearn.education.gov.ng/",role:"curriculum-resources"}
});
export const CONTENT_TYPES=Object.freeze(["lesson","video","audio","ebook","worksheet","lesson-plan","assessment","activity","course","other"]);
export const EDUCATION_STAGES=Object.freeze(["early-years","nursery","primary","junior-secondary","senior-secondary","tertiary","vocational","professional","adult-learning","other"]);
export function validateCatalogueRecord(record){
 const issues=[];
 if(!record||typeof record!=="object")return ["Missing record"];
 for(const field of ["id","title","stage","subject","source"]){
  if(typeof record[field]!=="string"||!record[field].trim())issues.push("Missing "+field);
 }
 if(record.stage&&!EDUCATION_STAGES.includes(record.stage))issues.push("Unrecognized stage");
 if(record.source&&!Object.hasOwn(CATALOGUE_SOURCES,record.source))issues.push("Unrecognized source");
 if(record.type&&!CONTENT_TYPES.includes(record.type))issues.push("Unrecognized content type");
 if(record.sourcePageUrl&&!/^https:\/\//.test(record.sourcePageUrl))issues.push("Invalid source page URL");
 if(record.assetUrl&&!/^https:\/\//.test(record.assetUrl))issues.push("Invalid asset URL");
 return issues;
}
export function canEmbedPartnerAsset(record){
 return validateCatalogueRecord(record).length===0&&
 record.reviewStatus==="approved"&&record.rightsStatus==="cleared"&&
 Array.isArray(record.allowedUses)&&record.allowedUses.includes("embed")&&
 typeof record.assetUrl==="string"&&/^https:\/\//.test(record.assetUrl)&&
 Boolean(record.rightsEvidenceUrl)&&Boolean(record.reviewedBy);
}
export function groupCatalogue(records){
 const groups=new Map();
 for(const record of records){
  if(validateCatalogueRecord(record).length)continue;
  const key=[record.stage,record.classLevel||"all",record.subject,record.topic||"general"].join("|");
  if(!groups.has(key))groups.set(key,{stage:record.stage,classLevel:record.classLevel||null,subject:record.subject,topic:record.topic||null,resources:[]});
  groups.get(key).resources.push(record);
 }
 return [...groups.values()];
}
