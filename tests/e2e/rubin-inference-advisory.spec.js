import { test, expect } from "@playwright/test";
import { AUTH_BYPASSED, BYPASS_ONLY_REASON } from "./helpers/auth-context.js";

test.skip(!AUTH_BYPASSED, BYPASS_ONLY_REASON);

test("Rubin advisory appears only when verified Blackwell inference reaches rack scale", async ({ page }) => {
  await page.goto("/gpu-sizing", { waitUntil: "domcontentloaded" });

  await expect(page.getByText("Rubin architecture evaluation recommended", { exact: true })).toHaveCount(0);

  const concurrentUsers = page.getByLabel("Peak concurrent users");
  await expect(concurrentUsers).toBeVisible();
  await concurrentUsers.fill("40000");

  await expect(page.getByText("Rubin architecture evaluation recommended", { exact: true })).toBeVisible();
  await expect(page.getByText(/Verified sizing baseline:/)).toBeVisible();
  await expect(page.getByText(/No exact Rubin GPU count is shown\./)).toBeVisible();
  await expect(page.getByText(/Evaluate DGX Rubin NVL8 and DGX Vera Rubin NVL72/)).toBeVisible();
});
