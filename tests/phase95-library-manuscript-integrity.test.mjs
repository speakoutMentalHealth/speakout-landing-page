import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('Starter books separate readable manuscripts from catalogue-only references',async()=>{
 const books=JSON.parse(await readFile(new URL('../firestore-seed/books-starter.json',import.meta.url),'utf8'));
 assert.ok(Array.isArray(books)&&books.length>0,'Book collection missing');
 const ids=new Set();
 let readable=0,catalogue=0;
 for(const book of books){
  assert.ok(typeof book.id==='string'&&book.id.length>3,'Missing book ID');
  assert.ok(!ids.has(book.id),'Duplicate book ID: '+book.id);
  ids.add(book.id);
  assert.ok(typeof book.title==='string'&&book.title.trim().length>2,'Missing book title: '+book.id);
  assert.ok(typeof book.author==='string'&&book.author.trim(),'Missing attribution: '+book.id);
  const html=String(book.content||'').trim();
  if(html){
   readable++;
   assert.ok(html.length>1000,'Substantial book body missing: '+book.id);
   assert.match(html,/<h[1-3]\b/i,'No navigable section headings: '+book.id);
   assert.ok(!/<script\b/i.test(html),'Script inside source manuscript: '+book.id);
  }else{
   catalogue++;
   assert.ok(book.source==='author'||book.source==='curated','Missing catalogue origin: '+book.id);
   assert.ok(/^https:\/\//i.test(book.purchaseUrl||''),'No direct external access link: '+book.id);
  }
 }
 assert.ok(readable>=8,'Readable source count unexpectedly decreased');
 assert.ok(catalogue>=21,'Catalogue-only source count unexpectedly decreased');
 console.log('Library manuscript preflight: '+readable+' readable source records, '+catalogue+' metadata-only listings. Rights, live imports and browser rendering require separate verification.');
});
