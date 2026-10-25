import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../scripts/home-learning-resource-digests.mjs',import.meta.url),'utf8');
test('inventory rejects duplicate resource identifiers',()=>{
 assert.match(src,/seenIds\.has\(resource\.id\)/);
 assert.match(src,/seenIds\.add\(resource\.id\)/);
});
test('inventory resolves symbolic links before reading files',()=>{
 assert.match(src,/realpathSync\(full\)/);
 assert.match(src,/realpathSync\(root\)/);
 assert.match(src,/Resource symlink escapes repository/);
});
test('inventory does not authorize publishing',()=>{
 assert.match(src,/candidate-unverified/);
 assert.doesNotMatch(src,/firebase-admin|status:\s*['"]trusted['"]/);
});
