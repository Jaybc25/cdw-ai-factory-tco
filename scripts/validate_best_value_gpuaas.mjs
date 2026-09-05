import { strict as assert } from "node:assert";
import { CLOUD_GPU_RATES, GPUAAS_PROVIDER_CONFIG } from "../src/pricingRegistry.js";
import { rankSameClassGpuAas, topGpuAasValues } from "../src/bestValueGpuaas.js";

const PROVIDERS = Object.keys(CLOUD_GPU_RATES);

function evaluateFromRate(_provider, rateInfo) {
  return {
    cloudTotal: rateInfo.od * 1000,
    monthlyCloudBaseline: rateInfo.od * 100,
  };
}

assert.deepEqual(PROVIDERS, ["AWS", "Azure", "Google Cloud", "Oracle Cloud"], "Customer-facing provider list should use clear enabled provider names");
assert.equal(GPUAAS_PROVIDER_CONFIG.CoreWeave.customerFacingEnabled, false, "CoreWeave must be hidden from customer-facing provider choices until commercially enabled");
assert.equal(GPUAAS_PROVIDER_CONFIG.CoreWeave.bestValueEnabled, false, "CoreWeave must remain disabled for Best-Value recommendations until commercially enabled");
assert.ok(CLOUD_GPU_RATES.CoreWeave?.H200, "CoreWeave modeling data should remain preserved internally for future re-enablement");
assert.strictEqual(CLOUD_GPU_RATES["Google Cloud"], CLOUD_GPU_RATES.GCP, "Google Cloud display name should resolve to the canonical GCP rate data");
assert.strictEqual(CLOUD_GPU_RATES["Oracle Cloud"], CLOUD_GPU_RATES.OCI, "Oracle Cloud display name should resolve to the canonical OCI rate data");

const h200 = rankSameClassGpuAas({
  gpuClass: "H200",
  providers: PROVIDERS,
  rateRegistry: CLOUD_GPU_RATES,
  evaluateProvider: evaluateFromRate,
});

assert.equal(h200.length, PROVIDERS.length, "Every customer-facing provider with an H200 row should be ranked");
assert.deepEqual(
  h200.map((row) => row.provider),
  ["AWS", "Oracle Cloud", "Azure", "Google Cloud"],
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
  evaluateProvider: evaluateFromRate,
});
assert.deepEqual(
  b300.map((row) => row.provider),
  ["Azure", "Google Cloud", "Oracle Cloud", "AWS"],
  "Tied lowest B300 rates should sort deterministically by provider name",
);
assert.equal(b300[0].confidence, "QUOTE", "Azure B300 must retain its QUOTE confidence");
assert.equal(b300.find((row) => row.provider === "Google Cloud")?.confidence, "QUOTE", "Google Cloud B300 must retain its QUOTE confidence");
assert.equal(b300.find((row) => row.provider === "Oracle Cloud")?.confidence, "LISTED", "Oracle Cloud B300 must retain its LISTED confidence");

const explicitDisabledCandidate = rankSameClassGpuAas({
  gpuClass: "H200",
  providers: ["CoreWeave", "AWS"],
  rateRegistry: CLOUD_GPU_RATES,
  evaluateProvider: evaluateFromRate,
});
assert.deepEqual(explicitDisabledCandidate.map((row) => row.provider), ["AWS"], "Ranking helper must reject an explicitly supplied but commercially disabled provider");

const missingClass = rankSameClassGpuAas({
  gpuClass: "DOES_NOT_EXIST",
  providers: PROVIDERS,
  rateRegistry: CLOUD_GPU_RATES,
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
console.log("- customer-facing providers are AWS, Azure, Google Cloud, Oracle Cloud");
console.log("- CoreWeave data is preserved but hidden and ineligible");
console.log("- ranks only the exact requested GPU class");
console.log("- never performs cross-class substitution");
console.log("- preserves pricing confidence/provenance");
console.log("- top-N output is deterministic");
