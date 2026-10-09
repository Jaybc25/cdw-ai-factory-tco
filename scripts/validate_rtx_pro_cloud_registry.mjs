import assert from "node:assert/strict";
import { RTX_PRO_CLOUD_EVIDENCE_AS_OF, RTX_PRO_CLOUD_PROVIDERS, getRtxProCloudShape } from "../src/rtxProCloudRegistry.js";

assert.equal(RTX_PRO_CLOUD_EVIDENCE_AS_OF, "2026-10-09");
assert.deepEqual(Object.keys(RTX_PRO_CLOUD_PROVIDERS), ["AWS", "Azure", "Google Cloud", "Oracle Cloud"]);

for (const [providerName, provider] of Object.entries(RTX_PRO_CLOUD_PROVIDERS)) {
  assert.equal(provider.customerFacingRateReady, false, `${providerName} must remain non-customer-facing during Phase 1.`);
  assert.ok(provider.sourceUrl?.startsWith("https://"), `${providerName} must preserve an official evidence URL.`);
  assert.ok(provider.gpuModel.includes("RTX PRO 6000"), `${providerName} must identify the RTX PRO 6000 GPU family.`);
}

assert.deepEqual(RTX_PRO_CLOUD_PROVIDERS.AWS.availableGpuCounts, [1, 2, 4, 8]);
assert.equal(getRtxProCloudShape("AWS", 2).sku, "g7e.12xlarge");
assert.equal(getRtxProCloudShape("AWS", 2).hourlyUsd, null, "AWS EC2 rate must remain unresolved until exact On-Demand normalization is verified.");

assert.deepEqual(RTX_PRO_CLOUD_PROVIDERS.Azure.availableGpuCounts, [0.25, 0.5, 1, 2]);
assert.equal(getRtxProCloudShape("Azure", 2).sku, "Standard_NC288ds_xl_RTXPRO6000BSE_v6");
assert.equal(getRtxProCloudShape("Azure", 2).hourlyUsd, null, "Azure rate must remain unresolved until GA Pay-As-You-Go normalization is verified.");

assert.equal(getRtxProCloudShape("Google Cloud", 1).hourlyUsd, 4.49993);
assert.equal(getRtxProCloudShape("Google Cloud", 2).hourlyUsd, 8.99986);
assert.equal(getRtxProCloudShape("Google Cloud", 4).hourlyUsd, 17.99972);
assert.equal(getRtxProCloudShape("Google Cloud", 8).hourlyUsd, 35.99944);

const oracle8 = getRtxProCloudShape("Oracle Cloud", 8);
assert.equal(oracle8.perGpuHourlyUsd, 5.8977);
assert.equal(oracle8.derivedShapeHourlyUsd, 47.1816);
assert.equal(getRtxProCloudShape("Oracle Cloud", 2), null, "OCI must not fabricate a smaller direct RTX PRO shape.");

console.log("RTX PRO cloud registry PASS");
console.log("- AWS/Azure shapes are staged with numeric rates intentionally unresolved");
console.log("- Google Cloud public G4 whole-VM rates are staged but not activated");
console.log("- Oracle 8-GPU public rate basis is staged with billing-basis validation pending");
console.log("- no staged provider can become customer-facing during Phase 1");
