import { test, expect } from "@playwright/test";
import { AUTH_BYPASSED, BYPASS_ONLY_REASON } from "./helpers/auth-context.js";

test.skip(!AUTH_BYPASSED, BYPASS_ONLY_REASON);

const BENCH = "rtx-pro-6000-llama-3.3-70b-fp4-1k1k";

function fieldByLabelText(page, label) {
  return page.locator("label").filter({ hasText: label }).locator('input[type="number"]').first();
}

async function fillMoney(page, label, value) {
  await fieldByLabelText(page, label).fill(String(value));
}

function rtxBackLink(page) {
  return page.getByRole("link", { name: /Adjust RTX PRO TCO inputs/ });
}

test("RTX PRO single-server TCO hands exact benchmark and lifecycle TCO into IE", async ({ page }) => {
  const params = new URLSearchParams({
    gpuCount: "2",
    model: "llama-3.3-70b",
    precision: "FP4",
    benchmarkId: BENCH,
    source: "gpu-sizing",
  });

  await page.goto(`/tco/rtx-pro?${params.toString()}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "RTX PRO single-server TCO", exact: true })).toBeVisible();
  await expect(page.getByText("2 × RTX PRO 6000 Blackwell Server Edition", { exact: true })).toBeVisible();

  await fillMoney(page, "NVIDIA software / support entitlement", 10000);
  await fillMoney(page, "OEM / server support", 5000);
  await fillMoney(page, "Professional services / implementation", 8000);
  await fillMoney(page, "Workload-derived storage", 12000);
  await fillMoney(page, "Incremental admin / operations labor (annual)", 15000);
  await fieldByLabelText(page, "Full configured-server power draw").fill("2.5");
  await fieldByLabelText(page, "Facility power burden").fill("100");

  await expect(page.getByText("3-year directional TCO ready", { exact: true })).toBeVisible();
  await expect(page.getByText("Directional lifecycle TCO", { exact: true })).toBeVisible();

  const ieLink = page.getByRole("link", { name: "Continue to Inference Economics", exact: true });
  await expect(ieLink).toBeVisible();
  const href = await ieLink.getAttribute("href");
  expect(href).toContain("source=tco");
  expect(href).toContain("rtx=1");
  expect(href).toContain("hardware=RTX+PRO+6000");
  expect(href).toContain("gpuCount=2");
  expect(href).toContain("model=llama-3.3-70b");
  expect(href).toContain("quant=FP4");
  expect(href).toContain(`benchmarkId=${BENCH}`);
  expect(href).toContain("inferenceShare=1");
  expect(href).toContain("tcoAllocation=DIRECT_INFERENCE_WORKLOAD");

  await ieLink.click();
  await expect(page).toHaveURL(/\/inference-economics\?/);
  await expect(rtxBackLink(page)).toHaveAttribute("href", "/tco/rtx-pro");
  await expect(page.getByText("RTX PRO 6000", { exact: true }).first()).toBeVisible();

  await page.getByPlaceholder("Required for capacity check, e.g. 0.5").fill("0.5");
  await page.getByPlaceholder("e.g. 2000000000").fill("100000000");
  await expect(page.getByText(/\/ 1M output tokens/)).toBeVisible();

  await page.getByText("Evidence & methodology", { exact: true }).click();
  await expect(page.getByText(/Replica-scaled · 2 × 1-GPU serving groups/)).toBeVisible();
});

test("RTX PRO IE rejects a tampered benchmark id", async ({ page }) => {
  const params = new URLSearchParams({
    source: "tco",
    rtx: "1",
    hardware: "RTX PRO 6000",
    gpuCount: "2",
    model: "llama-3.3-70b",
    quant: "FP4",
    horizon: "3",
    fullTco: "150000",
    tco: "150000",
    inferenceShare: "1",
    tcoAllocation: "DIRECT_INFERENCE_WORKLOAD",
    benchmarkId: "tampered-id",
  });

  await page.goto(`/inference-economics?${params.toString()}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByText("RTX PRO 6000", { exact: true }).first()).toBeVisible();
  await expect(rtxBackLink(page)).toHaveAttribute("href", "/tco/rtx-pro");

  // Supply the normal remaining user inputs. A tampered benchmark id must still
  // suppress economics; otherwise the URL could manufacture RTX capacity.
  await page.getByPlaceholder("Required for capacity check, e.g. 0.5").fill("0.5");
  await page.getByPlaceholder("e.g. 2000000000").fill("100000000");
  await expect(page.getByText(/\/ 1M output tokens/)).toHaveCount(0);
});
