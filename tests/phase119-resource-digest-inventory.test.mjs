import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const script=readFileSync(new URL('../scripts/home-learning-resource-digests.mjs',import.meta.url),'utf8');
test('digest inventory is read-only and never marks content trusted',()=>{
 assert.match(script,/createHash\('sha256'\)/);
 assert.match(script,/candidate-unverified/);
 assert.doesNotMatch(script,/firebase-admin|homeLearningTrustedResourceManifests|status:\s*'trusted'/);
});
