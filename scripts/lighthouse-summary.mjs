import { readdirSync, readFileSync } from "node:fs";
import { basename } from "node:path";

const dir = process.argv[2] || "lighthouse-results";
const thresholds = {
  performance: 0.70,
  accessibility: 0.90,
  "best-practices": 0.90,
  seo: 0.90
};

const files = readdirSync(dir).filter(name => name.endsWith(".json")).sort();
if (!files.length) throw new Error("No Lighthouse JSON reports found.");

const rows = [];
let belowTarget = 0;

for (const file of files) {
  const report = JSON.parse(readFileSync(`${dir}/${file}`, "utf8"));
  const categories = report.categories || {};
  const scores = Object.fromEntries(
    Object.keys(thresholds).map(key => [key, Number(categories[key]?.score ?? 0)])
  );

  for (const [key, target] of Object.entries(thresholds)) {
    if (scores[key] < target) belowTarget += 1;
  }

  rows.push({
    page: report.finalDisplayedUrl || report.finalUrl || basename(file, ".json"),
    ...scores
  });
}

const pct = score => Math.round(score * 100);
const header = "| Page | Performance | Accessibility | Best practices | SEO |";
const divider = "| --- | ---: | ---: | ---: | ---: |";
const table = rows.map(row =>
  `| ${row.page} | ${pct(row.performance)} | ${pct(row.accessibility)} | ${pct(row["best-practices"])} | ${pct(row.seo)} |`
);

const output = [
  "## SpeakOut Lighthouse baseline",
  "",
  header,
  divider,
  ...table,
  "",
  `Targets: performance ≥ ${pct(thresholds.performance)}, accessibility ≥ ${pct(thresholds.accessibility)}, best practices ≥ ${pct(thresholds["best-practices"])}, SEO ≥ ${pct(thresholds.seo)}.`,
  "",
  belowTarget
    ? `⚠️ ${belowTarget} category score(s) are below the current launch target. This audit is evidence-only and does not hide the report by failing the job.`
    : "✅ All measured category scores meet the current launch targets."
].join("\n");

console.log(output);
if (process.env.GITHUB_STEP_SUMMARY) {
  const { appendFileSync } = await import("node:fs");
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, output + "\n");
}
