#!/usr/bin/env node
// Home Learning staging target preflight. READ-ONLY, no Firebase credentials,
// network calls, writes, or deployment. It cannot verify a project exists.
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import {pathToFileURL} from "node:url";
import {resolve} from "node:path";

const require=createRequire(import.meta.url);
const {PRODUCTION_PROJECT}=require("../functions/home-learning-staging-gate.js");
const config=JSON.parse(readFileSync(new URL("../.firebaserc",import.meta.url),"utf8"));
const defaultProject=config?.projects?.default;
const PROJECT=/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/;

export function checkStagingTarget({projectId,declaredStagingId,defaultFirebaseProject=defaultProject}={}) {
  if(typeof defaultFirebaseProject!=="string" || !defaultFirebaseProject.trim()) {
    throw new Error("Missing configured Firebase default project; fail closed");
  }
  if(defaultFirebaseProject!==PRODUCTION_PROJECT) {
    throw new Error("Unexpected Firebase default project; review project mapping first");
  }
  if(typeof projectId!=="string" || !PROJECT.test(projectId) ||
    typeof declaredStagingId!=="string" || declaredStagingId!==projectId) {
    throw new Error("An explicit matching staging project ID is required");
  }
  if(projectId===PRODUCTION_PROJECT || projectId.startsWith("demo-") ||
    projectId.includes("production") || projectId.includes("-prod")) {
    throw new Error("Production or emulator project may not be used for staging");
  }
  return Object.freeze({
    targetProjectId:projectId,
    firebaseDefaultProjectId:defaultFirebaseProject,
    result:"target-format-and-isolation-only",
    credentialsVerified:false,
    projectExistenceVerified:false,
    stagingFunctionDeployed:false,
    educationalContentApproved:false,
    productionDeploymentPermitted:false
  });
}

if(process.argv[1] && pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
  const args=process.argv.slice(2);
  const index=args.indexOf("--project");
  const target=index>=0?args[index+1]:null;
  if(!target || args.length!==2 || index!==0){
    process.stderr.write("Usage: node scripts/home-learning-staging-preflight.mjs --project <nonproduction-project-id>\n");
    process.exitCode=2;
  } else {
    try {
      const result=checkStagingTarget({
        projectId:target,
        declaredStagingId:process.env.HOME_LEARNING_STAGING_PROJECT_ID
      });
      process.stdout.write(JSON.stringify(result,null,2)+"\n");
    } catch(err){
      process.stderr.write("Staging target rejected: "+err.message+"\n");
      process.exitCode=1;
    }
  }
}
