import { test, expect } from "@playwright/test";
import { AUTH_BYPASSED, BYPASS_ONLY_REASON } from "./helpers/auth-context.js";

test.skip(!AUTH_BYPASSED, BYPASS_ONLY_REASON);

function modelSelectFor(page, modelId) {
  return page.locator("select").filter({ has: page.locator(`option[value="${modelId}"]`) }).first();
}

function resultCard(page, title) {
  return page.getByText(title, { exact: true }).first().locator("..").locator("..");
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

test("inference sizing keeps dense, MoE, and hybrid residency semantics distinct", async ({ page }) => {
  await page.goto("/gpu-sizing", { waitUntil: "domcontentloaded" });

  // Dense current default: 29.6B resident / 29.6B active. With the default
  // 100-user, 30 tok/s scenario, all supported GPU classes fit in one
  // technical GPU; catalog order therefore selects B200 and node-rounds to 8.
  await chooseInferenceModel(page, "muse-glimmer-30b");
  await expect(resultCard(page, "Minimum technical")).toContainText("1 GPUs");
  await expect(resultCard(page, "Minimum technical")).toContainText("B200");
  await expect(resultCard(page, "Recommended")).toContainText("8 GPUs");

  // MoE: Scout is only 17B active per token but 109B resident. The one-sided
  // throughput rule gives it no unsupported speedup, while residency pushes
  // H200/B200 above one technical GPU. GB200 NVL72 is the first 1-GPU fit.
  await chooseInferenceModel(page, "llama-4-scout");
  await expect(resultCard(page, "Minimum technical")).toContainText("1 GPUs");
  await expect(resultCard(page, "Minimum technical")).toContainText("GB200 NVL72");
  await expect(resultCard(page, "Recommended")).toContainText("72 GPUs");

  // Hybrid: Maverick has the same 17B active-per-token concept as Scout but
  // a 400B resident model. If active parameters were incorrectly substituted
  // for residency this would collapse toward Scout. Correct behavior remains
  // memory-bound and selects two B300s before 8-GPU node rounding.
  await chooseInferenceModel(page, "llama-4-maverick");
  await expect(resultCard(page, "Minimum technical")).toContainText("2 GPUs");
  await expect(resultCard(page, "Minimum technical")).toContainText("B300");
  await expect(resultCard(page, "Recommended")).toContainText("8 GPUs");
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
  // parameters drive token-level FLOPs. The result remains 14 technical B300s,
  // node-rounded to 16. Rubin cannot reduce the 288GB/GPU memory floor here,
  // and using total params for sparse FLOPs would materially inflate the time-bound requirement.
  await chooseInferenceModel(page, "llama-4-scout");
  await expect(resultCard(page, "Minimum technical")).toContainText("14 GPUs");
  await expect(resultCard(page, "Minimum technical")).toContainText("B300");
  await expect(resultCard(page, "Recommended")).toContainText("16 GPUs");

  // Hybrid Maverick shares Scout's 17B active-compute concept but has 400B
  // resident parameters. The much larger resident state therefore drives a
  // 50-GPU technical requirement on B300, node-rounded to 56. This pair is a
  // regression guard against collapsing residency into active parameters.
  await chooseInferenceModel(page, "llama-4-maverick");
  await expect(resultCard(page, "Minimum technical")).toContainText("50 GPUs");
  await expect(resultCard(page, "Minimum technical")).toContainText("B300");
  await expect(resultCard(page, "Recommended")).toContainText("56 GPUs");
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
