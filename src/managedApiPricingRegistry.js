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
  // OpenAI — current standard text-token API pricing.
  Object.freeze({
    sourceId: "openai-model-docs",
    sourceType: MANAGED_API_SOURCE_TYPE.FIRST_PARTY,
    provider: "OpenAI",
    modelId: "gpt-6-astra",
    modelLabel: "GPT-6 Astra",
    inputUsdPerMillion: 10,
    cachedInputUsdPerMillion: 1,
    outputUsdPerMillion: 50,
    verifiedAt: "2026-09-18",
    sourceUrl: "https://developers.openai.com/api/docs/models/compare",
    provenanceNote: "Current short-context public API rates. Long-context pricing differs above the provider threshold.",
    commercialUseStatus: COMMERCIAL_USE_STATUS.NOT_APPLICABLE,
  }),
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
    provenanceNote: "Current short-context public API rates. Sol promotional pricing is time-limited; long-context pricing differs above 272k input tokens.",
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
    provenanceNote: "Current short-context public API rates. Long-context pricing differs above 272k input tokens.",
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
    provenanceNote: "Current short-context public API rates. Long-context pricing differs above 272k input tokens.",
    commercialUseStatus: COMMERCIAL_USE_STATUS.NOT_APPLICABLE,
  }),

  // Anthropic — Claude API global standard pricing.
  Object.freeze({
    sourceId: "anthropic-platform-pricing",
    sourceType: MANAGED_API_SOURCE_TYPE.FIRST_PARTY,
    provider: "Anthropic",
    modelId: "claude-fable-5-1",
    modelLabel: "Claude Fable 5.1",
    inputUsdPerMillion: 10,
    cachedInputUsdPerMillion: 0.25,
    outputUsdPerMillion: 50,
    verifiedAt: "2026-09-18",
    sourceUrl: "https://platform.claude.com/docs/en/models/fable-5-1/overview",
    provenanceNote: "Claude API global standard rates. Cached-input value is the provider's cache-read/hit rate; cache-write charges are not modeled here.",
    commercialUseStatus: COMMERCIAL_USE_STATUS.NOT_APPLICABLE,
  }),
  Object.freeze({
    sourceId: "anthropic-platform-pricing",
    sourceType: MANAGED_API_SOURCE_TYPE.FIRST_PARTY,
    provider: "Anthropic",
    modelId: "claude-opus-5",
    modelLabel: "Claude Opus 5",
    inputUsdPerMillion: 5,
    cachedInputUsdPerMillion: 0.5,
    outputUsdPerMillion: 25,
    verifiedAt: "2026-09-18",
    sourceUrl: "https://platform.claude.com/docs/en/about-claude/pricing",
    provenanceNote: "Claude API global standard rates. US-only inference and Fast mode use higher rates; cache-write charges are not modeled here.",
    commercialUseStatus: COMMERCIAL_USE_STATUS.NOT_APPLICABLE,
  }),
  Object.freeze({
    sourceId: "anthropic-platform-pricing",
    sourceType: MANAGED_API_SOURCE_TYPE.FIRST_PARTY,
    provider: "Anthropic",
    modelId: "claude-sonnet-5",
    modelLabel: "Claude Sonnet 5",
    inputUsdPerMillion: 2,
    cachedInputUsdPerMillion: 0.2,
    outputUsdPerMillion: 10,
    verifiedAt: "2026-09-18",
    sourceUrl: "https://platform.claude.com/docs/en/about-claude/pricing",
    provenanceNote: "Claude API global standard rates. Sonnet 5's $2/$10 pricing is now permanent; cache-write charges are not modeled here.",
    commercialUseStatus: COMMERCIAL_USE_STATUS.NOT_APPLICABLE,
  }),
  Object.freeze({
    sourceId: "anthropic-platform-pricing",
    sourceType: MANAGED_API_SOURCE_TYPE.FIRST_PARTY,
    provider: "Anthropic",
    modelId: "claude-haiku-4-5",
    modelLabel: "Claude Haiku 4.5",
    inputUsdPerMillion: 1,
    cachedInputUsdPerMillion: 0.1,
    outputUsdPerMillion: 5,
    verifiedAt: "2026-09-18",
    sourceUrl: "https://platform.claude.com/docs/en/about-claude/pricing",
    provenanceNote: "Claude API global standard rates. Cached-input value is the cache-read/hit rate; cache-write charges are not modeled here.",
    commercialUseStatus: COMMERCIAL_USE_STATUS.NOT_APPLICABLE,
  }),

  // Google Gemini Developer API — standard paid-tier text pricing.
  Object.freeze({
    sourceId: "google-gemini-pricing",
    sourceType: MANAGED_API_SOURCE_TYPE.FIRST_PARTY,
    provider: "Google",
    modelId: "gemini-3.8-flash",
    modelLabel: "Gemini 3.8 Flash",
    inputUsdPerMillion: 0.75,
    cachedInputUsdPerMillion: 0.075,
    outputUsdPerMillion: 3.75,
    verifiedAt: "2026-09-18",
    sourceUrl: "https://ai.google.dev/gemini-api/docs/pricing",
    provenanceNote: "Gemini Developer API standard paid-tier promotional rates through 2026-12-31; published standard rates increase 2027-01-01. Cache storage fees are not modeled.",
    commercialUseStatus: COMMERCIAL_USE_STATUS.NOT_APPLICABLE,
  }),
  Object.freeze({
    sourceId: "google-gemini-pricing",
    sourceType: MANAGED_API_SOURCE_TYPE.FIRST_PARTY,
    provider: "Google",
    modelId: "gemini-3.1-pro-preview",
    modelLabel: "Gemini 3.1 Pro Preview",
    inputUsdPerMillion: 2,
    cachedInputUsdPerMillion: null,
    outputUsdPerMillion: 12,
    verifiedAt: "2026-09-18",
    sourceUrl: "https://ai.google.dev/gemini-api/docs/generate-content/gemini-3",
    provenanceNote: "Preview-model standard pricing for prompts under 200k tokens. Pricing is higher above 200k tokens; no cached-input discount is assumed in this registry row.",
    commercialUseStatus: COMMERCIAL_USE_STATUS.NOT_APPLICABLE,
  }),
  Object.freeze({
    sourceId: "google-gemini-pricing",
    sourceType: MANAGED_API_SOURCE_TYPE.FIRST_PARTY,
    provider: "Google",
    modelId: "gemini-3.1-flash-lite",
    modelLabel: "Gemini 3.1 Flash-Lite",
    inputUsdPerMillion: 0.25,
    cachedInputUsdPerMillion: 0.025,
    outputUsdPerMillion: 1.5,
    verifiedAt: "2026-09-18",
    sourceUrl: "https://ai.google.dev/gemini-api/docs/pricing",
    provenanceNote: "Gemini Developer API standard paid-tier text rates. Cache storage fees are not modeled.",
    commercialUseStatus: COMMERCIAL_USE_STATUS.NOT_APPLICABLE,
  }),
  Object.freeze({
    sourceId: "google-gemini-pricing",
    sourceType: MANAGED_API_SOURCE_TYPE.FIRST_PARTY,
    provider: "Google",
    modelId: "gemini-2.5-pro",
    modelLabel: "Gemini 2.5 Pro",
    inputUsdPerMillion: 1.25,
    cachedInputUsdPerMillion: 0.125,
    outputUsdPerMillion: 10,
    verifiedAt: "2026-09-18",
    sourceUrl: "https://ai.google.dev/gemini-api/docs/pricing",
    provenanceNote: "Gemini Developer API standard paid-tier rates for prompts <=200k tokens. Rates increase for prompts >200k; cache storage fees are not modeled.",
    commercialUseStatus: COMMERCIAL_USE_STATUS.NOT_APPLICABLE,
  }),

  // xAI — global short-context text API pricing.
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
    provenanceNote: "Global short-context public API rates. Long-context pricing differs at >=200k tokens; US regional endpoint carries a 10% premium.",
    commercialUseStatus: COMMERCIAL_USE_STATUS.NOT_APPLICABLE,
  }),
  Object.freeze({
    sourceId: "xai-pricing",
    sourceType: MANAGED_API_SOURCE_TYPE.FIRST_PARTY,
    provider: "xAI",
    modelId: "grok-4.5",
    modelLabel: "Grok 4.5",
    inputUsdPerMillion: 2,
    cachedInputUsdPerMillion: 0.3,
    outputUsdPerMillion: 6,
    verifiedAt: "2026-09-18",
    sourceUrl: "https://docs.x.ai/developers/pricing",
    provenanceNote: "Global short-context public API rates. Long-context pricing differs at >=200k tokens.",
    commercialUseStatus: COMMERCIAL_USE_STATUS.NOT_APPLICABLE,
  }),
  Object.freeze({
    sourceId: "xai-pricing",
    sourceType: MANAGED_API_SOURCE_TYPE.FIRST_PARTY,
    provider: "xAI",
    modelId: "grok-4.3",
    modelLabel: "Grok 4.3",
    inputUsdPerMillion: 1.25,
    cachedInputUsdPerMillion: 0.2,
    outputUsdPerMillion: 2.5,
    verifiedAt: "2026-09-18",
    sourceUrl: "https://docs.x.ai/developers/pricing",
    provenanceNote: "Global short-context public API rates. Long-context pricing differs at >=200k tokens.",
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

export function validateManagedApiPricingSnapshotMetadata(snapshot = MANAGED_API_PRICING_SNAPSHOT) {
  const errors = [];
  const snapshotDateMatch = String(snapshot?.snapshotId || "").match(/(\d{4}-\d{2}-\d{2})$/);
  const snapshotDate = snapshotDateMatch?.[1] || null;
  const refreshDate = String(snapshot?.lastSuccessfulRefreshAt || "").slice(0, 10);

  if (!snapshot?.verifiedAt) errors.push("Pricing snapshot verifiedAt is required.");
  if (!snapshotDate) errors.push("Pricing snapshotId must end with YYYY-MM-DD.");
  if (snapshotDate && snapshot.verifiedAt !== snapshotDate) {
    errors.push("Pricing snapshotId date must match verifiedAt.");
  }
  if (refreshDate && snapshot?.verifiedAt && refreshDate !== snapshot.verifiedAt) {
    errors.push("lastSuccessfulRefreshAt date must match verifiedAt.");
  }

  for (const rate of snapshot?.rates || []) {
    if (rate.sourceType === MANAGED_API_SOURCE_TYPE.FIRST_PARTY && rate.verifiedAt !== snapshot?.verifiedAt) {
      errors.push(`${rate.provider}/${rate.modelId} verifiedAt must match snapshot verifiedAt.`);
    }
  }

  return { ok: errors.length === 0, errors };
}

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
