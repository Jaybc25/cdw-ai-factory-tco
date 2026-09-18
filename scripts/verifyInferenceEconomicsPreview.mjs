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

// 7) Scaling beyond the exact benchmark configuration is suppressed until
// qualified scaling-efficiency evidence is available.
const scaled16 = deriveInferenceEconomicsThroughput({
  hardwareClass: "B200",
  deployedGpuCount: 16,
  quant: "FP4",
  model: {
    id: "llama2-70b-reference",
    label: "Llama 2 70B",
    activeParamsB: 70,
    status: "VERIFIED",
  },
});
assert.equal(scaled16.ok, false);
assert.equal(scaled16.reason, "UNSUPPORTED_DEPLOYMENT_SCALING");

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
