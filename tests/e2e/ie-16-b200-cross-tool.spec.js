import { test, expect } from "@playwright/test";
import { AUTH_BYPASSED, BYPASS_ONLY_REASON } from "./helpers/auth-context.js";

test.skip(!AUTH_BYPASSED, BYPASS_ONLY_REASON);

const GPU_KEY = "ai-factory-session:gpu-sizing";
const TCO_KEY = "ai-factory-session:tco";

async function seedGpuSizingScenario(page) {
  await page.goto("/gpu-sizing", { waitUntil: "domcontentloaded" });
  await page.waitForFunction((key) => !!sessionStorage.getItem(key), GPU_KEY);
  await page.evaluate((key) => {
    const current = JSON.parse(sessionStorage.getItem(key) || "{}");
    sessionStorage.setItem(key, JSON.stringify({
      ...current,
      mode: "Inference",
      pathLevel: "advanced",
      infModelId: "llama-3.1-70b",
      quant: "FP8",
      concurrentUsers: 3000,
      targetTokPerUser: 30,
      environment: "Production",
      avgInputTokens: 2000,
      avgOutputTokens: 500,
      kvBytesPerElement: 2,
      overheadPct: 0.15,
      infGpuOverride: "B200",
      workingDayHours: 19,
    }));
  }, GPU_KEY);
  await page.reload({ waitUntil: "domcontentloaded" });
}

test("16 B200 GPU Sizing -> TCO -> IE stays full-fleet and replica-scaled", async ({ page }) => {
  await seedGpuSizingScenario(page);

  // Original repro: ~14 B200 technical GPUs for this workload, node-rounded
  // to the 16-GPU production recommendation.
  await expect(page.getByText("14", { exact: true })).toBeVisible();
  await expect(page.getByText("16 GPUs", { exact: true })).toBeVisible();
  await expect(page.getByText("B200", { exact: true }).first()).toBeVisible();

  const tcoLink = page.getByRole("link", { name: "Compare TCO", exact: true });
  await expect(tcoLink).toBeVisible();
  const tcoHref = await tcoLink.getAttribute("href");
  expect(tcoHref).toContain("gpuCount=16");
  expect(tcoHref).toContain("sourceClass=B200");
  expect(tcoHref).toContain("scaleoutClass=REPLICA_CAPACITY_SCALEOUT");

  await tcoLink.click();
  await expect(page).toHaveURL(/\/tco(?:\?|$)/);

  // TCO consumes the incoming query into session state. Verify the technical
  // architecture and classification survived rather than relying on the URL.
  await page.waitForFunction((key) => {
    const raw = sessionStorage.getItem(key);
    if (!raw) return false;
    const saved = JSON.parse(raw);
    return saved.gpuSizingCount === 16
      && saved.sourceClass === "B200"
      && saved.gpuSizingScaleoutClassification === "REPLICA_CAPACITY_SCALEOUT";
  }, TCO_KEY);
  const tcoState = await page.evaluate((key) => JSON.parse(sessionStorage.getItem(key)), TCO_KEY);
  expect(tcoState.gpuSizingCount).toBe(16);
  expect(tcoState.sourceClass).toBe("B200");
  expect(tcoState.gpuSizingScaleoutClassification).toBe("REPLICA_CAPACITY_SCALEOUT");

  await expect(page.getByText(/Comparing 2 x DGX B200 \(16 B200-class GPUs, your GPU Sizing recommendation\)/)).toBeVisible();

  const ieLink = page.getByRole("link", { name: "Compare inference economics", exact: true }).last();
  await expect(ieLink).toBeVisible();
  const ieHref = await ieLink.getAttribute("href");
  expect(ieHref).toContain("source=tco");
  expect(ieHref).toContain("hardware=B200");
  expect(ieHref).toContain("gpuCount=16");
  expect(ieHref).toContain("totalFleetGpuCount=16");
  expect(ieHref).toContain("scaleoutClass=REPLICA_CAPACITY_SCALEOUT");

  await ieLink.click();
  await expect(page).toHaveURL(/\/inference-economics\?/);

  // Full-fleet semantics: 16 deployed GPUs are evaluated. The retired
  // 16-deployed/8-throughput-credit treatment must never reappear.
  const scenario = page.getByText("Your private AI scenario").locator("..");
  await expect(page.getByText("Deployed GPUs evaluated", { exact: true })).toBeVisible();
  await expect(page.getByText("16", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("GPUs credited for throughput", { exact: true })).toHaveCount(0);
  await expect(page.getByText(/Conservative throughput treatment:/)).toHaveCount(0);

  // Contextual navigation retained from the cleaned-up #136.
  const adjustTco = page.getByRole("link", { name: "Adjust TCO assumptions", exact: true });
  await expect(adjustTco).toBeVisible();
  await expect(adjustTco).toHaveAttribute("href", "/tco");

  // Complete only the minimum IE inputs needed to expose the calculated
  // evidence basis. Keep demand comfortably below capacity so this test checks
  // replica semantics rather than intentionally triggering undersizing.
  await page.getByLabel("Production throughput assumption").fill("0.5");
  await page.getByLabel("Output tokens per month").fill("1000000000");

  await expect(page.getByText(/\/ 1M output tokens/)).toBeVisible();
  await page.getByText("Evidence & methodology", { exact: true }).click();
  await expect(page.getByText("Replica-scaled · 2 × 8-GPU serving groups", { exact: true })).toBeVisible();

  // ROI handoff remains available from the TCO-originated IE journey and must
  // preserve a real upfront/recurring split rather than inventing one.
  const roiLink = page.getByRole("link", { name: "Continue to ROI", exact: true });
  await expect(roiLink).toBeVisible();
  const roiHref = await roiLink.getAttribute("href");
  expect(roiHref).toMatch(/^\/roi\?initialCost=\d+&recurringCost=\d+&planningBasis=workload$/);

  await roiLink.click();
  await expect(page).toHaveURL(/\/roi(?:\?|$)/);
});
