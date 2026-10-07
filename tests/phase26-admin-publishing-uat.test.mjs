import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("admin publishing staging UAT script parses", () => {
  const path = new URL("../tests/admin-publishing-staging.mjs", import.meta.url).pathname;
  execFileSync(process.execPath, ["--check", path]);
});

test("publishing UAT covers draft, public release, hide and audiobook rights", () => {
  const source = read("tests/admin-publishing-staging.mjs");
  for (const marker of [
    "draftNotPublic",
    "publishPublic",
    "hiddenRemovedFromPublic",
    "audiobookRightsBlocked",
    "audiobookVerifiedRightsPublished",
    "audiobookHiddenRemovedFromPublic",
    "recordsDeleted"
  ]) {
    assert.match(source, new RegExp(marker), marker);
  }
});

test("TV admin exposes the editorial and audiobook gates exercised by UAT", () => {
  const page = read("admin-tv.html");
  assert.match(page, /collectionName:"tvEpisodes"/u);
  assert.match(page, /id="learningType"/u);
  assert.match(page, /id="bookRights"/u);
  assert.match(page, /id="editorialReview"/u);
  assert.match(page, /Draft — review first/u);
  assert.match(page, /Published — visible/u);
  assert.match(page, /Hidden/u);
});

test("admin publishing workflow deploys staging Worker before acceptance", () => {
  const workflow = read(".github/workflows/admin-publishing-staging.yml");
  assert.match(workflow, /Deploy branch Worker to staging/u);
  assert.match(workflow, /Run admin publishing staging UAT/u);
  assert.match(workflow, /audiobook rights enforcement/u);
});
