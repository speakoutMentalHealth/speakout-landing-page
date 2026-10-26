"use strict";

// Defence in depth: a feature flag alone must never activate ingestion in production.
// Only a separately named nonproduction Firebase project may enable this callable.
// This function never grants educational review, trusted status or publication.
const PRODUCTION_PROJECT = "speaakout-portal";

function stagingIngestionEnabled(env = {}) {
  if (env.HOME_LEARNING_CANDIDATE_INGESTION_ENABLED !== "true" ||
      env.HOME_LEARNING_APP_ENV !== "staging") return false;
  const expected = env.HOME_LEARNING_STAGING_PROJECT_ID;
  const names = [env.GCLOUD_PROJECT,env.GOOGLE_CLOUD_PROJECT,env.GCP_PROJECT]
    .filter(value => typeof value === "string" && value.trim().length > 0);
  if (typeof expected !== "string" ||
      !/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(expected) ||
      expected === PRODUCTION_PROJECT ||
      expected.startsWith("demo-") ||
      !names.length || names.some(name => name !== expected)) {
    return false;
  }
  return true;
}

module.exports = {stagingIngestionEnabled,PRODUCTION_PROJECT};
