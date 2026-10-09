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
  test(`evidence-qualified RTX PRO ${scenario.expectedGpuCount}-GPU alternative is selectable and continues through shared next step`, async ({ page }) => {
    await seedGpuSizing(page, { concurrentUsers: scenario.concurrentUsers });
    await page.goto("/gpu-sizing", { waitUntil: "domcontentloaded" });

    const rtx = page.getByTestId("rtx-lower-cost-qualified");
    await expect(rtx).toBeVisible();
    await expect(rtx).toContainText("Lower-cost alternative");
    await expect(rtx).toContainText(`${scenario.expectedGpuCount} × NVIDIA RTX PRO 6000 Blackwell Server Edition`);
    await expect(rtx).toContainText("does not provide NVLink/NVSwitch-style scale-up");
    await expect(rtx).toContainText("Tap to select for TCO");
    await expect(rtx).toHaveAttribute("aria-pressed", "false");

    await rtx.click();
    await expect(rtx).toHaveAttribute("aria-pressed", "true");
    await expect(rtx).toContainText("Selected for TCO");

    const handoff = page.getByTestId("rtx-selected-handoff");
    await expect(handoff).toBeVisible();
    await expect(handoff).toContainText("Selected next step · RTX PRO TCO");
    const forward = handoff.getByRole("link", { name: "Continue to RTX PRO TCO" });
    await expect(forward).toHaveAttribute("href", /\/tco\/rtx-pro\?/);
    await expect(forward).toHaveAttribute("href", new RegExp(`gpuCount=${scenario.expectedGpuCount}`));
    await expect(forward).toHaveAttribute("href", /benchmarkId=/);

    const tier = rtx.locator("..");
    await expect(tier.getByText("Higher-growth alternative", { exact: true })).toBeVisible();
    await expect(page.getByText("No qualifying lower-cost alternative in the current supported catalog.")).toBeHidden();
  });
}

test("unsupported Gemma benchmark is selectable for explicit 2/4/8 RTX TCO planning without inventing a recommendation", async ({ page }) => {
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

  const select = candidate.locator('button[aria-pressed]');
  await expect(select).toHaveCount(1);
  await expect(select).toContainText("Tap to select RTX PRO for TCO planning");
  await expect(select).toHaveAttribute("aria-pressed", "false");
  await select.click();
  await expect(select).toHaveAttribute("aria-pressed", "true");
  await expect(select).toContainText("Selected · choose an RTX PRO planning configuration");

  const picker = candidate.getByTestId("rtx-planning-config-picker");
  await expect(picker).toBeVisible();
  await expect(picker).toContainText("user-selected planning scenario");
  await expect(picker).toContainText("Engineering validation remains required");

  for (const count of [2, 4, 8]) {
    const link = picker.getByRole("link", { name: `Continue with ${count} GPUs` });
    await expect(link).toHaveAttribute("href", /\/tco\/rtx-pro\?/);
    await expect(link).toHaveAttribute("href", new RegExp(`gpuCount=${count}`));
    await expect(link).toHaveAttribute("href", /model=gemma-4-26b-a4b-it/);
    await expect(link).toHaveAttribute("href", /precision=FP8/);
    await expect(link).toHaveAttribute("href", /validationRequired=1/);
    await expect(link).toHaveAttribute("href", /sizingBasis=USER_SELECTED_PLANNING_SCENARIO/);
    await expect(link).not.toHaveAttribute("href", /benchmarkId=/);
  }

  await expect(page.getByTestId("rtx-selected-handoff")).toHaveCount(0);
  const tier = candidate.locator("..");
  await expect(tier.getByText("Higher-growth alternative", { exact: true })).toBeVisible();
});