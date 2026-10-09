import assert from "node:assert/strict";
import { chromium } from "playwright";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";

const require = createRequire(import.meta.url);
const base = process.env.PORTAL_BASE_URL || "http://127.0.0.1:4173";
const evidence = "artifacts/access-gateway";
await mkdir(evidence, { recursive: true });
const browser = await chromium.launch();
const reports = [];
try {
  for (const width of [320, 390, 768, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 844 } });
    // Navigation and names must remain usable without Firebase/network access.
    await page.route("https://www.gstatic.com/firebasejs/**", route => route.abort());
    await page.goto(`${base}/auth/auth.html`);
    await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
    const login = page.getByRole("tab", { name: "Sign In", exact: true });
    await login.click();
    assert.equal(await page.getByLabel("Email", { exact: true }).filter({ visible: true }).count(), 1);
    assert.equal(await page.getByLabel("Password", { exact: true }).filter({ visible: true }).count(), 1);
    await login.press("ArrowRight");
    assert.equal(await page.getByRole("tab", { name: "Join SpeakOut" }).getAttribute("aria-selected"), "true");
    await page.getByRole("tab", { name: "Join SpeakOut" }).press("End");
    assert.equal(await page.getByRole("tab", { name: "Register a School" }).getAttribute("aria-selected"), "true");
    await page.getByRole("tab", { name: "Register a School" }).press("ArrowRight");
    assert.equal(await login.getAttribute("aria-selected"), "true");
    await login.press("ArrowLeft");
    await page.getByRole("tab", { name: "Register a School" }).press("Home");
    assert.equal(await login.evaluate(el => el === document.activeElement), true);
    for (const name of ["Sign In", "Join SpeakOut", "Register a School"]) {
      await page.getByRole("tab", { name, exact: true }).click();
      const report = await page.evaluate(async () => {
        const result = await window.axe.run(document.querySelector("main"), {
          runOnly: { type: "rule", values: ["label", "aria-required-children", "aria-required-parent", "aria-valid-attr-value", "aria-allowed-role"] }
        });
        const unnamed = [...document.querySelectorAll("input:not([aria-hidden='true']), select, textarea")]
          .filter(el => el.getBoundingClientRect().height > 0 && !el.labels?.length && !el.getAttribute("aria-label"))
          .map(el => el.id);
        return { violations: result.violations, unnamed, overflow: document.documentElement.scrollWidth > innerWidth + 1 };
      });
      reports.push({ width, panel: name, ...report });
      await page.screenshot({ path: `${evidence}/${width}-${name.replaceAll(" ", "-")}.png`, fullPage: true });
      assert.deepEqual(report.unnamed, [], `${width} ${name}: unnamed controls`);
      assert.deepEqual(report.violations, [], `${width} ${name}: invalid accessible form/tab semantics`);
      assert.equal(report.overflow, false, `${width} ${name}: horizontal overflow`);
    }
    await page.goto(`${base}/auth/auth.html#join`);
    assert.equal(await page.getByRole("tab", { name: "Join SpeakOut" }).getAttribute("aria-selected"), "true");
    await page.close();
  }
  console.log("Gateway labels, keyboard navigation, deep links and responsive checks passed.");
} finally {
  await writeFile(`${evidence}/summary.json`, JSON.stringify({ reports }, null, 2));
  await browser.close();
}
