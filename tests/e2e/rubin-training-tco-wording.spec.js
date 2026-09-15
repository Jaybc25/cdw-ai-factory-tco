import { test, expect } from "@playwright/test";
import { AUTH_BYPASSED, BYPASS_ONLY_REASON } from "./helpers/auth-context.js";

test.skip(!AUTH_BYPASSED, BYPASS_ONLY_REASON);

function resultCard(page, title) {
  return page.getByText(title, { exact: true }).first().locator("..").locator("..");
}

const canonical = "Technical sizing uses NVIDIA-published memory and training FLOPS. Phase 1 TCO is available using transparent EST/PROVISIONAL planning assumptions; detailed fabric, liquid-cooling, rack, and facility engineering remains a quote/Phase 2 activity.";

test("Rubin training consistently presents Phase 1 TCO as available", async ({ page }) => {
  await page.goto("/gpu-sizing", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Training / fine-tuning sizing" }).click();

  await expect(resultCard(page, "Recommended")).toContainText("Rubin NVL8");
  await expect(page.getByText(canonical, { exact: true })).toBeVisible();
  await expect(page.getByText(/economics gated/i)).toHaveCount(0);
  await expect(page.getByText(/TCO remain intentionally unavailable/i)).toHaveCount(0);

  const tcoLink = page.getByRole("link", { name: "Compare TCO" });
  await expect(tcoLink).toBeVisible();
  await expect(tcoLink).toHaveAttribute("href", /ownSys=DGX\+Rubin\+NVL8/);

  await page.getByRole("button", { name: "Calculation Methodology & Audit Trail" }).click();
  await expect(page.getByText("See Phase 1 TCO", { exact: true })).toBeVisible();
  await expect(page.getByText("Modeled in Phase 1 TCO", { exact: true })).toBeVisible();
  await expect(page.getByText(/Not yet activated/i)).toHaveCount(0);
  await expect(page.getByText(/economics remain gated/i)).toHaveCount(0);
  await expect(page.getByText(canonical, { exact: false })).toBeVisible();

  await page.getByRole("button", { name: "Back to report" }).click();
  await expect(page.getByText(canonical, { exact: true })).toBeVisible();
  await expect(page.getByText(/economics gated/i)).toHaveCount(0);
  await expect(page.getByText(/TCO remain intentionally unavailable/i)).toHaveCount(0);
});
