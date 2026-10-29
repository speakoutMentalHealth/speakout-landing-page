// Synthetic browser contract test. No Firebase project, credentials, or real users.
// Run with Playwright installed: node tests/volunteer-browser-journey.mjs
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright";

const html = await readFile(new URL("../volunteer-dashboard.html", import.meta.url), "utf8");
const runtime = await readFile(new URL("../js/volunteer-onboarding.js", import.meta.url), "utf8");
const fixture = {
  status: "approved", role: "volunteer", record: null, writes: 0
};
const json = value => JSON.stringify(value);
const server = createServer((req, res) => {
  const send = (type, body) => { res.writeHead(200, {"content-type":type}); res.end(body); };
  if (req.url === "/volunteer-dashboard.html") return send("text/html", html);
  if (req.url === "/js/volunteer-onboarding.js") return send("text/javascript", runtime);
  if (req.url === "/firebase-config.js") return send("text/javascript", "export const auth = {}; export const db = {};");
  if (req.url === "/launch-role-guard.js") return send("text/javascript", String.raw