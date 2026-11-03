import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
import {canAccessProgrammeMaterial,programmeMaterialsRoute} from "../workers/platform-api/src/programme-materials.js";

const root = new URL("../", import.meta.url);
const read = path => readFileSync(new URL(path,root),"utf8");
const programme = {id:"club-a",schoolId:"school-a",schoolCode:"KPA",createdBy:"creator",facilitatorIds:["teacher-a"],status:"active"};
const identity = (uid,role,schoolId="school-a") => ({uid,profile:{role,schoolId}});
const stub = overrides => ({
  env:{}, getDocument:async(_env,path) => path.startsWith("programmes/") ? programme :
    path.startsWith("programmeMaterials/") ? {
      id:"resource-1",programmeId:"club-a",schoolId:"school-a",
      status:"active",fileName:"Guide.pdf",fileAssetId:"asset",fileStorage:"r2"
    } : null,
  queryDocumentsByField:async() => ({documents:[{id:"resource-1",status:"active",programmeId:"club-a",schoolId:"school-a",title:"Friday guide",fileName:"Guide.pdf",week:1},
    {id:"resource-2",status:"archived",programmeId:"club-a",schoolId:"school-a",title:"Old guide"}],truncated:false}),
  transactionalSet:async()=>({ok:true}),runTransaction:async()=>({ok:true}),
  sha1Hex:async()=>"",sha1Base64Url:async()=>"",
  ...overrides
});

test("facilitators can read only programmes they are assigned to",()=>{
  assert.equal(canAccessProgrammeMaterial(identity("teacher-a","teacher"),programme),true);
  assert.equal(canAccessProgrammeMaterial(identity("creator","teacher"),programme),false);
  assert.equal(canAccessProgrammeMaterial(identity("teacher-b","teacher"),programme),false);
  assert.equal(canAccessProgrammeMaterial(identity("teacher-a","teacher","school-b"),programme),false);
  assert.equal(canAccessProgrammeMaterial(identity("student-a","student"),programme),false);
  assert.equal(canAccessProgrammeMaterial(identity("teacher-a","teacher"),programme,true),false);
});

test("school admins publish only to their school; super admin can support all",()=>{
  assert.equal(canAccessProgrammeMaterial(identity("admin-a","school_admin"),programme,true),true);
  assert.equal(canAccessProgrammeMaterial(identity("admin-b","school_admin","school-b"),programme,true),false);
  assert.equal(canAccessProgrammeMaterial(identity("super","super_admin",""),programme,true),true);
});

test("list only returns active resources and strips private storage metadata",async()=>{
  const response = await programmeMaterialsRoute({
    path:"/v1/programme-materials/list",data:{programmeId:"club-a"},
    user:identity("teacher-a","teacher"),...stub()
  });
  assert.equal(response.materials.length,1);
  assert.equal(response.materials[0].title,"Friday guide");
  assert.equal(response.materials[0].filePublicId,undefined);
  assert.equal(response.materials[0].fileStorage,undefined);
});

test("unassigned teacher cannot list, download, archive or upload resources",async()=>{
  for(const [path,data] of [
    ["/v1/programme-materials/list",{programmeId:"club-a"}],
    ["/v1/programme-materials/download",{materialId:"resource-1"}],
    ["/v1/programme-materials/archive",{materialId:"resource-1"}],
    ["/v1/programme-materials/upload",{programmeId:"club-a"}]
  ]){
    await assert.rejects(programmeMaterialsRoute({
      path,data,user:identity("teacher-b","teacher"),...stub()
    }),e=>e.status===403);
  }
});

test("removed facilitator immediately loses access to old handout links",async()=>{
  const removed = {...programme,facilitatorIds:[]};
  await assert.rejects(programmeMaterialsRoute({
    path:"/v1/programme-materials/download",data:{materialId:"resource-1"},
    user:identity("teacher-a","teacher"),
    ...stub({getDocument:async(_env,path)=>path.startsWith("programmes/")?removed:{
      id:"resource-1",programmeId:"club-a",schoolId:"school-a",status:"active"
    }})
  }),e=>e.status===403);
});

test("dashboard and programme workspaces link to the same reusable material inbox",()=>{
  assert.match(read("teacher-dashboard.html"),/href="facilitator-materials.html"/);
  assert.match(read("programme-workspace.html"),/id="materialsShortcut"/);
  assert.match(read("js/programmes/programme-workspace.js"),/facilitator-materials\.html\?id=/);
  assert.match(read("facilitator-materials.html"),/id="materialsList"/);
  assert.match(read("facilitator-materials.html"),/id="uploadForm"/);
  assert.match(read("js/platform-api.js"),/programmeMaterialsApi/);
  assert.match(read("workers/platform-api/src/index.js"),/programmeMaterialsRoute/);
  assert.match(read("js/programmes/facilitator-materials.js"),/requireRoles\(\["teacher"/);
});

test("private metadata cannot be read from the super-admin Firestore fallback",()=>{
  const rules = read("firebase/firestore.rules");
  const worker = read("workers/platform-api/src/index.js");
  assert.match(rules,/match \/programmeMaterials\/\{materialId\} \{ allow read, write: if false; \}/);
  assert.equal(rules.match(/collection != "programmeMaterials"/g)?.length,4);
  assert.match(worker,/"programmeMaterials",\s*"programmeWeeklyReports",\s*"programmeWeeklyReportAudits"/);
});

test("private R2 upload and download preserve the file and enforce live assignment",async()=>{
  const files = new Map();
  const metadata = new Map();
  const env = {EVIDENCE_BUCKET:{
    async put(key,stream,options){
      files.set(key,await new Response(stream).arrayBuffer());
      metadata.set(key,options.customMetadata);
      return {key};
    },
    async get(key){
      if(!files.has(key))return null;
      return {
        body:new Blob([files.get(key)]).stream(),
        customMetadata:metadata.get(key)
      };
    }
  }};
  let saved = null;
  const fixtures = {
    env,
    getDocument:async(_env,path)=>{
      if(path==="programmes/club-a")return programme;
      if(path.startsWith("programmeMaterials/"))return saved ? {id:path.split("/")[1],...saved}:null;
      return null;
    },
    transactionalSet:async(_env,path,record)=>{saved=record;return {ok:true};},
    queryDocumentsByField:async()=>({documents:[],truncated:false}),
    runTransaction:async()=>({}),
    sha1Hex:async()=>"",sha1Base64Url:async()=>""
  };
  const uploaded=await programmeMaterialsRoute({
    ...fixtures,path:"/v1/programme-materials/upload",
    data:{programmeId:"club-a",title:"Friday facilitator guide",week:"1",
      file:new File(["private guide contents"],"guide.pdf",{type:"application/pdf"})},
    user:identity("admin-a","school_admin")
  });
  assert.equal(uploaded.ok,true);
  assert.equal(saved.fileStorage,"r2");
  assert.equal(saved.schoolId,"school-a");
  const response=await programmeMaterialsRoute({
    ...fixtures,path:"/v1/programme-materials/download",
    data:{materialId:uploaded.material.id},
    user:identity("teacher-a","teacher")
  });
  assert.equal(response.status,200);
  assert.equal(await response.text(),"private guide contents");
  assert.match(response.headers.get("cache-control"),/no-store/);
  await assert.rejects(programmeMaterialsRoute({
    ...fixtures,path:"/v1/programme-materials/download",
    data:{materialId:uploaded.material.id},
    user:identity("teacher-b","teacher")
  }),e=>e.status===403);
});

test("central super admin can discover programme materials across schools without a school link",()=>{
  assert.match(read("admin-dashboard.html"),/href="facilitator-materials\.html"/);
  const ui=read("js/programmes/facilitator-materials.js");
  assert.match(ui,/if \(superAdmin\(\)\) \{\s*\/\/ Central SpeakOut admins/s);
  assert.match(ui,/getDocs\(collection\(db,"programmes"\)\)/);
  assert.match(ui,/item.schoolName \|\| item.schoolCode \|\| item.schoolId/);
  assert.match(ui,/filter\(ownProgramme\)/);
});
