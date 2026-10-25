import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
test('home learning links to supervised counting practice',()=>{assert.match(read('home-learning.html'),/href="learning-counting-practice\.html"/)});
test('counting activity has five questions, progress, accessible feedback and replay',()=>{const html=read('learning-counting-practice.html');assert.match(html,/const questions=\[/);assert.equal((html.match(/\{count:\d+,symbol:/g)||[]).length,5);assert.match(html,/aria-live="polite"/);assert.match(html,/Practise again/);assert.match(html,/tabindex="-1"/)});
test('activity avoids personal information and marks review status',()=>{const html=read('learning-counting-practice.html');assert.match(html,/unreviewed supplementary practice/);assert.match(html,/Nothing is saved or transmitted/);assert.doesNotMatch(html,/<form\b|localStorage|sessionStorage|fetch\(/)});
