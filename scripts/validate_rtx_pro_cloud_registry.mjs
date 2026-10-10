import assert from "node:assert/strict";
import {
  RTX_PRO_CLOUD_EVIDENCE_AS_OF,
  RTX_PRO_CLOUD_HOURS_PER_MONTH,
  RTX_PRO_CLOUD_PROVIDERS,
  getRtxProCloudShape,
  getRtxProCloudComparisonPlan,
} from "../src/rtxProCloudRegistry.js";

assert.equal(RTX_PRO_CLOUD_EVIDENCE_AS_OF, "2026-10-10");
assert.equal(RTX_PRO_CLOUD_HOURS_PER_MONTH, 730);
assert.deepEqual(Object.keys(RTX_PRO_CLOUD_PROVIDERS), ["AWS", "Azure", "Google Cloud", "Oracle Cloud"]);

for (const [providerName, provider] of Object.entries(RTX_PRO_CLOUD_PROVIDERS)) {
  assert.ok(provider.shapeSourceUrl?.startsWith("https://"), `${providerName} must preserve an official shape evidence URL.`);
  assert.ok(provider.gpuModel.includes("RTX PRO 6000"), `${providerName} must identify the RTX PRO 6000 GPU family.`);
  if (!provider.customerFacingRateReady) assert.ok(provider.activationBlocker, `${providerName} must state what remains before client-facing activation.`);
}

assert.deepEqual(RTX_PRO_CLOUD_PROVIDERS.AWS.availableGpuCounts, [1, 2, 4, 8]);
assert.equal(getRtxProCloudShape("AWS", 2).sku, "g7e.12xlarge");
assert.equal(getRtxProCloudShape("AWS", 2).hourlyUsd, 8.2861);
const aws8 = getRtxProCloudComparisonPlan("AWS", 8);
assert.equal(aws8.status, "READY_FOR_ENGINEERING_COMPARISON");
assert.equal(aws8.composition, "DIRECT_SHAPE");
assert.equal(aws8.hourlyUsd, 33.1443);
assert.equal(aws8.customerFacingRateReady, false);

assert.deepEqual(RTX_PRO_CLOUD_PROVIDERS.Azure.availableGpuCounts, [0.25, 0.5, 1, 2]);
assert.equal(getRtxProCloudShape("Azure", 2).sku, "Standard_NC288ds_xl_RTXPRO6000BSE_v6");
assert.equal(getRtxProCloudShape("Azure", 2).hourlyUsd, 11.0);
const azure4 = getRtxProCloudComparisonPlan("Azure", 4);
assert.equal(azure4.status, "READY_FOR_ENGINEERING_COMPARISON");
assert.equal(azure4.composition, "MULTI_VM_COMPOSITION");
assert.equal(azure4.vmQuantity, 2);
assert.equal(azure4.gpusPerVm, 2);
assert.equal(azure4.hourlyUsd, 22.0);
const azure8 = getRtxProCloudComparisonPlan("Azure", 8);
assert.equal(azure8.vmQuantity, 4);
assert.equal(azure8.hourlyUsd, 44.0);
assert.equal(azure8.customerFacingRateReady, false);

assert.equal(getRtxProCloudShape("Google Cloud", 1).hourlyUsd, 4.49993);
assert.equal(getRtxProCloudShape("Google Cloud", 2).hourlyUsd, 8.99986);
assert.equal(getRtxProCloudShape("Google Cloud", 4).hourlyUsd, 17.99972);
assert.equal(getRtxProCloudShape("Google Cloud", 8).hourlyUsd, 35.99944);
const gcp2 = getRtxProCloudComparisonPlan("Google Cloud", 2);
assert.equal(gcp2.rateEvidence, "FIRST_PARTY_RATE");
assert.equal(gcp2.monthlyUsd, 8.99986 * 730);
assert.equal(gcp2.customerFacingRateReady, true);
assert.equal(RTX_PRO_CLOUD_PROVIDERS["Google Cloud"].activationBlocker, null);

const oracle8 = getRtxProCloudShape("Oracle Cloud", 8);
assert.equal(oracle8.hourlyUsd, 47.1816);
assert.equal(oracle8.perGpuHourlyUsd, 5.8977);
assert.equal(oracle8.rateEvidence, "FIRST_PARTY_RATE");
const oraclePlan = getRtxProCloudComparisonPlan("Oracle Cloud", 8);
assert.equal(oraclePlan.status, "READY_FOR_ENGINEERING_COMPARISON");
assert.equal(oraclePlan.hourlyUsd, 47.1816);
assert.equal(oraclePlan.customerFacingRateReady, false);
assert.match(oraclePlan.activationBlocker, /region\/currency/i);
assert.equal(getRtxProCloudComparisonPlan("Oracle Cloud", 2)?.status, "RATE_NOT_READY");

for (const provider of ["AWS", "Azure", "Google Cloud"]) {
  for (const gpuCount of [2, 4, 8]) {
    const plan = getRtxProCloudComparisonPlan(provider, gpuCount);
    assert.equal(plan.status, "READY_FOR_ENGINEERING_COMPARISON", `${provider} ${gpuCount}-GPU normalization should be engineering-ready.`);
    assert.ok(Number.isFinite(plan.hourlyUsd) && plan.hourlyUsd > 0, `${provider} ${gpuCount}-GPU normalized hourly cost must be positive.`);
  }
}

console.log("RTX PRO cloud registry Phase 4B PASS");
console.log("- AWS/Azure remain engineering-only pending first-party regional rate verification");
console.log("- Google Cloud G4 is customer-facing-ready on the normalized first-party basis");
console.log("- Oracle billing formula is resolved from first-party evidence but U.S. region/currency normalization remains gated");
console.log("- Azure 4/8-GPU equivalents remain explicit multi-VM compositions");
