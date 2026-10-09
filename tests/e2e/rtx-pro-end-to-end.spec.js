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

async function openAdvancedAssumptions(page) {
  const details = page.getByTestId("rtx-tco-advanced-assumptions");
  await expect(details).toBeVisible();
  if (!(await details.getAttribute("open"))) {
    await details.locator("summary").click();
  }
  await expect(details).toHaveAttribute("open", "");
}

function rtxBackLink(page) {
  return page.getByRole("link", { name: /Adjust RTX PRO TCO inputs/ });
}

function rtxParams(gpuCount = "2") {
  return new URLSearchParams({
    gpuCount,
    model: "llama-3.3-70b",
    precision: "FP4",
    benchmarkId: BENCH,
    source: "gpu-sizing",
  });
}

async function completeRtxTco(page) {
  await fillMoney(page, "NVIDIA software / support entitlement", 10000);
  await fillMoney(page, "OEM / server support", 5000);
  await fillMoney(page, "Professional services / implementation", 8000);
  await fillMoney(page, "Workload-derived storage", 12000);
  await openAdvancedAssumptions(page);
  await fillMoney(page, "Incremental admin / operations labor (annual)", 15000);
  await fieldByLabelText(page, "Full configured-server power draw").fill("2.5");
  await fieldByLabelText(page, "Facility power burden").fill("100");
}

test("RTX PRO single-server TCO hands exact benchmark and lifecycle TCO into IE", async ({ page }) => {
  await page.goto(`/tco/rtx-pro?${rtxParams().toString()}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "RTX PRO TCO", exact: true })).toBeVisible();
  await expect(page.getByText("2 × RTX PRO 6000", { exact: true })).toBeVisible();
  await expect(page.getByText(/Blackwell Server Edition/).first()).toBeVisible();

  await completeRtxTco(page);

  await expect(page.getByText("Directional TCO ready", { exact: true })).toBeVisible();
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
  await page.getByPlaceholder("Required for capacity check, e.g. 0.5").fill("0.5");
  await page.getByPlaceholder("e.g. 2000000000").fill("100000000");
  await expect(page.getByText(/\/ 1M output tokens/)).toHaveCount(0);
});

test("RTX PRO TCO preserves same-scenario inputs, exposes report/audit, and resets a different scenario", async ({ page }) => {
  await page.goto(`/tco/rtx-pro?${rtxParams().toString()}`, { waitUntil: "domcontentloaded" });
  await completeRtxTco(page);
  await expect(page.getByText("Directional TCO ready", { exact: true })).toBeVisible();

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(fieldByLabelText(page, "NVIDIA software / support entitlement")).toHaveValue("10000");
  await expect(fieldByLabelText(page, "Full configured-server power draw")).toHaveValue("2.5");
  await expect(page.getByText("Directional TCO ready", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "View my report", exact: true }).click();
  await expect(page.getByRole("heading", { name: "RTX PRO TCO Report", exact: true })).toBeVisible();
  await expect(page.getByText("Cost breakdown", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Calculation Methodology & Audit Trail", exact: true }).click();
  await expect(page.getByRole("heading", { name: "RTX PRO TCO Audit Trail", exact: true })).toBeVisible();
  await expect(page.getByText(/server kW × \$\/kW-month × 12 × horizon/)).toBeVisible();

  await page.goto(`/tco/rtx-pro?${rtxParams("4").toString()}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByText("4 × RTX PRO 6000", { exact: true })).toBeVisible();
  await expect(fieldByLabelText(page, "NVIDIA software / support entitlement")).toHaveValue("");
  await expect(fieldByLabelText(page, "Full configured-server power draw")).toHaveValue("");
  await expect(page.getByText(/inputs remaining$/)).toBeVisible();
});

test("RTX PRO TCO surfaces the full Google Cloud Run minimum instance floor, not GPU-only pricing", async ({ page }) => {
  await page.goto(`/tco/rtx-pro?${rtxParams().toString()}`, { waitUntil: "domcontentloaded" });

  const cloudRef = page.getByRole("region", { name: "Google Cloud RTX PRO reference" });
  await expect(cloudRef).toBeVisible();
  await expect(cloudRef.getByRole("heading", { name: "Google Cloud Run · RTX PRO 6000 Blackwell", exact: true })).toBeVisible();
  await expect(cloudRef.getByText("$3.186792/hr", { exact: true })).toBeVisible();
  await expect(cloudRef.getByText("minimum deployable instance floor", { exact: true })).toBeVisible();
  await expect(cloudRef.getByText("$1.314792/hr", { exact: true })).toBeVisible();
  await expect(cloudRef.getByText("Required 20 vCPU", { exact: true })).toBeVisible();
  await expect(cloudRef.getByText("Required 80 GiB memory", { exact: true })).toBeVisible();
  await expect(cloudRef.getByText(/not a direct cloud TCO or savings comparison/i)).toBeVisible();
});
