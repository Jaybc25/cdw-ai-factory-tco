import { test, expect } from "@playwright/test";
import { AUTH_BYPASSED, BYPASS_ONLY_REASON } from "./helpers/auth-context.js";

test.skip(!AUTH_BYPASSED, BYPASS_ONLY_REASON);

const ROI_KEY = "ai-factory-session:roi";

async function savedRoi(page) {
  await page.waitForFunction((key) => !!sessionStorage.getItem(key), ROI_KEY);
  return page.evaluate((key) => JSON.parse(sessionStorage.getItem(key)), ROI_KEY);
}

test("M7 defaults Year 1 benefit realization to 75 percent and explains when to change it", async ({ page }) => {
  await page.goto("/roi", { waitUntil: "domcontentloaded" });

  const ramp = page.getByLabel("Year 1 benefit realization / ramp");
  await expect(ramp).toHaveValue("75");

  const fieldRow = page.locator('label[for="roi-field-rampPct"]').locator("..");
  await fieldRow.getByRole("button", { name: "More info" }).click();
  await expect(page.getByText(/75% default is a planning assumption, not an industry benchmark/)).toBeVisible();
  await expect(page.getByText(/Use 100% when the analysis starts after the solution is effectively live/)).toBeVisible();
  await expect(page.getByText(/use about 50% for a roughly linear ramp/)).toBeVisible();

  // Default business assumptions: steady-state value $2,428,800;
  // at a 75% Year-1 ramp the modeled Year-1 value is $1,821,600.
  await expect(page.getByText("$1,821,600/yr")).toBeVisible();

  const saved = await savedRoi(page);
  expect(saved.roiRampPolicyVersion).toBe(1);
  expect(saved.inputs.rampPct).toBe(0.75);
});

test("M7 migrates the legacy 100 percent default once but preserves an explicit non-default ramp", async ({ page }) => {
  await page.goto("/roi", { waitUntil: "domcontentloaded" });
  let saved = await savedRoi(page);

  await page.evaluate(({ key, current }) => {
    const legacy = {
      ...current,
      inputs: { ...current.inputs, rampPct: 1 },
    };
    delete legacy.roiRampPolicyVersion;
    sessionStorage.setItem(key, JSON.stringify(legacy));
  }, { key: ROI_KEY, current: saved });

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByLabel("Year 1 benefit realization / ramp")).toHaveValue("75");
  saved = await savedRoi(page);
  expect(saved.roiRampPolicyVersion).toBe(1);
  expect(saved.inputs.rampPct).toBe(0.75);

  await page.evaluate(({ key, current }) => {
    const legacyCustom = {
      ...current,
      inputs: { ...current.inputs, rampPct: 0.82 },
    };
    delete legacyCustom.roiRampPolicyVersion;
    sessionStorage.setItem(key, JSON.stringify(legacyCustom));
  }, { key: ROI_KEY, current: saved });

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByLabel("Year 1 benefit realization / ramp")).toHaveValue("82");
  saved = await savedRoi(page);
  expect(saved.roiRampPolicyVersion).toBe(1);
  expect(saved.inputs.rampPct).toBe(0.82);
});


test("U4 ROI report carries compact key assumptions with the saved result", async ({ page }) => {
  await page.goto("/roi", { waitUntil: "domcontentloaded" });

  await page.getByLabel("AI time reduction").fill("45");
  await page.getByLabel("Adoption rate").fill("70");
  await page.getByLabel("Productive redeployment realization").fill("65");
  await page.getByLabel("Year 1 benefit realization / ramp").fill("80");
  await page.getByLabel("Initial implementation cost").fill("250000");
  await page.getByLabel("Annual recurring AI cost").fill("120000");
  await page.getByLabel("Analysis horizon").fill("4");

  await page.getByRole("button", { name: "Get the full report (PDF)" }).click();

  const reportGate = page.getByRole("button", { name: "View my report" });
  if (await reportGate.isVisible().catch(() => false)) {
    await page.getByLabel("Full name").fill("Regression User");
    await page.getByLabel("Company").fill("CDW");
    await page.getByLabel("Work email").fill("regression@example.com");
    await reportGate.click();
  }

  await expect(page.getByText("Key assumptions", { exact: true })).toBeVisible();
  await expect(page.getByText(/Time reduction 45\.0% · Adoption 70\.0% · Realization 65\.0% · Year 1 ramp 80\.0% · Horizon 4 years/)).toBeVisible();
  await expect(page.getByText(/AI cost \$250,000 initial \+ \$120,000\/yr recurring/)).toBeVisible();
});
