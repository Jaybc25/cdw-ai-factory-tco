import { test, expect } from "@playwright/test";
import { AUTH_BYPASSED, BYPASS_ONLY_REASON } from "./helpers/auth-context.js";

test.skip(!AUTH_BYPASSED, BYPASS_ONLY_REASON);

const KEY = "ai-factory-session:tco";

async function seedTcoSession(page, state) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.evaluate(({ key, state }) => {
    sessionStorage.setItem(key, JSON.stringify(state));
  }, { key: KEY, state });
}

async function openRefine(page) {
  const trigger = page.getByRole("button", { name: /Refine when known/i });
  await expect(trigger).toBeVisible();
  if ((await trigger.getAttribute("aria-expanded")) !== "true") await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
}

async function waitForStorageConfirmation(page, expected) {
  await page.waitForFunction(
    ({ key, expected }) => {
      const raw = sessionStorage.getItem(key);
      if (!raw) return false;
      return JSON.parse(raw).workloadStorageConfirmed === expected;
    },
    { key: KEY, expected },
  );
}

test("fresh workload handoff requires explicit storage confirmation instead of inheriting prior acceptance", async ({ page }) => {
  await seedTcoSession(page, {
    mode: "workload",
    workloadStorageConfirmed: true,
    fastPBm: 0.25,
    bulkPBm: 0.75,
  });

  await page.goto(
    "/tco?ownSys=DGX%20B300&gpuCount=8&sourceClass=B300&sizingBasis=recommended&workingDayHours=10&model=muse-glimmer-30b&modelParamsB=29.6&quant=FP8",
    { waitUntil: "domcontentloaded" },
  );

  await expect(page.getByText(/Storage assumption unconfirmed\./)).toBeVisible();
  await expect(page.getByText(/3-YEAR MODELED DELTA · DIRECTIONAL/)).toBeVisible();

  await openRefine(page);
  await expect(page.getByText("STORAGE: WORKLOAD INPUT — CONFIRM", { exact: true })).toBeVisible();
  await expect(page.getByText(/GPU count and model metadata do not determine storage capacity/)).toBeVisible();

  await page.getByRole("button", { name: /use these storage assumptions/i }).click();
  await waitForStorageConfirmation(page, true);
  await expect(page.getByText("STORAGE: WORKLOAD INPUT CONFIRMED", { exact: true })).toBeVisible();
  await expect(page.getByText(/Storage assumption unconfirmed\./)).toHaveCount(0);
});

test("workload fleets beyond the current small-cluster envelope require architecture review", async ({ page }) => {
  await page.goto(
    "/tco?ownSys=DGX%20B200&gpuCount=72&sourceClass=B200&sizingBasis=recommended&workingDayHours=10&model=llama-3.1-70b&modelParamsB=70.6&quant=FP8",
    { waitUntil: "domcontentloaded" },
  );

  await openRefine(page);
  await page.getByRole("button", { name: /use these storage assumptions/i }).click();
  await waitForStorageConfirmation(page, true);

  // 72 B200 GPUs node-round to nine 8-GPU systems. M5 does not fabricate a
  // linear cluster-cost multiplier; it keeps the modeled subtotal directional
  // and requires topology/infrastructure validation beyond the 8-system
  // BasePOD planning envelope.
  await expect(page.getByText(/Infrastructure architecture review required\./)).toBeVisible();
  await expect(page.getByText(/Validate management\/network topology, rack\/power\/cooling, and storage design/)).toBeVisible();
  await expect(page.getByText(/3-YEAR MODELED DELTA · DIRECTIONAL/)).toBeVisible();
  await expect(page.getByText("9 sys", { exact: true })).toBeVisible();
});

test("single GB200 NVL72 requires a scoped infrastructure review in workload mode", async ({ page }) => {
  await page.goto(
    "/tco?ownSys=DGX%20GB200%20NVL-72&gpuCount=72&sourceClass=GB200%20NVL72&sizingBasis=recommended&workingDayHours=10&model=llama-3.1-70b&modelParamsB=70.6&quant=FP8",
    { waitUntil: "domcontentloaded" },
  );
  await expect(page.getByText(/3-YEAR MODELED DELTA · DIRECTIONAL/)).toBeVisible();
  await openRefine(page);
  await expect(page.getByText("NVL72 infrastructure quote/coverage review")).toBeVisible();
  await expect(page.getByText(/rack, liquid cooling, power distribution, fabric, installation, selected software/)).toBeVisible();
  await page.getByRole("button", { name: /use these storage assumptions/i }).click();
  await waitForStorageConfirmation(page, true);
  const confirm = page.getByRole("button", { name: /I reviewed coverage and reflected the costs/i });
  await expect(confirm).toBeDisabled();
  await page.getByRole("textbox", { name: "Quote or existing-facility coverage reference" }).fill("CDW quote 123 / facility review 2026-09-23");
  await confirm.click();
  await expect(page.getByText(/User review recorded for these inputs; the result remains directional/)).toBeVisible();
  await expect(page.getByText(/NVL72 review recorded; result remains directional\./)).toBeVisible();
  await expect(page.getByText(/3-YEAR MODELED DELTA · DIRECTIONAL/)).toBeVisible();
  await expect(page.getByText(/3-YEAR SAVINGS · REFINED/)).toHaveCount(0);
});

test("NVL72 five-year retrofit accepts a quote beyond the old slider cap and still discloses renewal", async ({ page }) => {
  await page.goto("/tco", { waitUntil: "domcontentloaded" });
  await openRefine(page);
  await page.getByRole("button", { name: "DGX GB300 NVL-72" }).click();
  await page.getByRole("button", { name: "Self-hosted (retrofit)" }).click();
  await page.getByRole("spinbutton", { name: /Facility retrofit \(one-time\)/i }).fill("4500000");
  await expect(page.getByRole("spinbutton", { name: /Facility retrofit \(one-time\)/i })).toHaveValue("4500000");
  await page.getByRole("button", { name: "5yr" }).click();
  await expect(page.getByText(/Five-year software\/support renewal not included/)).toBeVisible();
  await expect(page.getByText(/5-YEAR MODELED DELTA · DIRECTIONAL/)).toBeVisible();
});

test("same-value Equinix entry cannot clear the NVL72 review gate", async ({ page }) => {
  await seedTcoSession(page, {
    ownSys: "DGX GB200 NVL-72",
    facility: "Equinix",
    onPremRateOverrides: { "DGX GB200 NVL-72": { equinixMo: 11387 } },
  });
  await page.goto("/tco", { waitUntil: "domcontentloaded" });
  await openRefine(page);
  await page.getByRole("textbox", { name: "Quote or existing-facility coverage reference" }).fill("CDW colo quote 123");
  const confirm = page.getByRole("button", { name: /I reviewed coverage and reflected the costs/i });
  await expect(confirm).toBeDisabled();
  const rateCard = page.getByRole("button", { name: /Rate card/i });
  if ((await rateCard.getAttribute("aria-expanded")) !== "true") await rateCard.click();
  await expect(page.getByRole("spinbutton", { name: /Equinix bundle \$\/system\/mo/i })).toHaveValue("11387");
  await expect(confirm).toBeDisabled();
  await page.getByRole("spinbutton", { name: /Equinix bundle \$\/system\/mo/i }).fill("12000");
  await expect(confirm).toBeEnabled();
  await confirm.click();
  await expect(page.getByText(/User review recorded for these inputs; the result remains directional/)).toBeVisible();
  await expect(page.getByText(/3-YEAR MODELED DELTA · DIRECTIONAL/)).toBeVisible();
});
