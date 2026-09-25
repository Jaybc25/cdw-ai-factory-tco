import { test, expect } from "@playwright/test";
import { AUTH_BYPASSED, BYPASS_ONLY_REASON } from "./helpers/auth-context.js";

test.skip(!AUTH_BYPASSED, BYPASS_ONLY_REASON);

function resultCard(page, title) {
  return page.getByText(title, { exact: true }).first().locator("..").locator("..");
}

const canonical = "Technical sizing uses NVIDIA-published memory and training FLOPS. Planning TCO is available using transparent EST/PROVISIONAL assumptions; detailed fabric, liquid-cooling, rack, and facility engineering remains project-specific and quote-based.";

test("Rubin training consistently presents planning TCO as available", async ({ page }) => {
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
  // AuditFormula renders result values with a leading "= ", so match the
  // visible line rather than requiring a standalone text node.
  await expect(page.getByText(/See planning TCO/)).toBeVisible();
  await expect(page.getByText("Modeled in planning TCO", { exact: true })).toBeVisible();
  await expect(page.getByText(/Not yet activated/i)).toHaveCount(0);
  await expect(page.getByText(/economics remain gated/i)).toHaveCount(0);
  await expect(page.getByText(canonical, { exact: false })).toBeVisible();

  await page.getByRole("button", { name: "Back to report" }).click();
  await expect(page.getByText(canonical, { exact: true })).toBeVisible();
  await expect(page.getByText(/economics gated/i)).toHaveCount(0);
  await expect(page.getByText(/TCO remain intentionally unavailable/i)).toHaveCount(0);
});
