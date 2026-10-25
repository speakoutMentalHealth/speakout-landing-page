import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root),'utf8');
test('early literacy is discoverable from Home Learning',()=>{assert.match(read('home-learning.html'),/href="learning-letter-practice\.html"/)});
test('letter activity has five reviewed-in-code answer mappings',()=>{const html=read('learning-letter-practice.html');const qs=[...html.matchAll(/\{prompt:'([^']+)',choices:\[([^\]]+)\],answer:'([^']+)'\}/g)];assert.equal(qs.length,5);for(const [,prompt,choices,answer] of qs){assert.ok(prompt.includes('Which letter starts'));assert.ok(choices.includes("'"+answer+"'"))}});
test('letter activity is accessible, replayable, and has no persistence',()=>{const html=read('learning-letter-practice.html');assert.match(html,/aria-live="polite"/);assert.match(html,/Practise again/);assert.match(html,/unreviewed supplementary practice/);assert.doesNotMatch(html,/localStorage|sessionStorage|fetch\(|<form\b/)});
