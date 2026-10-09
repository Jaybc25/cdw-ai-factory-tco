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
    await expect(rtx).toContainText(`${scenario.expectedGpuCount} GPUs`);
    await expect(rtx).toContainText("NVIDIA RTX PRO 6000");
    await expect(rtx).toContainText("No NVLink scale-up");
    await expect(rtx).toContainText("Tap to select for TCO");
    await expect(rtx).toHaveAttribute("aria-pressed", "false");

    await rtx.click();
    await expect(rtx).toHaveAttribute("aria-pressed", "true");
    await expect(rtx).toContainText("Selected for TCO");

    const handoff = page.getByTestId("rtx-selected-handoff");
    await expect(handoff).toBeVisible();
    const forward = handoff.getByRole("link", { name: "Continue to RTX PRO TCO" });
    await expect(forward).toHaveAttribute("href", /\/tco\/rtx-pro\?/);
    await expect(forward).toHaveAttribute("href", new RegExp(`gpuCount=${scenario.expectedGpuCount}`));
    await expect(forward).toHaveAttribute("href", /benchmarkId=/);
  });
}

test("Qwen3.8 27B is auto-sized from measured RTX serving evidence rather than asking the user to choose a GPU count", async ({ page }) => {
  await seedGpuSizing(page, {
    infModelId: "qwen3.8-27b",
    quant: "FP8",
    concurrentUsers: 100,
    targetTokPerUser: 30,
    avgInputTokens: 2000,
    avgOutputTokens: 500,
  });
  await page.goto("/gpu-sizing", { waitUntil: "domcontentloaded" });

  const grid = page.getByTestId("gpu-result-choice-grid");
  await expect(grid).toBeVisible();

  const rtx = page.getByTestId("rtx-lower-cost-qualified");
  await expect(rtx).toBeVisible();
  await expect(rtx).toContainText("8 GPUs");
  await expect(rtx).toContainText("NVIDIA RTX PRO 6000");
  await expect(rtx).toContainText("Measured serving evidence");
  await expect(rtx).toContainText("Tap to select for TCO");
  await expect(rtx).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByTestId("rtx-planning-config-picker")).toHaveCount(0);

  await rtx.click();
  await expect(rtx).toHaveAttribute("aria-pressed", "true");
  const handoff = page.getByTestId("rtx-selected-handoff");
  const forward = handoff.getByRole("link", { name: "Continue to RTX PRO TCO" });
  await expect(forward).toHaveAttribute("href", /gpuCount=8/);
  await expect(forward).toHaveAttribute("href", /model=qwen3.8-27b/);
  await expect(forward).toHaveAttribute("href", /precision=FP8/);
  await expect(forward).toHaveAttribute("href", /benchmarkId=rtx-pro-6000-qwen3.8-27b-fp8-chat-c24/);
});

test("unsupported model remains a compact validation candidate and never asks the user to guess 2/4/8 GPUs", async ({ page }) => {
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
  await expect(candidate).toContainText("cannot yet prove a production GPU count");
  await expect(candidate).not.toContainText(/\d+ GPUs/);
  await expect(candidate.locator('button[aria-pressed]')).toHaveCount(0);
  await expect(page.getByTestId("rtx-planning-config-picker")).toHaveCount(0);
  await expect(candidate.getByText("Continue with 2 GPUs")).toHaveCount(0);
  await expect(candidate.getByText("Continue with 4 GPUs")).toHaveCount(0);
  await expect(candidate.getByText("Continue with 8 GPUs")).toHaveCount(0);
  await expect(candidate.getByText("Why validation is required")).toBeVisible();
  await expect(page.getByTestId("rtx-selected-handoff")).toHaveCount(0);
});