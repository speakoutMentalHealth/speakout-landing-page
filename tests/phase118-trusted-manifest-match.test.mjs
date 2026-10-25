import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../functions/index.js',import.meta.url),'utf8');
const handler=source.split('exports.recordHomeLearningEditorialDecision = onCall(')[1];
test('editorial decision fails closed without matching trusted manifest',()=>{
 assert.ok(handler);
 assert.match(handler,/homeLearningTrustedResourceManifests/);
 assert.match(handler,/tx\.get\(manifestRef\)/);
 assert.match(handler,/manifestSnap\.exists \? manifestSnap\.data\(\) : null/);
 assert.match(handler,/!manifest/);
 assert.match(handler,/manifest\.contentSha256 !== contentSha256/);
 assert.match(handler,/manifest\.status !== "trusted"/);
 assert.match(handler,/manifest\.assignmentId !== assignmentId/);
 assert.match(handler,/manifest\.resourceId !== assignment\.resourceId/);
 assert.match(handler,/manifest\.resourceVersion !== assignment\.resourceVersion/);
 assert.match(handler,/Trusted content verification unavailable/);
});
test('trusted manifest does not enable positive publication',()=>{
 assert.match(handler,/\["request_changes", "reject"\]\.includes\(outcome\)/);
 assert.match(handler,/published: false/);
});
