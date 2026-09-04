import { test, expect } from "@playwright/test";

const KEY = "ai-factory-session:tco";
const runningUndeployedBranchAgainstProduction =
  process.env.GITHUB_EVENT_NAME === "pull_request" &&
  (process.env.BASE_URL || "").includes("vercel.app");

test.skip(
  runningUndeployedBranchAgainstProduction,
  "Branch-only ownership behavior is validated against the PR build, not the still-current production deployment.",
);

async function seedTcoSession(page, state) {
  await page.goto("/tco", { waitUntil: "domcontentloaded" });
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
