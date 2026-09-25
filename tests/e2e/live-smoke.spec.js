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


test("GPU Sizing report and audit honor the Higher-growth selection", async ({ page }) => {
  test.skip(!AUTH_BYPASSED, BYPASS_ONLY_REASON);
  const pageErrors = capturePageErrors(page);
  await page.goto("/gpu-sizing", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});

  const higherGrowthButton = page.getByRole("button").filter({ hasText: "Higher-growth alternative" });
  await expect(higherGrowthButton).toHaveCount(1);
  const higherGrowthText = await higherGrowthButton.innerText();
  const countMatch = higherGrowthText.match(/(\d[\d,]*)\s+GPUs?/i);
  expect(countMatch).not.toBeNull();
  const selectedCount = countMatch[1].replace(/,/g, "");
  await higherGrowthButton.click();
  await expect(higherGrowthButton).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: "Get the full sizing report" }).click();
  if (await page.getByRole("button", { name: "View my report" }).count()) {
    await page.locator('input[placeholder="Full name"]:visible').fill("Test User");
    await page.locator('input[placeholder="Company"]:visible').fill("CDW");
    await page.locator('input[placeholder="Work email"]:visible').fill("test@example.com");
    await page.getByRole("button", { name: "View my report" }).click();
  }
  const reportText = await page.locator("body").innerText();
  expect(reportText).toMatch(/Selected configuration for TCO/i);
  expect(reportText).toContain("SELECTED FOR TCO · HIGHER-GROWTH");
  expect(reportText).toMatch(new RegExp(`\\b${selectedCount}\\s+GPUs?\\b`, "i"));

  await page.getByRole("button", { name: "Calculation Methodology & Audit Trail" }).click();
  const auditText = await page.locator("body").innerText();
  expect(auditText).toContain("TCO selection basis");
  expect(auditText).toContain("User-selected higher-growth alternative");
  expect(auditText).toContain("Selected configuration for TCO");
  expect(auditText).toContain("Selected loaded system budget");
  expect(auditText).toContain("Selected-for-TCO budget");

  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
});

test("GPU Sizing handoff persists TCO workload anchor after query consumption and reload", async ({ page }) => {
  test.skip(!AUTH_BYPASSED, BYPASS_ONLY_REASON);
  const pageErrors = capturePageErrors(page);
  await page.goto(
    "/tco?ownSys=DGX%20B200&gpuCount=8&gpuDemandCount=1&sourceClass=B200&workingDayHours=8",
    { waitUntil: "domcontentloaded" },
  );
  await page.waitForFunction(() => !!sessionStorage.getItem("ai-factory-session:tco"));

  expect(new URL(page.url()).pathname).toBe("/tco");
  expect(new URL(page.url()).search).toBe("");

  const first = await page.evaluate(() => JSON.parse(sessionStorage.getItem("ai-factory-session:tco")));
  expect(first.ownSys).toBe("DGX B200");
  expect(first.gpuSizingCount).toBe(8);
  expect(first.gpuSizingDemandCount).toBe(1);
  expect(first.sourceClass).toBe("B200");
  expect(first.workingDayHours).toBe(8);
  expect(first.mode).toBe("workload");

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !!sessionStorage.getItem("ai-factory-session:tco"));
  const afterReload = await page.evaluate(() => JSON.parse(sessionStorage.getItem("ai-factory-session:tco")));
  expect(afterReload.ownSys).toBe("DGX B200");
  expect(afterReload.gpuSizingCount).toBe(8);
  expect(afterReload.gpuSizingDemandCount).toBe(1);
  expect(afterReload.sourceClass).toBe("B200");
  expect(afterReload.workingDayHours).toBe(8);
  expect(afterReload.mode).toBe("workload");
  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
});









test("Inference Economics uses customer-facing throughput wording and errors", async ({ page }) => {
  test.skip(!AUTH_BYPASSED, BYPASS_ONLY_REASON);
  const pageErrors = capturePageErrors(page);

  await page.goto("/inference-economics", { waitUntil: "domcontentloaded" });
  const technicalAssumptions = page.locator("details").filter({ hasText: "Technical assumptions" }).first();
  if (!(await technicalAssumptions.evaluate((element) => element.open))) {
    await technicalAssumptions.locator("summary").click();
  }

  const bodyText = await page.locator("body").innerText();
  expect(bodyText).toContain("Sustained share of benchmark throughput");
  expect(bodyText).not.toMatch(/throughputTokPerSec must be > 0|throughputUtilization must be > 0 and <= 1/i);
  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
});





test("GPU class selectors show customer-friendly labels while preserving values", async ({ page }) => {
  test.skip(!AUTH_BYPASSED, BYPASS_ONLY_REASON);
  const pageErrors = capturePageErrors(page);

  await page.goto("/gpu-sizing", { waitUntil: "domcontentloaded" });
  const deploymentAssumptions = page.locator("details").filter({ hasText: "Deployment assumptions" }).first();
  if (!(await deploymentAssumptions.evaluate((element) => element.open))) {
    await deploymentAssumptions.locator("summary").click();
  }
  const gpuSelect = deploymentAssumptions.locator("select").filter({ has: page.locator('option[value="B200"]') }).first();
  const optionText = await gpuSelect.locator('option[value="B200"]').innerText();
  expect(optionText).toBe("NVIDIA B200");
  await gpuSelect.selectOption("B200");
  expect(await gpuSelect.inputValue()).toBe("B200");
  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
});

test("GPU Sizing shows a concise confidence summary", async ({ page }) => {
  test.skip(!AUTH_BYPASSED, BYPASS_ONLY_REASON);
  const pageErrors = capturePageErrors(page);

  await page.goto("/gpu-sizing", { waitUntil: "domcontentloaded" });
  const bodyText = await page.locator("body").innerText();
  expect(bodyText).toMatch(/Directional sizing: based on benchmark-backed hardware throughput plus modeled workload adjustments\./);
  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
});

test("TCO labels the conservative baseline without performance credit", async ({ page }) => {
  test.skip(!AUTH_BYPASSED, BYPASS_ONLY_REASON);
  const pageErrors = capturePageErrors(page);

  await page.goto("/tco", { waitUntil: "domcontentloaded" });
  const bodyText = await page.locator("body").innerText();
  expect(bodyText).not.toContain("floor case");
  expect(bodyText).toMatch(/without performance credit/i);
  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
});

test("customer-facing tool and catalog counts use consistent scope wording", async ({ page }) => {
  test.skip(!AUTH_BYPASSED, BYPASS_ONLY_REASON);
  const pageErrors = capturePageErrors(page);

  await page.goto("/model-advisor", { waitUntil: "domcontentloaded" });
  const advisorText = await page.locator("body").innerText();
  expect(advisorText).toContain("current new-deployment models evaluated");
  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
});

test("legacy Inference Economics preview routes redirect to the current tool", async ({ page }) => {
  test.skip(!AUTH_BYPASSED, BYPASS_ONLY_REASON);
  for (const path of [
    "/tco/inference-economics-preview",
    "/tco/inference-economics-preview-guided",
  ]) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await page.waitForURL(/\/inference-economics\?source=tco$/);
    expect(new URL(page.url()).pathname).toBe("/inference-economics");
  }
});

test("Model Advisor distinguishes enforced governance from planning-only inputs", async ({ page }) => {
  test.skip(!AUTH_BYPASSED, BYPASS_ONLY_REASON);
  const pageErrors = capturePageErrors(page);

  await page.goto("/model-advisor", { waitUntil: "domcontentloaded" });
  await page.getByText("Deployment requirements", { exact: true }).click();

  const governanceField = page.locator("label").filter({ hasText: "Governance / origin restriction" }).first();
  const governanceSelect = governanceField.locator("select");
  await expect(governanceSelect).toBeVisible();
  await governanceSelect.selectOption("approved-vendor-families");

  const sensitivityField = page.locator("label").filter({ hasText: "Data sensitivity (planning only)" }).first();
  await expect(sensitivityField).toBeVisible();

  await page.waitForFunction(() => {
    const raw = sessionStorage.getItem("ai-factory-session:model-advisor");
    return raw && JSON.parse(raw).governance === "approved-vendor-families";
  });
  const selectedLabel = await governanceSelect.locator("option:checked").innerText();
  expect(selectedLabel).toMatch(/Approved vendor families \(planning only\)/i);

  const saved = await page.evaluate(() => JSON.parse(sessionStorage.getItem("ai-factory-session:model-advisor")));
  expect(saved.governance).toBe("approved-vendor-families");

  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
});

test("Model Advisor text-only requirement does not exclude multimodal-capable models", async ({ page }) => {
  test.skip(!AUTH_BYPASSED, BYPASS_ONLY_REASON);
  const pageErrors = capturePageErrors(page);

  await page.goto("/model-advisor", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});

  await page.getByText("Deployment requirements", { exact: true }).click();
  const multimodalField = page.locator("label").filter({ hasText: "Multimodal need" }).first();
  const modalitySelect = multimodalField.locator("select");
  await expect(modalitySelect).toBeVisible();
  await modalitySelect.selectOption("text-only");

  await page.waitForFunction(() => {
    const raw = sessionStorage.getItem("ai-factory-session:model-advisor");
    return raw && JSON.parse(raw).multimodal === "text-only";
  });
  let saved = await page.evaluate(() => JSON.parse(sessionStorage.getItem("ai-factory-session:model-advisor")));
  expect(saved.multimodal).toBe("text-only");

  await modalitySelect.selectOption("image-text");
  await page.waitForFunction(() => {
    const raw = sessionStorage.getItem("ai-factory-session:model-advisor");
    return raw && JSON.parse(raw).multimodal === "image-text";
  });
  saved = await page.evaluate(() => JSON.parse(sessionStorage.getItem("ai-factory-session:model-advisor")));
  expect(saved.multimodal).toBe("image-text");

  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
});

test("Model Advisor handoff keeps the recommended model across Inference and Training toggles", async ({ page }) => {
  test.skip(!AUTH_BYPASSED, BYPASS_ONLY_REASON);
  const pageErrors = capturePageErrors(page);

  await page.goto("/gpu-sizing?model=muse-glimmer-30b", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !!sessionStorage.getItem("ai-factory-session:gpu-sizing"));

  let saved = await page.evaluate(() => JSON.parse(sessionStorage.getItem("ai-factory-session:gpu-sizing")));
  expect(saved.infModelId).toBe("muse-glimmer-30b");
  expect(saved.modelAdvisorRecommendedId).toBe("muse-glimmer-30b");

  await page.getByRole("button", { name: "Training / fine-tuning sizing" }).click();
  await page.waitForFunction(() => {
    const raw = sessionStorage.getItem("ai-factory-session:gpu-sizing");
    return raw && JSON.parse(raw).trainModelId === "muse-glimmer-30b";
  });
  let bodyText = await page.locator("body").innerText();
  expect(bodyText).toMatch(/Model pre-set to Meta Muse Glimmer 30B, carried over from Model Advisor/i);
  expect(bodyText).not.toMatch(/you're currently sizing .* after an adjustment/i);

  await page.getByRole("button", { name: "Inference sizing" }).click();
  bodyText = await page.locator("body").innerText();
  expect(bodyText).toMatch(/Model pre-set to Meta Muse Glimmer 30B, carried over from Model Advisor/i);
  expect(bodyText).not.toMatch(/you're currently sizing .* after an adjustment/i);

  saved = await page.evaluate(() => JSON.parse(sessionStorage.getItem("ai-factory-session:gpu-sizing")));
  expect(saved.infModelId).toBe("muse-glimmer-30b");
  expect(saved.trainModelId).toBe("muse-glimmer-30b");

  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
});

test("Explorer specialized routing context persists in GPU Sizing and only model-training presets Training", async ({ page }) => {
  test.skip(!AUTH_BYPASSED, BYPASS_ONLY_REASON);
  const pageErrors = capturePageErrors(page);

  await page.goto(
    "/gpu-sizing?sourceUseCase=predictive-maintenance&workloadType=predictive-maintenance-ml&routingClass=infrastructure-first",
    { waitUntil: "domcontentloaded" },
  );
  await page.waitForFunction(() => !!sessionStorage.getItem("ai-factory-session:gpu-sizing"));
  let bodyText = await page.locator("body").innerText();
  expect(bodyText).toMatch(/predictive-maintenance-ml/i);
  expect(bodyText).toMatch(/isn't fully represented in this calculator yet/i);
  let saved = await page.evaluate(() => JSON.parse(sessionStorage.getItem("ai-factory-session:gpu-sizing")));
  expect(saved.incomingWorkloadType).toBe("predictive-maintenance-ml");
  expect(saved.incomingRoutingClass).toBe("infrastructure-first");
  expect(saved.mode).toBe("Inference");

  await page.reload({ waitUntil: "domcontentloaded" });
  bodyText = await page.locator("body").innerText();
  expect(bodyText).toMatch(/predictive-maintenance-ml/i);
  expect(bodyText).toMatch(/isn't fully represented in this calculator yet/i);

  await page.goto(
    "/gpu-sizing?sourceUseCase=earth2-weather-analytics&workloadType=scientific-model-inference&routingClass=specialized-stack",
    { waitUntil: "domcontentloaded" },
  );
  await page.waitForFunction(() => {
    const raw = sessionStorage.getItem("ai-factory-session:gpu-sizing");
    return raw && JSON.parse(raw).sourceUseCase === "earth2-weather-analytics";
  });
  saved = await page.evaluate(() => JSON.parse(sessionStorage.getItem("ai-factory-session:gpu-sizing")));
  expect(saved.mode).toBe("Inference");

  await page.goto(
    "/gpu-sizing?sourceUseCase=transaction-foundation-model&workloadType=model-training&routingClass=specialized-stack&mode=Training",
    { waitUntil: "domcontentloaded" },
  );
  await page.waitForFunction(() => {
    const raw = sessionStorage.getItem("ai-factory-session:gpu-sizing");
    return raw && JSON.parse(raw).sourceUseCase === "transaction-foundation-model";
  });
  saved = await page.evaluate(() => JSON.parse(sessionStorage.getItem("ai-factory-session:gpu-sizing")));
  expect(saved.mode).toBe("Training");

  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
});

test("B200 memory is consistent between GPU Sizing and TCO", async ({ page }) => {
  test.skip(!AUTH_BYPASSED, BYPASS_ONLY_REASON);
  const pageErrors = capturePageErrors(page);

  await page.goto("/gpu-sizing", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  const gpuSizingText = await page.locator("body").innerText();
  expect(gpuSizingText).toMatch(/B200/);

  await page.goto("/tco?ownSys=DGX%20B200&gpuCount=8&sourceClass=B200", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.getByRole("button", { name: /Performance factors|Capacity/i }).count().catch(() => 0);
  const tcoText = await page.locator("body").innerText();
  expect(tcoText).not.toMatch(/DGX B200 \(192 GB\/GPU/i);

  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
});

test("TCO workload growth consumes GPU Sizing headroom before buying another system", async ({ page }) => {
  test.skip(!AUTH_BYPASSED, BYPASS_ONLY_REASON);
  const pageErrors = capturePageErrors(page);
  await page.goto(
    "/tco?ownSys=DGX%20B200&gpuCount=8&gpuDemandCount=1&sourceClass=B200&workingDayHours=10&concurrentUsers=200&targetTokPerUser=30",
    { waitUntil: "domcontentloaded" },
  );
  await page.waitForLoadState("networkidle").catch(() => {});

  const bodyText = await page.locator("body").innerText();
  expect(bodyText).toContain("88% headroom");
  expect(bodyText).not.toMatch(/88% headroom\s*→\s*2 sys by yr 3/i);
  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
});



test("GPU Sizing mode sets TCO workload mix on fresh handoff", async ({ page }) => {
  test.skip(!AUTH_BYPASSED, BYPASS_ONLY_REASON);
  const pageErrors = capturePageErrors(page);

  await page.goto(
    "/tco?ownSys=DGX%20B200&gpuCount=8&gpuDemandCount=1&sourceClass=B200&sizingBasis=recommended&gpuSizingMode=Inference&workingDayHours=10",
    { waitUntil: "domcontentloaded" },
  );
  await page.waitForFunction(() => !!sessionStorage.getItem("ai-factory-session:tco"));
  let saved = await page.evaluate(() => JSON.parse(sessionStorage.getItem("ai-factory-session:tco")));
  expect(saved.trainShare).toBe(0);
  expect(saved.gpuSizingMode).toBe("Inference");

  await page.goto(
    "/tco?ownSys=DGX%20B200&gpuCount=8&gpuDemandCount=1&sourceClass=B200&sizingBasis=recommended&gpuSizingMode=Training",
    { waitUntil: "domcontentloaded" },
  );
  await page.waitForFunction(() => {
    const raw = sessionStorage.getItem("ai-factory-session:tco");
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return parsed.gpuSizingMode === "Training";
  });
  saved = await page.evaluate(() => JSON.parse(sessionStorage.getItem("ai-factory-session:tco")));
  expect(saved.trainShare).toBe(1);
  expect(saved.gpuSizingMode).toBe("Training");

  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
});


test("TCO workload timing uses the same 250 active-days basis as Inference Economics", async ({ page }) => {
  test.skip(!AUTH_BYPASSED, BYPASS_ONLY_REASON);
  const pageErrors = capturePageErrors(page);
  await page.goto(
    "/tco?ownSys=DGX%20B200&gpuCount=8&gpuDemandCount=1&sourceClass=B200&gpuSizingMode=Inference&workingDayHours=10",
    { waitUntil: "domcontentloaded" },
  );
  await page.waitForLoadState("networkidle").catch(() => {});

  await page.getByRole("button", { name: /Get the full report/i }).click();
  const reportGate = page.getByRole("button", { name: "View my report" });
  if (await reportGate.count()) {
    await page.locator('input[placeholder="Full name"]:visible').fill("Test User");
    await page.locator('input[placeholder="Company"]:visible').fill("CDW");
    await page.locator('input[placeholder="Work email"]:visible').fill("test@example.com");
    await reportGate.click();
  }
  const reportText = await page.locator("body").innerText();
  expect(reportText).toMatch(/10 hrs\/day × 250 active days\/year ÷ 12/i);
  expect(reportText).toMatch(/1,667 GPU-hrs\/mo/i);

  await page.goto("/inference-economics", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  const daysField = page.locator("div").filter({ hasText: /^Serving days per year/ }).first();
  const daysInput = daysField.locator('input[type="number"]');
  await expect(daysInput).toHaveValue("250");

  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
});

test("TCO workload mode suppresses standalone serving-capacity estimates", async ({ page }) => {
  test.skip(!AUTH_BYPASSED, BYPASS_ONLY_REASON);
  const pageErrors = capturePageErrors(page);
  await page.goto(
    "/tco?ownSys=DGX%20B200&gpuCount=8&gpuDemandCount=1&sourceClass=B200&workingDayHours=10&concurrentUsers=200&targetTokPerUser=30",
    { waitUntil: "domcontentloaded" },
  );
  await page.waitForLoadState("networkidle").catch(() => {});

  await expect(page.getByText("Serving capacity (est.)", { exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "Calculation Methodology & Audit Trail" }).click();
  await expect(page.getByText("Serving capacity estimate", { exact: true })).toHaveCount(0);

  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
});


test("TCO labels savings ratio distinctly from ROI", async ({ page }) => {
  test.skip(!AUTH_BYPASSED, BYPASS_ONLY_REASON);
  const pageErrors = capturePageErrors(page);
  await page.goto(
    "/tco?ownSys=DGX%20B200&gpuCount=8&gpuDemandCount=1&sourceClass=B200&workingDayHours=10&concurrentUsers=200&targetTokPerUser=30",
    { waitUntil: "domcontentloaded" },
  );
  await page.waitForLoadState("networkidle").catch(() => {});

  const bodyText = await page.locator("body").innerText();
  expect(bodyText).toMatch(/savings\s+-?\d+% of on-prem cost/i);
  expect(bodyText).not.toMatch(/static payback[^\n]*\bROI\b/i);

  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
});


test("Rubin workload handoff labels cloud GPU as a placeholder, not like-for-like", async ({ page }) => {
  test.skip(!AUTH_BYPASSED, BYPASS_ONLY_REASON);
  const pageErrors = capturePageErrors(page);
  await page.goto(
    "/tco?ownSys=DGX%20Vera%20Rubin%20NVL72&gpuCount=72&gpuDemandCount=72&sourceClass=Vera%20Rubin%20NVL72&workingDayHours=10",
    { waitUntil: "domcontentloaded" },
  );
  await page.waitForLoadState("networkidle").catch(() => {});

  await page.getByRole("button", { name: /Refine when known/i }).click();
  const refineText = await page.locator("body").innerText();
  expect(refineText).toMatch(/No cloud rate is available for Vera Rubin NVL72/i);
  expect(refineText).toMatch(/cloud side currently uses H100 as a placeholder with no Rubin performance credit/i);
  expect(refineText).toMatch(/select the GPU class you would actually rent/i);
  expect(refineText).not.toMatch(/like-for-like starting comparison/i);

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


test("TCO to ROI handoff discloses its narrower cost basis", async ({ page }) => {
  test.skip(!AUTH_BYPASSED, BYPASS_ONLY_REASON);
  const pageErrors = capturePageErrors(page);
  await page.goto(
    "/roi?initialCost=1250000&recurringCost=180000&planningBasis=workload",
    { waitUntil: "domcontentloaded" },
  );
  await page.waitForLoadState("networkidle").catch(() => {});

  await expect(page.getByText(/This prefill uses TCO's current upfront cost plus Year-1 operating cost/i)).toBeVisible();
  await expect(page.getByText(/excludes later-year fleet expansion and operating-cost growth modeled in TCO/i)).toBeVisible();

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
