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

test("GB300 NVL72 handoff starts on GB300 cloud rental and survives refresh", async ({ page }) => {
  await seedTcoSession(page, {
    mode: "spend",
    provider: "AWS",
    gpuClass: "H100",
    cloudGpuClassOverridden: false,
  });

  const params = new URLSearchParams({
    ownSys: "DGX GB300 NVL-72",
    gpuCount: "72",
    sourceClass: "GB300 NVL72",
    sizingBasis: "recommended",
    workingDayHours: "10",
  });
  await page.goto(`/tco?${params.toString()}`, { waitUntil: "domcontentloaded" });

  let saved = await waitForTcoSession(page, {
    mode: "workload",
    provider: "AWS",
    ownSys: "DGX GB300 NVL-72",
    gpuSizingCount: 72,
    sourceClass: "GB300 NVL72",
    gpuClass: "GB300",
    cloudGpuClassOverridden: false,
    workingDayHours: 10,
  });

  expect(saved.gpuClass).toBe("GB300");
  expect(new URL(page.url()).search).toBe("");
  await expect(page.getByText(/Cloud alternative priced at AWS GB300/)).toBeVisible();

  await openTier2(page);
  await expect(page.getByText(/Matched to GB300 NVL72 from GPU Sizing for a like-for-like starting comparison/)).toBeVisible();

  await page.reload({ waitUntil: "domcontentloaded" });
  saved = await waitForTcoSession(page, {
    gpuClass: "GB300",
    sourceClass: "GB300 NVL72",
    ownSys: "DGX GB300 NVL-72",
    gpuSizingCount: 72,
  });
  expect(saved.cloudGpuClassOverridden).toBe(false);
  await expect(page.getByText(/Cloud alternative priced at AWS GB300/)).toBeVisible();
});

test("explicit H100 cloud override still wins for a later GB300 handoff", async ({ page }) => {
  await seedTcoSession(page, {
    mode: "workload",
    provider: "AWS",
    gpuClass: "H100",
    cloudGpuClassOverridden: true,
    ownSys: "DGX B200",
    gpuSizingCount: 8,
    sourceClass: "B200",
  });

  const params = new URLSearchParams({
    ownSys: "DGX GB300 NVL-72",
    gpuCount: "72",
    sourceClass: "GB300 NVL72",
    sizingBasis: "recommended",
    workingDayHours: "10",
  });
  await page.goto(`/tco?${params.toString()}`, { waitUntil: "domcontentloaded" });

  const saved = await waitForTcoSession(page, {
    ownSys: "DGX GB300 NVL-72",
    gpuSizingCount: 72,
    sourceClass: "GB300 NVL72",
  });
  expect(saved.gpuClass).toBe("H100");
  expect(saved.cloudGpuClassOverridden).toBe(true);
});
