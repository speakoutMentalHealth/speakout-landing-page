import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
const read=name=>readFileSync(new URL("../"+name,import.meta.url),"utf8");
const script=new URL("../tests/forum-staging-live-pilot.mjs",import.meta.url).pathname;
test("genuine Firebase staging pilot script parses and requires staging service account",()=>{
 const syntax=spawnSync(process.execPath,["--check",script],{encoding:"utf8",timeout:10000});
 assert.equal(syntax.status,0,syntax.stderr);
 const scope=spawnSync(process.execPath,[script],{
   encoding:"utf8",timeout:10000,env:{PATH:process.env.PATH}
 });
 assert.notEqual(scope.status,0);
 assert.match(scope.stderr,/FIREBASE_SERVICE_ACCOUNT_FILE required/);
});
test("real pilot uses staging only, synthetic accounts and read/write permission checks",()=>{
 const s=read("tests/forum-staging-live-pilot.mjs");
 assert.match(s,/const project="speakout-portal-staging"/);
 assert.match(s,/account\.project_id,project/);
 assert.doesNotMatch(s,/project="speaakout-portal"/);
 assert.match(s,/forumReleaseControls\/pilot/);
 assert.match(s,/suffix=randomBytes/);
 assert.match(s,/await expectDenied\(getDoc\(topicRef\)/);
 assert.match(s,/await approval\.commit\(\)/);
 assert.match(s,/await approveReply\.commit\(\)/);
 assert.match(s,/const reports=await getDocs/);
 assert.match(s,/await close\.commit\(\)/);
 assert.match(s,/finally\{\s*try\{await cleanup\(\)/);
 assert.match(s,/STAGING CLEANUP PASS/);
 assert(s.includes("currentDocument.updateTime"));
 assert(s.includes("currentDocument.exists=false"));
 assert(s.includes("adminGate(gateData,gate.updateTime)"));
 assert(s.includes("adminGate(priorGate,current.updateTime)"));
 assert(s.includes("runTag!==suffix"));
 assert.match(s,/process\.exitCode=1/);
});
test("staging workflow is opt-in, serialized, checks capacity before writes, and never targets production",()=>{
 const w=read(".github/workflows/forum-staging-pilot.yml");
 assert.match(w,/workflow_dispatch:/);
 assert.doesNotMatch(w,/^\s+push:/m);
 assert.doesNotMatch(w,/^\s+pull_request:/m);
 assert.match(w,/group: speakout-shared-staging/);
 assert.match(w,/environment: staging/);
 assert.match(w,/run_pilot:/);
 assert.match(w,/if: inputs\.run_pilot == true/);
 assert.match(w,/default: false/);
 assert.match(w,/tests\/staging-capacity-preflight\.mjs/);
 assert.match(w,/forum-indexes-additive\.mjs/);
 assert.match(w,/--mode=inspect --project=speakout-portal-staging/);
 assert.match(w,/firebase-tools@latest deploy/);
 assert.match(w,/--project speakout-portal-staging/);
 assert.match(w,/tests\/forum-staging-live-pilot\.mjs/);
 assert.match(w,/project_id!==\"speakout-portal-staging\"/);
 assert.doesNotMatch(w,/--project speaakout-portal/);
 const index=w.indexOf("staging-capacity-preflight.mjs");
 const deploy=w.indexOf("firebase-tools@latest deploy");
 const pilot=w.indexOf("tests/forum-staging-live-pilot.mjs");
 assert(index>=0&&deploy>index&&pilot>deploy);
});
test("forum index inspection fails for composites that are not READY",()=>{
 const s=read("scripts/forum-indexes-additive.mjs");
 assert.match(s,/existing\.state!==\"READY\"/);
 assert.match(s,/missing\.length\|\|notReady\.length\?3:0/);
});
