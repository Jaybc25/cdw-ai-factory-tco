import {
  MANAGED_API_PRICING_SNAPSHOT,
  chooseLastKnownGoodPricingSnapshot,
} from "./managedApiPricingRegistry.js";
import {
  MANAGED_API_SOURCE_TYPE,
} from "./managedApiPricingSource.js";

function text(value) {
  const v = String(value ?? "").trim();
  return v || null;
}

function positive(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function nonNegativeOrNull(value) {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
}

export function validateManagedApiPricingSnapshot(snapshot) {
  const errors = [];
  if (!snapshot || typeof snapshot !== "object") {
    return { ok: false, errors: ["Snapshot object is required."] };
  }

  if (!text(snapshot.snapshotId)) errors.push("snapshotId is required.");
  if (!text(snapshot.verifiedAt)) errors.push("verifiedAt is required.");
  if (!text(snapshot.lastSuccessfulRefreshAt)) errors.push("lastSuccessfulRefreshAt is required.");
  if (!Array.isArray(snapshot.rates) || snapshot.rates.length === 0) {
    errors.push("At least one pricing rate is required.");
  }

  const seen = new Set();
  for (const [index, rate] of (snapshot.rates || []).entries()) {
    const prefix = `rates[${index}]`;
    const provider = text(rate?.provider);
    const modelId = text(rate?.modelId);
    const modelLabel = text(rate?.modelLabel);
    const sourceType = text(rate?.sourceType);
    const input = positive(rate?.inputUsdPerMillion);
    const output = positive(rate?.outputUsdPerMillion);
    const cached = nonNegativeOrNull(rate?.cachedInputUsdPerMillion);

    if (!provider) errors.push(`${prefix}.provider is required.`);
    if (!modelId) errors.push(`${prefix}.modelId is required.`);
    if (!modelLabel) errors.push(`${prefix}.modelLabel is required.`);
    if (!Object.values(MANAGED_API_SOURCE_TYPE).includes(sourceType)) {
      errors.push(`${prefix}.sourceType is invalid.`);
    }
    if (!input) errors.push(`${prefix}.inputUsdPerMillion must be > 0.`);
    if (!output) errors.push(`${prefix}.outputUsdPerMillion must be > 0.`);
    if (Number.isNaN(cached)) errors.push(`${prefix}.cachedInputUsdPerMillion must be >= 0 when supplied.`);
    if (!text(rate?.verifiedAt)) errors.push(`${prefix}.verifiedAt is required.`);
    if (!text(rate?.sourceUrl)) errors.push(`${prefix}.sourceUrl is required.`);

    if (provider && modelId) {
      const key = `${provider}::${modelId}`;
      if (seen.has(key)) errors.push(`Duplicate provider/model pricing row: ${key}.`);
      seen.add(key);
    }
  }

  return { ok: errors.length === 0, errors };
}

export function evaluateManagedApiPricingCandidate({
  currentSnapshot = MANAGED_API_PRICING_SNAPSHOT,
  candidateSnapshot,
}) {
  const validation = validateManagedApiPricingSnapshot(candidateSnapshot);
  const selectedSnapshot = chooseLastKnownGoodPricingSnapshot({
    currentSnapshot,
    candidateSnapshot,
    candidateValid: validation.ok,
  });

  return {
    ok: validation.ok,
    candidateAccepted: validation.ok,
    selectedSnapshot,
    errors: validation.errors,
    reason: validation.ok ? "CANDIDATE_ACCEPTED" : "LAST_KNOWN_GOOD_PRESERVED",
  };
}

export function getManagedApiPricingRefreshStatus({
  snapshot = MANAGED_API_PRICING_SNAPSHOT,
  asOf = new Date(),
} = {}) {
  const verifiedAt = new Date(`${snapshot.verifiedAt}T00:00:00Z`);
  const current = asOf instanceof Date ? asOf : new Date(asOf);
  if (Number.isNaN(verifiedAt.getTime()) || Number.isNaN(current.getTime())) {
    return {
      ok: false,
      state: "UNKNOWN",
      ageDays: null,
      stale: true,
      errors: ["Unable to determine pricing snapshot freshness."],
    };
  }

  const ageDays = Math.max(0, Math.floor((current.getTime() - verifiedAt.getTime()) / 86_400_000));
  const staleAfterDays = Number(snapshot.staleAfterDays) || 14;
  const stale = ageDays > staleAfterDays;

  return {
    ok: true,
    state: stale ? "STALE" : "CURRENT",
    ageDays,
    stale,
    staleAfterDays,
    verifiedAt: snapshot.verifiedAt,
    snapshotId: snapshot.snapshotId,
    rateCount: snapshot.rates?.length || 0,
  };
}
