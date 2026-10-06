import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root=new URL("../",import.meta.url);
const read=path=>readFileSync(new URL(path,root),"utf8");

test("academic results are managed through the secure platform API",()=>{
  const client=read("js/platform-api.js");
  const worker=read("workers/platform-api/src/index.js");

  for(const route of [
    "/v1/academic-results/school/list",
    "/v1/academic-results/policy",
    "/v1/academic-results/upload",
    "/v1/academic-results/fee-clearance",
    "/v1/academic-results/publication",
    "/v1/academic-results/pin/generate",
    "/v1/academic-results/pin/revoke",
    "/v1/academic-results/parent/list",
    "/v1/academic-results/parent/unlock",
    "/v1/academic-results/download"
  ]){
    assert.match(client,new RegExp(route.replaceAll("/","\\/"),"u"),route+" missing from client");
    assert.match(worker,new RegExp(route.replaceAll("/","\\/"),"u"),route+" missing from worker");
  }

  assert.match(worker,/speakout\/private-results\//u);
  assert.match(worker,/EVIDENCE_BUCKET\.put/u);
  assert.match(worker,/cache-control", "private, no-store, max-age=0"/u);
  assert.match(worker,/content-disposition", "attachment;/u);
});

test("fee clearance and result PIN state cannot be bypassed",()=>{
  const worker=read("workers/platform-api/src/index.js");

  assert.match(worker,/feeClearanceStatus/u);
  assert.match(worker,/School-fee clearance must be confirmed before a result PIN can be generated/u);
  assert.match(worker,/pinHash:\s*await academicResultPinHash/u);
  assert.match(worker,/resultVersion:\s*Number\(result\.resultVersion/u);
  assert.match(worker,/pinVersion:\s*Number\(result\.pinVersion/u);
  assert.match(worker,/academicResultUnlocks/u);
  assert.match(worker,/failedCount >= 5/u);
  assert.match(worker,/15 \* 60 \* 1000/u);
  assert.match(worker,/result_fee_clearance_updated/u);
  assert.match(worker,/result_publication_updated/u);
  assert.match(worker,/result_pin_generated/u);
  assert.match(worker,/result_pin_revoked/u);
  assert.match(worker,/result_downloaded/u);
  assert.match(worker,/result_policy_updated/u);
});

test("institution result policy defaults to reviewed release and is enforced",()=>{
  const worker=read("workers/platform-api/src/index.js");
  const client=read("js/platform-api.js");
  const school=read("school-results.html");

  assert.match(worker,/defaultAccessMode:\s*\["fee_and_pin", "fee_only", "open_after_publish"\]/u);
  assert.match(worker,/allowImmediatePublish:\s*raw\.allowImmediatePublish === true/u);
  assert.match(worker,/managerAuthority:\s*"school_admin_only"/u);
  assert.match(worker,/feeClearanceAuthority:\s*"school_admin_only"/u);
  assert.match(worker,/pinDeliveryMethod:\s*"school_issued_manual"/u);
  assert.match(worker,/requires result review before publication/u);
  assert.match(client,/savePolicy:\s*policy => platformRequest\("\/v1\/academic-results\/policy"/u);
  assert.match(school,/id="policyForm"/u);
  assert.match(school,/School administrators only/u);
  assert.match(school,/Immediate publishing is disabled by school policy/u);
});

test("parents can only reach published results for approved child links",()=>{
  const worker=read("workers/platform-api/src/index.js");
  const parent=read("parent-results.html");
  const parentDashboard=read("parent-dashboard.html");
  const parentJs=read("js/learner/parent-dashboard.js");

  assert.match(worker,/approvedParentLink/u);
  assert.match(worker,/normalized\(link\.status\) === "approved"/u);
  assert.match(worker,/normalized\(record\.status\) === "published"/u);
  assert.match(parent,/academicResultsApi\.parentList/u);
  assert.match(parent,/academicResultsApi\.unlock/u);
  assert.match(parent,/academicResultsApi\.download/u);
  assert.match(parentDashboard,/href="parent-results\.html"/u);
  assert.match(parentJs,/parent-results\.html\?studentId=/u);
});

test("school administrators have result upload, release and download controls",()=>{
  const school=read("school-results.html");
  const dashboard=read("school-dashboard.html");

  assert.match(school,/academicResultsApi\.upload/u);
  assert.match(school,/setFeeClearance/u);
  assert.match(school,/setPublication/u);
  assert.match(school,/generatePin/u);
  assert.match(school,/revokePin/u);
  assert.match(school,/academicResultsApi\.download/u);
  assert.match(school,/Fee clearance \+ PIN/u);
  assert.match(dashboard,/href="school-results\.html"/u);
});

test("academic-result Firestore collections deny direct browser access",()=>{
  const rules=read("firebase/firestore.rules");

  for(const collection of [
    "academicResults",
    "academicResultUnlocks",
    "academicResultPinAttempts",
    "academicResultAuditLogs"
  ]){
    const block=new RegExp("match \/"+collection+"\/\\{[^}]+\\} \\{[\\s\\S]*?allow read, write: if false;[\\s\\S]*?\\}","u");
    assert.match(rules,block,collection+" must be API-only");
  }
});
