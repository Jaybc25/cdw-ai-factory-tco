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

console.log("Inference economics preview foundation verified.");
