import { RTX_PRO_CLOUD_HOURS_PER_MONTH, RTX_PRO_CLOUD_PROVIDERS, getRtxProCloudComparisonPlan } from "./rtxProCloudRegistry.js";

export const RTX_PRO_CLOUD_COMPARISON_VERSION = "2026-10-10.v1";

function finite(value) {
  return value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
}

function normalizeActiveHours(value) {
  if (value === null || value === undefined || value === "") return RTX_PRO_CLOUD_HOURS_PER_MONTH;
  const hours = Number(value);
  if (!Number.isFinite(hours) || hours <= 0 || hours > RTX_PRO_CLOUD_HOURS_PER_MONTH) return null;
  return hours;
}

function normalizeOnPremLifecycle(onPremLifecycle) {
  if (!onPremLifecycle || !finite(onPremLifecycle.totalTcoUSD) || !finite(onPremLifecycle.oneTimeCapexUSD) || !finite(onPremLifecycle.recurringLifecycleUSD)) {
    return null;
  }
  const horizonYears = Number(onPremLifecycle.horizonYears);
  if (![1, 3, 5].includes(horizonYears)) return null;
  return Object.freeze({
    horizonYears,
    horizonMonths: horizonYears * 12,
    totalTcoUSD: Number(onPremLifecycle.totalTcoUSD),
    oneTimeCapexUSD: Number(onPremLifecycle.oneTimeCapexUSD),
    recurringLifecycleUSD: Number(onPremLifecycle.recurringLifecycleUSD),
    monthlyRecurringUSD: Number(onPremLifecycle.recurringLifecycleUSD) / (horizonYears * 12),
  });
}

function cumulativeSeries({ onPrem, monthlyCloudUSD, maxMonths }) {
  const months = [];
  let crossoverMonth = null;
  for (let month = 1; month <= maxMonths; month += 1) {
    const cloudUSD = monthlyCloudUSD * month;
    const onPremUSD = onPrem.oneTimeCapexUSD + onPrem.monthlyRecurringUSD * month;
    if (crossoverMonth === null && cloudUSD >= onPremUSD) crossoverMonth = month;
    months.push(Object.freeze({ month, cloudUSD, onPremUSD }));
  }
  return { months: Object.freeze(months), crossoverMonth };
}

function yearlySeries(months, horizonYears) {
  const rows = [];
  for (let year = 1; year <= horizonYears; year += 1) {
    const row = months[year * 12 - 1];
    rows.push(Object.freeze({ year, cloudUSD: row.cloudUSD, onPremUSD: row.onPremUSD }));
  }
  return Object.freeze(rows);
}

function buildProviderComparison({ providerName, gpuCount, activeHoursPerMonth, onPrem, maxCrossoverMonths }) {
  const provider = RTX_PRO_CLOUD_PROVIDERS[providerName];
  const plan = getRtxProCloudComparisonPlan(providerName, gpuCount);
  if (!provider || !plan || plan.status !== "READY_FOR_ENGINEERING_COMPARISON") {
    return Object.freeze({
      provider: providerName,
      status: "UNAVAILABLE",
      reason: plan?.reason || provider?.activationBlocker || "Comparable RTX PRO rate is not available.",
      customerFacingRateReady: false,
      recommendationEligible: false,
    });
  }

  const monthlyCloudUSD = plan.hourlyUsd * activeHoursPerMonth;
  const cloudHorizonUSD = monthlyCloudUSD * onPrem.horizonMonths;
  const savingsVsCloudUSD = cloudHorizonUSD - onPrem.totalTcoUSD;
  const savingsVsCloudPct = cloudHorizonUSD > 0 ? savingsVsCloudUSD / cloudHorizonUSD : null;
  const cumulative = cumulativeSeries({ onPrem, monthlyCloudUSD, maxMonths: maxCrossoverMonths });
  const crossoverWithinHorizonMonth = cumulative.crossoverMonth && cumulative.crossoverMonth <= onPrem.horizonMonths ? cumulative.crossoverMonth : null;

  return Object.freeze({
    provider: providerName,
    productFamily: plan.productFamily,
    sku: plan.sku,
    vmQuantity: plan.vmQuantity,
    gpusPerVm: plan.gpusPerVm,
    composition: plan.composition,
    region: plan.region,
    regionLabel: plan.regionLabel,
    purchaseOption: plan.purchaseOption,
    gpuCount: plan.gpuCount,
    hourlyUsd: plan.hourlyUsd,
    activeHoursPerMonth,
    monthlyCloudUSD,
    cloudHorizonUSD,
    onPremHorizonUSD: onPrem.totalTcoUSD,
    savingsVsCloudUSD,
    savingsVsCloudPct,
    preferredAtHorizon: savingsVsCloudUSD >= 0 ? "ON_PREM" : "CLOUD",
    crossoverMonth: cumulative.crossoverMonth,
    crossoverWithinHorizonMonth,
    cumulativeByMonth: cumulative.months,
    cumulativeByYear: yearlySeries(cumulative.months, onPrem.horizonYears),
    rateEvidence: plan.rateEvidence,
    confidence: plan.confidence,
    customerFacingRateReady: Boolean(plan.customerFacingRateReady),
    recommendationEligible: Boolean(plan.customerFacingRateReady),
    status: plan.customerFacingRateReady ? "READY_FOR_CUSTOMER_COMPARISON" : "ENGINEERING_ONLY",
    activationBlocker: plan.activationBlocker || null,
  });
}

function cheapest(rows) {
  const eligible = rows.filter((row) => row && row.status !== "UNAVAILABLE" && finite(row.cloudHorizonUSD));
  if (!eligible.length) return null;
  return eligible.reduce((best, row) => (row.cloudHorizonUSD < best.cloudHorizonUSD ? row : best));
}

export function buildRtxProCloudComparison({
  gpuCount,
  onPremLifecycle,
  activeHoursPerMonth = RTX_PRO_CLOUD_HOURS_PER_MONTH,
  maxCrossoverMonths = 60,
} = {}) {
  const targetGpuCount = Number(gpuCount);
  if (![2, 4, 8].includes(targetGpuCount)) {
    return Object.freeze({ status: "UNSUPPORTED_GPU_COUNT", customerRecommendation: null, providerComparisons: Object.freeze([]) });
  }

  const onPrem = normalizeOnPremLifecycle(onPremLifecycle);
  if (!onPrem) {
    return Object.freeze({ status: "ON_PREM_TCO_REQUIRED", customerRecommendation: null, providerComparisons: Object.freeze([]) });
  }

  const hours = normalizeActiveHours(activeHoursPerMonth);
  if (hours === null) {
    return Object.freeze({ status: "ACTIVE_HOURS_INVALID", customerRecommendation: null, providerComparisons: Object.freeze([]) });
  }

  const maxMonths = Number(maxCrossoverMonths);
  if (!Number.isInteger(maxMonths) || maxMonths < onPrem.horizonMonths || maxMonths > 120) {
    return Object.freeze({ status: "CROSSOVER_WINDOW_INVALID", customerRecommendation: null, providerComparisons: Object.freeze([]) });
  }

  const providerComparisons = Object.freeze(Object.keys(RTX_PRO_CLOUD_PROVIDERS).map((providerName) =>
    buildProviderComparison({ providerName, gpuCount: targetGpuCount, activeHoursPerMonth: hours, onPrem, maxCrossoverMonths: maxMonths })
  ));

  const verified = Object.freeze(providerComparisons.filter((row) => row.recommendationEligible));
  const engineering = Object.freeze(providerComparisons.filter((row) => row.status !== "UNAVAILABLE"));
  const bestVerifiedCloud = cheapest(verified);
  const bestEngineeringCloud = cheapest(engineering);

  const customerRecommendation = bestVerifiedCloud
    ? Object.freeze({
        status: "READY",
        preferredPath: bestVerifiedCloud.preferredAtHorizon,
        cloudProvider: bestVerifiedCloud.provider,
        cloudHorizonUSD: bestVerifiedCloud.cloudHorizonUSD,
        onPremHorizonUSD: onPrem.totalTcoUSD,
        savingsVsCloudUSD: bestVerifiedCloud.savingsVsCloudUSD,
        savingsVsCloudPct: bestVerifiedCloud.savingsVsCloudPct,
        crossoverMonth: bestVerifiedCloud.crossoverMonth,
        crossoverWithinHorizonMonth: bestVerifiedCloud.crossoverWithinHorizonMonth,
      })
    : Object.freeze({ status: "EVIDENCE_PENDING", preferredPath: null, cloudProvider: null });

  return Object.freeze({
    status: "READY",
    gpuCount: targetGpuCount,
    horizonYears: onPrem.horizonYears,
    activeHoursPerMonth: hours,
    onPrem,
    providerComparisons,
    verifiedProviderComparisons: verified,
    engineeringProviderComparisons: engineering,
    bestVerifiedCloud,
    bestEngineeringCloud,
    customerRecommendation,
    note: "Crossover uses cumulative cash spend: on-prem one-time costs at month 0 plus recurring lifecycle costs accrued evenly by month versus cloud hourly rate × active hours. Engineering-only provider rates are excluded from customer recommendations.",
  });
}
