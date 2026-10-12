/** Academy partner resource import validation. No network calls or automatic publishing. */
(function(root){'use strict';
const SOURCES=new Set(['Inspire','Ignite','eLearn']);
const KINDS=new Set(['facilitator-topic','resource-listing','catalogue','lesson','video','audio','ebook','worksheet','assessment','lesson-plan']);
const VALID_STATUS=new Set(['external-link-only','editorial-review','native-published']);
function validate(record){const errors=[];if(!record||typeof record!=='object')return {valid:false,errors:['Record must be an object']};
for(const field of ['id','title','subject','level','source','url','contentKind','publicationStatus'])if(typeof record[field]!=='string'||!record[field].trim())errors.push('Missing '+field);
if(!SOURCES.has(record.source))errors.push('Unsupported source');if(!KINDS.has(record.contentKind))errors.push('Unsupported contentKind');if(!VALID_STATUS.has(record.publicationStatus))errors.push('Unsupported publicationStatus');
try{const u=new URL(record.url);if(u.protocol!=='https:')errors.push('HTTPS required');const domains={Inspire:'inspire.education.gov.ng',Ignite:'ignite.education.gov.ng',eLearn:'elearn.education.gov.ng'};if(u.hostname!==domains[record.source])errors.push('Source domain mismatch')}catch(e){errors.push('Invalid URL')}
if(record.publicationStatus==='native-published'&&!(record.rightsStatus==='cleared'&&record.reviewStatus==='approved'&&record.sourceVerifiedAt&&record.assetUrl&&record.approvedBy))errors.push('Native publication requires rights, approved review, source verification, asset URL and reviewer');
return {valid:errors.length===0,errors};}
function validateBatch(records){const seen=new Set();return (Array.isArray(records)?records:[]).map((r,i)=>{const result=validate(r);if(r&&seen.has(r.id))result.errors.push('Duplicate id');if(r)seen.add(r.id);result.valid=result.errors.length===0;return {index:i,id:r&&r.id||null,...result}})}
root.SpeakOutAcademyImport={validate,validateBatch};
})(typeof window!=='undefined'?window:globalThis);
