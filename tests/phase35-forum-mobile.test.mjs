import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
test("forum mobile hero wraps the pilot pill without forcing horizontal overflow", () => {
 const html=readFileSync(new URL("../forum.html",import.meta.url),"utf8");
 assert.match(html, /@media\(max-width:700px\)/);
 assert.match(html, /\.hero\{flex-wrap:wrap;min-width:0\}/);
 assert.match(html, /\.hero>div\{min-width:0;flex:1 1 200px\}/);
 assert.match(html, /\.hero-pill\{max-width:100%;white-space:normal;/);
 assert.match(html, /Preview — not launched/);
});
