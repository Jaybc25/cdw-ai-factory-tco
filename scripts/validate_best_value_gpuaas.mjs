import { strict as assert } from "node:assert";
import { CLOUD_GPU_RATES, GPUAAS_PROVIDER_CONFIG } from "../src/pricingRegistry.js";
import { rankSameClassGpuAas, topGpuAasValues } from "../src/bestValueGpuaas.js";

const PROVIDERS = Object.keys(CLOUD_GPU_RATES);

function evaluateFromRate(_provider, rateInfo) {
  // Deterministic harness only: production integration will call the existing
  // TCO engine. This validator checks ranking/eligibility/confidence behavior,
  // not TCO arithmetic.
  return {
    cloudTotal: rateInfo.od * 1000,
    monthlyCloudBaseline: rateInfo.od * 100,
  };
}

assert.deepEqual(PROVIDERS, ["AWS", "Azure", "GCP", "OCI"], "Customer-facing provider list should contain only commercially enabled providers");
assert.equal(GPUAAS_PROVIDER_CONFIG.CoreWeave.bestValueEnabled, false, "CoreWeave must remain disabled for Best-Value recommendations until commercially enabled");
assert.ok(CLOUD_GPU_RATES.CoreWeave?.H200, "CoreWeave modeling data should remain preserved internally for future re-enablement");

const h200 = rankSameClassGpuAas({
  gpuClass: "H200",
  providers: PROVIDERS,
  rateRegistry: CLOUD_GPU_RATES,
  providerConfig: GPUAAS_PROVIDER_CONFIG,
  evaluateProvider: evaluateFromRate,
});

assert.equal(h200.length, PROVIDERS.length, "Every customer-facing provider with an H200 row should be ranked");
assert.deepEqual(
  h200.map((row) => row.provider),
  ["AWS", "OCI", "Azure", "GCP"],
  "H200 ranking should follow modeled same-class cost among commercially enabled providers",
);
assert.ok(!h200.some((row) => row.provider === "CoreWeave"), "Commercially disabled providers must not enter Best-Value rankings");
assert.ok(h200.every((row) => row.gpuClass === "H200"), "v1 must never substitute GPU classes");
assert.equal(h200[0].confidence, "LISTED", "confidence provenance must survive ranking");
assert.equal(topGpuAasValues(h200, 3).length, 3, "Top-3 helper should return exactly three rows when available");

const b300 = rankSameClassGpuAas({
  gpuClass: "B300",
  providers: PROVIDERS,
  rateRegistry: CLOUD_GPU_RATES,
  providerConfig: GPUAAS_PROVIDER_CONFIG,
  evaluateProvider: evaluateFromRate,
});
assert.equal(b300[0].provider, "OCI", "Lowest eligible numeric B300 value should rank first");
assert.equal(b300[0].confidence, "LISTED", "pricing confidence must remain visible after eligibility filtering");

const explicitDisabledCandidate = rankSameClassGpuAas({
  gpuClass: "H200",
  providers: ["CoreWeave", "AWS"],
  rateRegistry: CLOUD_GPU_RATES,
  providerConfig: GPUAAS_PROVIDER_CONFIG,
  evaluateProvider: evaluateFromRate,
});
assert.deepEqual(explicitDisabledCandidate.map((row) => row.provider), ["AWS"], "Ranking helper must reject an explicitly supplied but commercially disabled provider");

const missingClass = rankSameClassGpuAas({
  gpuClass: "DOES_NOT_EXIST",
  providers: PROVIDERS,
  rateRegistry: CLOUD_GPU_RATES,
  providerConfig: GPUAAS_PROVIDER_CONFIG,
  evaluateProvider: evaluateFromRate,
});
assert.deepEqual(missingClass, [], "Missing exact class must yield no candidates, never cross-class fallback");

const tieRegistry = {
  B: { H200: { od: 5, conf: "EST" } },
  A: { H200: { od: 5, conf: "LISTED" } },
};
const tie = rankSameClassGpuAas({
  gpuClass: "H200",
  providers: ["B", "A"],
  rateRegistry: tieRegistry,
  evaluateProvider: evaluateFromRate,
});
assert.deepEqual(tie.map((row) => row.provider), ["A", "B"], "Equal modeled costs should sort deterministically by provider name");

console.log("Best-Value GPUaaS v1 validator: PASS");
console.log("- ranks only the exact requested GPU class");
console.log("- excludes commercially disabled providers without deleting their modeling data");
console.log("- never performs cross-class substitution");
console.log("- preserves pricing confidence/provenance");
console.log("- top-N output is deterministic");
