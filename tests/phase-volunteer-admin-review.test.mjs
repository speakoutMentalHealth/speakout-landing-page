import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
const page=readFileSync(new URL("../admin-users.html",import.meta.url),"utf8");
test("administrators can filter volunteer accounts for approval review",()=>{
 assert.match(page,/<select id="roleFilter">[\\s\\S]*?<option value="volunteer">Volunteer<\\/option>/);
 assert.match(page,/data-status="approved"/);
 assert.match(page,/data-status="rejected"/);
 assert.match(page,/data-status="suspended"/);
 assert.match(page,/status:btn\.dataset\.status/);
});
