import { test, expect } from "@playwright/test";
import { AUTH_BYPASSED, BYPASS_ONLY_REASON } from "./helpers/auth-context.js";

test.skip(!AUTH_BYPASSED, BYPASS_ONLY_REASON);

const TCO_KEY = "ai-factory-session:tco";
const GPU_KEY = "ai-factory-session:gpu-sizing";

async function waitField(page, key, field, expected) {
  await page.waitForFunction(({ key, field, expected }) => {
    const raw = sessionStorage.getItem(key);
    return raw && JSON.parse(raw)?.[field] === expected;
  }, { key, field, expected });
}

async function setRangeValue(locator, value) {
  await locator.evaluate((el, next) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (!setter) throw new Error("HTMLInputElement value setter unavailable");
    setter.call(el, String(next));
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}

test("working-day hours synchronize between TCO and GPU Sizing", async ({ page }) => {
  await page.goto("/gpu-sizing", { waitUntil: "domcontentloaded" });
  await page.waitForFunction((key) => !!sessionStorage.getItem(key), GPU_KEY);

  const params = new URLSearchParams({ ownSys: "DGX B300", gpuCount: "8", sourceClass: "B300", sizingBasis: "recommended", workingDayHours: "10" });
  await page.goto(`/tco?${params}`, { waitUntil: "domcontentloaded" });
  const tco = page.getByLabel("Length of working day");
  await expect(tco).toHaveValue("10");

  await setRangeValue(tco, 18);
  await expect(tco).toHaveValue("18");
  await waitField(page, TCO_KEY, "workingDayHours", 18);
  await waitField(page, GPU_KEY, "workingDayHours", 18);

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByLabel("Length of working day")).toHaveValue("18");

  await page.goto("/gpu-sizing", { waitUntil: "domcontentloaded" });
  const gpu = page.getByLabel("Length of working day, hours per day");
  await expect(gpu).toHaveValue("18");
  await gpu.fill("12");
  await gpu.blur();
  await waitField(page, GPU_KEY, "workingDayHours", 12);
  await expect(page.getByRole("link", { name: "Compare TCO" }).first()).toHaveAttribute("href", /workingDayHours=12/);
});


test("24-hour duty cycle does not say not 24/7", async ({ page }) => {
  const params = new URLSearchParams({
    ownSys: "DGX B200",
    gpuCount: "8",
    sourceClass: "B200",
    sizingBasis: "recommended",
    workingDayHours: "24",
  });
  await page.goto(`/tco?${params}`, { waitUntil: "domcontentloaded" });

  await expect(page.getByText(/full 24-hour\/day, 365-day\/year duty cycle shared with GPU Sizing/i)).toBeVisible();
  await expect(page.getByText(/not 24\/7/i)).toHaveCount(0);

  await page.getByRole("button", { name: /Get the full report/i }).click();
  const reportGate = page.getByRole("button", { name: "View my report" });
  if (await reportGate.isVisible().catch(() => false)) {
    await page.getByLabel("Full name").fill("Regression User");
    await page.getByLabel("Company").fill("CDW");
    await page.getByLabel("Work email").fill("regression@example.com");
    await reportGate.click();
  }

  await expect(page.getByText("24 hrs/day × 250 active days/year ÷ 12; aligned with Inference Economics default", { exact: true })).toBeVisible();
  await expect(page.getByText(/full-day operation/i)).toHaveCount(0);
});
