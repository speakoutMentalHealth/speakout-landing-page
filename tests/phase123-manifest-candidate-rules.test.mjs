import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const rules=readFileSync(new URL('../firebase/firestore.rules',import.meta.url),'utf8');
test('candidate manifests are inaccessible to browsers',()=>{
 assert.match(rules,/match \/homeLearningManifestCandidates\/\{candidateId\} \{\s*allow read, create, update, delete: if false;/);
});
test('candidate manifests cannot be accessed through superadmin catch-all',()=>{
 const helper=rules.match(/function isHomeLearningReviewCollection\(collection\) \{([\s\S]*?)\}/)?.[1]||'';
 assert.match(helper,/homeLearningManifestCandidates/);
});
