#!/usr/bin/env node
/**
 * Non-destructive Firestore forum-index operator.
 * Default --plan is offline. --inspect reads remote indexes using gcloud credentials.
 * --apply creates ONLY missing indexes, never deletes, updates or replaces indexes.
 */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

function arg(name, fallback="") {
  const entry=process.argv.find(x=>x.startsWith("--"+name+"="));
  return entry ? entry.slice(name.length+3) : fallback;
}
const mode=arg("mode","plan");
const project=arg("project");
const actor=arg("actor");
const validProject=/^[a-z][a-z0-9-]{5,61}$/.test(project);
const file=new URL("../firebase/forum-firestore.indexes.json",import.meta.url);
const proposed=JSON.parse(readFileSync(file,"utf8")).indexes;
function fields(index) {
  return index.fields.filter(f=>f.fieldPath!=="__name__").map(f=>[f.fieldPath,f.order||f.arrayConfig||""]);
}
function signature(index) {
  return JSON.stringify([index.queryScope,...fields(index)]);
}
function reference(index){
  return index.collectionGroup+" "+fields(index).map(x=>x.join(" ")).join(", ");
}
function logResult(result){console.log(JSON.stringify(result));}
if(!["plan","inspect","apply"].includes(mode))throw Error("Use --mode=plan|inspect|apply");
if(mode!=="plan"&&!validProject)throw Error("Remote inspection requires a valid --project=FIREBASE_PROJECT_ID");
if(!Array.isArray(proposed)||proposed.length<2||proposed.length>8 ||
 proposed.some(x=>!["forumTopics","forumReplies"].includes(x.collectionGroup) ||
 x.queryScope!=="COLLECTION"||x.fields.length<2||x.fields.length>5))throw Error("Unexpected forum index definitions.");
if(mode==="plan"){
  logResult({mode:"OFFLINE_PLAN",requiresCredentials:false,
    proposed:proposed.map(reference),
    message:"No network access or database changes. Use --mode=inspect --project=... to compare actual indexes."});
  process.exit(0);
}
if(mode==="apply"){
  if(process.env.FORUM_INDEX_CONFIRM_PROJECT!==project || arg("ack")!=="ADD_ONLY")
    throw Error("Index creation refused: exact FORUM_INDEX_CONFIRM_PROJECT and --ack=ADD_ONLY are required.");
  if(project==="speaakout-portal" &&
    (arg("production-ack")!=="PRODUCTION_INDEXES_APPROVED" ||
      !actor || process.env.FORUM_INDEX_PRODUCTION_APPROVER!==actor)) {
    throw Error("Production index creation requires explicit approval and matching operator identity.");
  }
}
let token;
try {
  token=execFileSync("gcloud",["auth","print-access-token"],{encoding:"utf8",timeout:15000}).trim();
} catch {
  throw Error("Missing Google Cloud CLI credentials. Authenticate with a privileged, least-privilege operator account.");
}
if(!token)throw Error("No Google access token obtained");
const base="https://firestore.googleapis.com/v1/projects/"+encodeURIComponent(project)+"/databases/(default)/collectionGroups/";
async function request(url,method="GET",body) {
  const response=await fetch(url,{method,headers:{
    "Authorization":"Bearer "+token,
    "Content-Type":"application/json"
  },body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(25000)});
  const content=await response.text();
  if(!response.ok)throw Error("Firestore Admin API "+method+" failed HTTP "+response.status+" (no index changes inferred): "+content.slice(0,400));
  return content?JSON.parse(content):{};
}
async function currentIndexes(group) {
  let next="",all=[],pages=0;
  do{
    const parent=base+encodeURIComponent(group)+"/indexes";
    const url=parent+(next?"?pageToken="+encodeURIComponent(next):"");
    const value=await request(url);
    all.push(...(value.indexes||[]));
    next=value.nextPageToken||"";
    if(++pages>30)throw Error("Too many index listing pages; aborting.");
  }while(next);
  return all;
}
const byGroup=new Map();
for(const group of new Set(proposed.map(x=>x.collectionGroup)))byGroup.set(group,await currentIndexes(group));
const missing=[];
for(const item of proposed){
  const existing=byGroup.get(item.collectionGroup).find(x=>signature(x)===signature(item));
  logResult({collection:item.collectionGroup,signature:reference(item),
    status:existing ? (existing.state||"EXISTS") : "MISSING",
    mode:mode.toUpperCase()});
  if(!existing)missing.push(item);
}
if(mode==="inspect"){
  logResult({mode:"READ_ONLY_INSPECTION",project,missing:missing.length,total:proposed.length,
    message:"No indexes created, modified or deleted. READY is required before real forum queries."});
  process.exit(missing.length?3:0);
}
for(const item of missing){
  const url=base+encodeURIComponent(item.collectionGroup)+"/indexes";
  const operation=await request(url,"POST",{queryScope:item.queryScope,fields:item.fields});
  logResult({action:"CREATE_REQUESTED",collection:item.collectionGroup,
    operation:operation.name||"submitted",note:"Index may still be BUILDING; inspect again before pilot."});
}
logResult({mode:"ADD_ONLY",project,requested:missing.length,existing:proposed.length-missing.length,
  deletes:0,updates:0});
