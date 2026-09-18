import {
  COMMERCIAL_USE_STATUS,
  MANAGED_API_SOURCE_TYPE,
  createManagedApiRateRecord,
} from "./managedApiPricingSource.js";

export const MANAGED_API_CUSTOM_PROVIDER = "CUSTOM";

const SNAPSHOT_METADATA = Object.freeze({
  snapshotId: "first-party-2026-09-18",
  lastSuccessfulRefreshAt: "2026-09-18T18:00:00-05:00",
  verifiedAt: "2026-09-18",
  staleAfterDays: 14,
  sourceStrategy: "FIRST_PARTY_SNAPSHOT",
});

const RAW_FIRST_PARTY_RATES = Object.freeze([
  Object.freeze({
    sourceId: "openai-model-docs",
    sourceType: MANAGED_API_SOURCE_TYPE.FIRST_PARTY,
    provider: "OpenAI",
    modelId: "gpt-5.6-sol",
    modelLabel: "GPT-5.6 Sol",
    inputUsdPerMillion: 4,
    cachedInputUsdPerMillion: 0.4,
    outputUsdPerMillion: 20,
    verifiedAt: "2026-09-18",
    sourceUrl: "https://developers.openai.com/api/docs/models/gpt-5.6-sol",
    provenanceNote: "Current public API token rates; promotional Sol pricing is time-limited per provider documentation.",
    commercialUseStatus: COMMERCIAL_USE_STATUS.NOT_APPLICABLE,
  }),
  Object.freeze({
    sourceId: "openai-model-docs",
    sourceType: MANAGED_API_SOURCE_TYPE.FIRST_PARTY,
    provider: "OpenAI",
    modelId: "gpt-5.6-terra",
    modelLabel: "GPT-5.6 Terra",
    inputUsdPerMillion: 2,
    cachedInputUsdPerMillion: 0.2,
    outputUsdPerMillion: 12,
    verifiedAt: "2026-09-18",
    sourceUrl: "https://developers.openai.com/api/docs/models/gpt-5.6-terra",
    provenanceNote: "Current public API token rates.",
    commercialUseStatus: COMMERCIAL_USE_STATUS.NOT_APPLICABLE,
  }),
  Object.freeze({
    sourceId: "openai-model-docs",
    sourceType: MANAGED_API_SOURCE_TYPE.FIRST_PARTY,
    provider: "OpenAI",
    modelId: "gpt-5.6-luna",
    modelLabel: "GPT-5.6 Luna",
    inputUsdPerMillion: 0.2,
    cachedInputUsdPerMillion: 0.02,
    outputUsdPerMillion: 1.2,
    verifiedAt: "2026-09-18",
    sourceUrl: "https://developers.openai.com/api/docs/models/gpt-5.6-luna",
    provenanceNote: "Current public API token rates.",
    commercialUseStatus: COMMERCIAL_USE_STATUS.NOT_APPLICABLE,
  }),
  Object.freeze({
    sourceId: "anthropic-first-party",
    sourceType: MANAGED_API_SOURCE_TYPE.FIRST_PARTY,
    provider: "Anthropic",
    modelId: "claude-sonnet-5",
    modelLabel: "Claude Sonnet 5",
    inputUsdPerMillion: 2,
    cachedInputUsdPerMillion: null,
    outputUsdPerMillion: 10,
    verifiedAt: "2026-09-18",
    sourceUrl: "https://www.anthropic.com/news/claude-sonnet-5",
    provenanceNote: "Current public API token rates. No cached-input rate is assumed in this snapshot.",
    commercialUseStatus: COMMERCIAL_USE_STATUS.NOT_APPLICABLE,
  }),
  Object.freeze({
    sourceId: "xai-pricing",
    sourceType: MANAGED_API_SOURCE_TYPE.FIRST_PARTY,
    provider: "xAI",
    modelId: "grok-4.6",
    modelLabel: "Grok 4.6",
    inputUsdPerMillion: 2,
    cachedInputUsdPerMillion: 0.5,
    outputUsdPerMillion: 6,
    verifiedAt: "2026-09-18",
    sourceUrl: "https://docs.x.ai/developers/pricing",
    provenanceNote: "Short-context public API token rates. Long-context pricing differs at >=200k tokens.",
    commercialUseStatus: COMMERCIAL_USE_STATUS.NOT_APPLICABLE,
  }),
]);

const normalizedRates = RAW_FIRST_PARTY_RATES.map((raw) => {
  const normalized = createManagedApiRateRecord(raw);
  if (!normalized.ok) {
    throw new Error(`Invalid managed API registry row ${raw.provider}/${raw.modelId}: ${normalized.errors.join(" ")}`);
  }
  return normalized.rate;
});

export const MANAGED_API_PRICING_SNAPSHOT = Object.freeze({
  ...SNAPSHOT_METADATA,
  rates: Object.freeze(normalizedRates),
});

export function listManagedApiProviders(snapshot = MANAGED_API_PRICING_SNAPSHOT) {
  return [...new Set(snapshot.rates.map((rate) => rate.provider))].sort((a, b) => a.localeCompare(b));
}

export function listManagedApiModels(provider, snapshot = MANAGED_API_PRICING_SNAPSHOT) {
  return snapshot.rates
    .filter((rate) => rate.provider === provider)
    .sort((a, b) => a.modelLabel.localeCompare(b.modelLabel));
}

export function getManagedApiRate(provider, modelId, snapshot = MANAGED_API_PRICING_SNAPSHOT) {
  return snapshot.rates.find((rate) => rate.provider === provider && rate.modelId === modelId) || null;
}

export function getManagedApiPricingFreshness({
  snapshot = MANAGED_API_PRICING_SNAPSHOT,
  asOf = new Date(),
} = {}) {
  const verified = new Date(`${snapshot.verifiedAt}T00:00:00Z`);
  const current = asOf instanceof Date ? asOf : new Date(asOf);
  if (Number.isNaN(verified.getTime()) || Number.isNaN(current.getTime())) {
    return { status: "UNKNOWN", ageDays: null, stale: true };
  }
  const ageDays = Math.max(0, Math.floor((current.getTime() - verified.getTime()) / 86_400_000));
  return {
    status: ageDays > snapshot.staleAfterDays ? "STALE" : "CURRENT",
    ageDays,
    stale: ageDays > snapshot.staleAfterDays,
    staleAfterDays: snapshot.staleAfterDays,
    verifiedAt: snapshot.verifiedAt,
    lastSuccessfulRefreshAt: snapshot.lastSuccessfulRefreshAt,
  };
}

// Future refresh adapters (BenchLM, first-party APIs/pages, admin workflow) should
// replace this snapshot only after a complete refresh validates successfully.
// A failed refresh must leave the last-known-good snapshot untouched.
export function chooseLastKnownGoodPricingSnapshot({
  currentSnapshot = MANAGED_API_PRICING_SNAPSHOT,
  candidateSnapshot,
  candidateValid,
}) {
  return candidateValid === true && candidateSnapshot?.rates?.length
    ? candidateSnapshot
    : currentSnapshot;
}
