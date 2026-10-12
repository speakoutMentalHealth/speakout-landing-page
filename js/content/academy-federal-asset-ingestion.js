// Individual federal learning assets, distinct from source collection/listing pages.
// SpeakOut authorization is recorded at program level; each asset still requires
// a resolvable media URL and format review before native display.
export const FEDERAL_SOURCES = Object.freeze(['Inspire','Ignite','eLearn']);
export const ASSET_KINDS = Object.freeze(['video','audio','ebook','document','interactive','teacher-guide']);
export function validateFederalAsset(asset){
  const errors=[];
  if(!asset||typeof asset!=='object'||Array.isArray(asset))return ['Asset must be an object'];
  for(const key of ['id','source','title','level','subject','kind','sourceUrl','assetUrl','attribution'])if(typeof asset[key]!=='string'||!asset[key].trim())errors.push('Missing '+key);
  if(!FEDERAL_SOURCES.includes(asset.source))errors.push('Unsupported source');
  if(!ASSET_KINDS.includes(asset.kind))errors.push('Unsupported kind');
  for(const key of ['sourceUrl','assetUrl']){
    try{const u=new URL(asset[key]);if(u.protocol!=='https:'||!u.hostname||u.username||u.password)errors.push('Unsafe '+key)}catch{errors.push('Invalid '+key)}
  }
  if(asset.reviewStatus!=='approved')errors.push('Asset review not approved');
  if(asset.permissionStatus!=='authorized')errors.push('Permission not recorded');
  if(asset.publicationStatus!=='native-published')errors.push('Asset not published');
  return errors;
}
export function publishableFederalAssets(assets){return (Array.isArray(assets)?assets:[]).filter(a=>validateFederalAsset(a).length===0)}
