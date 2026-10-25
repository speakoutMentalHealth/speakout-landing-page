import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root),'utf8');
for(const [file,label] of [['learning-primary-maths-practice.html','maths'],['learning-primary-english-practice.html','English']]){
 test(label+' practice has five answerable questions and replay',()=>{
  const html=read(file),matches=[...html.matchAll(/\{prompt:'([^']+)',choices:\[([^\]]+)\],answer:'([^']+)'\}/g)];
  assert.equal(matches.length,5);
  for(const [,prompt,choices,answer] of matches){assert.ok(prompt);assert.ok(choices.includes("'"+answer+"'"))}
  assert.match(html,/Practise again/);assert.match(html,/aria-live="polite"/);
  assert.match(html,/unreviewed supplementary practice/);
  assert.doesNotMatch(html,/localStorage|sessionStorage|fetch\(|<form\b/);
 });
 test(label+' activity is linked from Home Learning',()=>assert.ok(read('home-learning.html').includes('href="'+file+'"')));
}
