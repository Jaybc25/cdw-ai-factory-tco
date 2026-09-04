import { strict as assert } from "node:assert";
import { CLOUD_GPU_RATES } from "../src/pricingRegistry.js";
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

const h200 = rankSameClassGpuAas({
  gpuClass: "H200",
  providers: PROVIDERS,
  rateRegistry: CLOUD_GPU_RATES,
  evaluateProvider: evaluateFromRate,
});

assert.equal(h200.length, PROVIDERS.length, "Every provider with an H200 row should be ranked");
assert.deepEqual(
  h200.map((row) => row.provider),
  ["CoreWeave", "AWS", "OCI", "Azure", "GCP"],
  "H200 ranking should follow modeled same-class cost",
);
assert.ok(h200.every((row) => row.gpuClass === "H200"), "v1 must never substitute GPU classes");
assert.equal(h200[0].confidence, "LISTED", "confidence provenance must survive ranking");
assert.equal(topGpuAasValues(h200, 3).length, 3, "Top-3 helper should return exactly three rows when available");

const b300 = rankSameClassGpuAas({
  gpuClass: "B300",
  providers: PROVIDERS,
  rateRegistry: CLOUD_GPU_RATES,
  evaluateProvider: evaluateFromRate,
});
assert.equal(b300[0].provider, "CoreWeave", "Lowest numeric B300 planning value should rank first");
assert.equal(b300[0].confidence, "QUOTE", "A low-cost QUOTE must remain visibly QUOTE, not look LISTED");

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
console.log("- ranks only the exact requested GPU class");
console.log("- never performs cross-class substitution");
console.log("- preserves pricing confidence/provenance");
console.log("- top-N output is deterministic");
