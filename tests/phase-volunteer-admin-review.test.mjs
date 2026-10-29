import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
const page=readFileSync(new URL("../admin-users.html",import.meta.url),"utf8");
test("administrators can filter volunteer accounts for approval review",()=>{
 assert.ok(page.includes('<option value="volunteer">Volunteer</option>'));
 for(const status of ["approved","rejected","suspended"]){
  assert.ok(page.includes('data-status="'+status+'"'));
 }
 assert.ok(page.includes("status:btn.dataset.status"));
});
