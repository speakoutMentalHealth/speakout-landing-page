/** Inspire partner resources: editorial seed, not a published learner catalogue. 
 * Do not infer a media download URL from a lesson page or imply verified curriculum approval.
 * Importers should retain provenance, review status and rights confirmation per asset.
 */
export const INSPIRE_PARTNER_SOURCE = Object.freeze({
 id: "inspire-fme", name: "Inspire e-learning",
 homepage: "https://inspire.education.gov.ng/",
 catalogue: "https://inspire.education.gov.ng/lessons/video/explore?level=primary",
 partnership: "user-reported", publicationStatus: "review-required"
});
export const INSPIRE_PRIMARY1_DISCOVERY = Object.freeze([
 {title:"Objects in the Home",subject:"Basic Science",topic:"Learning About Our Environment"},
 {title:"Objects in the Classroom and School",subject:"Basic Science",topic:"Learning About Our Environment"},
 {title:"Roads",subject:"Basic Science",topic:"Learning About Our Environment"},
 {title:"Soil",subject:"Basic Science",topic:"Learning About Our Environment"},
 {title:"Air",subject:"Basic Science",topic:"Learning About Our Environment"},
 {title:"Water",subject:"Basic Science",topic:"Learning About Our Environment"},
 {title:"Simple Machines",subject:"Basic Technology",topic:"Understanding Basic Technology"},
 {title:"Parts of a Computer",subject:"Basic Technology",topic:"Understanding Basic Technology"}
].map((entry,index)=>Object.freeze({...entry,sourceId:INSPIRE_PARTNER_SOURCE.id,sourceIndex:index+1,stage:"primary",classLevel:1,format:"video",reviewStatus:"discovered",publicationStatus:"unpublished",assetUrl:null,licenseEvidence:null})));
export function readyForNativePublication(item) {
 return Boolean(item && item.reviewStatus==="approved" && item.publicationStatus==="approved" && typeof item.assetUrl==="string" && /^https:\/\//.test(item.assetUrl) && item.licenseEvidence);
}
