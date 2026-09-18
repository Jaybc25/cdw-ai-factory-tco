// Preview-only inference economics primitives.
//
// IMPORTANT:
// - This module is intentionally isolated from production TCO math.
// - It must never infer monthly token volume from peak concurrency alone.
// - It converts a source-qualified sustained throughput basis plus explicit
//   productive-runtime assumptions into useful token output and $/1M tokens.
// - Callers must pass attributable TCO explicitly; shared-fleet allocation is
//   a business assumption and is not silently invented here.

export const INFERENCE_ECONOMICS_STATUS = Object.freeze({
  VALIDATED: "VALIDATED",
  MODELED: "MODELED",
  INSUFFICIENT_EVIDENCE: "INSUFFICIENT_EVIDENCE",
});

function finitePositive(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function fraction(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n <= 1 ? n : null;
}

function boundedHours(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 && n <= 24 ? n : null;
}

function boundedDays(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 && n <= 366 ? n : null;
}

function evidenceStatus(evidence) {
  if (!evidence || evidence.qualified !== true) {
    return INFERENCE_ECONOMICS_STATUS.INSUFFICIENT_EVIDENCE;
  }

  const exact =
    evidence.directBenchmark === true &&
    evidence.modelMatch === true &&
    evidence.hardwareMatch === true &&
    evidence.precisionMatch === true &&
    evidence.workloadScenarioMatch === true &&
    evidence.adjustmentFactor === 1;

  return exact
    ? INFERENCE_ECONOMICS_STATUS.VALIDATED
    : INFERENCE_ECONOMICS_STATUS.MODELED;
}

/**
 * Convert a throughput basis into useful token production.
 *
 * throughputTokPerSec should represent the full priced configuration, not a
 * single GPU unless the priced configuration itself is one GPU.
 *
 * throughputUtilization is the share of the benchmark throughput expected to
 * be realized while the service is active. activeHoursPerDay is kept separate
 * so schedule/duty cycle is not conflated with serving efficiency.
 */
export function calculateUsefulTokenProduction({
  throughputTokPerSec,
  throughputUtilization,
  activeHoursPerDay,
  activeDaysPerYear = 365,
  horizonYears,
}) {
  const tps = finitePositive(throughputTokPerSec);
  const util = fraction(throughputUtilization);
  const hours = boundedHours(activeHoursPerDay);
  const days = boundedDays(activeDaysPerYear);
  const years = finitePositive(horizonYears);

  const errors = [];
  if (!tps) errors.push("throughputTokPerSec must be > 0");
  if (util == null || util === 0) errors.push("throughputUtilization must be > 0 and <= 1");
  if (!hours) errors.push("activeHoursPerDay must be > 0 and <= 24");
  if (!days) errors.push("activeDaysPerYear must be > 0 and <= 366");
  if (!years) errors.push("horizonYears must be > 0");

  if (errors.length) {
    return { ok: false, errors, annualUsefulTokens: null, horizonUsefulTokens: null };
  }

  const secondsPerActiveYear = hours * 3600 * days;
  const annualUsefulTokens = tps * util * secondsPerActiveYear;

  return {
    ok: true,
    errors: [],
    annualUsefulTokens,
    horizonUsefulTokens: annualUsefulTokens * years,
    assumptions: {
      throughputTokPerSec: tps,
      throughputUtilization: util,
      activeHoursPerDay: hours,
      activeDaysPerYear: days,
      horizonYears: years,
    },
  };
}

/**
 * Preview cost-per-token calculation.
 *
 * attributableTcoUsd is intentionally caller-owned. The engine does not decide
 * whether 100%, 50%, or another share of a multi-workload AI Factory should be
 * charged to this workload.
 */
export function calculateInferenceEconomics({
  attributableTcoUsd,
  throughputTokPerSec,
  throughputUtilization,
  activeHoursPerDay,
  activeDaysPerYear = 365,
  horizonYears,
  evidence,
}) {
  const tco = finitePositive(attributableTcoUsd);
  if (!tco) {
    return {
      ok: false,
      status: INFERENCE_ECONOMICS_STATUS.INSUFFICIENT_EVIDENCE,
      errors: ["attributableTcoUsd must be > 0"],
    };
  }

  const evidenceAdjustment =
    evidence && Number.isFinite(Number(evidence.adjustmentFactor)) && Number(evidence.adjustmentFactor) > 0
      ? Number(evidence.adjustmentFactor)
      : 1;
  const adjustedThroughputTokPerSec =
    finitePositive(throughputTokPerSec) == null
      ? throughputTokPerSec
      : Number(throughputTokPerSec) * evidenceAdjustment;

  const production = calculateUsefulTokenProduction({
    throughputTokPerSec: adjustedThroughputTokPerSec,
    throughputUtilization,
    activeHoursPerDay,
    activeDaysPerYear,
    horizonYears,
  });

  if (!production.ok) {
    return {
      ok: false,
      status: INFERENCE_ECONOMICS_STATUS.INSUFFICIENT_EVIDENCE,
      errors: production.errors,
    };
  }

  const status = evidenceStatus(evidence);
  if (status === INFERENCE_ECONOMICS_STATUS.INSUFFICIENT_EVIDENCE) {
    return {
      ok: false,
      status,
      errors: ["Source-qualified inference performance evidence is required."],
      production,
    };
  }

  const costPerMillionTokens =
    (tco / production.horizonUsefulTokens) * 1_000_000;

  return {
    ok: true,
    status,
    errors: [],
    attributableTcoUsd: tco,
    costPerMillionTokens,
    annualUsefulTokens: production.annualUsefulTokens,
    horizonUsefulTokens: production.horizonUsefulTokens,
    productionAssumptions: {
      ...production.assumptions,
      sourceThroughputTokPerSec: Number(throughputTokPerSec),
      evidenceAdjustmentFactor: evidenceAdjustment,
    },
    evidence,
  };
}

/**
 * Optional managed-API comparison.
 * Input/output token mix is explicit; no blended API price is fabricated.
 */
export function calculateManagedApiBlendedCost({
  inputUsdPerMillion,
  outputUsdPerMillion,
  inputShare,
  outputShare,
}) {
  const inPrice = finitePositive(inputUsdPerMillion);
  const outPrice = finitePositive(outputUsdPerMillion);
  const inShare = fraction(inputShare);
  const outShare = fraction(outputShare);

  if (!inPrice || !outPrice || inShare == null || outShare == null) {
    return { ok: false, errors: ["Valid API prices and token shares are required."] };
  }

  if (Math.abs(inShare + outShare - 1) > 1e-9) {
    return { ok: false, errors: ["inputShare + outputShare must equal 1."] };
  }

  return {
    ok: true,
    blendedUsdPerMillion: (inPrice * inShare) + (outPrice * outShare),
    assumptions: {
      inputUsdPerMillion: inPrice,
      outputUsdPerMillion: outPrice,
      inputShare: inShare,
      outputShare: outShare,
    },
  };
}
