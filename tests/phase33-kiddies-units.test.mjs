import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
test('original units include substantive lessons, learner practice, answer and review guidance',async()=>{
 const nursery=await readFile(new URL('../content/kiddies/nursery-unit-01.md',import.meta.url),'utf8');
 const primary=await readFile(new URL('../content/kiddies/primary1-unit-01.md',import.meta.url),'utf8');
 assert.equal((nursery.match(/^## Lesson [1-4]:/gm)||[]).length,4);
 assert.equal((primary.match(/^## (English|Mathematics) Lesson [1-3]:/gm)||[]).length,6);
 assert.ok(nursery.split(/\s+/).length>1000);assert.ok(primary.split(/\s+/).length>1800);
 assert.match(nursery,/Reusable activity sheet/);assert.match(primary,/English practice sheet/);assert.match(primary,/Mathematics practice sheet/);
 assert.match(nursery,/no verified outcome locator/);assert.match(primary,/national outcome alignment is not claimed/);
 assert.match(nursery,/No reviewer identity or approval/);assert.match(primary,/No reviewer or approval is invented/);
 // Validate every explicit arithmetic statement, including answer sheets.
 const equations=[...primary.matchAll(/(\d+) ([+−]) (\d+) = (\d+)/g)];assert.ok(equations.length>=6);
 for(const [,a,op,b,c]of equations)assert.equal(op==='+'?Number(a)+Number(b):Number(a)-Number(b),Number(c));
});
test('review publication is an escaped static teaching copy, not a database importer',async()=>{
 const page=await readFile(new URL('../kiddies-units-review.html',import.meta.url),'utf8');
 assert.match(page,/Teacher and rights review pending/);assert.match(page,/id="primary1-unit-01" class="unit" hidden/);
 assert.equal((page.match(/class="unit"/g)||[]).length,2);
 assert.doesNotMatch(page,/firebasejs|setDoc|certificateEligible/);
});
