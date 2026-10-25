import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const rules=readFileSync(new URL('../firebase/firestore.rules',import.meta.url),'utf8');
const handler=readFileSync(new URL('../functions/index.js',import.meta.url),'utf8').split('exports.recordHomeLearningEditorialDecision = onCall(')[1];
test('trusted resource manifests deny all browser operations',()=>{
 const match=rules.match(/match \/homeLearningTrustedResourceManifests\/\{manifestId\} \{([^}]+)\}/);
 assert.ok(match);
 assert.match(match[1],/allow read, create, update, delete: if false;/);
});
test('editorial verification remains disabled until trusted manifest integration',()=>{
 assert.ok(handler);
 assert.match(handler,/\["request_changes", "reject"\]\.includes\(outcome\)/);
 assert.match(handler,/published: false/);
});
