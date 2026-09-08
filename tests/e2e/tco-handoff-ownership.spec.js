import { test, expect } from "@playwright/test";
import { AUTH_BYPASSED, BYPASS_ONLY_REASON } from "./helpers/auth-context.js";

test.skip(!AUTH_BYPASSED, BYPASS_ONLY_REASON);

const KEY = "ai-factory-session:tco";

async function seedTcoSession(page, state) {
  await page.goto("/tco", { waitUntil: "domcontentloaded" });
  await page.waitForFunction((key) => !!sessionStorage.getItem(key), KEY);
  await page.evaluate(({ key, state }) => {
    sessionStorage.setItem(key, JSON.stringify(state));
  }, { key: KEY, state });
}

async function waitForTcoSession(page, expected = {}) {
  await page.waitForFunction(
    ({ key, expected }) => {
      const raw = sessionStorage.getItem(key);
      if (!raw) return false;
      const saved = JSON.parse(raw);
      return Object.entries(expected).every(([field, value]) => saved[field] === value);
    },
    { key: KEY, expected },
  );
  return page.evaluate((key) => JSON.parse(sessionStorage.getItem(key)), KEY);
}

async function openTier2(page) {
  const trigger = page.getByRole("button", { name: /Refine when known/i });
  await expect(trigger).toBeVisible();
  if ((await trigger.getAttribute("aria-expanded")) !== "true") await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
}

async function openCapacityAndUnitEconomics(page) {
  const trigger = page.getByRole("button", { name: /Capacity & unit economics/i });
  await expect(trigger).toBeVisible();
  if ((await trigger.getAttribute("aria-expanded")) !== "true") await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
}

test("TCO exposes cloud GPU price sensitivity separately from workload growth", async ({ page }) => {
  await seedTcoSession(page, { mode: "spend", cloudUnitPriceTrend: 0 });
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByText("CLOUD GPU PRICE SENSITIVITY", { exact: true })).toBeVisible();
  await expect(page.getByText(/Applies an annual change to modeled cloud GPU compute rates only/)).toBeVisible();
  await expect(page.getByText(/Workload growth remains a separate consumption assumption/)).toBeVisible();
});

test("cloud unit-price trend is a persisted production sensitivity input", async ({ page }) => {
  await seedTcoSession(page, { mode: "spend", growth: 0.25, horizon: 3, cloudUnitPriceTrend: 0 });
  await page.reload({ waitUntil: "domcontentloaded" });

  const slider = page.getByLabel("Cloud GPU unit-price trend");
  await expect(slider).toBeVisible();
  await expect(slider).toHaveValue("0");

  await slider.fill("20");
  await expect(slider).toHaveValue("20");
  await expect(page.getByText("+20%/yr", { exact: true })).toBeVisible();

  // Regression guard: changing the sensitivity must trigger the TCO persistence effect.
  const saved = await waitForTcoSession(page, { cloudUnitPriceTrend: 20, growth: 0.25, horizon: 3 });
  expect(saved.cloudUnitPriceTrend).toBe(20);
  expect(saved.growth).toBe(0.25);
  expect(saved.horizon).toBe(3);

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByLabel("Cloud GPU unit-price trend")).toHaveValue("20");
});

test("GPU Sizing handoff preserves explicit higher-growth selection provenance", async ({ page }) => {
  await seedTcoSession(page, { mode: "spend" });
  await page.goto(
    "/tco?ownSys=DGX%20B300&gpuCount=16&sourceClass=B300&sizingBasis=higher-growth&workingDayHours=10&model=muse-glimmer-30b&modelParamsB=29.6&quant=FP8",
    { waitUntil: "domcontentloaded" },
  );
  const saved = await waitForTcoSession(page, {
    ownSys: "DGX B300", gpuSizingCount: 16, sourceClass: "B300", gpuSizingBasis: "higher-growth",
  });
  expect(saved.gpuSizingBasis).toBe("higher-growth");
  await expect(page.getByText("Higher-growth alternative selected in GPU Sizing", { exact: true })).toBeVisible();
});

test("GPU Sizing handoff defaults sizing provenance to recommended", async ({ page }) => {
  await seedTcoSession(page, { mode: "spend" });
  await page.goto(
    "/tco?ownSys=DGX%20B200&gpuCount=8&sourceClass=B200&workingDayHours=10&model=muse-glimmer-30b&modelParamsB=29.6&quant=FP8",
    { waitUntil: "domcontentloaded" },
  );
  const saved = await waitForTcoSession(page, { gpuSizingBasis: "recommended" });
  expect(saved.gpuSizingBasis).toBe("recommended");
});

test("fresh GPU Sizing handoff replaces upstream technical facts but preserves TCO-owned assumptions", async ({ page }) => {
  await seedTcoSession(page, {
    ownSys: "DGX H200",
    gpuSizingCount: 8,
    sourceClass: "H200",
    workingDayHours: 6,
    mode: "workload",
    provider: "Azure",
    gpuClass: "H100",
    cloudGpuClassOverridden: false,
    facility: "Equinix",
    growth: 0.5,
    cloudUnitPriceTrend: -10,
    horizon: 5,
    redundancy: true,
    migration: 175000,
    dualRun: 3,
    fastPBm: 0.5,
    bulkPBm: 2,
    storageAuto: false,
    cloudRateOverrides: {
      "Azure::H100": { instOD: 9.91, instRes: 5.11 },
      "Azure::B300": { instOD: 18.25, instRes: 10.75 },
    },
    onPremRateOverrides: {
      "DGX H200": { perSysCost: 555000, sysKw: 11.5, equinixMo: 9900 },
      "DGX B300": { perSysCost: 777000, sysKw: 15.2, equinixMo: 12900 },
    },
  });

  await page.goto(
    "/tco?ownSys=DGX%20B300&gpuCount=16&sourceClass=B300&workingDayHours=10&model=muse-glimmer-30b&modelParamsB=29.6&quant=FP8",
    { waitUntil: "domcontentloaded" },
  );

  const saved = await waitForTcoSession(page, {
    ownSys: "DGX B300",
    gpuSizingCount: 16,
    sourceClass: "B300",
    workingDayHours: 10,
    modelId: "muse-glimmer-30b",
  });
  expect(saved.modelParamsB).toBe(29.6);
  expect(saved.quant).toBe("FP8");

  expect(saved.provider).toBe("Azure");
  expect(saved.gpuClass).toBe("B300");
  expect(saved.cloudGpuClassOverridden).toBe(false);
  expect(saved.facility).toBe("Equinix");
  expect(saved.growth).toBe(0.5);
  expect(saved.cloudUnitPriceTrend).toBe(-10);
  expect(saved.horizon).toBe(5);
  expect(saved.redundancy).toBe(true);
  expect(saved.migration).toBe(175000);
  expect(saved.dualRun).toBe(3);
  expect(saved.fastPBm).toBe(0.5);
  expect(saved.bulkPBm).toBe(2);
  expect(saved.cloudRateOverrides["Azure::H100"]).toEqual({ instOD: 9.91, instRes: 5.11 });
  expect(saved.cloudRateOverrides["Azure::B300"]).toEqual({ instOD: 18.25, instRes: 10.75 });
  expect(saved.onPremRateOverrides["DGX H200"]).toEqual({ perSysCost: 555000, sysKw: 11.5, equinixMo: 9900 });
  expect(saved.onPremRateOverrides["DGX B300"]).toEqual({ perSysCost: 777000, sysKw: 15.2, equinixMo: 12900 });

  await openTier2(page);
  await expect(page.getByText("DGX B300", { exact: true })).toBeVisible();
  await expect(page.getByText(/Set by GPU Sizing\. Return to GPU Sizing to change the technical design\./)).toBeVisible();
});

test("explicit cloud GPU override survives later GPU Sizing changes", async ({ page }) => {
  await seedTcoSession(page, {
    ownSys: "DGX B200",
    gpuSizingCount: 8,
    sourceClass: "B200",
    mode: "workload",
    provider: "AWS",
    gpuClass: "H100",
    cloudGpuClassOverridden: true,
    cloudRateOverrides: {
      "AWS::H100": { instOD: 7.25, instRes: 4.5 },
    },
  });

  await page.goto(
    "/tco?ownSys=DGX%20B300&gpuCount=16&sourceClass=B300&workingDayHours=8&model=llama-3.1-70b&modelParamsB=70.6&quant=FP8",
    { waitUntil: "domcontentloaded" },
  );

  const saved = await waitForTcoSession(page, {
    ownSys: "DGX B300",
    gpuSizingCount: 16,
    sourceClass: "B300",
  });
  expect(saved.gpuClass).toBe("H100");
  expect(saved.cloudGpuClassOverridden).toBe(true);
  expect(saved.cloudRateOverrides["AWS::H100"]).toEqual({ instOD: 7.25, instRes: 4.5 });

  await openTier2(page);
  await expect(page.getByText(/Cloud comparison is a user override/)).toBeVisible();
});

test("model context survives query consumption and reload", async ({ page }) => {
  await seedTcoSession(page, { mode: "spend" });
  await page.goto(
    "/tco?ownSys=DGX%20B200&gpuCount=8&sourceClass=B200&workingDayHours=8&model=muse-glimmer-30b&modelParamsB=29.6&quant=FP8",
    { waitUntil: "domcontentloaded" },
  );

  const first = await waitForTcoSession(page, {
    modelId: "muse-glimmer-30b",
    gpuSizingCount: 8,
    sourceClass: "B200",
  });
  expect(first.modelParamsB).toBe(29.6);
  expect(first.quant).toBe("FP8");
  expect(new URL(page.url()).search).toBe("");

  await page.reload({ waitUntil: "domcontentloaded" });
  const afterReload = await waitForTcoSession(page, { modelId: "muse-glimmer-30b" });
  expect(afterReload.modelParamsB).toBe(29.6);
  expect(afterReload.quant).toBe("FP8");
});

test("legacy size-only TCO session migrates deterministically to Custom without inventing a model identity", async ({ page }) => {
  await seedTcoSession(page, {
    mode: "spend",
    modelSize: "671B",
    quant: "FP8",
  });

  await page.reload({ waitUntil: "domcontentloaded" });
  const saved = await waitForTcoSession(page, { modelId: "custom" });
  expect(saved.modelParamsB).toBe(671);
  expect(saved.quant).toBe("FP8");

  await openCapacityAndUnitEconomics(page);
  const modelSelect = page.getByLabel("Model for capacity estimate");
  await expect(modelSelect).toHaveValue("custom");
  await expect(page.getByLabel("Custom model parameters in billions")).toHaveValue("671");
});

test("Custom GPU Sizing handoff preserves Custom identity, exact parameter count, and quantization", async ({ page }) => {
  await seedTcoSession(page, {
    mode: "spend",
    modelId: "llama-3.1-70b",
    modelParamsB: 70.6,
    quant: "FP8",
  });

  await page.goto(
    "/tco?ownSys=DGX%20B300&gpuCount=8&sourceClass=B300&workingDayHours=8&model=custom&modelParamsB=123.4&quant=FP4",
    { waitUntil: "domcontentloaded" },
  );

  const saved = await waitForTcoSession(page, {
    ownSys: "DGX B300",
    gpuSizingCount: 8,
    sourceClass: "B300",
    modelId: "custom",
  });
  expect(saved.modelParamsB).toBe(123.4);
  expect(saved.quant).toBe("FP4");

  await openCapacityAndUnitEconomics(page);
  await expect(page.getByLabel("Model for capacity estimate")).toHaveValue("custom");
  await expect(page.getByLabel("Custom model parameters in billions")).toHaveValue("123.4");
});

test("Back and Forward do not replay consumed model handoff params or erase persisted edits", async ({ page }) => {
  await seedTcoSession(page, { mode: "spend" });
  await page.goto(
    "/tco?ownSys=DGX%20B200&gpuCount=8&sourceClass=B200&workingDayHours=8&model=muse-glimmer-30b&modelParamsB=29.6&quant=FP8",
    { waitUntil: "domcontentloaded" },
  );
  await waitForTcoSession(page, { modelId: "muse-glimmer-30b", sourceClass: "B200" });
  expect(new URL(page.url()).search).toBe("");

  const legacyToggle = page.getByLabel("Include models for existing deployments");
  await legacyToggle.check();
  await openCapacityAndUnitEconomics(page);
  const modelSelect = page.getByLabel("Model for capacity estimate");
  await modelSelect.selectOption("gemma-3-27b");
  const edited = await waitForTcoSession(page, { modelId: "gemma-3-27b" });
  expect(edited.modelParamsB).toBe(27);
  await legacyToggle.uncheck();

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.goBack({ waitUntil: "domcontentloaded" });
  expect(new URL(page.url()).search).toBe("");
  let restored = await waitForTcoSession(page, { modelId: "gemma-3-27b" });
  expect(restored.modelParamsB).toBe(27);

  await page.goForward({ waitUntil: "domcontentloaded" });
  await page.goBack({ waitUntil: "domcontentloaded" });
  expect(new URL(page.url()).search).toBe("");
  restored = await waitForTcoSession(page, { modelId: "gemma-3-27b" });
  expect(restored.modelParamsB).toBe(27);
});
