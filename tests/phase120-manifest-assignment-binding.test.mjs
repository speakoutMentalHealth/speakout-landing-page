import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../functions/index.js',import.meta.url),'utf8');
const start=source.lastIndexOf('exports.recordHomeLearningEditorialDecision = onCall');
const editorial=source.slice(start);
test('trusted manifest is read in same transaction as editorial decision',()=>{
 assert.match(editorial,/const manifestRef = db\.doc\(`homeLearningTrustedResourceManifests\/\$\{assignmentId\}`\)/);
 assert.match(editorial,/tx\.get\(manifestRef\)/);
 assert.doesNotMatch(editorial,/await db\.doc\(`homeLearningTrustedResourceManifests/);
});
test('manifest binds assignment identity, resource and exact version',()=>{
 for(const term of ['manifest.assignmentId !== assignmentId','manifest.resourceId !== assignment.resourceId','manifest.resourceVersion !== assignment.resourceVersion','manifest.contentSha256 !== contentSha256','manifest.status !== "trusted"']) assert.ok(editorial.includes(term),term);
 assert.ok(editorial.includes('published: false'));
});
