import { test, expect } from "@playwright/test";
import { AUTH_BYPASSED, BYPASS_ONLY_REASON } from "./helpers/auth-context.js";

test.skip(!AUTH_BYPASSED, BYPASS_ONLY_REASON);

const TCO_SESSION_KEY = "ai-factory-session:tco";
const ROI_SESSION_KEY = "ai-factory-session:roi";

const canonicalTcoState = {
  ov: {},
  bill: 105079,
  provider: "AWS",
  gpuClass: "B200-class",
  ownSys: "DGX B200",
  mode: "spend",
  trainShare: 0.5,
  odShare: 0,
  storageAuto: false,
  fastPBm: 0.25,
  bulkPBm: 0.75,
  egressPct: 0.05,
  computeShare: 0.49491,
  growth: 0,
  facility: "Self-hosted (AI-ready)",
  powerRate: 300,
  util: 1,
  fNet: 1,
  fSw: 1,
  fNvaie: 1,
  tier3Hrs: 0,
  horizon: 3,
  retrofit: 0,
  migration: 0,
  dualRun: 0,
  redundancy: false,
  residPct: 0,
  modelSize: "70B",
  quant: "FP8",
  gpuSizingCount: null,
  sourceClass: null,
  workingDayHours: null,
};

test("live TCO renders the canonical Excel parity fixture and hands it to ROI", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", (err) => pageErrors.push(String(err?.stack || err?.message || err)));

  // Establish the production origin before writing the same session state the
  // application itself persists. This avoids UI-slider imprecision while still
  // exercising the deployed React component and production TCO engine.
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ key, state }) => sessionStorage.setItem(key, JSON.stringify(state)),
    { key: TCO_SESSION_KEY, state: canonicalTcoState },
  );

  await page.goto("/tco", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});

  const body = page.locator("body");
  await expect(body).toContainText("FLEET");
  await expect(body).toContainText("1 sys");
  await expect(body).toContainText("CROSSOVER");
  await expect(body).toContainText("mo 24");

  // This text exists only in the source after the exact B200 reserved-rate
  // correction that closed the workbook parity defect. Checking it makes this
  // test a deployment-freshness assertion, not merely a calculation assertion.
  await page.getByRole("button", { name: /Refine when known/i }).click();
  await expect(body).toContainText("reserved snapshot $68.36/8 GPUs");

  // Exercise the actual production navigation rather than constructing the ROI
  // query manually. ROI should capture, consume, and persist TCO provenance.
  await page.getByRole("link", { name: /Send to ROI Calculator/i }).click();
  await expect(page).toHaveURL(/\/roi$/);
  await page.waitForFunction((key) => !!sessionStorage.getItem(key), ROI_SESSION_KEY);

  const roi = await page.evaluate((key) => JSON.parse(sessionStorage.getItem(key)), ROI_SESSION_KEY);
  expect(roi.arrivedFromTco).toBe(true);
  expect(roi.tcoPlanningBasis).toBe("spend");
  expect(Number.isFinite(roi.inputs.initialCost)).toBe(true);
  expect(Number.isFinite(roi.inputs.recurringCost)).toBe(true);
  expect(roi.inputs.initialCost).toBeGreaterThan(0);
  expect(roi.inputs.recurringCost).toBeGreaterThan(0);
  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
});
