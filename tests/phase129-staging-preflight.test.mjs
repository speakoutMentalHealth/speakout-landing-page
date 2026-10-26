import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {checkStagingTarget} from "../scripts/home-learning-staging-preflight.mjs";

const target="speakout-learning-stage";
test("preflight checks only isolated project ID and does not imply deployment",()=>{
 const report=checkStagingTarget({projectId:target,declaredStagingId:target});
 assert.equal(report.targetProjectId,target);
 assert.equal(report.result,"target-format-and-isolation-only");
 for(const key of [
   "credentialsVerified","projectExistenceVerified","stagingFunctionDeployed",
   "educationalContentApproved","productionDeploymentPermitted"
 ]) assert.equal(report[key],false,key);
 assert.ok(Object.isFrozen(report));
});
test("preflight blocks production, demo, ambiguous and mismatched staging IDs",()=>{
 for(const [projectId,declaredStagingId] of [
  ["speaakout-portal","speaakout-portal"],
  ["demo-speakout-rules","demo-speakout-rules"],
  ["speakout-prod-test","speakout-prod-test"],
  ["learning-production","learning-production"],
  [target,"different-project"],
  [target,undefined],
  ["invalid/project","invalid/project"],
  ["",target]
 ]) assert.throws(()=>checkStagingTarget({projectId,declaredStagingId}),undefined,
   `Unexpected staging acceptance: ${projectId}`);
 assert.throws(()=>checkStagingTarget({
   projectId:target,declaredStagingId:target,defaultFirebaseProject:"another-default"
 }));
});
test("CLI requires explicitly matching environment and provides no deployment action",()=>{
 const script=fileURLToPath(new URL("../scripts/home-learning-staging-preflight.mjs",import.meta.url));
 const good=spawnSync(process.execPath,[script,"--project",target],{
   env:{...process.env,HOME_LEARNING_STAGING_PROJECT_ID:target},
   encoding:"utf8",timeout:5000
 });
 assert.equal(good.status,0,good.stderr);
 assert.match(good.stdout,/"productionDeploymentPermitted": false/);
 const blocked=spawnSync(process.execPath,[script,"--project","speaakout-portal"],{
   env:{...process.env,HOME_LEARNING_STAGING_PROJECT_ID:"speaakout-portal"},
   encoding:"utf8",timeout:5000
 });
 assert.equal(blocked.status,1);
 assert.match(blocked.stderr,/rejected/i);
 const missing=spawnSync(process.execPath,[script,"--project",target],{
   env:{...process.env,HOME_LEARNING_STAGING_PROJECT_ID:""},
   encoding:"utf8",timeout:5000
 });
 assert.equal(missing.status,1);
});
