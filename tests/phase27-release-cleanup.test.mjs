import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCleanup } from "./staging-cleanup.mjs";

test("cleanup continues after HTTP/network failures and fails with evidence", async () => {
  const dir = await mkdtemp(join(tmpdir(), "speakout-cleanup-"));
  const calls = [];
  try {
    await assert.rejects(runCleanup([
      { label: "blocked", run: async () => { calls.push(1); return { response: { ok: false, status: 403 } }; } },
      { label: "network", run: async () => { calls.push(2); throw new Error("network failed"); } },
      { label: "deleted", run: async () => { calls.push(3); return { ok: true, status: 200 }; } },
      { label: "already absent", run: async () => { calls.push(4); return { ok: false, status: 404 }; } }
    ], dir), AggregateError);
    assert.deepEqual(calls, [1, 2, 3, 4]);
    const evidence = JSON.parse(await readFile(join(dir, "cleanup.json")));
    assert.equal(evidence.ok, false);
    assert.deepEqual(evidence.results.map(r => r.ok), [false, false, true, true]);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
