import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { classifyHead, verifyReleaseHead } from "./staging-pr-head-guard.mjs";

const a = "a".repeat(40);
const b = "b".repeat(40);
const env = {
  GITHUB_EVENT_NAME: "pull_request",
  GITHUB_REPOSITORY: "speakoutMentalHealth/speakout-landing-page",
  GITHUB_TOKEN: "test-placeholder-not-real",
  PR_NUMBER: "391",
  PR_HEAD_SHA: a
};

test("rejects superseded or closed PR heads, accepts only current open head", () => {
  assert.equal(classifyHead({eventName:"pull_request",eventHead:a,currentHead:a,state:"open"}).status,"current");
  assert.equal(classifyHead({eventName:"pull_request",eventHead:a,currentHead:b,state:"open"}).status,"superseded");
  assert.equal(classifyHead({eventName:"pull_request",eventHead:a,currentHead:a,state:"closed"}).status,"not_open");
  assert.equal(classifyHead({eventName:"pull_request",eventHead:"bad",currentHead:a,state:"open"}).status,"invalid_sha");
  assert.equal(classifyHead({eventName:"workflow_dispatch"}).status,"not_applicable");
});

test("read-only GitHub head verification rejects a stale event", async () => {
  let calls = 0;
  const mock = async (_url, options) => {
    calls++;
    assert.equal(options.headers.accept, "application/vnd.github+json");
    return {ok:true,json:async()=>({state:"open",head:{sha:b}})};
  };
  await assert.rejects(verifyReleaseHead(env,mock),/superseded/);
  assert.equal(calls,1);
});

test("current event is admitted and a non-PR event does not call GitHub", async () => {
  let calls = 0;
  const mock = async () => { calls++; return {ok:true,json:async()=>({state:"open",head:{sha:a}})}; };
  assert.equal((await verifyReleaseHead(env,mock)).status,"current");
  assert.equal((await verifyReleaseHead({...env,GITHUB_EVENT_NAME:"workflow_dispatch"},mock)).status,"not_applicable");
  assert.equal(calls,1);
});

test("API failures and malformed PR input block staging, without echoing secret", async () => {
  const failure=async()=>({ok:false,status:429});
  await assert.rejects(verifyReleaseHead(env,failure),/HTTP 429/);
  await assert.rejects(verifyReleaseHead({...env,PR_NUMBER:"not-a-number"},failure),/Invalid GitHub PR/);
});

test("both PR guards precede staging deployment; an outdated run cannot report pass", () => {
  const yaml=readFileSync(new URL("../.github/workflows/release-acceptance.yml",import.meta.url),"utf8");
  const positions=[...yaml.matchAll(/node tests\/staging-pr-head-guard\.mjs/g)].map(m=>m.index);
  assert.equal(positions.length,2);
  assert.ok(positions[0] < yaml.indexOf("Check staging credentials"));
  assert.ok(positions[1] > yaml.indexOf("staging-capacity-preflight.mjs"));
  assert.ok(positions[1] < yaml.indexOf("Deploy branch Firestore rules to staging"));
  const code=readFileSync(new URL("./staging-pr-head-guard.mjs",import.meta.url),"utf8");
  assert.match(code,/process\.exitCode = 1/);
  assert.match(yaml,/pull-requests: read/);
});
