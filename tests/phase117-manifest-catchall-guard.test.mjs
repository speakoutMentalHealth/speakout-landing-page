import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const rules=readFileSync(new URL('../firebase/firestore.rules',import.meta.url),'utf8');
test('trusted manifests excluded from broad superadmin catch-all',()=>{
 const exclusion=rules.match(/function isHomeLearningReviewCollection\(collection\) \{([\s\S]*?)\}/);
 assert.ok(exclusion);
 assert.match(exclusion[1],/homeLearningTrustedResourceManifests/);
 const manifest=rules.match(/match \/homeLearningTrustedResourceManifests\/\{manifestId\} \{([\s\S]*?)\}/);
 assert.ok(manifest);
 assert.match(manifest[1],/allow read, create, update, delete: if false;/);
});
