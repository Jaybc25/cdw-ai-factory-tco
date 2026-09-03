import fs from "node:fs";
import { chromium } from "@playwright/test";

const out = process.argv[2] || "artifacts/gpu-sizing-report-experiment.pdf";
fs.mkdirSync(out.split("/").slice(0, -1).join("/") || ".", { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
await page.goto("http://127.0.0.1:4173/gpu-sizing", { waitUntil: "networkidle" });
await page.getByRole("button", { name: /Get the full sizing report/i }).click();
await page.getByPlaceholder("Full name").fill("Jay Carlile");
await page.getByPlaceholder("Company").fill("CDW");
await page.getByPlaceholder("Work email").fill("carlilejb@gmail.com");
await page.getByRole("button", { name: /View my report/i }).click();
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
