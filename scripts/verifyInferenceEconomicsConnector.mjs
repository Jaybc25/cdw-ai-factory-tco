import assert from "node:assert/strict";
import fs from "node:fs";
import {
  buildInferenceEconomicsPreviewHandoff,
  parseInferenceEconomicsPreviewHandoff,
} from "../src/inferenceEconomicsConnector.js";

// Clean inference workload handoff: attributable TCO may be inherited only when
// growth semantics also match the Preview's current flat-demand horizon.
const clean = buildInferenceEconomicsPreviewHandoff({
  ownSys: "DGX B200",
  systemCount: 1,
  gpusPerSystem: 8,
  modelId: "llama-3.1-70b",
  modelParamsB: 70.6,
  quant: "FP8",
  horizonYears: 3,
  onPremTcoUsd: 1_250_000,
  workingDayHours: 8,
  isInferenceWorkloadHandoff: true,
  trainShare: 0,
  growth: 0,
});
assert.deepEqual(clean.blockers, []);
assert.equal(clean.hardwareClass, "B200");
assert.equal(clean.gpuCount, 8);
assert.equal(clean.attributableTcoUsd, 1_250_000);
assert.ok(clean.href.includes("source=tco"));
assert.ok(clean.href.includes("tco=1250000"));

const parsedClean = parseInferenceEconomicsPreviewHandoff(
  clean.href.slice(clean.href.indexOf("?"))
);
assert.equal(parsedClean.hardwareClass, "B200");
assert.equal(parsedClean.gpuCount, 8);
assert.equal(parsedClean.modelId, "llama-3.1-70b");
assert.equal(parsedClean.quant, "FP8");
assert.equal(parsedClean.horizonYears, 3);
assert.equal(parsedClean.attributableTcoUsd, 1_250_000);
assert.equal(parsedClean.activeHoursPerDay, 8);

// Mixed workload: preserve context, suppress inherited TCO.
const mixed = buildInferenceEconomicsPreviewHandoff({
  ownSys: "DGX B200",
  systemCount: 1,
  gpusPerSystem: 8,
  modelId: "llama-3.1-70b",
  quant: "FP8",
  horizonYears: 3,
  onPremTcoUsd: 1_250_000,
  trainShare: 0.5,
  growth: 0,
});
assert.ok(mixed.blockers.includes("MIXED_WORKLOAD_TCO"));
assert.equal(mixed.attributableTcoUsd, null);
assert.equal(mixed.href.includes("tco=1250000"), false);

// Nonzero TCO growth: do not pair a growth-loaded numerator with flat demand.
const growthMismatch = buildInferenceEconomicsPreviewHandoff({
  ownSys: "DGX B200",
  systemCount: 1,
  gpusPerSystem: 8,
  modelId: "llama-3.1-70b",
  quant: "FP8",
  horizonYears: 3,
  onPremTcoUsd: 1_500_000,
  isInferenceWorkloadHandoff: true,
  trainShare: 0,
  growth: 0.25,
});
assert.ok(growthMismatch.blockers.includes("TCO_GROWTH_NOT_MODELED"));
assert.equal(growthMismatch.attributableTcoUsd, null);

// Unsupported hardware identity is preserved so Preview fails honestly.
const rubin = buildInferenceEconomicsPreviewHandoff({
  ownSys: "DGX Rubin NVL8",
  systemCount: 1,
  gpusPerSystem: 8,
  modelId: "llama-3.1-70b",
  quant: "FP8",
  horizonYears: 3,
  onPremTcoUsd: 2_000_000,
  isInferenceWorkloadHandoff: true,
  trainShare: 0,
  growth: 0,
});
assert.ok(rubin.blockers.includes("UNSUPPORTED_HARDWARE"));
assert.equal(rubin.hardwareClass, "DGX Rubin NVL8");
assert.ok(rubin.href.includes("hardware=DGX+Rubin+NVL8"));

// Custom model size must survive the handoff.
const custom = buildInferenceEconomicsPreviewHandoff({
  ownSys: "DGX H200",
  systemCount: 1,
  gpusPerSystem: 8,
  modelId: "custom",
  modelParamsB: 42,
  quant: "FP8",
  horizonYears: 1,
  onPremTcoUsd: 800_000,
  isInferenceWorkloadHandoff: true,
  trainShare: 0,
  growth: 0,
});
const parsedCustom = parseInferenceEconomicsPreviewHandoff(
  custom.href.slice(custom.href.indexOf("?"))
);
assert.equal(parsedCustom.modelId, "custom");
assert.equal(parsedCustom.modelParamsB, 42);

// UI/TCO contract stays Preview-only and one-way.
const tco = fs.readFileSync("src/TcoCalculator.jsx", "utf8");
const ui = fs.readFileSync("src/InferenceEconomicsPreview.jsx", "utf8");
assert.ok(tco.includes("Open Inference Economics Preview"));
assert.ok(tco.includes("buildInferenceEconomicsPreviewHandoff"));
assert.ok(ui.includes("PREVIEW — IE-5"));
assert.ok(ui.includes("parseInferenceEconomicsPreviewHandoff"));
assert.ok(ui.includes("Inherited from TCO"));
assert.ok(ui.includes("does not change TCO calculations, reports, or recommendations"));
assert.equal(ui.includes("Send to TCO"), false);

console.log("IE-5 Preview TCO connector contract verified.");
