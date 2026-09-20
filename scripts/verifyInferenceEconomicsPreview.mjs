import assert from "node:assert/strict";
import {
  INFERENCE_ECONOMICS_STATUS,
  calculateInferenceEconomics,
  calculateManagedApiBlendedCost,
  calculateUsefulTokenProduction,
} from "../src/inferenceEconomics.js";
import {
  getInferenceEconomicsEvidence,
  qualifyInferenceEconomicsEvidence,
} from "../src/inferenceEconomicsEvidence.js";
import { deriveInferenceEconomicsThroughput } from "../src/inferenceEconomicsThroughput.js";
import { calculateManagedApiWorkloadEconomics } from "../src/managedApiComparison.js";
import { getModelById } from "../src/modelRegistry.js";
import {
  classifyInferenceScaleout,
  INFERENCE_SCALEOUT_CLASSIFICATION,
} from "../src/inferenceScaleoutClassification.js";
import {
  OUTPUT_TOKEN_DEMAND_BASIS,
  calculateAnnualOutputTokenDemand,
  calculateAnnualServingCapacity,
  calculateDemandBoundInferenceEconomics,
} from "../src/inferenceEconomicsWorkload.js";

// 1) Peak concurrency alone is intentionally insufficient: there is no API in
// this module that converts concurrent users × target tok/s directly to monthly
// tokens. Useful production requires explicit throughput + runtime assumptions.
const production = calculateUsefulTokenProduction({
  throughputTokPerSec: 100000,
  throughputUtilization: 0.5,
  activeHoursPerDay: 8,
  activeDaysPerYear: 250,
  horizonYears: 3,
});
assert.equal(production.ok, true);
assert.equal(production.annualUsefulTokens, 360000000000);

// 2) Exact source-qualified scenario match can be VALIDATED.
const b200 = getInferenceEconomicsEvidence("B200");
const exactEvidence = qualifyInferenceEconomicsEvidence(b200, {
  modelMatch: true,
  hardwareMatch: true,
  precisionMatch: true,
  workloadScenarioMatch: true,
});
const validated = calculateInferenceEconomics({
  attributableTcoUsd: 1000000,
  throughputTokPerSec: b200.throughputTokPerSec,
  throughputUtilization: 0.5,
  activeHoursPerDay: 8,
  activeDaysPerYear: 250,
  horizonYears: 3,
  evidence: exactEvidence,
});
assert.equal(validated.ok, true);
assert.equal(validated.status, INFERENCE_ECONOMICS_STATUS.VALIDATED);
assert.ok(validated.costPerMillionTokens > 0);

// 3) MLPerf Offline reused for an interactive workload must remain MODELED.
const modeledEvidence = qualifyInferenceEconomicsEvidence(b200, {
  modelMatch: true,
  hardwareMatch: true,
  precisionMatch: true,
  workloadScenarioMatch: false,
});
const modeled = calculateInferenceEconomics({
  attributableTcoUsd: 1000000,
  throughputTokPerSec: b200.throughputTokPerSec,
  throughputUtilization: 0.5,
  activeHoursPerDay: 8,
  activeDaysPerYear: 250,
  horizonYears: 3,
  evidence: modeledEvidence,
});
assert.equal(modeled.ok, true);
assert.equal(modeled.status, INFERENCE_ECONOMICS_STATUS.MODELED);


// 3b) Evidence adjustment factors must change usable throughput and economics,
// not exist as audit-only metadata.
const adjustedEvidence = qualifyInferenceEconomicsEvidence(b200, {
  modelMatch: false,
  hardwareMatch: true,
  precisionMatch: false,
  workloadScenarioMatch: false,
  adjustmentFactor: 0.5,
  adjustmentBasis: "Preview guardrail test",
});
const adjusted = calculateInferenceEconomics({
  attributableTcoUsd: 1000000,
  throughputTokPerSec: b200.throughputTokPerSec,
  throughputUtilization: 0.5,
  activeHoursPerDay: 8,
  activeDaysPerYear: 250,
  horizonYears: 3,
  evidence: adjustedEvidence,
});
assert.equal(adjusted.ok, true);
assert.equal(adjusted.status, INFERENCE_ECONOMICS_STATUS.MODELED);
assert.equal(
  adjusted.productionAssumptions.throughputTokPerSec,
  b200.throughputTokPerSec * 0.5,
);
assert.equal(adjusted.productionAssumptions.evidenceAdjustmentFactor, 0.5);
assert.ok(adjusted.costPerMillionTokens > modeled.costPerMillionTokens);

// 4) Missing qualified evidence must suppress the result.
const blocked = calculateInferenceEconomics({
  attributableTcoUsd: 1000000,
  throughputTokPerSec: 100000,
  throughputUtilization: 0.5,
  activeHoursPerDay: 8,
  activeDaysPerYear: 250,
  horizonYears: 3,
  evidence: null,
});
assert.equal(blocked.ok, false);
assert.equal(blocked.status, INFERENCE_ECONOMICS_STATUS.INSUFFICIENT_EVIDENCE);

// 5) Managed API comparison requires an explicit token mix.
const api = calculateManagedApiBlendedCost({
  inputUsdPerMillion: 2,
  outputUsdPerMillion: 10,
  inputShare: 0.8,
  outputShare: 0.2,
});
assert.equal(api.ok, true);
assert.equal(api.blendedUsdPerMillion, 3.6);

const badMix = calculateManagedApiBlendedCost({
  inputUsdPerMillion: 2,
  outputUsdPerMillion: 10,
  inputShare: 0.8,
  outputShare: 0.3,
});
assert.equal(badMix.ok, false);


// 6) IE-2 must consume the same model + precision methodology as GPU Sizing.
// B200 FP8 = 0.5x of its FP4 benchmark anchor after M3. A 140B-active model
// adds a separate 0.5x model penalty vs the 70B reference.
const modeled140B = {
  id: "ie2-test-140b",
  label: "IE2 Test 140B",
  activeParamsB: 140,
  status: "VERIFIED",
};
const integrated = deriveInferenceEconomicsThroughput({
  hardwareClass: "B200",
  deployedGpuCount: 8,
  quant: "FP8",
  model: modeled140B,
});
assert.equal(integrated.ok, true);
assert.equal(integrated.modelScale.factor, 0.5);
assert.equal(integrated.precisionScale.factor, 0.5);
assert.equal(integrated.deploymentScale, 1);
assert.equal(integrated.evidence.adjustmentFactor, 0.25);
assert.equal(
  integrated.effectiveThroughputTokPerSec,
  integrated.sourceThroughputTokPerSec * 0.25,
);

const integratedEconomics = calculateInferenceEconomics({
  attributableTcoUsd: 1000000,
  ...integrated.economicsInput,
  throughputUtilization: 0.5,
  activeHoursPerDay: 8,
  activeDaysPerYear: 250,
  horizonYears: 3,
});
assert.equal(integratedEconomics.ok, true);
assert.equal(
  integratedEconomics.productionAssumptions.throughputTokPerSec,
  integrated.effectiveThroughputTokPerSec,
);

// 7) Whole benchmark-sized replica groups are supported when one group can
// host the selected model. This is replica aggregation, not model-parallel scaling.
const exact8 = deriveInferenceEconomicsThroughput({
  hardwareClass: "B200",
  deployedGpuCount: 8,
  quant: "FP4",
  model: {
    id: "llama2-70b-reference",
    label: "Llama 2 70B",
    activeParamsB: 70,
    totalParamsB: 70,
    status: "VERIFIED",
  },
});
const scaled16 = deriveInferenceEconomicsThroughput({
  hardwareClass: "B200",
  deployedGpuCount: 16,
  quant: "FP4",
  model: {
    id: "llama2-70b-reference",
    label: "Llama 2 70B",
    activeParamsB: 70,
    totalParamsB: 70,
    status: "VERIFIED",
  },
});
assert.equal(exact8.ok, true);
assert.equal(scaled16.ok, true);
assert.equal(scaled16.deploymentEvidenceBasis, "REPLICA_SCALED");
assert.equal(scaled16.replicaGroupCount, 2);
assert.equal(scaled16.effectiveThroughputTokPerSec, exact8.effectiveThroughputTokPerSec * 2);


// 7b) F1 residency guardrail: a model whose weights alone exceed aggregate HBM
// must be suppressed before benchmark throughput is credited. This is a
// necessary-condition check only; full workload memory remains GPU Sizing's job.
const deepSeekV4Pro = getModelById("deepseek-v4-pro-0813");
const impossibleResidency = deriveInferenceEconomicsThroughput({
  hardwareClass: "B200",
  deployedGpuCount: 8,
  quant: "FP8",
  model: deepSeekV4Pro,
});
assert.equal(impossibleResidency.ok, false);
assert.equal(impossibleResidency.reason, "MODEL_DOES_NOT_FIT_BENCHMARK_CONFIG");
assert.equal(impossibleResidency.weightMemoryGB, 1650);
assert.equal(impossibleResidency.aggregateMemoryGB, 1440);
// 7c) Cross-tool classification distinguishes aggregate replica capacity from
// per-instance topology requirements without using fleet-wide concurrency as
// a proxy for model-parallel need.
const replicaClassification = classifyInferenceScaleout({
  hardwareClass: "B200",
  weightMemoryGB: 70.6,
  sequenceMemoryGB: 4,
  overheadPct: 0.2,
});
assert.equal(
  replicaClassification.classification,
  INFERENCE_SCALEOUT_CLASSIFICATION.REPLICA_CAPACITY_SCALEOUT
);

const topologyClassification = classifyInferenceScaleout({
  hardwareClass: "B200",
  weightMemoryGB: 1500,
  sequenceMemoryGB: 10,
  overheadPct: 0.1,
});
assert.equal(
  topologyClassification.classification,
  INFERENCE_SCALEOUT_CLASSIFICATION.TOPOLOGY_SCALEOUT_REQUIRED
);
assert.ok(
  topologyClassification.minimumServingInstanceMemoryGB >
    topologyClassification.benchmarkGroupMemoryGB
);


// Do not import hidden GPU-Sizing workload assumptions into standalone Guided.
// Mistral Large 3 weights fit within 8xB200 HBM at FP8, so residency alone must
// not suppress it; any larger requirement belongs to a full GPU Sizing run.
const mistralLarge3 = getModelById("mistral-large-3");
const residencyNecessaryConditionPasses = deriveInferenceEconomicsThroughput({
  hardwareClass: "B200",
  deployedGpuCount: 8,
  quant: "FP8",
  model: mistralLarge3,
});
assert.equal(residencyNecessaryConditionPasses.ok, true);
assert.equal(residencyNecessaryConditionPasses.hardwareClass, "B200");
assert.equal(residencyNecessaryConditionPasses.deployedGpuCount, 8);

// H200 currently has qualified evidence only at FP8; unsupported precision must
// be suppressed rather than silently reusing the FP8 anchor.
const unsupportedH200Precision = deriveInferenceEconomicsThroughput({
  hardwareClass: "H200",
  deployedGpuCount: 8,
  quant: "FP16",
  model: modeled140B,
});
assert.equal(unsupportedH200Precision.ok, false);
assert.equal(unsupportedH200Precision.reason, "UNSUPPORTED_PRECISION");

// 8) Unsupported hardware remains suppressed rather than guessed.
const unsupported = deriveInferenceEconomicsThroughput({
  hardwareClass: "DGX Rubin NVL8",
  deployedGpuCount: 8,
  quant: "FP8",
  model: modeled140B,
});
assert.equal(unsupported.ok, false);
assert.equal(unsupported.reason, "INSUFFICIENT_EVIDENCE");


// 9) Measured demand, not theoretical capacity, defines useful output tokens.
const measuredDemand = calculateAnnualOutputTokenDemand({
  basis: OUTPUT_TOKEN_DEMAND_BASIS.MEASURED_MONTHLY,
  measuredMonthlyOutputTokens: 1_000_000_000,
  activeDaysPerYear: 365,
});
assert.equal(measuredDemand.ok, true);
assert.equal(measuredDemand.annualOutputTokens, 12_000_000_000);
assert.equal(measuredDemand.provenance, "MEASURED");

// 10) Request forecasting derives output-token demand explicitly.
const forecastDemand = calculateAnnualOutputTokenDemand({
  basis: OUTPUT_TOKEN_DEMAND_BASIS.REQUEST_FORECAST,
  requestsPerDay: 100_000,
  averageOutputTokensPerRequest: 500,
  averageInputTokensPerRequest: 2_000,
  activeDaysPerYear: 250,
});
assert.equal(forecastDemand.ok, true);
assert.equal(forecastDemand.annualOutputTokens, 12_500_000_000);
assert.equal(forecastDemand.assumptions.averageInputTokensPerRequest, 2_000);

// 11) Production-serving factor is mandatory; no silent Offline -> Server default.
const missingServingFactor = calculateAnnualServingCapacity({
  effectiveOutputThroughputTokPerSec: 10_000,
  activeHoursPerDay: 8,
  activeDaysPerYear: 250,
});
assert.equal(missingServingFactor.ok, false);

const servingCapacity = calculateAnnualServingCapacity({
  effectiveOutputThroughputTokPerSec: 10_000,
  productionServingFactor: 0.6,
  activeHoursPerDay: 8,
  activeDaysPerYear: 250,
});
assert.equal(servingCapacity.ok, true);
assert.equal(servingCapacity.productionOutputTokPerSec, 6_000);
assert.equal(servingCapacity.annualCapacityOutputTokens, 43_200_000_000);

// 12) Idle capacity stays idle: denominator is demand, not maximum capacity.
const demandBound = calculateDemandBoundInferenceEconomics({
  attributableTcoUsd: 1_200_000,
  horizonYears: 3,
  demand: measuredDemand,
  servingCapacity,
  evidenceStatus: "MODELED",
});
assert.equal(demandBound.ok, true);
assert.equal(demandBound.horizonUsefulOutputTokens, 36_000_000_000);
assert.equal(demandBound.costPerMillionOutputTokens, (1_200_000 / 36_000_000_000) * 1_000_000);
assert.ok(demandBound.annualUnusedCapacityTokens > 0);

// 12b) Growth-aware denominator: useful demand grows across the horizon rather
// than staying flat when TCO carries an annual workload-growth assumption.
const growthAware = calculateDemandBoundInferenceEconomics({
  attributableTcoUsd: 1_200_000,
  horizonYears: 3,
  demand: measuredDemand,
  servingCapacity,
  demandGrowthRate: 0.25,
  evidenceStatus: "MODELED",
});
assert.equal(growthAware.ok, true);
assert.deepEqual(growthAware.demandByYear, [
  12_000_000_000,
  15_000_000_000,
  18_750_000_000,
]);
assert.equal(growthAware.horizonUsefulOutputTokens, 45_750_000_000);
assert.equal(growthAware.finalYearDemandOutputTokens, 18_750_000_000);
assert.equal(growthAware.demandGrowthRate, 0.25);
assert.equal(
  growthAware.costPerMillionOutputTokens,
  (1_200_000 / 45_750_000_000) * 1_000_000,
);

// 12c) Growth is allowed only while peak demand stays inside the one-system
// benchmark-supported serving capacity. No extra throughput is inferred.
const growthExceedsSupportedCapacity = calculateDemandBoundInferenceEconomics({
  attributableTcoUsd: 2_000_000,
  horizonYears: 3,
  demand: {
    ...measuredDemand,
    annualOutputTokens: 30_000_000_000,
  },
  servingCapacity,
  demandGrowthRate: 0.25,
  evidenceStatus: "MODELED",
});
assert.equal(growthExceedsSupportedCapacity.ok, false);
assert.equal(growthExceedsSupportedCapacity.reason, "UNDERSIZED_FOR_DEMAND");
assert.equal(growthExceedsSupportedCapacity.costPerMillionOutputTokens, null);
assert.ok(growthExceedsSupportedCapacity.annualShortfallTokens > 0);

// 12d) F4: non-integer horizons must be rejected rather than silently floored.
const fractionalPrivateHorizon = calculateDemandBoundInferenceEconomics({
  attributableTcoUsd: 1_200_000,
  horizonYears: 2.5,
  demand: measuredDemand,
  servingCapacity,
  evidenceStatus: "MODELED",
});
assert.equal(fractionalPrivateHorizon.ok, false);
assert.ok(fractionalPrivateHorizon.errors.includes("horizonYears must be a whole number of years."));

const fractionalApiHorizon = calculateManagedApiWorkloadEconomics({
  annualOutputTokens: 12_000_000_000,
  horizonYears: 2.5,
  demandGrowthRate: 0,
  inputTokensPerOutputToken: 0.70 / 0.30,
  cachedInputShare: 0,
  rate: {
    inputUsdPerMillion: 5,
    outputUsdPerMillion: 25,
  },
});
assert.equal(fractionalApiHorizon.ok, false);
assert.ok(fractionalApiHorizon.errors.includes("horizonYears must be a whole number of years."));

// 12e) F8: negative demand growth is rejected consistently on both private and API sides.
const negativePrivateGrowth = calculateDemandBoundInferenceEconomics({
  attributableTcoUsd: 1_200_000,
  horizonYears: 3,
  demand: measuredDemand,
  servingCapacity,
  demandGrowthRate: -0.1,
  evidenceStatus: "MODELED",
});
assert.equal(negativePrivateGrowth.ok, false);
assert.ok(negativePrivateGrowth.errors.includes("demandGrowthRate must be >= 0."));

const negativeApiGrowth = calculateManagedApiWorkloadEconomics({
  annualOutputTokens: 12_000_000_000,
  horizonYears: 3,
  demandGrowthRate: -0.1,
  inputTokensPerOutputToken: 0.70 / 0.30,
  cachedInputShare: 0,
  rate: {
    inputUsdPerMillion: 5,
    outputUsdPerMillion: 25,
  },
});
assert.equal(negativeApiGrowth.ok, false);
assert.ok(negativeApiGrowth.errors.includes("demandGrowthRate must be >= 0."));

// 13) An undersized design must not win with an artificially cheap token cost.
const tooSmallCapacity = calculateAnnualServingCapacity({
  effectiveOutputThroughputTokPerSec: 1_000,
  productionServingFactor: 0.5,
  activeHoursPerDay: 8,
  activeDaysPerYear: 250,
});
const undersized = calculateDemandBoundInferenceEconomics({
  attributableTcoUsd: 100_000,
  horizonYears: 3,
  demand: measuredDemand,
  servingCapacity: tooSmallCapacity,
  evidenceStatus: "MODELED",
});
assert.equal(undersized.ok, false);
assert.equal(undersized.reason, "UNDERSIZED_FOR_DEMAND");
assert.equal(undersized.costPerMillionOutputTokens, null);
assert.ok(undersized.annualShortfallTokens > 0);

console.log("Inference economics preview serving methodology verified.");
