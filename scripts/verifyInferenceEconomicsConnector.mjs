import assert from "node:assert/strict";
import fs from "node:fs";
import {
  buildInferenceEconomicsPreviewHandoff,
  buildInferenceEconomicsGpuSizingHandoff,
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
assert.ok(clean.href.startsWith("/inference-economics?"));
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

// Physical fleet growth is handled conservatively: full TCO cost is retained,
 // but no extra throughput credit is assumed beyond the initial benchmark-sized deployment.
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
assert.equal(fleetGrowth.blockers.includes("FLEET_GROWTH_NOT_MODELED"), false);
assert.equal(fleetGrowth.fleetGrowthConservative, true);
assert.equal(fleetGrowth.gpuCount, 8);
assert.equal(fleetGrowth.totalDeployedGpuCount, 8);
assert.equal(fleetGrowth.inferenceShare, 0.5);
assert.equal(fleetGrowth.attributableTcoUsd, 750_000);
assert.equal(fleetGrowth.allocationMethod, "WORKLOAD_SHARE_MODELED");

// A current 2-system B200 fleet keeps all 16 GPUs in TCO context but credits
// only one benchmark-supported 8-GPU system for throughput.
const twoSystemFleet = buildInferenceEconomicsPreviewHandoff({
  ownSys: "DGX B200",
  systemCount: 2,
  gpusPerSystem: 8,
  fleetSystemsByYear: [2, 2, 2],
  modelId: "llama-3.1-70b",
  quant: "FP8",
  horizonYears: 3,
  onPremTcoUsd: 3_547_569,
  trainShare: 0,
  growth: 0.25,
});
assert.equal(twoSystemFleet.gpuCount, 8);
assert.equal(twoSystemFleet.totalDeployedGpuCount, 16);
assert.equal(twoSystemFleet.attributableTcoUsd, 3_547_569);
const parsedTwoSystem = parseInferenceEconomicsPreviewHandoff(
  twoSystemFleet.href.slice(twoSystemFleet.href.indexOf("?"))
);
assert.equal(parsedTwoSystem.gpuCount, 8);
assert.equal(parsedTwoSystem.totalDeployedGpuCount, 16);

// Unknown workload mix must stay unknown rather than defaulting to 100% inference.
const unknownShare = buildInferenceEconomicsPreviewHandoff({
  ownSys: "DGX B200",
  systemCount: 1,
  gpusPerSystem: 8,
  fleetSystemsByYear: [1, 1, 1],
  modelId: "llama-3.1-70b",
  quant: "FP8",
  horizonYears: 3,
  onPremTcoUsd: 1_000_000,
  trainShare: null,
  growth: 0,
});
assert.ok(unknownShare.blockers.includes("INFERENCE_SHARE_UNKNOWN"));
assert.equal(unknownShare.attributableTcoUsd, null);

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

// GPU Sizing may hand off technical context directly only when it matches an
// exact qualified IE benchmark configuration. No private-cost value is invented.
const gpuDirect = buildInferenceEconomicsGpuSizingHandoff({
  hardwareClass: "B200",
  gpuCount: 8,
  modelId: "llama-3.1-70b",
  modelParamsB: 70.6,
  quant: "FP8",
  workingDayHours: 8,
});
assert.equal(gpuDirect.eligible, true);
assert.deepEqual(gpuDirect.blockers, []);
assert.ok(gpuDirect.href.startsWith("/inference-economics?"));
assert.ok(gpuDirect.href.includes("source=gpu-sizing"));
assert.equal(gpuDirect.href.includes("tco="), false);
const parsedGpuDirect = parseInferenceEconomicsPreviewHandoff(
  gpuDirect.href.slice(gpuDirect.href.indexOf("?"))
);
assert.equal(parsedGpuDirect.source, "gpu-sizing");
assert.equal(parsedGpuDirect.hardwareClass, "B200");
assert.equal(parsedGpuDirect.gpuCount, 8);
assert.equal(parsedGpuDirect.modelId, "llama-3.1-70b");
assert.equal(parsedGpuDirect.quant, "FP8");
assert.equal(parsedGpuDirect.activeHoursPerDay, 8);
assert.equal(parsedGpuDirect.attributableTcoUsd, null);

const gpuScaled = buildInferenceEconomicsGpuSizingHandoff({
  hardwareClass: "B200",
  gpuCount: 16,
  modelId: "llama-3.1-70b",
  quant: "FP8",
  workingDayHours: 8,
});
assert.equal(gpuScaled.eligible, false);
assert.ok(gpuScaled.blockers.includes("UNSUPPORTED_DEPLOYMENT_SCALING"));

// TCO's normal journey now opens the standalone Inference Economics tool; the technical Preview remains available
// as a direct advanced/audit route. The connector stays one-way.
const tco = fs.readFileSync("src/TcoCalculator.jsx", "utf8");
const ui = fs.readFileSync("src/InferenceEconomicsPreview.jsx", "utf8");
assert.ok(tco.includes("Where do you want to go next?"));
assert.ok(tco.includes("Option A · Compare inference economics"));
assert.ok(tco.includes("Option B · Build the business case"));
assert.ok(tco.includes("Compare inference economics"));
assert.ok(tco.includes("Open ROI Calculator"));
assert.ok(tco.includes("buildInferenceEconomicsPreviewHandoff"));
assert.ok(tco.includes("fleetSystemsByYear: r.fleetAdj"));
assert.ok(ui.includes("PREVIEW — IE-6.6"));
assert.ok(ui.includes("parseInferenceEconomicsPreviewHandoff"));
assert.ok(ui.includes("Modeled TCO allocation"));
assert.ok(ui.includes("does not change TCO calculations, reports, or recommendations"));
assert.equal(ui.includes("Send to TCO"), false);

console.log("IE-5.4 Preview TCO connector contract verified.");


// IE-5.3: allocation and eligibility are separate concepts.
assert.ok(ui.includes("INHERITED_SCENARIO_UNSUPPORTED"));
assert.ok(ui.includes("Inherited TCO scenario is not yet eligible for token economics"));


// IE-5.4: fleet growth is a conservative disclosure, not a blanket blocker.
assert.ok(ui.includes("Conservative fleet-growth treatment"));
assert.ok(ui.includes("no throughput credit is given beyond the initial benchmark-supported deployment"));


// IE-5.5: total paid fleet and throughput-credit basis are distinct.
assert.ok(ui.includes("Throughput-credit GPUs"));
assert.ok(ui.includes("TCO fleet:"));
assert.ok(ui.includes("extra throughput is not assumed"));
