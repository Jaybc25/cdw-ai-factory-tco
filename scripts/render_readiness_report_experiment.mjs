import fs from "node:fs";
import { chromium } from "@playwright/test";

const out = process.argv[2] || "artifacts/readiness-report-experiment.pdf";
fs.mkdirSync(out.split("/").slice(0, -1).join("/") || ".", { recursive: true });
const data = JSON.parse(fs.readFileSync("src/checklists.json", "utf8"));
const routes = {};
const answers = {};
for (const door of data.doors) {
  const branch = door.branches[0];
  routes[door.id] = branch.id;
  for (const itemId of branch.items) answers[itemId] = "needs_attention";
}
const state = { content_version: data.content_version, answers, routes };

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
await page.addInitScript((seed) => localStorage.setItem("cdw-readiness", JSON.stringify(seed)), state);
await page.goto("http://127.0.0.1:4173/readiness", { waitUntil: "networkidle" });
await page.getByRole("button", { name: /Get my full readiness report/i }).click();
await page.getByPlaceholder("Name", { exact: true }).fill("Jay Carlile");
await page.getByPlaceholder("Organization", { exact: true }).fill("CDW");
await page.getByPlaceholder("Work email", { exact: true }).fill("carlilejb@gmail.com");
await page.getByRole("button", { name: /Show my summary/i }).click();
await page.getByText(/Prepared for Jay Carlile, CDW/i).waitFor();
await page.emulateMedia({ media: "print" });
await page.pdf({
  path: out,
  format: "Letter",
  printBackground: true,
  preferCSSPageSize: true,
  displayHeaderFooter: false,
});
console.log(`Rendered ${out}`);
await browser.close();
