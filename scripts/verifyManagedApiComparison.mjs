import assert from "node:assert/strict";
import {
  BENCHLM_FUTURE_SOURCE,
  COMMERCIAL_USE_STATUS,
  MANAGED_API_SOURCE_TYPE,
  createManagedApiPricingSource,
  createManagedApiRateRecord,
} from "../src/managedApiPricingSource.js";
import {
  REFERENCE_BLEND_PROFILE,
  calculateManagedApiWorkloadEconomics,
  calculateReferenceBlendedRate,
  comparePrivateAndManagedApi,
} from "../src/managedApiComparison.js";
import {
  MANAGED_API_CUSTOM_PROVIDER,
  MANAGED_API_PRICING_SNAPSHOT,
  chooseLastKnownGoodPricingSnapshot,
  getManagedApiPricingFreshness,
  getManagedApiRate,
  listManagedApiModels,
  listManagedApiProviders,
  validateManagedApiPricingSnapshotMetadata,
} from "../src/managedApiPricingRegistry.js";

// 1) A first-party rate can be normalized into the shared contract.
const firstParty = createManagedApiRateRecord({
  sourceId: "provider-docs",
  sourceType: MANAGED_API_SOURCE_TYPE.FIRST_PARTY,
  provider: "Example AI",
  modelId: "example-model",
  modelLabel: "Example Model",
  inputUsdPerMillion: 2,
  outputUsdPerMillion: 10,
  cachedInputUsdPerMillion: 0.5,
  verifiedAt: "2026-09-18",
  sourceUrl: "https://example.com/pricing",
  commercialUseStatus: COMMERCIAL_USE_STATUS.NOT_APPLICABLE,
});
assert.equal(firstParty.ok, true);

// 1b) Published reference blends are explicit and cache-free.
const blend7030 = calculateReferenceBlendedRate({
  inputUsdPerMillion: 2,
  outputUsdPerMillion: 10,
  profile: REFERENCE_BLEND_PROFILE.INPUT_70_OUTPUT_30,
});
assert.equal(blend7030.ok, true);
assert.equal(blend7030.blendedUsdPerMillion, 4.4);
assert.equal(blend7030.inputShare, 0.70);
assert.equal(blend7030.outputShare, 0.30);
assert.equal(blend7030.cacheIncluded, false);

const blend7525 = calculateReferenceBlendedRate({
  inputUsdPerMillion: 2,
  outputUsdPerMillion: 10,
  profile: REFERENCE_BLEND_PROFILE.INPUT_75_OUTPUT_25,
});
assert.equal(blend7525.ok, true);
assert.equal(blend7525.blendedUsdPerMillion, 4);
assert.equal(blend7525.inputShare, 0.75);
assert.equal(blend7525.outputShare, 0.25);
assert.equal(blend7525.cacheIncluded, false);

// A cached-input rate is deliberately irrelevant to the reference blend.
const blendWithCacheIrrelevant = calculateReferenceBlendedRate({
  inputUsdPerMillion: firstParty.rate.inputUsdPerMillion,
  outputUsdPerMillion: firstParty.rate.outputUsdPerMillion,
  profile: "INPUT_70_OUTPUT_30",
});
assert.equal(blendWithCacheIrrelevant.blendedUsdPerMillion, 4.4);

// 2) Workload economics use full input + cached input + output billing, while
// normalizing the final comparison back to useful OUTPUT tokens.
const apiEconomics = calculateManagedApiWorkloadEconomics({
  annualOutputTokens: 24_000_000_000,
  horizonYears: 3,
  demandGrowthRate: 0.25,
  inputTokensPerOutputToken: 3,
  cachedInputShare: 0.4,
  rate: firstParty.rate,
});
assert.equal(apiEconomics.ok, true);
assert.equal(apiEconomics.annualRows.length, 3);
assert.equal(apiEconomics.annualRows[0].annualOutputTokens, 24_000_000_000);
assert.equal(apiEconomics.annualRows[1].annualOutputTokens, 30_000_000_000);
assert.equal(apiEconomics.annualRows[2].annualOutputTokens, 37_500_000_000);
assert.equal(apiEconomics.horizonOutputTokens, 91_500_000_000);
assert.equal(apiEconomics.horizonInputTokens, 274_500_000_000);

// Year 1:
// output = 24B * $10/M = $240,000
// input = 72B; 40% cached (28.8B * $0.50/M = $14,400),
// 60% uncached (43.2B * $2/M = $86,400)
// total = $340,800
assert.equal(apiEconomics.annualRows[0].totalApiCostUsd, 340_800);
assert.equal(
  apiEconomics.effectiveUsdPerMillionOutputTokens,
  apiEconomics.horizonApiCostUsd / 91_500_000_000 * 1_000_000
);

// 3) Cached workload cannot silently fall back when no cached rate exists.
const noCacheRate = createManagedApiRateRecord({
  sourceId: "provider-docs",
  sourceType: MANAGED_API_SOURCE_TYPE.FIRST_PARTY,
  provider: "Example AI",
  modelId: "no-cache",
  modelLabel: "No Cache Model",
  inputUsdPerMillion: 2,
  outputUsdPerMillion: 10,
});
assert.equal(noCacheRate.ok, true);
const cacheMissing = calculateManagedApiWorkloadEconomics({
  annualOutputTokens: 1_000_000_000,
  horizonYears: 1,
  inputTokensPerOutputToken: 2,
  cachedInputShare: 0.5,
  rate: noCacheRate.rate,
});
assert.equal(cacheMissing.ok, false);

// 3b) Missing or zero input/output ratio must not silently become output-only API economics.
const missingInputRatio = calculateManagedApiWorkloadEconomics({
  annualOutputTokens: 1_000_000_000,
  horizonYears: 1,
  inputTokensPerOutputToken: null,
  cachedInputShare: 0,
  rate: firstParty.rate,
});
assert.equal(missingInputRatio.ok, false);
assert.ok(missingInputRatio.errors.includes("inputTokensPerOutputToken must be > 0."));

const zeroInputRatio = calculateManagedApiWorkloadEconomics({
  annualOutputTokens: 1_000_000_000,
  horizonYears: 1,
  inputTokensPerOutputToken: 0,
  cachedInputShare: 0,
  rate: firstParty.rate,
});
assert.equal(zeroInputRatio.ok, false);

// 4) Comparison is descriptive only; engine returns deltas/ratios, not a winner.
const comparison = comparePrivateAndManagedApi({
  privateCostPerMillionOutputTokens: 20.17,
  managedApiEconomics: apiEconomics,
});
assert.equal(comparison.ok, true);
assert.equal(comparison.privateUsdPerMillionOutputTokens, 20.17);
assert.ok(Number.isFinite(comparison.managedApiMinusPrivateUsdPerMillionOutputTokens));
assert.ok(Number.isFinite(comparison.managedApiToPrivateCostRatio));

// 5) User overrides fit the same normalized record contract.
const userRate = createManagedApiRateRecord({
  sourceId: "customer-contract",
  sourceType: MANAGED_API_SOURCE_TYPE.USER_OVERRIDE,
  provider: "Customer Contract",
  modelId: "customer-model",
  modelLabel: "Customer negotiated rate",
  inputUsdPerMillion: 1.25,
  outputUsdPerMillion: 6.5,
  commercialUseStatus: COMMERCIAL_USE_STATUS.NOT_APPLICABLE,
});
assert.equal(userRate.ok, true);

// 6) Aggregator records require explicit commercial-use clearance.
const unresolvedAggregatorRecord = createManagedApiRateRecord({
  sourceId: "benchlm",
  sourceType: MANAGED_API_SOURCE_TYPE.AGGREGATOR,
  provider: "Example Provider",
  modelId: "example-model",
  modelLabel: "Example Model",
  inputUsdPerMillion: 2,
  outputUsdPerMillion: 10,
  commercialUseStatus: COMMERCIAL_USE_STATUS.UNRESOLVED,
});
assert.equal(unresolvedAggregatorRecord.ok, false);

// 7) BenchLM remains a future adapter slot only and cannot be activated.
assert.equal(BENCHLM_FUTURE_SOURCE.id, "benchlm");
assert.equal(BENCHLM_FUTURE_SOURCE.activationStatus, "HOLD");
assert.equal(BENCHLM_FUTURE_SOURCE.commercialUseStatus, COMMERCIAL_USE_STATUS.UNRESOLVED);

const blockedBenchLmSource = createManagedApiPricingSource({
  id: BENCHLM_FUTURE_SOURCE.id,
  label: BENCHLM_FUTURE_SOURCE.label,
  sourceType: BENCHLM_FUTURE_SOURCE.sourceType,
  commercialUseStatus: BENCHLM_FUTURE_SOURCE.commercialUseStatus,
  fetchRates: async () => ({ ok: true, rates: [] }),
});
const blocked = await blockedBenchLmSource.getRates();
assert.equal(blocked.ok, false);
assert.equal(blocked.reason, "COMMERCIAL_USE_UNRESOLVED");

// 8) IE-6.3 last-known-good pricing registry contract.
assert.ok(MANAGED_API_PRICING_SNAPSHOT.rates.length >= 4);
assert.deepEqual(listManagedApiProviders(), ["Anthropic", "Google", "OpenAI", "xAI"]);
assert.ok(listManagedApiModels("OpenAI").length >= 4);
assert.ok(listManagedApiModels("Anthropic").length >= 4);
assert.ok(listManagedApiModels("Google").length >= 4);
assert.ok(listManagedApiModels("xAI").length >= 3);
assert.equal(getManagedApiRate("OpenAI", "gpt-5.6-sol")?.inputUsdPerMillion, 4);
assert.equal(getManagedApiRate("OpenAI", "gpt-5.6-sol")?.outputUsdPerMillion, 20);
assert.equal(getManagedApiRate("OpenAI", "gpt-6-astra")?.cachedInputUsdPerMillion, 1);
assert.equal(getManagedApiRate("Anthropic", "claude-sonnet-5")?.cachedInputUsdPerMillion, 0.2);
assert.equal(getManagedApiRate("Anthropic", "claude-fable-5-1")?.outputUsdPerMillion, 50);
assert.equal(getManagedApiRate("Google", "gemini-3.8-flash")?.inputUsdPerMillion, 0.75);
assert.equal(getManagedApiRate("Google", "gemini-3.1-flash-lite")?.cachedInputUsdPerMillion, 0.025);
assert.equal(getManagedApiRate("xAI", "grok-4.3")?.outputUsdPerMillion, 2.5);
assert.equal(MANAGED_API_CUSTOM_PROVIDER, "CUSTOM");

const snapshotMetadata = validateManagedApiPricingSnapshotMetadata();
assert.equal(snapshotMetadata.ok, true);
assert.deepEqual(snapshotMetadata.errors, []);

const mismatchedSnapshotMetadata = validateManagedApiPricingSnapshotMetadata({
  ...MANAGED_API_PRICING_SNAPSHOT,
  snapshotId: "first-party-2026-09-19",
});
assert.equal(mismatchedSnapshotMetadata.ok, false);
assert.ok(mismatchedSnapshotMetadata.errors.includes("Pricing snapshotId date must match verifiedAt."));

const fallbackSnapshot = chooseLastKnownGoodPricingSnapshot({
  currentSnapshot: MANAGED_API_PRICING_SNAPSHOT,
  candidateSnapshot: { rates: [] },
  candidateValid: false,
});
assert.equal(fallbackSnapshot, MANAGED_API_PRICING_SNAPSHOT);

const validCandidate = { rates: [{ provider: "Example" }] };
assert.equal(
  chooseLastKnownGoodPricingSnapshot({
    currentSnapshot: MANAGED_API_PRICING_SNAPSHOT,
    candidateSnapshot: validCandidate,
    candidateValid: true,
  }),
  validCandidate,
);

const fresh = getManagedApiPricingFreshness({
  asOf: new Date("2026-09-20T00:00:00Z"),
});
assert.equal(fresh.status, "CURRENT");
assert.equal(fresh.stale, false);

const stale = getManagedApiPricingFreshness({
  asOf: new Date("2026-10-10T00:00:00Z"),
});
assert.equal(stale.status, "STALE");
assert.equal(stale.stale, true);

console.log("IE-6 managed API comparison foundation verified.");
