// Best-Value GPUaaS v1
//
// Authority boundary:
// - GPU Sizing owns technical equivalence / GPU-class selection.
// - TCO owns economic evaluation.
// - This helper ONLY ranks providers for the exact GPU class supplied to it.
//   It never substitutes or infers another GPU class.
//
// The caller supplies evaluateProvider(provider, rateInfo), which lets the TCO
// calculator run its existing validated engine for every candidate provider
// instead of duplicating cloud/TCO math here.

export const GPUAAS_CONFIDENCE = Object.freeze({
  LISTED: "Listed",
  CUSTOM: "Customer-entered rate",
  "NODE-NORM": "Node-normalized",
  EST: "Estimated",
  QUOTE: "Quote / verify",
});

function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Rank GPUaaS providers for one exact rented GPU class.
 *
 * @param {Object} options
 * @param {string} options.gpuClass Exact GPU class to price. No fallback.
 * @param {string[]} options.providers Candidate provider names.
 * @param {Object} options.rateRegistry Shared provider -> GPU class registry.
 * @param {(provider:string, rateInfo:Object)=>Object} options.evaluateProvider
 *   Must return at least { cloudTotal }. Optional modeled fields are preserved.
 *   The evaluator may override confidence/confidenceLabel/rateNote when the
 *   active TCO assumptions make the registry's base confidence insufficient
 *   (for example, a derived reserved rate or a customer-entered rate).
 * @returns {Array<Object>} Lowest modeled cloud total first.
 */
export function rankSameClassGpuAas({ gpuClass, providers, rateRegistry, evaluateProvider }) {
  if (!gpuClass || !Array.isArray(providers) || !rateRegistry || typeof evaluateProvider !== "function") {
    return [];
  }

  const rows = [];

  for (const provider of providers) {
    const rateInfo = rateRegistry?.[provider]?.[gpuClass];

    // v1 is intentionally like-for-like only. If this exact class is absent,
    // the provider is ineligible rather than silently falling back to another
    // class or asking TCO to make a technical-equivalence judgment.
    if (!rateInfo) continue;

    const modeled = evaluateProvider(provider, rateInfo);
    if (!modeled || !finiteNumber(modeled.cloudTotal)) continue;

    rows.push({
      provider,
      gpuClass,
      confidence: rateInfo.conf ?? "EST",
      confidenceLabel: GPUAAS_CONFIDENCE[rateInfo.conf] ?? rateInfo.conf ?? "Estimated",
      rateNote: rateInfo.note ?? null,
      hasExplicitReservedRate: rateInfo.res != null,
      ...modeled,
    });
  }

  return rows.sort((a, b) => {
    const costDelta = a.cloudTotal - b.cloudTotal;
    if (Math.abs(costDelta) > 1e-9) return costDelta;
    return a.provider.localeCompare(b.provider);
  });
}

/** Return the top N rows without changing the canonical ranking. */
export function topGpuAasValues(rows, limit = 3) {
  if (!Array.isArray(rows)) return [];
  const n = Math.max(0, Math.floor(Number(limit) || 0));
  return rows.slice(0, n);
}
