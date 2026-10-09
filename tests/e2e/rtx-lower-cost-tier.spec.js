import { test, expect } from "@playwright/test";
import { AUTH_BYPASSED, BYPASS_ONLY_REASON } from "./helpers/auth-context.js";

test.skip(!AUTH_BYPASSED, BYPASS_ONLY_REASON);

async function seedGpuSizing(page, overrides) {
  const state = {
    mode: "Inference",
    pathLevel: "simple",
    infModelId: "llama-3.3-70b",
    quant: "FP4",
    concurrentUsers: 10,
    targetTokPerUser: 30,
    environment: "Production",
    avgInputTokens: 1000,
    avgOutputTokens: 1000,
    kvBytesPerElement: 2,
    overheadPct: 0.15,
    infGpuOverride: "Auto-recommend",
    customParamsB: 70,
    customLayers: 80,
    customKvHeads: 8,
    customHeadDim: 128,
    workingDayHours: 10,
    ...overrides,
  };
  await page.addInitScript((saved) => {
    window.sessionStorage.setItem("ai-factory-session:gpu-sizing", JSON.stringify(saved));
  }, state);
}

for (const scenario of [
  { concurrentUsers: 10, expectedGpuCount: 2 },
  { concurrentUsers: 120, expectedGpuCount: 4 },
  { concurrentUsers: 360, expectedGpuCount: 8 },
]) {
  test(`evidence-qualified RTX PRO ${scenario.expectedGpuCount}-GPU alternative continues into the forward journey`, async ({ page }) => {
    await seedGpuSizing(page, { concurrentUsers: scenario.concurrentUsers });
    await page.goto("/gpu-sizing", { waitUntil: "domcontentloaded" });

    const rtx = page.getByTestId("rtx-lower-cost-qualified");
    await expect(rtx).toBeVisible();
    await expect(rtx).toContainText("Lower-cost alternative");
    await expect(rtx).toContainText(`${scenario.expectedGpuCount} × NVIDIA RTX PRO 6000 Blackwell Server Edition`);
    await expect(rtx).toContainText("does not provide NVLink/NVSwitch-style scale-up");

    const forward = rtx.getByRole("link", { name: "Continue with RTX PRO" });
    await expect(forward).toHaveAttribute("href", /\/tco\/rtx-pro\?/);
    await expect(forward).toHaveAttribute("href", new RegExp(`gpuCount=${scenario.expectedGpuCount}`));
    await expect(forward).toHaveAttribute("href", /benchmarkId=/);

    const tier = rtx.locator("..");
    await expect(tier.getByText("Higher-growth alternative", { exact: true })).toBeVisible();
    await expect(page.getByText("No qualifying lower-cost alternative in the current supported catalog.")).toBeHidden();
  });
}

test("unsupported Gemma benchmark shows RTX PRO as a potential lower-cost candidate without inventing a GPU count", async ({ page }) => {
  await seedGpuSizing(page, {
    infModelId: "gemma-4-26b-a4b-it",
    quant: "FP8",
    concurrentUsers: 10,
    targetTokPerUser: 30,
    avgInputTokens: 2000,
    avgOutputTokens: 500,
  });
  await page.goto("/gpu-sizing", { waitUntil: "domcontentloaded" });

  const candidate = page.getByTestId("rtx-lower-cost-candidate");
  await expect(candidate).toBeVisible();
  await expect(candidate).toContainText("Potential lower-cost alternative");
  await expect(candidate).toContainText("VALIDATION REQUIRED");
  await expect(candidate).toContainText("A production GPU count is therefore not inferred");
  await expect(candidate).toContainText("does not provide NVLink/NVSwitch-style scale-up");
  await expect(candidate).not.toContainText(/\d+ × NVIDIA RTX PRO/);
  await expect(candidate.getByRole("link", { name: "Continue with RTX PRO" })).toHaveCount(0);

  const tier = candidate.locator("..");
  await expect(tier.getByText("Higher-growth alternative", { exact: true })).toBeVisible();
  await expect(page.getByText("No qualifying lower-cost alternative in the current supported catalog.")).toBeHidden();
});
