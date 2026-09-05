import { test, expect } from "@playwright/test";
import { AUTH_BYPASSED, BYPASS_ONLY_REASON, FRONT_DOOR_ONLY_REASON } from "./helpers/auth-context.js";

const ROUTES = [
  "/",
  "/use-cases",
  "/model-advisor",
  "/gpu-sizing",
  "/tco",
  "/roi",
  "/readiness",
  "/summary",
];

function capturePageErrors(page) {
  const errors = [];
  page.on("pageerror", (err) => errors.push(String(err?.stack || err?.message || err)));
  return errors;
}

for (const route of ROUTES) {
  test(`live route smoke: ${route}`, async ({ page }) => {
    const pageErrors = capturePageErrors(page);
    const response = await page.goto(route, { waitUntil: "domcontentloaded" });
    expect(response, `No document response for ${route}`).not.toBeNull();
    expect(response.ok(), `HTTP ${response.status()} for ${route}`).toBeTruthy();
    await page.waitForLoadState("networkidle").catch(() => {});

    expect(new URL(page.url()).pathname).toBe(route);
    const bodyText = (await page.locator("body").innerText()).trim();
    expect(bodyText.length, `${route} rendered too little content`).toBeGreaterThan(80);
    expect(bodyText).not.toMatch(/application error|internal server error|this page could not be found/i);
    expect(pageErrors, `Runtime errors on ${route}:\n${pageErrors.join("\n")}`).toEqual([]);
  });
}

test("every route serves the authenticated front door to signed-out visitors", async ({ page }) => {
  test.skip(AUTH_BYPASSED, FRONT_DOOR_ONLY_REASON);
  for (const route of ROUTES) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: "Access AI Factory Tools" }),
      `${route} did not render the sign-in front door`,
    ).toBeVisible();
    await expect(
      page.locator('a[href="/use-cases"]'),
      `${route} leaked tool navigation to a signed-out visitor`,
    ).toHaveCount(0);
  }
});

test("landing page exposes all six customer-journey tools", async ({ page }) => {
  test.skip(!AUTH_BYPASSED, BYPASS_ONLY_REASON);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const expectedHrefs = [
    "/use-cases",
    "/model-advisor",
    "/gpu-sizing",
    "/tco",
    "/roi",
    "/readiness",
  ];
  for (const href of expectedHrefs) {
    await expect(page.locator(`a[href="${href}"]`), `Missing landing link ${href}`).toHaveCount(1);
  }
});

test("GPU Sizing handoff persists TCO workload anchor after query consumption and reload", async ({ page }) => {
  test.skip(!AUTH_BYPASSED, BYPASS_ONLY_REASON);
  const pageErrors = capturePageErrors(page);
  await page.goto(
    "/tco?ownSys=DGX%20B200&gpuCount=8&sourceClass=B200&workingDayHours=8",
    { waitUntil: "domcontentloaded" },
  );
  await page.waitForFunction(() => !!sessionStorage.getItem("ai-factory-session:tco"));

  expect(new URL(page.url()).pathname).toBe("/tco");
  expect(new URL(page.url()).search).toBe("");

  const first = await page.evaluate(() => JSON.parse(sessionStorage.getItem("ai-factory-session:tco")));
  expect(first.ownSys).toBe("DGX B200");
  expect(first.gpuSizingCount).toBe(8);
  expect(first.sourceClass).toBe("B200");
  expect(first.workingDayHours).toBe(8);
  expect(first.mode).toBe("workload");

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !!sessionStorage.getItem("ai-factory-session:tco"));
  const afterReload = await page.evaluate(() => JSON.parse(sessionStorage.getItem("ai-factory-session:tco")));
  expect(afterReload.ownSys).toBe("DGX B200");
  expect(afterReload.gpuSizingCount).toBe(8);
  expect(afterReload.sourceClass).toBe("B200");
  expect(afterReload.workingDayHours).toBe(8);
  expect(afterReload.mode).toBe("workload");
  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
});

test("TCO handoff persists ROI values and provenance after query consumption and reload", async ({ page }) => {
  test.skip(!AUTH_BYPASSED, BYPASS_ONLY_REASON);
  const pageErrors = capturePageErrors(page);
  await page.goto(
    "/roi?initialCost=1250000&recurringCost=180000&planningBasis=workload",
    { waitUntil: "domcontentloaded" },
  );
  await page.waitForFunction(() => !!sessionStorage.getItem("ai-factory-session:roi"));

  expect(new URL(page.url()).pathname).toBe("/roi");
  expect(new URL(page.url()).search).toBe("");

  const first = await page.evaluate(() => JSON.parse(sessionStorage.getItem("ai-factory-session:roi")));
  expect(first.arrivedFromTco).toBe(true);
  expect(first.inputs.initialCost).toBe(1_250_000);
  expect(first.inputs.recurringCost).toBe(180_000);
  expect(first.tcoOriginalValues).toEqual({ initialCost: 1_250_000, recurringCost: 180_000 });
  expect(first.tcoPlanningBasis).toBe("workload");

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !!sessionStorage.getItem("ai-factory-session:roi"));
  const afterReload = await page.evaluate(() => JSON.parse(sessionStorage.getItem("ai-factory-session:roi")));
  expect(afterReload.arrivedFromTco).toBe(true);
  expect(afterReload.inputs.initialCost).toBe(1_250_000);
  expect(afterReload.inputs.recurringCost).toBe(180_000);
  expect(afterReload.tcoOriginalValues).toEqual({ initialCost: 1_250_000, recurringCost: 180_000 });
  expect(afterReload.tcoPlanningBasis).toBe("workload");
  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
});

test("malformed ROI handoff does not manufacture TCO provenance or zero-dollar costs", async ({ page }) => {
  test.skip(!AUTH_BYPASSED, BYPASS_ONLY_REASON);
  const pageErrors = capturePageErrors(page);
  await page.goto("/roi?initialCost=abc&recurringCost=", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !!sessionStorage.getItem("ai-factory-session:roi"));

  const saved = await page.evaluate(() => JSON.parse(sessionStorage.getItem("ai-factory-session:roi")));
  expect(saved.arrivedFromTco).toBe(false);
  expect(saved.tcoOriginalValues).toEqual({ initialCost: null, recurringCost: null });
  expect(saved.tcoPlanningBasis).toBeNull();
  expect(saved.inputs.initialCost).not.toBe(0);
  expect(saved.inputs.recurringCost).not.toBe(0);
  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
});
