import { test, expect } from "@playwright/test";
import { AUTH_BYPASSED, BYPASS_ONLY_REASON } from "./helpers/auth-context.js";

test.skip(!AUTH_BYPASSED, BYPASS_ONLY_REASON);

const TCO_SESSION_KEY = "ai-factory-session:tco";

function modelSelectFor(page, modelId) {
  return page.locator("select").filter({ has: page.locator(`option[value="${modelId}"]`) }).first();
}

function resultCard(page, title) {
  return page.getByText(title, { exact: true }).first().locator("..").locator("..");
}

function gpuSelectFor(page, gpuId) {
  return page.locator("select").filter({ has: page.locator(`option[value="${gpuId}"]`) }).first();
}

async function chooseInferenceModel(page, modelId) {
  const select = modelSelectFor(page, modelId);
  await expect(select).toBeVisible();
  await select.selectOption(modelId);
  await expect(select).toHaveValue(modelId);
}

async function switchToTraining(page) {
  await page.getByRole("button", { name: "Training / fine-tuning sizing" }).click();
  await expect(page.getByRole("button", { name: "Training / fine-tuning sizing" })).toHaveCSS("color", "rgb(255, 255, 255)");
}

async function waitForTcoSession(page, expected = {}) {
  await page.waitForFunction(
    ({ key, expected }) => {
      const raw = sessionStorage.getItem(key);
      if (!raw) return false;
      const saved = JSON.parse(raw);
      return Object.entries(expected).every(([field, value]) => saved[field] === value);
    },
    { key: TCO_SESSION_KEY, expected },
  );
  return page.evaluate((key) => JSON.parse(sessionStorage.getItem(key)), TCO_SESSION_KEY);
}

test("inference sizing keeps dense, MoE, and hybrid residency semantics distinct", async ({ page }) => {
  await page.goto("/gpu-sizing", { waitUntil: "domcontentloaded" });

  // Dense current default: 29.6B resident / 29.6B active. With the default
  // 100-user, 30 tok/s scenario, all supported 8-GPU classes fit in one
  // deployable node; deterministic tie-breaking selects B200.
  await chooseInferenceModel(page, "muse-glimmer-30b");
  await expect(resultCard(page, "Minimum technical")).toContainText("1 GPUs");
  await expect(resultCard(page, "Minimum technical")).toContainText("B200");
  await expect(resultCard(page, "Recommended")).toContainText("8 GPUs");

  // MoE: Scout is only 17B active per token but 109B resident. The one-sided
  // throughput rule gives it no unsupported speedup, while residency still
  // changes the technical fit. F4 now compares the actual 8-GPU purchase: B200
  // needs two technical GPUs but retains acceptable headroom and is cheaper than
  // the one-technical-GPU B300, so the production recommendation remains one
  // 8-GPU node without paying extra for unused technical efficiency.
  await chooseInferenceModel(page, "llama-4-scout");
  await expect(resultCard(page, "Minimum technical")).toContainText("2 GPUs");
  await expect(resultCard(page, "Minimum technical")).toContainText("B200");
  await expect(resultCard(page, "Recommended")).toContainText("8 GPUs");

  // Hybrid: Maverick has the same 17B active-per-token concept as Scout but
  // a 400B resident model. Residency still materially increases the memory-bound
  // technical requirement relative to Scout. Under F4, B200 needs three technical
  // GPUs but still fits safely within one 8-GPU node, so its lower deployed cost
  // wins over the two-technical-GPU B300 option with the same deployed footprint.
  await chooseInferenceModel(page, "llama-4-maverick");
  await expect(resultCard(page, "Minimum technical")).toContainText("3 GPUs");
  await expect(resultCard(page, "Minimum technical")).toContainText("B200");
  await expect(resultCard(page, "Recommended")).toContainText("8 GPUs");
});

test("offline throughput sizing does not claim to validate interactive response speed", async ({ page }) => {
  await page.goto("/gpu-sizing", { waitUntil: "domcontentloaded" });

  await expect(page.getByLabel("Desired output tokens/sec per active request")).toBeVisible();
  await expect(page.getByText("Desired output-rate preview", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Calculation Methodology & Audit Trail" }).click();
  // AuditRow nests source/basis text under its label, so assert the material
  // semantics rather than relying on exact text for the composite label node.
  await expect(page.getByText("MLPerf Offline — aggregate output-throughput capacity planning", { exact: true })).toBeVisible();
  await expect(page.getByText(/does not enforce the latency constraints.*TTFT.*TPOT/)).toBeVisible();
  await expect(page.getByText(/MLPerf Offline throughput anchor/).first()).toBeVisible();
});

test("inference throughput anchor is precision-aware instead of reusing FP4 unchanged", async ({ page }) => {
  await page.goto("/gpu-sizing", { waitUntil: "domcontentloaded" });
  await chooseInferenceModel(page, "muse-glimmer-30b");
  await page.getByLabel("Peak concurrent users").fill("10000");

  const deploymentAssumptions = page.locator("details").filter({ hasText: "Deployment assumptions" });
  await deploymentAssumptions.locator("summary").click();
  const gpuSelect = gpuSelectFor(page, "B200");
  await gpuSelect.selectOption("B200");

  const quantSelect = page.locator("select").filter({ has: page.locator('option[value="FP4"]') }).first();
  await quantSelect.selectOption("FP4");
  await expect(resultCard(page, "Minimum technical")).toContainText("23 GPUs");
  await expect(resultCard(page, "Recommended")).toContainText("24 GPUs");

  await quantSelect.selectOption("FP8");
  await expect(resultCard(page, "Minimum technical")).toContainText("46 GPUs");
  await expect(resultCard(page, "Recommended")).toContainText("48 GPUs");

  await quantSelect.selectOption("FP16");
  await expect(resultCard(page, "Minimum technical")).toContainText("92 GPUs");
  await expect(resultCard(page, "Recommended")).toContainText("96 GPUs");

  await page.getByRole("button", { name: "Calculation Methodology & Audit Trail" }).click();
  // Keep the regression aligned to the production AuditFormula label, not a shortened paraphrase.
  await expect(page.getByText("Precision throughput guardrail (FP16)", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/Downward precision guardrail applied/)).toBeVisible();
});

test("training sizing uses total parameters for resident state and active parameters for sparse FLOPs", async ({ page }) => {
  await page.goto("/gpu-sizing", { waitUntil: "domcontentloaded" });
  await switchToTraining(page);

  // Dense Muse: resident and active parameter counts are the same. With Rubin
  // training enabled from first-party FLOPS and memory specifications, the
  // default full-fine-tune/BF16/50B-token/14-day/40%-MFU scenario needs five
  // technical Rubin NVL8 GPUs and node-rounds to one 8-GPU system.
  await chooseInferenceModel(page, "muse-glimmer-30b");
  await expect(resultCard(page, "Minimum technical")).toContainText("5 GPUs");
  await expect(resultCard(page, "Minimum technical")).toContainText("Rubin NVL8");
  await expect(resultCard(page, "Recommended")).toContainText("8 GPUs");

  // MoE Scout: 109B resident state drives fit memory while only 17B active
  // parameters drive token-level FLOPs. M2 fixes the old BF16 double-scaling
  // error: 109B × 18 bytes/param = 1,962 GB, which needs 7 B300s and
  // node-rounds to one 8-GPU system.
  await chooseInferenceModel(page, "llama-4-scout");
  await expect(resultCard(page, "Minimum technical")).toContainText("7 GPUs");
  await expect(resultCard(page, "Minimum technical")).toContainText("B300");
  await expect(resultCard(page, "Recommended")).toContainText("8 GPUs");

  // Hybrid Maverick shares Scout's 17B active-compute concept but has 400B
  // resident parameters. At the corrected 18 bytes/param full-training baseline,
  // resident state is 7,200 GB, driving 25 technical B300s and 32 node-rounded.
  // This pair remains a regression guard against collapsing residency into active parameters.
  await chooseInferenceModel(page, "llama-4-maverick");
  await expect(resultCard(page, "Minimum technical")).toContainText("25 GPUs");
  await expect(resultCard(page, "Minimum technical")).toContainText("B300");
  await expect(resultCard(page, "Recommended")).toContainText("32 GPUs");
});

test("training audit uses training TFLOPS provenance rather than inference benchmark provenance", async ({ page }) => {
  await page.goto("/gpu-sizing", { waitUntil: "domcontentloaded" });
  await switchToTraining(page);

  // GPU selection lives inside the collapsed Deployment assumptions panel.
  const deploymentAssumptions = page.locator("details").filter({ hasText: "Deployment assumptions" });
  await deploymentAssumptions.locator("summary").click();

  const gpuSelect = gpuSelectFor(page, "B300");
  await expect(gpuSelect).toBeVisible();
  await gpuSelect.selectOption("B300");
  await expect(gpuSelect).toHaveValue("B300");

  await page.getByRole("button", { name: "Calculation Methodology & Audit Trail" }).click();
  await expect(page.getByText("Selected GPU -- B300", { exact: true })).toBeVisible();
  // The source string is the material provenance assertion; the AuditRow label also contains nested subtext.
  await expect(page.getByText(/NVIDIA Blackwell Ultra \/ DGX B300 published specifications; peak BF16\/FP8 Tensor Core throughput used for training sizing\./)).toBeVisible();
  await expect(page.getByText(/MLPerf Inference/i)).toHaveCount(0);
});

// The production cards themselves are the TCO-selection controls; there is no
// duplicate selector lower on the page.
test("higher-growth production design is opt-in for TCO and resets after re-sizing", async ({ page }) => {
  await page.goto("/gpu-sizing", { waitUntil: "domcontentloaded" });
  await chooseInferenceModel(page, "muse-glimmer-30b");

  const recommendedChoice = page.getByRole("button", { name: /Recommended.*Selected for TCO/i });
  await expect(recommendedChoice).toBeVisible();
  await expect(recommendedChoice).toHaveAttribute("aria-pressed", "true");

  const higherGrowthChoice = page.getByRole("button", { name: /Higher-growth alternative/i });
  await expect(higherGrowthChoice).toBeVisible();
  await higherGrowthChoice.click();
  await expect(higherGrowthChoice).toHaveAttribute("aria-pressed", "true");

  const tcoLink = page.getByRole("link", { name: "Compare TCO" });
  const selectedHref = await tcoLink.getAttribute("href");
  expect(selectedHref).toContain("sizingBasis=higher-growth");

  await chooseInferenceModel(page, "llama-4-scout");
  await expect(page.getByRole("button", { name: /Recommended.*Selected for TCO/i })).toHaveAttribute("aria-pressed", "true");
  const resetHref = await tcoLink.getAttribute("href");
  expect(resetHref).toContain("sizingBasis=recommended");
});

test("rack-scale same-footprint recommendation preserves GPU Sizing to TCO handoff", async ({ page }) => {
  await page.goto("/gpu-sizing", { waitUntil: "domcontentloaded" });
  await chooseInferenceModel(page, "deepseek-v4-pro-0813");
  await page.getByLabel("Peak concurrent users").fill("20000");
  await page.getByLabel("Desired output tokens/sec per active request").fill("50");

  // M3 no longer reuses FP4 Blackwell benchmark throughput unchanged for
  // this FP8 workload. B200's FP8 guardrail halves its loaded FP4 anchor, so
  // the workload needs 153 technical GPUs and node-rounds to 160 B200s. The
  // other current Blackwell classes require at least 216 deployed GPUs here,
  // so deployable footprint remains the first recommendation criterion.
  await expect(resultCard(page, "Minimum technical")).toContainText("153 GPUs");
  await expect(resultCard(page, "Minimum technical")).toContainText("B200");
  await expect(resultCard(page, "Recommended")).toContainText("160 GPUs");
  await expect(resultCard(page, "Recommended")).toContainText("B200");
  await expect(page.getByText("TCO modeling not yet activated", { exact: true })).toHaveCount(0);

  const tcoLink = page.getByRole("link", { name: "Compare TCO" });
  await expect(tcoLink).toBeVisible();
  const href = await tcoLink.getAttribute("href");
  const params = new URL(href, "http://local.test").searchParams;
  expect(params.get("ownSys")).toBe("DGX B200");
  expect(params.get("gpuCount")).toBe("160");
  expect(params.get("sourceClass")).toBe("B200");
  expect(params.get("sizingBasis")).toBe("recommended");
  expect(params.get("model")).toBe("deepseek-v4-pro-0813");
  expect(params.get("modelParamsB")).toBe("1650");
  expect(params.get("quant")).toBe("FP8");
  expect(params.get("workingDayHours")).toBe("10");

  await page.goto(href, { waitUntil: "domcontentloaded" });
  const saved = await waitForTcoSession(page, {
    ownSys: "DGX B200",
    gpuSizingCount: 160,
    sourceClass: "B200",
    gpuSizingBasis: "recommended",
    modelId: "deepseek-v4-pro-0813",
  });
  expect(saved.modelParamsB).toBe(1650);
  expect(saved.quant).toBe("FP8");
  expect(saved.workingDayHours).toBe(10);
});


test("GPU Sizing distinguishes loaded system budget from full deployment TCO", async ({ page }) => {
  await page.goto("/gpu-sizing", { waitUntil: "domcontentloaded" });

  await expect(page.getByText("Loaded system budget", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/Same pricing basis as the Cloud vs On-Prem TCO Calculator \(system \+ software suite \+ fabrics \+ professional services\)\./).first()).toBeVisible();
  await expect(page.getByText(/Excludes shared cluster infrastructure, workload storage, racks\/facility costs, ongoing operations, and migration\/transition costs -- not a quote\./).first()).toBeVisible();
  await expect(page.getByText(/TCO adds the shared infrastructure, storage, facility\/operations, and transition costs required to model the full deployment lifecycle\./).first()).toBeVisible();

  await page.getByRole("button", { name: "Calculation Methodology & Audit Trail" }).click();
  await expect(page.getByText("Loaded system budget", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Estimated budget", { exact: true })).toHaveCount(0);
});
