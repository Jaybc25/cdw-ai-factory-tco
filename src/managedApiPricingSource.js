export const MANAGED_API_SOURCE_TYPE = Object.freeze({
  FIRST_PARTY: "FIRST_PARTY",
  AGGREGATOR: "AGGREGATOR",
  USER_OVERRIDE: "USER_OVERRIDE",
});

export const COMMERCIAL_USE_STATUS = Object.freeze({
  CLEARED: "CLEARED",
  UNRESOLVED: "UNRESOLVED",
  NOT_APPLICABLE: "NOT_APPLICABLE",
});

function positive(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function nonNegative(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function text(value) {
  const v = String(value ?? "").trim();
  return v || null;
}

export function createManagedApiRateRecord({
  sourceId,
  sourceType,
  provider,
  modelId,
  modelLabel,
  inputUsdPerMillion,
  outputUsdPerMillion,
  cachedInputUsdPerMillion = null,
  currency = "USD",
  verifiedAt = null,
  retrievedAt = null,
  sourceUrl = null,
  provenanceNote = null,
  commercialUseStatus = COMMERCIAL_USE_STATUS.NOT_APPLICABLE,
}) {
  const errors = [];
  const normalizedSourceType = text(sourceType);
  const normalizedCommercial = text(commercialUseStatus);
  const input = positive(inputUsdPerMillion);
  const output = positive(outputUsdPerMillion);
  const cached = cachedInputUsdPerMillion == null
    ? null
    : nonNegative(cachedInputUsdPerMillion);

  if (!text(sourceId)) errors.push("sourceId is required.");
  if (!Object.values(MANAGED_API_SOURCE_TYPE).includes(normalizedSourceType)) {
    errors.push("sourceType must be FIRST_PARTY, AGGREGATOR, or USER_OVERRIDE.");
  }
  if (!text(provider)) errors.push("provider is required.");
  if (!text(modelId)) errors.push("modelId is required.");
  if (!text(modelLabel)) errors.push("modelLabel is required.");
  if (!input) errors.push("inputUsdPerMillion must be > 0.");
  if (!output) errors.push("outputUsdPerMillion must be > 0.");
  if (cachedInputUsdPerMillion != null && cached == null) {
    errors.push("cachedInputUsdPerMillion must be >= 0 when supplied.");
  }
  if (text(currency) !== "USD") errors.push("IE-6 foundation currently supports USD only.");
  if (!Object.values(COMMERCIAL_USE_STATUS).includes(normalizedCommercial)) {
    errors.push("commercialUseStatus is invalid.");
  }
  if (normalizedSourceType === MANAGED_API_SOURCE_TYPE.AGGREGATOR &&
      normalizedCommercial !== COMMERCIAL_USE_STATUS.CLEARED) {
    errors.push("Aggregator rates cannot be activated until commercial use is CLEARED.");
  }

  if (errors.length) return { ok: false, errors };

  return {
    ok: true,
    rate: Object.freeze({
      sourceId: text(sourceId),
      sourceType: normalizedSourceType,
      provider: text(provider),
      modelId: text(modelId),
      modelLabel: text(modelLabel),
      inputUsdPerMillion: input,
      outputUsdPerMillion: output,
      cachedInputUsdPerMillion: cached,
      currency: "USD",
      verifiedAt: text(verifiedAt),
      retrievedAt: text(retrievedAt),
      sourceUrl: text(sourceUrl),
      provenanceNote: text(provenanceNote),
      commercialUseStatus: normalizedCommercial,
    }),
  };
}

export function createManagedApiPricingSource({
  id,
  label,
  sourceType,
  commercialUseStatus = COMMERCIAL_USE_STATUS.NOT_APPLICABLE,
  fetchRates,
}) {
  if (!text(id) || !text(label)) throw new Error("Pricing source id and label are required.");
  if (!Object.values(MANAGED_API_SOURCE_TYPE).includes(sourceType)) {
    throw new Error("Invalid managed API pricing source type.");
  }
  if (typeof fetchRates !== "function") throw new Error("fetchRates must be a function.");

  return Object.freeze({
    id,
    label,
    sourceType,
    commercialUseStatus,
    async getRates(context = {}) {
      if (sourceType === MANAGED_API_SOURCE_TYPE.AGGREGATOR &&
          commercialUseStatus !== COMMERCIAL_USE_STATUS.CLEARED) {
        return {
          ok: false,
          reason: "COMMERCIAL_USE_UNRESOLVED",
          errors: [`${label} is not activated because commercial-use rights are unresolved.`],
          rates: [],
        };
      }
      const payload = await fetchRates(context);
      return payload;
    },
  });
}

// BenchLM is intentionally represented as a future adapter slot only.
// No endpoint is called in IE-6 foundation. The public-site licensing language
// reviewed on 2026-09-18 is contradictory, so commercial activation remains HOLD.
export const BENCHLM_FUTURE_SOURCE = Object.freeze({
  id: "benchlm",
  label: "BenchLM.ai",
  sourceType: MANAGED_API_SOURCE_TYPE.AGGREGATOR,
  commercialUseStatus: COMMERCIAL_USE_STATUS.UNRESOLVED,
  activationStatus: "HOLD",
  note: "Future pricing-provider candidate only. Resolve commercial-use rights and payload provenance before implementing fetchRates.",
});
