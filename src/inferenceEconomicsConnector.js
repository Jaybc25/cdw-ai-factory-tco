const TCO_SYSTEM_TO_IE_HARDWARE = Object.freeze({
  "DGX H200": "H200",
  "DGX B200": "B200",
  "DGX B300": "B300",
  "DGX GB200 NVL-72": "GB200 NVL72",
  "DGX GB300 NVL-72": "GB300 NVL72",
});

function finitePositive(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Builds a one-way Preview connector payload from the current TCO result.
 *
 * Attribution guardrails:
 * - inference GPU-Sizing handoff = attributable workload
 * - standalone TCO = attributable only when training share is explicitly 0%
 * - non-zero TCO growth is not auto-carried into the numerator because IE-3
 *   currently models flat annual useful-token demand over the horizon
 */
export function buildInferenceEconomicsPreviewHandoff({
  ownSys,
  systemCount,
  gpusPerSystem,
  modelId,
  quant,
  horizonYears,
  onPremTcoUsd,
  workingDayHours = null,
  isInferenceWorkloadHandoff = false,
  trainShare = null,
  growth = null,
}) {
  const hardwareClass = TCO_SYSTEM_TO_IE_HARDWARE[ownSys] || null;
  const gpuCount = finitePositive(systemCount) && finitePositive(gpusPerSystem)
    ? Number(systemCount) * Number(gpusPerSystem)
    : null;
  const horizon = finitePositive(horizonYears);
  const tco = finitePositive(onPremTcoUsd);
  const hours = finitePositive(workingDayHours);

  const attributionEligible =
    isInferenceWorkloadHandoff === true || Number(trainShare) === 0;
  const flatDemandCompatible =
    Number.isFinite(Number(growth)) && Number(growth) === 0;

  const blockers = [];
  if (!hardwareClass) blockers.push("UNSUPPORTED_HARDWARE");
  if (!gpuCount) blockers.push("INVALID_GPU_COUNT");
  if (!modelId) blockers.push("MISSING_MODEL");
  if (!quant) blockers.push("MISSING_PRECISION");
  if (!horizon) blockers.push("INVALID_HORIZON");
  if (!attributionEligible) blockers.push("MIXED_WORKLOAD_TCO");
  if (!flatDemandCompatible) blockers.push("TCO_GROWTH_NOT_MODELED");

  const params = new URLSearchParams();
  params.set("source", "tco");
  if (hardwareClass) params.set("hardware", hardwareClass);
  if (gpuCount) params.set("gpuCount", String(gpuCount));
  if (modelId) params.set("model", modelId);
  if (quant) params.set("quant", quant);
  if (horizon) params.set("horizon", String(horizon));
  if (hours && hours <= 24) params.set("activeHours", String(hours));

  // TCO is only inherited when attribution and demand-growth semantics line up.
  if (tco && attributionEligible && flatDemandCompatible) {
    params.set("tco", String(Math.round(tco)));
  }

  if (blockers.length) params.set("connectorBlockers", blockers.join(","));

  return {
    hardwareClass,
    gpuCount,
    horizonYears: horizon,
    attributableTcoUsd:
      tco && attributionEligible && flatDemandCompatible ? tco : null,
    workingDayHours: hours && hours <= 24 ? hours : null,
    blockers,
    href: `/tco/inference-economics-preview?${params.toString()}`,
  };
}

export function parseInferenceEconomicsPreviewHandoff(search) {
  const params = new URLSearchParams(search || "");
  if (params.get("source") !== "tco") return null;

  const hardwareClass = params.get("hardware");
  const gpuCount = finitePositive(params.get("gpuCount"));
  const modelId = params.get("model");
  const quant = params.get("quant");
  const horizonYears = finitePositive(params.get("horizon"));
  const attributableTcoUsd = finitePositive(params.get("tco"));
  const activeHoursPerDay = finitePositive(params.get("activeHours"));
  const blockers = (params.get("connectorBlockers") || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

  return {
    source: "tco",
    hardwareClass,
    gpuCount,
    modelId,
    quant,
    horizonYears,
    attributableTcoUsd,
    activeHoursPerDay:
      activeHoursPerDay && activeHoursPerDay <= 24 ? activeHoursPerDay : null,
    blockers,
  };
}
