import { test, expect } from "@playwright/test";
import { AUTH_BYPASSED, BYPASS_ONLY_REASON } from "./helpers/auth-context.js";

test.skip(!AUTH_BYPASSED, BYPASS_ONLY_REASON);

const GPU_SESSION = "ai-factory-session:gpu-sizing";
const EXISTING_DEPLOYMENT_LABELS = [
  "Llama 3.1 8B Instruct",
  "Llama 3.1 70B Instruct",
  "Llama 3.1 405B Instruct",
  "Llama 3.3 70B Instruct",
  "Mixtral 8x7B Instruct",
  "DeepSeek V3",
  "DeepSeek R1",
  "Gemma 3 27B",
];
const STAGED_MODEL_LABELS = [
  "Qwen3.8 27B",
  "DeepSeek V4 Flash 0731",
  "DeepSeek V4 Pro 0813",
  "Gemma 4 26B-A4B IT",
  "Mistral Small 4",
  "Mistral Large 3",
  "gpt-oss-20b",
  "gpt-oss-120b",
  "NVIDIA Nemotron 3 Super 120B-A12B FP8",
  "IBM Granite 4.2 30B",
];
const STAGED_MODEL_IDS = [
  "qwen3.8-27b",
  "deepseek-v4-flash-0731",
  "deepseek-v4-pro-0813",
  "gemma-4-26b-a4b-it",
  "mistral-small-4",
  "mistral-large-3",
  "gpt-oss-20b",
  "gpt-oss-120b",
  "nemotron-3-super-120b-a12b",
  "granite-4.2-30b",
];

async function existingModelOptionCount(page, modelId = "llama-3.1-70b") {
  return page.locator(`option[value="${modelId}"]`).count();
}

async function openTcoCapacitySection(page) {
  const trigger = page.getByRole("button", { name: /Capacity & unit economics/i });
  await expect(trigger).toBeVisible();
  if ((await trigger.getAttribute("aria-expanded")) !== "true") await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByLabel("Model for capacity estimate")).toBeVisible();
}

test("Model Advisor never surfaces existing-deployment models", async ({ page }) => {
  await page.goto("/model-advisor", { waitUntil: "domcontentloaded" });
  await expect(page.getByText(/Llama 4 Scout|Llama 4 Maverick|Meta Muse Glimmer 30B/).first()).toBeVisible();

  for (const label of EXISTING_DEPLOYMENT_LABELS) {
    await expect(page.getByText(label, { exact: true })).toHaveCount(0);
  }
});

test("staged PR3 models do not surface in Model Advisor before PR4 activation", async ({ page }) => {
  await page.goto("/model-advisor", { waitUntil: "domcontentloaded" });
  await expect(page.getByText(/Llama 4 Scout|Llama 4 Maverick|Meta Muse Glimmer 30B/).first()).toBeVisible();

  for (const label of STAGED_MODEL_LABELS) {
    await expect(page.getByText(label, { exact: true })).toHaveCount(0);
  }
});

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

test("staged PR3 models stay out of GPU Sizing even when existing deployments are enabled", async ({ page }) => {
  await page.goto("/gpu-sizing", { waitUntil: "domcontentloaded" });

  const toggle = page.getByLabel("Include models for existing deployments");
  await toggle.check();

  for (const id of STAGED_MODEL_IDS) {
    await expect(page.locator(`option[value="${id}"]`)).toHaveCount(0);
  }
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
  await openTcoCapacitySection(page);

  const toggle = page.getByLabel("Include models for existing deployments");
  await expect(toggle).toBeVisible();
  await expect(toggle).not.toBeChecked();
  await expect.poll(() => existingModelOptionCount(page)).toBe(0);

  await toggle.check();
  await expect.poll(() => existingModelOptionCount(page)).toBeGreaterThan(0);
});

test("staged PR3 models stay out of TCO even when existing deployments are enabled", async ({ page }) => {
  await page.goto("/tco", { waitUntil: "domcontentloaded" });
  await openTcoCapacitySection(page);

  const toggle = page.getByLabel("Include models for existing deployments");
  await toggle.check();

  for (const id of STAGED_MODEL_IDS) {
    await expect(page.locator(`option[value="${id}"]`)).toHaveCount(0);
  }
});
