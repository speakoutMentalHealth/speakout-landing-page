import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
const load=name=>readFileSync(new URL("../"+name,import.meta.url),"utf8");
test("trusted private-pilot operator defaults to dry-run with no admin credentials",()=>{
  const cli=new URL("../scripts/forum-pilot-control.mjs",import.meta.url).pathname;
  const result=spawnSync(process.execPath,[cli,
    "--project=staging-example", "--room=adult-pilot",
    "--action=enable", "--hours=24","--actor=operator-one",
    "--reason=Approved staging pilot with adult moderators"
  ],{encoding:"utf8",timeout:12000});
  assert.equal(result.status,0,result.stderr);
  assert.match(result.stdout,/DRY_RUN/);
  assert.match(result.stdout,/No data changed/);
});
test("private pilot cannot be switched on from client, and existing app indexes are explicitly deployment-gated",()=>{
  const rules=load("firebase/firestore.rules");
  const config=JSON.parse(load("firebase.json"));
  const admin=load("js/forum-admin.js");
  const client=load("js/forum-community.js");
  const runbook=load("docs/forum-private-live-pilot-runbook.md");
  assert.match(rules,/forumReleaseControls\/pilot/);
  assert.match(rules,/forumPilotAuthorized\(roomId\)/);
  assert.match(rules,/forumPilotWriteAllowed\(roomId\)/);
  assert.match(rules,/allow list, create, update, delete: if false/);
  assert.match(admin,/Publish private pilot room/);
  assert.match(admin,/previousPublished/);
  assert.match(admin,/nextPublished/);
  assert.match(client,/adultVerified/);
  assert.match(client,/actor.uid \+ "__" \+ kind \+ "__" \+ targetId/);
  assert.equal(config.firestore.indexes,"firebase/forum-firestore.indexes.json");
  assert.match(runbook,/existing.*remote.*indexes/i);
});
