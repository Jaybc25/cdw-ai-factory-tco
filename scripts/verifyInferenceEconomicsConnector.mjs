import assert from "node:assert/strict";
import fs from "node:fs";
import {
  buildInferenceEconomicsPreviewHandoff,
  buildInferenceEconomicsGpuSizingHandoff,
  parseInferenceEconomicsPreviewHandoff,
} from "../src/inferenceEconomicsConnector.js";
import { deriveInferenceEconomicsThroughput } from "../src/inferenceEconomicsThroughput.js";
import { getModelById } from "../src/modelRegistry.js";

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
  activeDaysPerYear: 250,
  isInferenceWorkloadHandoff: true,
  trainShare: 0,
  growth: 0.25,
  roiInitialCostUsd: 900_000,
  roiRecurringCostUsd: 140_000,
  roiPlanningBasis: "workload",
  scaleoutClassification: "REPLICA_CAPACITY_SCALEOUT",
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
assert.ok(clean.href.includes("roiInitialCost=900000"));
assert.ok(clean.href.includes("roiRecurringCost=140000"));
assert.ok(clean.href.includes("roiPlanningBasis=workload"));

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
assert.equal(parsedClean.activeDaysPerYear, 250);
assert.equal(parsedClean.demandGrowthRate, 0.25);
assert.equal(parsedClean.roiInitialCostUsd, 900_000);
assert.equal(parsedClean.roiRecurringCostUsd, 140_000);
assert.equal(parsedClean.roiPlanningBasis, "workload");
assert.equal(parsedClean.scaleoutClassification, "REPLICA_CAPACITY_SCALEOUT");
assert.deepEqual(parsedClean.fleetSystemsByYear, [1, 1, 1]);


const continuous = buildInferenceEconomicsPreviewHandoff({
  ownSys: "DGX B200",
  systemCount: 1,
  gpusPerSystem: 8,
  fleetSystemsByYear: [1, 1, 1],
  modelId: "llama-3.1-70b",
  quant: "FP8",
  horizonYears: 3,
  onPremTcoUsd: 1_250_000,
  workingDayHours: 24,
  activeDaysPerYear: 365,
  isInferenceWorkloadHandoff: true,
  trainShare: 0,
  growth: 0,
});
const parsedContinuous = parseInferenceEconomicsPreviewHandoff(
  continuous.href.slice(continuous.href.indexOf("?"))
);
assert.equal(parsedContinuous.activeHoursPerDay, 24);
assert.equal(parsedContinuous.activeDaysPerYear, 365);
assert.ok(continuous.href.includes("activeDays=365"));

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

// A current 2-system B200 fleet carries all 16 deployed GPUs into IE so
// throughput and the TCO cost numerator refer to the same architecture.
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
assert.equal(twoSystemFleet.gpuCount, 16);
assert.equal(twoSystemFleet.totalDeployedGpuCount, 16);
assert.equal(twoSystemFleet.attributableTcoUsd, 3_547_569);
const parsedTwoSystem = parseInferenceEconomicsPreviewHandoff(
  twoSystemFleet.href.slice(twoSystemFleet.href.indexOf("?"))
);
assert.equal(parsedTwoSystem.gpuCount, 16);
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
assert.equal(gpuScaled.eligible, true);
assert.deepEqual(gpuScaled.blockers, []);

const gpuTopologyRequired = buildInferenceEconomicsGpuSizingHandoff({
  hardwareClass: "B200",
  gpuCount: 16,
  modelId: "custom",
  modelParamsB: 1500,
  quant: "FP8",
  workingDayHours: 8,
  scaleoutClassification: "TOPOLOGY_SCALEOUT_REQUIRED",
});
assert.equal(gpuTopologyRequired.eligible, false);
assert.ok(gpuTopologyRequired.blockers.includes("TOPOLOGY_SCALEOUT_REQUIRED"));
assert.ok(gpuTopologyRequired.href.includes("scaleoutClass=TOPOLOGY_SCALEOUT_REQUIRED"));

const gpuNonMultiple = buildInferenceEconomicsGpuSizingHandoff({
  hardwareClass: "B200",
  gpuCount: 12,
  modelId: "llama-3.1-70b",
  quant: "FP8",
  workingDayHours: 8,
});
assert.equal(gpuNonMultiple.eligible, false);
assert.ok(gpuNonMultiple.blockers.includes("UNSUPPORTED_DEPLOYMENT_SCALING"));

// Replica scaling: 16 B200s are two independent 8-GPU benchmark-sized
// serving groups when the selected model fits inside one group.
const llama70b = getModelById("llama-3.1-70b");
const exactThroughput = deriveInferenceEconomicsThroughput({
  hardwareClass: "B200",
  deployedGpuCount: 8,
  quant: "FP8",
  model: llama70b,
});
const replicaThroughput = deriveInferenceEconomicsThroughput({
  hardwareClass: "B200",
  deployedGpuCount: 16,
  quant: "FP8",
  model: llama70b,
});
assert.equal(exactThroughput.ok, true);
assert.equal(exactThroughput.deploymentEvidenceBasis, "EXACT_BENCHMARK");
assert.equal(replicaThroughput.ok, true);
assert.equal(replicaThroughput.deploymentEvidenceBasis, "REPLICA_SCALED");
assert.equal(replicaThroughput.replicaGroupCount, 2);
assert.equal(
  replicaThroughput.effectiveThroughputTokPerSec,
  exactThroughput.effectiveThroughputTokPerSec * 2
);

// Arbitrary/non-whole-group topology scaling remains suppressed.
const unsupportedTopology = deriveInferenceEconomicsThroughput({
  hardwareClass: "B200",
  deployedGpuCount: 12,
  quant: "FP8",
  model: llama70b,
});
assert.equal(unsupportedTopology.ok, false);
assert.equal(unsupportedTopology.reason, "UNSUPPORTED_DEPLOYMENT_SCALING");

// A model that cannot fit inside one benchmark-sized group may not use replica
// aggregation even when the total deployed fleet has enough aggregate memory.
const tooLargeForOneGroup = deriveInferenceEconomicsThroughput({
  hardwareClass: "B200",
  deployedGpuCount: 16,
  quant: "FP8",
  model: { id: "custom", label: "Custom 2000B", totalParamsB: 2000, activeParamsB: 2000, status: "CUSTOM" },
  customParamsB: 2000,
});
assert.equal(tooLargeForOneGroup.ok, false);
assert.equal(tooLargeForOneGroup.reason, "MODEL_DOES_NOT_FIT_BENCHMARK_CONFIG");

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
