import assert from "node:assert/strict";
import fs from "node:fs";
import {
  buildInferenceEconomicsPreviewHandoff,
  parseInferenceEconomicsPreviewHandoff,
} from "../src/inferenceEconomicsConnector.js";

// Clean inference workload: full TCO can be attributed when fleet stays fixed.
const clean = buildInferenceEconomicsPreviewHandoff({
  ownSys: "DGX B200",
  systemCount: 1,
  gpusPerSystem: 8,
  fleetSystemsByYear: [1, 1, 1],
  modelId: "llama-3.1-70b",
  modelParamsB: 70.6,
  quant: "FP8",
  horizonYears: 3,
  onPremTcoUsd: 1_250_000,
  workingDayHours: 8,
  isInferenceWorkloadHandoff: true,
  trainShare: 0,
  growth: 0.25,
});
assert.deepEqual(clean.blockers, []);
assert.equal(clean.hardwareClass, "B200");
assert.equal(clean.gpuCount, 8);
assert.equal(clean.attributableTcoUsd, 1_250_000);
assert.equal(clean.inferenceShare, 1);
assert.equal(clean.demandGrowthRate, 0.25);
assert.equal(clean.allocationMethod, "DIRECT_INFERENCE_WORKLOAD");
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
assert.equal(parsedClean.demandGrowthRate, 0.25);
assert.deepEqual(parsedClean.fleetSystemsByYear, [1, 1, 1]);

// Mixed workload: use TCO's known inference share as a MODELED allocation.
const mixed = buildInferenceEconomicsPreviewHandoff({
  ownSys: "DGX B200",
  systemCount: 1,
  gpusPerSystem: 8,
  fleetSystemsByYear: [1, 1, 1],
  modelId: "llama-3.1-70b",
  quant: "FP8",
  horizonYears: 3,
  onPremTcoUsd: 1_250_000,
  trainShare: 0.5,
  growth: 0.25,
});
assert.deepEqual(mixed.blockers, []);
assert.equal(mixed.inferenceShare, 0.5);
assert.equal(mixed.attributableTcoUsd, 625_000);
assert.equal(mixed.allocationMethod, "WORKLOAD_SHARE_MODELED");
assert.equal(mixed.demandGrowthRate, 0.25);
assert.ok(mixed.href.includes("tco=625000"));
assert.ok(mixed.href.includes("inferenceShare=0.5"));

// Physical fleet growth remains blocked until multi-system scaling is qualified.
const fleetGrowth = buildInferenceEconomicsPreviewHandoff({
  ownSys: "DGX B200",
  systemCount: 1,
  gpusPerSystem: 8,
  fleetSystemsByYear: [1, 2, 2],
  modelId: "llama-3.1-70b",
  quant: "FP8",
  horizonYears: 3,
  onPremTcoUsd: 1_500_000,
  trainShare: 0.5,
  growth: 0.25,
});
assert.ok(fleetGrowth.blockers.includes("FLEET_GROWTH_NOT_MODELED"));
assert.equal(fleetGrowth.attributableTcoUsd, null);

// Unsupported hardware identity is preserved so Preview fails honestly.
const rubin = buildInferenceEconomicsPreviewHandoff({
  ownSys: "DGX Rubin NVL8",
  systemCount: 1,
  gpusPerSystem: 8,
  fleetSystemsByYear: [1, 1, 1],
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
  fleetSystemsByYear: [1],
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
assert.ok(tco.includes("fleetSystemsByYear: r.fleetAdj"));
assert.ok(ui.includes("PREVIEW — IE-5.2"));
assert.ok(ui.includes("parseInferenceEconomicsPreviewHandoff"));
assert.ok(ui.includes("Modeled TCO allocation"));
assert.ok(ui.includes("does not change TCO calculations, reports, or recommendations"));
assert.equal(ui.includes("Send to TCO"), false);

console.log("IE-5.2 Preview TCO connector contract verified.");
