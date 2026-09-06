import { test, expect } from "@playwright/test";
import { AUTH_BYPASSED, BYPASS_ONLY_REASON } from "./helpers/auth-context.js";

test.skip(!AUTH_BYPASSED, BYPASS_ONLY_REASON);

const GPU_SESSION = "ai-factory-session:gpu-sizing";

async function existingModelOptionCount(page, modelId = "llama-3.1-70b") {
  return page.locator(`option[value="${modelId}"]`).count();
}

test("GPU Sizing hides existing-deployment models by default and reveals them on opt-in", async ({ page }) => {
  await page.goto("/gpu-sizing", { waitUntil: "domcontentloaded" });

  const toggle = page.getByLabel("Include models for existing deployments");
  await expect(toggle).toBeVisible();
  await expect(toggle).not.toBeChecked();
  await expect.poll(() => existingModelOptionCount(page)).toBe(0);

  await toggle.check();
  await expect.poll(() => existingModelOptionCount(page)).toBeGreaterThan(0);

  await toggle.uncheck();
  await expect.poll(() => existingModelOptionCount(page)).toBe(0);
});

test("GPU Sizing preserves a deep-linked existing-deployment model without opening the full legacy catalog", async ({ page }) => {
  await page.goto("/gpu-sizing?model=llama-3.1-70b", { waitUntil: "domcontentloaded" });

  const toggle = page.getByLabel("Include models for existing deployments");
  await expect(toggle).not.toBeChecked();
  await expect.poll(() => existingModelOptionCount(page, "llama-3.1-70b")).toBeGreaterThan(0);
  await expect.poll(() => existingModelOptionCount(page, "llama-3.1-8b")).toBe(0);

  const modelSelect = page.locator('select').filter({ has: page.locator('option[value="llama-3.1-70b"]') }).first();
  await expect(modelSelect).toHaveValue("llama-3.1-70b");
});

test("GPU Sizing restores an existing-deployment model from saved session state", async ({ page }) => {
  await page.goto("/gpu-sizing", { waitUntil: "domcontentloaded" });
  await page.evaluate((key) => {
    const current = JSON.parse(sessionStorage.getItem(key) || "{}");
    sessionStorage.setItem(key, JSON.stringify({ ...current, infModelId: "llama-3.1-70b" }));
  }, GPU_SESSION);

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByLabel("Include models for existing deployments")).not.toBeChecked();
  const modelSelect = page.locator('select').filter({ has: page.locator('option[value="llama-3.1-70b"]') }).first();
  await expect(modelSelect).toHaveValue("llama-3.1-70b");
});

test("TCO uses the same hidden-by-default existing-deployment policy", async ({ page }) => {
  await page.goto("/tco", { waitUntil: "domcontentloaded" });

  const toggle = page.getByLabel("Include models for existing deployments");
  await expect(toggle).toBeVisible();
  await expect(toggle).not.toBeChecked();
  await expect.poll(() => existingModelOptionCount(page)).toBe(0);

  await toggle.check();
  await expect.poll(() => existingModelOptionCount(page)).toBeGreaterThan(0);
});
