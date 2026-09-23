import { test, expect } from "@playwright/test";
import { AUTH_BYPASSED, BYPASS_ONLY_REASON } from "./helpers/auth-context.js";

test.skip(!AUTH_BYPASSED, BYPASS_ONLY_REASON);

const KEY = "ai-factory-session:tco";

async function openSection(page, name) {
  const trigger = page.getByRole("button", { name });
  await expect(trigger).toBeVisible();
  if ((await trigger.getAttribute("aria-expanded")) !== "true") await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
}

async function waitForSavedDemand(page) {
  await page.waitForFunction((key) => {
    const raw = sessionStorage.getItem(key);
    if (!raw) return false;
    const saved = JSON.parse(raw);
    return saved.gpuSizingConcurrentUsers === 1200 && saved.gpuSizingTargetTokPerUser === 40;
  }, KEY);
  return page.evaluate((key) => JSON.parse(sessionStorage.getItem(key)), KEY);
}

test("workload mode restates GPU Sizing demand instead of inventing a second capacity answer", async ({ page }) => {
  await page.goto(
    "/tco?ownSys=DGX%20B300&gpuCount=8&sourceClass=B300&sizingBasis=recommended&workingDayHours=10&concurrentUsers=1200&targetTokPerUser=40&model=gpt-oss-120b&modelParamsB=117&quant=FP8",
    { waitUntil: "domcontentloaded" },
  );

  const saved = await waitForSavedDemand(page);
  expect(saved.gpuSizingCount).toBe(8);
  expect(saved.sourceClass).toBe("B300");
  expect(new URL(page.url()).search).toBe("");

  await openSection(page, /Workload capacity basis/i);
  await expect(page.getByText(/GPU Sizing is the technical capacity authority for this workload/)).toBeVisible();
  await expect(page.getByText("Peak concurrent request streams", { exact: true })).toBeVisible();
  await expect(page.getByText("1,200", { exact: true })).toBeVisible();
  await expect(page.getByText("40 tok/s per stream", { exact: true })).toBeVisible();
  await expect(page.getByText("48,000 tok/s", { exact: true })).toBeVisible();
  await expect(page.getByText("8 × B300", { exact: true })).toBeVisible();
  await expect(page.getByText(/Peak concurrency is not assumed to be sustained/)).toBeVisible();

  await expect(page.getByText("Concurrent interactive users (est.)", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Token throughput (est.)", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Cost per 1M tokens", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Cost per user / month", { exact: true })).toHaveCount(0);

  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForSavedDemand(page);
  await openSection(page, /Workload capacity basis/i);
  await expect(page.getByText("48,000 tok/s", { exact: true })).toBeVisible();
});

test("workload mode without inference demand refuses to fabricate serving capacity", async ({ page }) => {
  await page.goto(
    "/tco?ownSys=DGX%20B300&gpuCount=8&sourceClass=B300&sizingBasis=recommended&model=mistral-large-3&modelParamsB=675",
    { waitUntil: "domcontentloaded" },
  );

  await openSection(page, /Workload capacity basis/i);
  await expect(page.getByText(/does not include inference demand fields/)).toBeVisible();
  await expect(page.getByText("Concurrent interactive users (est.)", { exact: true })).toHaveCount(0);
});

test("standalone spend mode retains directional capacity without an unverified API cost comparison", async ({ page }) => {
  await page.goto("/tco", { waitUntil: "domcontentloaded" });
  await openSection(page, /Capacity estimates/i);
  await expect(page.getByText("Concurrent interactive users (est.)", { exact: true })).toBeVisible();
  await expect(page.getByText("Token throughput (est.)", { exact: true })).toBeVisible();
  await expect(page.getByText("Cost per 1M tokens", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Cost per user / month", { exact: true })).toHaveCount(0);
  await expect(page.getByText(/For demand-bound private cost per token and a named managed API comparison/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Compare inference economics" })).toHaveAttribute("href", /inference-economics/);

  // Older saved TCO sessions can still carry the retired API estimate. Drop
  // that override while preserving the rest of the scenario and the IE path.
  await page.waitForFunction((key) => !!sessionStorage.getItem(key), KEY);
  await page.evaluate((key) => {
    const saved = JSON.parse(sessionStorage.getItem(key));
    sessionStorage.setItem(key, JSON.stringify({ ...saved, ov: { ...saved.ov, cloudTok: 12 } }));
  }, KEY);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction((key) => {
    const saved = JSON.parse(sessionStorage.getItem(key));
    return saved && !("cloudTok" in saved.ov);
  }, KEY);
  await openSection(page, /Rate card/i);
  await expect(page.getByText("Managed API blended $/1M tokens (EST)")).toHaveCount(0);
});
