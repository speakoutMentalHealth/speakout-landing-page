import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("guide reader and book details share one stable progress record", () => {
  const reader = read("book-reader.html");
  const details = read("book-details.html");
  const tracker = read("progress-tracker.js");

  assert.match(reader, /\$\{currentUser\.uid\}_book_\$\{cleanId\(item\.id\)\}/u);
  assert.ok((details.match(/\$\{currentUser\.uid\}_book_\$\{id\.replace\(\/\[\^a-zA-Z0-9_-\]\/g,"_"\)\.slice\(0,120\)\}/gu) || []).length >= 2);
  assert.match(tracker, /status:\s*existing\.exists\(\)[\s\S]*existing\.data\(\)\.status \|\| "opened"/u);
});

test("saved guide progress is bounded and returns readers to their own library", () => {
  const reader = read("book-reader.html");

  assert.match(reader, /index>=0&&index<slides\.length/u);
  assert.match(reader, /href="\$\{escapeHtml\(libraryFor\(currentProfile\)\)\}"/u);
  assert.doesNotMatch(reader, /href="student-library\.html">Back to Library/u);
});

test("guide reader supports accessible navigation and printing", () => {
  const reader = read("book-reader.html");

  assert.match(reader, /id="progressMeter" role="progressbar"/u);
  assert.match(reader, /progressMeter\.setAttribute\("aria-valuenow"/u);
  assert.match(reader, /aria-live="polite" class="reader-status"/u);
  assert.match(reader, /aria-current="\$\{index === currentIndex \? "step" : "false"\}"/u);
  assert.match(reader, /id="stage" tabindex="-1"/u);
  assert.match(reader, /printBtn\.addEventListener\("click",\(\)=>window\.print\(\)\)/u);
  assert.match(reader, /function renderPrintableGuide/u);
  assert.match(reader, /slides\.map\(\(slide,index\)=>/u);
  assert.match(reader, /@media print/u);
  assert.match(reader, /event\.key === "ArrowLeft"/u);
  assert.match(reader, /event\.key === "ArrowRight"/u);
});

test("guide reader sanitizes rich content and constrains media URLs", () => {
  const reader = read("book-reader.html");

  assert.match(reader, /function sanitizeRichHtml/u);
  assert.match(reader, /script,style,object,embed,iframe,svg,math,form,meta,link,base/u);
  assert.match(reader, /name\.startsWith\("on"\)/u);
  assert.match(reader, /!\/\^\(https\?:\|mailto:\|tel:\|#\|\\\/\|/u);
  assert.match(reader, /function safeImageUrl/u);
  assert.match(reader, /parsed\.protocol === "https:"/u);
  assert.match(reader, /\["fade-up","zoom-in","fade-left"\]\.includes\(slide\.animation\)/u);
});
