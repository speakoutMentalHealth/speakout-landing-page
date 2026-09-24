import {PLATFORM_API_BASE} from "./platform-config.js";

let cataloguePromise=null;

async function requestCatalogue(){
  if(!PLATFORM_API_BASE)throw new Error("Public course catalogue is unavailable on this host.");
  const response=await fetch(PLATFORM_API_BASE+"/v1/catalog/courses",{
    method:"GET",
    credentials:"omit",
    cache:"default"
  });
  if(!response.ok)throw new Error("The public course catalogue could not be loaded.");
  const body=await response.json();
  return Array.isArray(body.courses)?body.courses:[];
}

export async function loadPublicCourses(){
  if(!cataloguePromise)cataloguePromise=requestCatalogue().catch(error=>{
    cataloguePromise=null;
    throw error;
  });
  return cataloguePromise;
}

export async function loadPublicCourse(id){
  const key=String(id||"").trim();
  if(!key)return null;
  return (await loadPublicCourses()).find(course=>String(course.id||"")===key)||null;
}

export function resetPublicCourseCatalogue(){
  cataloguePromise=null;
}
