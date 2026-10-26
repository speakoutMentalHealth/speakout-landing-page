#!/usr/bin/env node
// Read-only smoke test of pinned GitHub source verification.
// Intended for GitHub Actions on a real main-branch commit, not a PR merge ref.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {createPinnedGitHubSourceLoader}=require("../functions/home-learning-pinned-source.js");

const commit=process.env.GITHUB_SHA;
assert.match(commit||"",/^[a-f0-9]{40}$/,"A full immutable GITHUB_SHA is required");
const load=createPinnedGitHubSourceLoader();
for (const path of [
  "data/home-learning-catalog.json",
  "early-years-counting-pack.html",
  "senior-secondary-home-learning-packs.html"
]) {
  const actual=await load({sourceCommit:commit,resourceUrl:path});
  const local=readFileSync(new URL(`../${path}`,import.meta.url));
  assert.equal(createHash("sha256").update(actual).digest("hex"),
    createHash("sha256").update(local).digest("hex"),`Pinned GitHub bytes differ for ${path}`);
  assert.equal(actual.length,local.length);
  process.stdout.write(`Pinned source verified: ${path} (${actual.length} bytes)\n`);
}
