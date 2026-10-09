import assert from "node:assert/strict";
import { sizeRtxProInference } from "../src/rtxProGpuSizing.js";
import { buildRtxProSingleServerTcoPolicy } from "../src/rtxProTcoPolicy.js";
import { buildRtxProLifecycleTco } from "../src/rtxProLifecycleTco.js";
import { buildRtxProInferenceEconomicsHandoff } from "../src/rtxProInferenceEconomicsConnector.js";
import { deriveInferenceEconomicsThroughput } from "../src/inferenceEconomicsThroughput.js";
import { getModelById } from "../src/modelRegistry.js";
import { LEGACY_DGX_8_GPU_POLICY } from "../src/tcoPlatformPolicy.js";

const MODEL = "llama-3.3-70b";
const BENCH = "rtx-pro-6000-llama-3.3-70b-fp4-1k1k";
const common = {
  modelId: MODEL,
  precision: "FP4",
  totalMemoryGB: 70,
  avgInputTokens: 1000,
  avgOutputTokens: 1000,
};

function sized(demand) {
  return sizeRtxProInference({ ...common, aggregateTokensPerSecond: demand });
}

const two = sized(3000);
assert.equal(two.eligible, true);
assert.equal(two.deployment.totalDeployedGpus, 2);
assert.equal(two.deployment.servers, 1);
assert.equal(two.deployment.serverGpuCount, 2);
assert.equal(two.benchmark.id, BENCH);
assert.equal(two.budget.amount, 66680.45);

const four = sized(5000);
assert.equal(four.deployment.totalDeployedGpus, 4);
assert.equal(four.deployment.serverGpuCount, 4);
assert.equal(four.budget.amount, 127673);

const eight = sized(10000);
assert.equal(eight.deployment.totalDeployedGpus, 8);
assert.equal(eight.deployment.serverGpuCount, 8);
assert.equal(eight.budget.amount, null);
assert.equal(eight.budget.confidence, "QUOTE");

const sixteen = sized(16000);
assert.equal(sixteen.deployment.totalDeployedGpus, 16);
assert.equal(sixteen.deployment.servers, 2);
assert.equal(sixteen.budget.amount, null);

const tooLarge = sizeRtxProInference({ ...common, totalMemoryGB: 97, aggregateTokensPerSecond: 1000 });
assert.equal(tooLarge.eligible, false);
assert.equal(tooLarge.status, "ENGINEERING_VALIDATION_REQUIRED");

// Regression for the production bug caught on mobile: aggregate serving memory
// can exceed one GPU even though independent replicas distribute sequence state.
// 35 GB of replicated weights + 0.5 GB/active sequence + 15% overhead across
// 100 users should fit comfortably once those users are spread across 2 GPUs.
const distributedMemory = sizeRtxProInference({
  modelId: MODEL,
  precision: "FP4",
  weightMemoryGB: 35,
  sequenceStateGBPerSequence: 0.5,
  concurrentUsers: 100,
  overheadPct: 0.15,
  aggregateTokensPerSecond: 3000,
  avgInputTokens: 1000,
  avgOutputTokens: 1000,
});
assert.equal(distributedMemory.eligible, true);
assert.equal(distributedMemory.deployment.totalDeployedGpus, 2);
assert.equal(distributedMemory.memoryBasis.sequencesPerGpu, 50);
assert.equal(distributedMemory.memoryBasis.totalMemoryGB < 90, true);

const unsupportedModel = sizeRtxProInference({ ...common, modelId: "muse-glimmer-30b", aggregateTokensPerSecond: 1000 });
assert.equal(unsupportedModel.eligible, false);
assert.equal(unsupportedModel.status, "EVIDENCE_REQUIRED");

const longContext = sizeRtxProInference({ ...common, avgInputTokens: 12000, aggregateTokensPerSecond: 1000 });
assert.equal(longContext.eligible, false);
assert.equal(longContext.status, "EVIDENCE_REQUIRED");

const incompletePolicy = buildRtxProSingleServerTcoPolicy({ gpuCount: 2 });
assert.equal(incompletePolicy.clientReady, false);
assert.ok(incompletePolicy.requiredInputs.includes("NVIDIA software/support entitlement"));
assert.equal(incompletePolicy.assumptions.managementControlPlaneCapexUSD, 0);
assert.equal(incompletePolicy.assumptions.fabricCapexUSD, 0);
assert.equal(incompletePolicy.assumptions.rackCapexUSD, 0);

const completePolicy = buildRtxProSingleServerTcoPolicy({
  gpuCount: 2,
  nvidiaSoftwareUSD: 10000,
  supportUSD: 5000,
  professionalServicesUSD: 8000,
  storageUSD: 12000,
  adminFteAnnualUSD: 15000,
  serverPowerKW: 2.5,
});
assert.equal(completePolicy.clientReady, true);
assert.equal(completePolicy.hardware.configuredSystemPriceUSD, 66680.45);

const lifecycle = buildRtxProLifecycleTco({
  hardwareUSD: completePolicy.hardware.configuredSystemPriceUSD,
  managementControlPlaneCapexUSD: completePolicy.assumptions.managementControlPlaneCapexUSD,
  fabricCapexUSD: completePolicy.assumptions.fabricCapexUSD,
  rackCapexUSD: completePolicy.assumptions.rackCapexUSD,
  nvidiaSoftwareUSD: 10000,
  nvidiaSoftwareBasis: "annual",
  supportUSD: 15000,
  supportBasis: "term-total",
  supportCoverageYears: 3,
  professionalServicesUSD: 8000,
  storageUSD: 12000,
  adminFteAnnualUSD: 15000,
  serverPowerKW: 2.5,
  powerBurdenPerKwMonth: 100,
  horizonYears: 3,
});
assert.equal(lifecycle.clientReady, true);
assert.equal(lifecycle.breakdown.nvidiaSoftwareLifecycleUSD, 30000);
assert.equal(lifecycle.breakdown.supportLifecycleUSD, 15000);
assert.equal(lifecycle.breakdown.adminLifecycleUSD, 45000);
assert.equal(lifecycle.breakdown.facilityPowerLifecycleUSD, 9000);
assert.equal(lifecycle.totalTcoUSD, 185680.45);

const shortSupport = buildRtxProLifecycleTco({
  hardwareUSD: 66680.45,
  managementControlPlaneCapexUSD: 0,
  fabricCapexUSD: 0,
  rackCapexUSD: 0,
  nvidiaSoftwareUSD: 0,
  nvidiaSoftwareBasis: "annual",
  supportUSD: 5000,
  supportBasis: "term-total",
  supportCoverageYears: 1,
  professionalServicesUSD: 0,
  storageUSD: 0,
  adminFteAnnualUSD: 0,
  serverPowerKW: 2,
  powerBurdenPerKwMonth: 0,
  horizonYears: 3,
});
assert.equal(shortSupport.clientReady, false);
assert.ok(shortSupport.requiredInputs.some((x) => x.includes("term coverage")));

const handoff = buildRtxProInferenceEconomicsHandoff({
  gpuCount: 2,
  modelId: MODEL,
  quant: "FP4",
  horizonYears: 3,
  onPremTcoUsd: lifecycle.totalTcoUSD,
  benchmarkId: BENCH,
});
assert.equal(handoff.eligible, true);
assert.equal(handoff.hardwareClass, "RTX PRO 6000");
assert.equal(handoff.inferenceShare, 1);
assert.equal(handoff.attributableTcoUsd, lifecycle.totalTcoUSD);
assert.match(handoff.href, /benchmarkId=rtx-pro-6000-llama-3.3-70b-fp4-1k1k/);

const tampered = buildRtxProInferenceEconomicsHandoff({
  gpuCount: 2,
  modelId: MODEL,
  quant: "FP4",
  horizonYears: 3,
  onPremTcoUsd: 100000,
  benchmarkId: "tampered-id",
});
assert.equal(tampered.eligible, false);
assert.ok(tampered.blockers.includes("RTX_BENCHMARK_NOT_FOUND"));

const mismatch = buildRtxProInferenceEconomicsHandoff({
  gpuCount: 2,
  modelId: "muse-glimmer-30b",
  quant: "FP4",
  horizonYears: 3,
  onPremTcoUsd: 100000,
  benchmarkId: BENCH,
});
assert.equal(mismatch.eligible, false);
assert.ok(mismatch.blockers.includes("RTX_BENCHMARK_MODEL_MISMATCH"));

const throughput = deriveInferenceEconomicsThroughput({
  hardwareClass: "RTX PRO 6000",
  deployedGpuCount: 2,
  quant: "FP4",
  model: getModelById(MODEL),
  benchmarkId: BENCH,
});
assert.equal(throughput.ok, true);
assert.equal(throughput.sourceThroughputTokPerSec, 1724);
assert.equal(throughput.effectiveThroughputTokPerSec, 3448);
assert.equal(throughput.deploymentEvidenceBasis, "REPLICA_SCALED");
assert.match(throughput.evidence.adjustmentBasis, /Independent-replica scaling/);

const badThroughput = deriveInferenceEconomicsThroughput({
  hardwareClass: "RTX PRO 6000",
  deployedGpuCount: 2,
  quant: "FP8",
  model: getModelById(MODEL),
  benchmarkId: BENCH,
});
assert.equal(badThroughput.ok, false);
assert.equal(badThroughput.reason, "UNSUPPORTED_PRECISION");

assert.equal(LEGACY_DGX_8_GPU_POLICY.values.cluster, 600000);
assert.equal(LEGACY_DGX_8_GPU_POLICY.values.fabricC, 54323);
assert.equal(LEGACY_DGX_8_GPU_POLICY.values.fabricS, 23443);
assert.equal(LEGACY_DGX_8_GPU_POLICY.values.fabricM, 14227);
assert.equal(LEGACY_DGX_8_GPU_POLICY.values.profSvcs, 25000);
assert.equal(LEGACY_DGX_8_GPU_POLICY.values.adminRatio, 10);

console.log("RTX PRO final adversarial regression PASS");
console.log("- 2/4/8/>8 replica sizing and price gates behave as designed");
console.log("- aggregate serving memory is distributed per RTX replica instead of misapplied to one GPU");
console.log("- >90 GB model-resident, unsupported-model, and long-context cases fail safely");
console.log("- unresolved TCO inputs remain blocked; explicit zero assumptions stay labeled");
console.log("- lifecycle term normalization and reconciliation are pinned");
console.log("- IE benchmark-id integrity/model/precision checks are enforced");
console.log("- direct RTX throughput scales only through independent replicas");
console.log("- legacy DGX shared-infrastructure baseline remains pinned");
