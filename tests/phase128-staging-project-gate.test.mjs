import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {stagingIngestionEnabled,PRODUCTION_PROJECT}=
  require("../functions/home-learning-staging-gate.js");
const base={
  HOME_LEARNING_CANDIDATE_INGESTION_ENABLED:"true",
  HOME_LEARNING_APP_ENV:"staging",
  HOME_LEARNING_STAGING_PROJECT_ID:"speakout-learning-staging",
  GCLOUD_PROJECT:"speakout-learning-staging"
};
test("ingestion requires all explicit staging conditions",()=>{
  assert.equal(stagingIngestionEnabled(base),true);
  for(const key of Object.keys(base)){
    const env={...base};
    delete env[key];
    assert.equal(stagingIngestionEnabled(env),false,`Missing ${key} must disable ingestion`);
  }
  assert.equal(stagingIngestionEnabled({...base,HOME_LEARNING_CANDIDATE_INGESTION_ENABLED:"false"}),false);
  assert.equal(stagingIngestionEnabled({...base,HOME_LEARNING_APP_ENV:"production"}),false);
});
test("production and emulator project IDs can never be used for ingestion",()=>{
  assert.equal(stagingIngestionEnabled({...base,GCLOUD_PROJECT:PRODUCTION_PROJECT,
    HOME_LEARNING_STAGING_PROJECT_ID:PRODUCTION_PROJECT}),false);
  assert.equal(stagingIngestionEnabled({...base,GCLOUD_PROJECT:"demo-speakout-rules",
    HOME_LEARNING_STAGING_PROJECT_ID:"demo-speakout-rules"}),false);
  assert.equal(stagingIngestionEnabled({...base,GCLOUD_PROJECT:"speaakout-portal"}),false);
  assert.equal(stagingIngestionEnabled({...base,GCLOUD_PROJECT:"other-project"}),false);
});
test("conflicting project environment variables fail closed",()=>{
  assert.equal(stagingIngestionEnabled({...base,GOOGLE_CLOUD_PROJECT:PRODUCTION_PROJECT}),false);
  assert.equal(stagingIngestionEnabled({...base,GCP_PROJECT:"different-project"}),false);
  assert.equal(stagingIngestionEnabled({...base,GCLOUD_PROJECT:"",
    GOOGLE_CLOUD_PROJECT:"speakout-learning-staging"}),true);
});
