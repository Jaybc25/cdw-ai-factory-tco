import assert from "node:assert/strict";
import { buildRtxProCloudComparison } from "../src/rtxProCloudComparison.js";

const lifecycle3y = Object.freeze({
  horizonYears: 3,
  oneTimeCapexUSD: 100000,
  recurringLifecycleUSD: 36000,
  totalTcoUSD: 136000,
});

const two = buildRtxProCloudComparison({ gpuCount: 2, onPremLifecycle: lifecycle3y });
assert.equal(two.status, "READY");
assert.equal(two.activeHoursPerMonth, 730);
assert.equal(two.providerComparisons.length, 4);
assert.equal(two.verifiedProviderComparisons.length, 1, "Only first-party normalized rates may drive customer recommendations in Phase 4B.");
assert.equal(two.verifiedProviderComparisons[0].provider, "Google Cloud");
assert.equal(two.customerRecommendation.status, "READY");
assert.equal(two.customerRecommendation.cloudProvider, "Google Cloud");
assert.equal(two.customerRecommendation.preferredPath, "ON_PREM");
assert.equal(two.customerRecommendation.crossoverMonth, 18);
assert.equal(two.customerRecommendation.crossoverWithinHorizonMonth, 18);

const gcp2 = two.providerComparisons.find((row) => row.provider === "Google Cloud");
assert.equal(gcp2.status, "READY_FOR_CUSTOMER_COMPARISON");
assert.equal(gcp2.hourlyUsd, 8.99986);
assert.ok(Math.abs(gcp2.monthlyCloudUSD - 6569.8978) < 0.000001);
assert.ok(Math.abs(gcp2.cloudHorizonUSD - 236516.3208) < 0.000001);
assert.ok(Math.abs(gcp2.savingsVsCloudUSD - 100516.3208) < 0.000001);
assert.equal(gcp2.cumulativeByYear.length, 3);
assert.ok(Math.abs(gcp2.cumulativeByYear[0].cloudUSD - 78838.7736) < 0.000001);
assert.equal(gcp2.cumulativeByYear[0].onPremUSD, 112000);

const aws2 = two.providerComparisons.find((row) => row.provider === "AWS");
assert.equal(aws2.status, "ENGINEERING_ONLY");
assert.equal(aws2.customerFacingRateReady, false);
assert.equal(aws2.recommendationEligible, false);
assert.equal(two.bestEngineeringCloud.provider, "AWS", "Engineering ranking may identify AWS, but it must not override the verified customer recommendation.");
assert.equal(two.bestVerifiedCloud.provider, "Google Cloud");

const azure2 = two.providerComparisons.find((row) => row.provider === "Azure");
assert.equal(azure2.status, "ENGINEERING_ONLY");
assert.equal(azure2.vmQuantity, 1);
assert.equal(azure2.composition, "DIRECT_SHAPE");

const oracle2 = two.providerComparisons.find((row) => row.provider === "Oracle Cloud");
assert.equal(oracle2.status, "UNAVAILABLE");

const eight = buildRtxProCloudComparison({ gpuCount: 8, onPremLifecycle: lifecycle3y });
const oracle8 = eight.providerComparisons.find((row) => row.provider === "Oracle Cloud");
assert.equal(oracle8.status, "ENGINEERING_ONLY");
assert.equal(oracle8.hourlyUsd, 47.1816);
assert.equal(oracle8.customerFacingRateReady, false);
const azure8 = eight.providerComparisons.find((row) => row.provider === "Azure");
assert.equal(azure8.vmQuantity, 4);
assert.equal(azure8.composition, "MULTI_VM_COMPOSITION");
assert.equal(azure8.hourlyUsd, 44);
assert.equal(eight.bestEngineeringCloud.provider, "AWS");
assert.equal(eight.customerRecommendation.cloudProvider, "Google Cloud");

const lowerRuntime = buildRtxProCloudComparison({ gpuCount: 2, onPremLifecycle: lifecycle3y, activeHoursPerMonth: 300 });
const lowerRuntimeGcp = lowerRuntime.providerComparisons.find((row) => row.provider === "Google Cloud");
assert.equal(lowerRuntimeGcp.preferredAtHorizon, "CLOUD");
assert.equal(lowerRuntimeGcp.crossoverWithinHorizonMonth, null);
assert.equal(lowerRuntime.customerRecommendation.preferredPath, "CLOUD");

assert.equal(buildRtxProCloudComparison({ gpuCount: 1, onPremLifecycle: lifecycle3y }).status, "UNSUPPORTED_GPU_COUNT");
assert.equal(buildRtxProCloudComparison({ gpuCount: 2, onPremLifecycle: null }).status, "ON_PREM_TCO_REQUIRED");
assert.equal(buildRtxProCloudComparison({ gpuCount: 2, onPremLifecycle: lifecycle3y, activeHoursPerMonth: 0 }).status, "ACTIVE_HOURS_INVALID");
assert.equal(buildRtxProCloudComparison({ gpuCount: 2, onPremLifecycle: lifecycle3y, maxCrossoverMonths: 12 }).status, "CROSSOVER_WINDOW_INVALID");

console.log("RTX PRO cloud comparison Phase 4B PASS");
console.log("- customer recommendation uses verified rates only");
console.log("- engineering ranking cannot silently promote AWS/Azure snapshots");
console.log("- cumulative monthly cash-flow crossover reconciles to the horizon totals");
console.log("- active cloud hours can change the preferred path without changing on-prem TCO");
console.log("- Azure multi-VM composition and Oracle evidence gating remain explicit");
