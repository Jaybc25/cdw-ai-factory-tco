// IE-3: demand-bound production-serving methodology for Inference Economics Preview.
//
// The benchmark tells us what a configuration can produce under a specific test.
// It does NOT tell us how many useful tokens a customer will actually consume.
// This module therefore separates:
//   1) output-token demand,
//   2) production-serving capacity,
//   3) useful output tokens actually served.
//
// Cost per token is demand-bound: idle capacity remains in the numerator but does
// not create fictional "useful" tokens in the denominator.

export const OUTPUT_TOKEN_DEMAND_BASIS = Object.freeze({
  MEASURED_MONTHLY: "MEASURED_MONTHLY",
  REQUEST_FORECAST: "REQUEST_FORECAST",
  ANNUAL_FORECAST: "ANNUAL_FORECAST",
});

function positive(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function fraction(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 && n <= 1 ? n : null;
}

function days(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 && n <= 366 ? n : null;
}

function hours(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 && n <= 24 ? n : null;
}

/**
 * Demand denominator is generated OUTPUT tokens.
 *
 * This matches the performance quantity exposed by NVIDIA GenAI-Perf
 * ("Output Token Throughput") and avoids pretending that prompt/prefill tokens
 * consume infrastructure identically to generated/decode tokens.
 *
 * Input-token volume is retained as context for future prefill-aware modeling,
 * but is not silently blended into the output-token denominator.
 */
export function calculateAnnualOutputTokenDemand({
  basis,
  measuredMonthlyOutputTokens,
  annualOutputTokens,
  requestsPerDay,
  averageOutputTokensPerRequest,
  averageInputTokensPerRequest = null,
  activeDaysPerYear = 365,
}) {
  const d = days(activeDaysPerYear);
  if (!d) {
    return { ok: false, errors: ["activeDaysPerYear must be > 0 and <= 366."] };
  }

  if (basis === OUTPUT_TOKEN_DEMAND_BASIS.MEASURED_MONTHLY) {
    const monthly = positive(measuredMonthlyOutputTokens);
    if (!monthly) {
      return { ok: false, errors: ["measuredMonthlyOutputTokens must be > 0."] };
    }
    return {
      ok: true,
      basis,
      annualOutputTokens: monthly * 12,
      provenance: "MEASURED",
      assumptions: { measuredMonthlyOutputTokens: monthly },
    };
  }

  if (basis === OUTPUT_TOKEN_DEMAND_BASIS.ANNUAL_FORECAST) {
    const annual = positive(annualOutputTokens);
    if (!annual) {
      return { ok: false, errors: ["annualOutputTokens must be > 0."] };
    }
    return {
      ok: true,
      basis,
      annualOutputTokens: annual,
      provenance: "FORECAST",
      assumptions: { annualOutputTokens: annual },
    };
  }

  if (basis === OUTPUT_TOKEN_DEMAND_BASIS.REQUEST_FORECAST) {
    const rpd = positive(requestsPerDay);
    const out = positive(averageOutputTokensPerRequest);
    const input = averageInputTokensPerRequest == null
      ? null
      : positive(averageInputTokensPerRequest);

    if (!rpd || !out) {
      return {
        ok: false,
        errors: ["requestsPerDay and averageOutputTokensPerRequest must be > 0."],
      };
    }

    return {
      ok: true,
      basis,
      annualOutputTokens: rpd * out * d,
      provenance: "FORECAST",
      assumptions: {
        requestsPerDay: rpd,
        averageOutputTokensPerRequest: out,
        averageInputTokensPerRequest: input,
        activeDaysPerYear: d,
      },
    };
  }

  return { ok: false, errors: ["Unsupported output-token demand basis."] };
}

/**
 * Converts modeled benchmark throughput into a production-serving ceiling.
 *
 * productionServingFactor is intentionally REQUIRED. There is no universal
 * Offline -> Server conversion. MLPerf documentation notes Server target QPS is
 * often around 80% of Offline but can fall below 50% on some systems. A direct
 * production/Server benchmark may use 1.0 if the supplied throughput already
 * reflects the required latency/SLO scenario.
 */
export function calculateAnnualServingCapacity({
  effectiveOutputThroughputTokPerSec,
  productionServingFactor,
  activeHoursPerDay,
  activeDaysPerYear = 365,
}) {
  const tps = positive(effectiveOutputThroughputTokPerSec);
  const factor = fraction(productionServingFactor);
  const h = hours(activeHoursPerDay);
  const d = days(activeDaysPerYear);

  const errors = [];
  if (!tps) errors.push("effectiveOutputThroughputTokPerSec must be > 0.");
  if (!factor) errors.push("productionServingFactor must be > 0 and <= 1.");
  if (!h) errors.push("activeHoursPerDay must be > 0 and <= 24.");
  if (!d) errors.push("activeDaysPerYear must be > 0 and <= 366.");

  if (errors.length) return { ok: false, errors };

  const productionOutputTokPerSec = tps * factor;
  const annualCapacityOutputTokens =
    productionOutputTokPerSec * h * 3600 * d;

  return {
    ok: true,
    productionOutputTokPerSec,
    annualCapacityOutputTokens,
    assumptions: {
      effectiveOutputThroughputTokPerSec: tps,
      productionServingFactor: factor,
      activeHoursPerDay: h,
      activeDaysPerYear: d,
    },
  };
}

/**
 * Demand-bound economics.
 *
 * If the design cannot serve the stated demand inside the supplied production
 * window, $/1M output tokens is suppressed. Quoting a cheap token cost for an
 * undersized design would reward failure to meet demand.
 */
export function calculateDemandBoundInferenceEconomics({
  attributableTcoUsd,
  horizonYears,
  demand,
  servingCapacity,
  demandGrowthRate = 0,
  evidenceStatus = "MODELED",
}) {
  const tco = positive(attributableTcoUsd);
  const years = positive(horizonYears);

  if (!tco || !years) {
    return {
      ok: false,
      errors: ["attributableTcoUsd and horizonYears must be > 0."],
    };
  }
  if (!demand?.ok) {
    return { ok: false, errors: demand?.errors || ["Valid output-token demand is required."] };
  }
  if (!servingCapacity?.ok) {
    return { ok: false, errors: servingCapacity?.errors || ["Valid serving capacity is required."] };
  }

  const firstYearDemand = demand.annualOutputTokens;
  const annualCapacity = servingCapacity.annualCapacityOutputTokens;
  const growth = Number(demandGrowthRate);
  const normalizedGrowth = Number.isFinite(growth) && growth >= 0 ? growth : 0;
  const wholeYears = Math.max(1, Math.floor(years));
  const demandByYear = Array.from({ length: wholeYears }, (_, i) =>
    firstYearDemand * Math.pow(1 + normalizedGrowth, i)
  );
  const peakAnnualDemand = Math.max(...demandByYear);
  const finalYearDemandOutputTokens = demandByYear[demandByYear.length - 1];
  const meetsDemand = peakAnnualDemand <= annualCapacity;
  const demandCoverage = annualCapacity / firstYearDemand;
  const demandUtilizationOfCapacity = firstYearDemand / annualCapacity;
  const peakDemandUtilizationOfCapacity = peakAnnualDemand / annualCapacity;
  const annualUnusedCapacityTokens = Math.max(0, annualCapacity - firstYearDemand);
  const annualShortfallTokens = Math.max(0, peakAnnualDemand - annualCapacity);

  if (!meetsDemand) {
    return {
      ok: false,
      reason: "UNDERSIZED_FOR_DEMAND",
      errors: ["The modeled production-serving capacity does not meet stated output-token demand across the selected growth horizon."],
      evidenceStatus,
      annualDemandOutputTokens: firstYearDemand,
      finalYearDemandOutputTokens,
      peakAnnualDemandOutputTokens: peakAnnualDemand,
      annualCapacityOutputTokens: annualCapacity,
      annualShortfallTokens,
      demandCoverage,
      demandUtilizationOfCapacity,
      peakDemandUtilizationOfCapacity,
      demandGrowthRate: normalizedGrowth,
      demandByYear,
      costPerMillionOutputTokens: null,
    };
  }

  const horizonUsefulOutputTokens = demandByYear.reduce((sum, value) => sum + value, 0);
  const costPerMillionOutputTokens =
    (tco / horizonUsefulOutputTokens) * 1_000_000;

  return {
    ok: true,
    evidenceStatus,
    attributableTcoUsd: tco,
    horizonYears: years,
    annualDemandOutputTokens: firstYearDemand,
    finalYearDemandOutputTokens,
    peakAnnualDemandOutputTokens: peakAnnualDemand,
    annualCapacityOutputTokens: annualCapacity,
    horizonUsefulOutputTokens,
    annualUnusedCapacityTokens,
    annualShortfallTokens: 0,
    demandCoverage,
    demandUtilizationOfCapacity,
    peakDemandUtilizationOfCapacity,
    demandGrowthRate: normalizedGrowth,
    demandByYear,
    costPerMillionOutputTokens,
    demandBasis: demand.basis,
    demandProvenance: demand.provenance,
    demandAssumptions: demand.assumptions,
    servingAssumptions: servingCapacity.assumptions,
  };
}
