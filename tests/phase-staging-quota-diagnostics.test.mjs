import assert from "node:assert/strict";
import test from "node:test";
import { firestoreQuotaDetail, firestoreQuotaSummary } from "./staging-quota-diagnostics.mjs";
import { readFileSync } from "node:fs";

test("structured Firestore quota fields are reported without provider messages", () => {
  const result = firestoreQuotaDetail({
    error: {
      code: 429,
      status: "RESOURCE_EXHAUSTED",
      message: "this raw provider message should never be logged",
      details: [
        { "@type": "type.googleapis.com/google.rpc.ErrorInfo",
          reason: "RATE_LIMIT_EXCEEDED",
          metadata: {
            quota_metric: "firestore.googleapis.com/api/request_count",
            quota_limit: "ReadRequestsPerMinutePerProject"
          }
        },
        { "@type": "type.googleapis.com/google.rpc.QuotaFailure",
          violations: [{subject: "projects/speakout-portal-staging"}] }
      ]
    }
  });
  assert.equal(result.googleStatus, "RESOURCE_EXHAUSTED");
  assert.equal(result.reason, "RATE_LIMIT_EXCEEDED");
  assert.equal(result.quotaMetric, "firestore.googleapis.com/api/request_count");
  assert.equal(result.quotaLimit, "ReadRequestsPerMinutePerProject");
  assert.equal(result.quotaSubject, "projects/speakout-portal-staging");
  assert.doesNotMatch(JSON.stringify(result), /raw provider message/);
});
test("untrusted API content never becomes a log message", () => {
  const danger = firestoreQuotaSummary({
    error: { status: "RESOURCE_EXHAUSTED\nTOKEN=secret",
      details: [{
        "@type": "type.googleapis.com/google.rpc.ErrorInfo",
        reason: "<credential>",
        metadata: { quota_metric: "secret@example.com", quota_limit: "Reads per min" }
      }]
    }
  });
  assert.doesNotMatch(danger, /secret|credential|TOKEN|Reads per min/);
  assert.match(danger, /googleStatus=unavailable/);
  assert.match(danger, /reason=unavailable/);
});
test("missing Google error details are safely classified", () => {
  assert.deepEqual(firestoreQuotaDetail(null), {
    googleStatus: "unavailable", reason: "unavailable", quotaMetric: "unavailable",
    quotaLimit: "unavailable", quotaSubject: "unavailable"
  });
});
test("staging preflight blocks before deploying to staging when direct Firestore is throttled", () => {
  const source = readFileSync(new URL("./staging-capacity-preflight.mjs", import.meta.url), "utf8");
  const workflow = readFileSync(new URL("../.github/workflows/release-acceptance.yml", import.meta.url), "utf8");
  assert.match(source, /response\.status === 429/);
  assert.match(source, /firestoreQuotaSummary\(details\)/);
  assert.match(source, /throw new Error\(/);
  assert.ok(workflow.indexOf("node tests/staging-capacity-preflight.mjs") < workflow.indexOf("Deploy branch Firestore rules to staging"));
});
