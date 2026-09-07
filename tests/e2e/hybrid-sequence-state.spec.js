import { test, expect } from "@playwright/test";
import { AUTH_BYPASSED, BYPASS_ONLY_REASON } from "./helpers/auth-context.js";

test.skip(!AUTH_BYPASSED, BYPASS_ONLY_REASON);

const FIXTURES = {
  "qwen3.8-27b": {
    stateType: "deltanet-attention-hybrid",
    totalBytes: 691798016,
    fixedBytes: 154927104,
  },
  "deepseek-v4-flash-0731": {
    stateType: "deepseek-v4-compressed-attention",
    totalBytes: 62050816,
    fixedBytes: 53760,
  },
  "deepseek-v4-pro-0813": {
    stateType: "deepseek-v4-compressed-attention",
    totalBytes: 88747008,
    fixedBytes: 76800,
  },
  "nemotron-3-super-120b-a12b": {
    stateType: "mamba-attention-hybrid",
    totalBytes: 238157824,
    fixedBytes: 171048960,
  },
};

test("staged hybrid architectures execute source-qualified sequence-state fixtures in the browser", async ({ page }) => {
  await page.goto("/__e2e/hybrid-sequence-state", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("hybrid-sequence-state-harness")).toBeVisible();
  await expect(page.getByTestId("fixture-inputs")).toHaveAttribute("data-tokens", "8192");
  await expect(page.getByTestId("fixture-inputs")).toHaveAttribute("data-cache-bytes", "2");

  for (const [id, fixture] of Object.entries(FIXTURES)) {
    const section = page.getByTestId(`hybrid-state-${id}`);
    await expect(section).toBeVisible();
    await expect(section).toHaveAttribute("data-model-id", id);
    await expect(section).toHaveAttribute("data-state-type", fixture.stateType);
    await expect(section).toHaveAttribute("data-total-bytes", String(fixture.totalBytes));
    await expect(section).toHaveAttribute("data-fixed-bytes", String(fixture.fixedBytes));
  }
});

test("test-only hybrid route is not part of normal production navigation", async ({ page }) => {
  await page.goto("/gpu-sizing", { waitUntil: "domcontentloaded" });
  for (const id of Object.keys(FIXTURES)) {
    await expect(page.locator(`option[value="${id}"]`)).toHaveCount(0);
  }
  await expect(page.getByRole("link", { name: /hybrid sequence-state/i })).toHaveCount(0);
});
