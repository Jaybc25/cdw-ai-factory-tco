import { test, expect } from "@playwright/test";
import { AUTH_BYPASSED, BYPASS_ONLY_REASON } from "./helpers/auth-context.js";

test.skip(!AUTH_BYPASSED, BYPASS_ONLY_REASON);

async function openSection(page, name) {
  const trigger = page.getByRole("button", { name });
  await expect(trigger).toBeVisible();
  if ((await trigger.getAttribute("aria-expanded")) !== "true") await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
}

test("M6 defaults use modest scheduling credit and neutral incremental NVAIE credit", async ({ page }) => {
  await page.goto("/tco", { waitUntil: "domcontentloaded" });
  await openSection(page, "Performance factors");

  const scheduling = page.getByLabel("Scheduling / orchestration (Run:ai / Mission Control)");
  const nvaie = page.getByLabel("NVAIE / NIM incremental optimization");

  await expect(scheduling).toHaveValue("1.1");
  await expect(scheduling).toHaveAttribute("max", "1.17");
  await expect(nvaie).toHaveValue("1");

  await expect(page.getByText(/At 85% baseline utilization, scheduling recovery is capped at 1\.17x/)).toBeVisible();
  await expect(page.getByText(/NVAIE software\/support cost remains included/)).toBeVisible();
});

test("M6 scheduling factor cannot imply more than 100 percent useful utilization", async ({ page }) => {
  await page.goto("/tco", { waitUntil: "domcontentloaded" });

  await openSection(page, "Refine when known");
  const utilization = page.getByLabel("Target on-prem utilization");
  await utilization.evaluate((el) => { el.value = "1"; el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); });

  await openSection(page, "Performance factors");
  const scheduling = page.getByLabel("Scheduling / orchestration (Run:ai / Mission Control)");

  await expect(scheduling).toHaveAttribute("max", "1");
  await expect(scheduling).toHaveValue("1");
  await expect(page.getByText(/At 100% baseline utilization, scheduling recovery is capped at 1\.00x/)).toBeVisible();
});
