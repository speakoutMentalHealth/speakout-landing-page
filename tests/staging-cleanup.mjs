import { mkdir, writeFile } from "node:fs/promises";

// Attempt every deletion, retain actionable failures, then fail the acceptance run.
export async function runCleanup(tasks, evidenceDir) {
  const results = [];
  for (const { label, run } of tasks) {
    try {
      const result = await run();
      const response = result?.response || result;
      if (response && !response.ok && response.status !== 404) {
        throw new Error(`HTTP ${response.status}`);
      }
      results.push({ label, ok: true });
    } catch (error) {
      results.push({ label, ok: false, error: String(error.message || error) });
    }
  }
  await mkdir(evidenceDir, { recursive: true });
  const failed = results.filter(result => !result.ok);
  await writeFile(`${evidenceDir}/cleanup.json`, JSON.stringify({ ok: failed.length === 0, results }, null, 2));
  if (failed.length) throw new AggregateError(failed.map(result => new Error(`${result.label}: ${result.error}`)), "Staging cleanup incomplete; see cleanup.json");
}
