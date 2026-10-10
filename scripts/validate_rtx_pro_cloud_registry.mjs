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
  assert.equal(provider.customerFacingRateReady, false, `${providerName} must remain non-customer-facing during Phase 4A.`);
  assert.ok(provider.shapeSourceUrl?.startsWith("https://"), `${providerName} must preserve an official shape evidence URL.`);
  assert.ok(provider.gpuModel.includes("RTX PRO 6000"), `${providerName} must identify the RTX PRO 6000 GPU family.`);
  assert.ok(provider.activationBlocker, `${providerName} must state what remains before client-facing activation.`);
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

assert.equal(getRtxProCloudShape("Google Cloud", 1).hourlyUsd, 4.49993);
assert.equal(getRtxProCloudShape("Google Cloud", 2).hourlyUsd, 8.99986);
assert.equal(getRtxProCloudShape("Google Cloud", 4).hourlyUsd, 17.99972);
assert.equal(getRtxProCloudShape("Google Cloud", 8).hourlyUsd, 35.99944);
const gcp2 = getRtxProCloudComparisonPlan("Google Cloud", 2);
assert.equal(gcp2.rateEvidence, "FIRST_PARTY_RATE");
assert.equal(gcp2.monthlyUsd, 8.99986 * 730);

const oracle8 = getRtxProCloudShape("Oracle Cloud", 8);
assert.equal(oracle8.hourlyUsd, null);
assert.equal(oracle8.rateEvidence, "RATE_CONFLICT");
assert.equal(oracle8.priorPerGpuHourlyUsd, 5.8977);
assert.equal(oracle8.priorDerivedShapeHourlyUsd, 47.1816);
assert.equal(oracle8.observedPublicCatalogShapeHourlyUsd, 36.0);
const oraclePlan = getRtxProCloudComparisonPlan("Oracle Cloud", 8);
assert.equal(oraclePlan.status, "RATE_NOT_READY");
assert.equal(oraclePlan.customerFacingRateReady, false);

for (const provider of ["AWS", "Azure", "Google Cloud"]) {
  for (const gpuCount of [2, 4, 8]) {
    const plan = getRtxProCloudComparisonPlan(provider, gpuCount);
    assert.equal(plan.status, "READY_FOR_ENGINEERING_COMPARISON", `${provider} ${gpuCount}-GPU normalization should be engineering-ready.`);
    assert.ok(Number.isFinite(plan.hourlyUsd) && plan.hourlyUsd > 0, `${provider} ${gpuCount}-GPU normalized hourly cost must be positive.`);
    assert.equal(plan.customerFacingRateReady, false, `${provider} ${gpuCount}-GPU rate must remain gated from customer-facing math in Phase 4A.`);
  }
}

console.log("RTX PRO cloud registry Phase 4A PASS");
console.log("- AWS 1/2/4/8 G7e shapes normalized to us-east-1 Linux On-Demand engineering rate snapshots");
console.log("- Azure 2/4/8 equivalents normalize through explicit 2-GPU VM composition");
console.log("- Google Cloud 1/2/4/8 G4 whole-VM first-party rates remain the strongest evidence tier");
console.log("- Oracle remains blocked because current public rate evidence conflicts materially");
console.log("- no Phase 4A cloud rate is yet customer-facing");
