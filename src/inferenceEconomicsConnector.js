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

function validShare(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n <= 1 ? n : null;
}

function validGrowth(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/**
 * Builds a one-way Preview connector payload from the current TCO result.
 *
 * IE-5.2 attribution:
 * - a confirmed inference GPU-Sizing workload is 100% inference-attributable;
 * - otherwise TCO's workload mix is used as a MODELED allocation basis:
 *   inference share = 1 - training share;
 * - the modeled allocation is prefilled but remains overrideable in Preview.
 *
 * Growth:
 * - TCO workload growth is carried into Preview demand growth;
 * - if TCO's physical fleet changes during the selected horizon, attributable
 *   TCO is withheld because IE still requires exact benchmark-sized deployment
 *   evidence and does not infer multi-system scaling efficiency.
 */
export function buildInferenceEconomicsPreviewHandoff({
  ownSys,
  systemCount,
  gpusPerSystem,
  fleetSystemsByYear = [],
  modelId,
  modelParamsB = null,
  quant,
  horizonYears,
  onPremTcoUsd,
  workingDayHours = null,
  isInferenceWorkloadHandoff = false,
  trainShare = null,
  growth = null,
}) {
  const mappedHardwareClass = TCO_SYSTEM_TO_IE_HARDWARE[ownSys] || null;
  const hardwareClass = mappedHardwareClass || ownSys || null;
  const gpuCount = finitePositive(systemCount) && finitePositive(gpusPerSystem)
    ? Number(systemCount) * Number(gpusPerSystem)
    : null;
  const horizon = finitePositive(horizonYears);
  const tco = finitePositive(onPremTcoUsd);
  const hours = finitePositive(workingDayHours);
  const trainingShare = validShare(trainShare);
  const inferenceShare = isInferenceWorkloadHandoff
    ? 1
    : trainingShare == null
      ? null
      : 1 - trainingShare;
  const demandGrowthRate = validGrowth(growth);

  const horizonFleet = Array.isArray(fleetSystemsByYear)
    ? fleetSystemsByYear.slice(0, Math.max(1, Math.floor(horizon || 1))).map(Number).filter(Number.isFinite)
    : [];
  const fleetChanges =
    horizonFleet.length > 1 && horizonFleet.some((systems) => systems !== horizonFleet[0]);

  const blockers = [];
  if (!mappedHardwareClass) blockers.push("UNSUPPORTED_HARDWARE");
  if (!gpuCount) blockers.push("INVALID_GPU_COUNT");
  if (!modelId) blockers.push("MISSING_MODEL");
  if (modelId === "custom" && !finitePositive(modelParamsB)) blockers.push("CUSTOM_MODEL_SIZE_MISSING");
  if (!quant) blockers.push("MISSING_PRECISION");
  if (!horizon) blockers.push("INVALID_HORIZON");
  if (inferenceShare == null) blockers.push("INFERENCE_SHARE_UNKNOWN");
  if (inferenceShare === 0) blockers.push("NO_INFERENCE_SHARE");
  // Fleet expansion is handled conservatively in Preview: the entire inherited
  // TCO numerator is counted, but no throughput credit is given beyond the
  // initial benchmark-supported deployment. Demand feasibility decides whether
  // the result remains supportable.

  const allocationEligible =
    tco && inferenceShare != null && inferenceShare > 0;
  const allocatedTcoUsd = allocationEligible ? tco * inferenceShare : null;
  const allocationMethod = allocatedTcoUsd
    ? isInferenceWorkloadHandoff
      ? "DIRECT_INFERENCE_WORKLOAD"
      : "WORKLOAD_SHARE_MODELED"
    : null;

  const params = new URLSearchParams();
  params.set("source", "tco");
  if (hardwareClass) params.set("hardware", hardwareClass);
  if (gpuCount) params.set("gpuCount", String(gpuCount));
  if (modelId) params.set("model", modelId);
  if (finitePositive(modelParamsB)) params.set("modelParamsB", String(Number(modelParamsB)));
  if (quant) params.set("quant", quant);
  if (horizon) params.set("horizon", String(horizon));
  if (hours && hours <= 24) params.set("activeHours", String(hours));
  params.set("demandGrowth", String(demandGrowthRate));
  if (inferenceShare != null) params.set("inferenceShare", String(inferenceShare));
  if (tco) params.set("fullTco", String(Math.round(tco)));
  if (allocatedTcoUsd) params.set("tco", String(Math.round(allocatedTcoUsd)));
  if (allocationMethod) params.set("tcoAllocation", allocationMethod);
  if (horizonFleet.length) params.set("fleetSystems", horizonFleet.join(","));
  if (fleetChanges) params.set("fleetGrowthConservative", "1");
  if (blockers.length) params.set("connectorBlockers", blockers.join(","));

  return {
    hardwareClass,
    gpuCount,
    horizonYears: horizon,
    attributableTcoUsd: allocatedTcoUsd,
    fullTcoUsd: tco,
    inferenceShare,
    allocationMethod,
    demandGrowthRate,
    fleetSystemsByYear: horizonFleet,
    fleetGrowthConservative: fleetChanges,
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
  const modelParamsB = finitePositive(params.get("modelParamsB"));
  const quant = params.get("quant");
  const horizonYears = finitePositive(params.get("horizon"));
  const attributableTcoUsd = finitePositive(params.get("tco"));
  const fullTcoUsd = finitePositive(params.get("fullTco"));
  const activeHoursPerDay = finitePositive(params.get("activeHours"));
  const inferenceShare = validShare(params.get("inferenceShare"));
  const demandGrowthRate = validGrowth(params.get("demandGrowth"));
  const allocationMethod = params.get("tcoAllocation") || null;
  const fleetSystemsByYear = (params.get("fleetSystems") || "")
    .split(",")
    .map(Number)
    .filter(Number.isFinite);
  const fleetGrowthConservative = params.get("fleetGrowthConservative") === "1";
  const blockers = (params.get("connectorBlockers") || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

  return {
    source: "tco",
    hardwareClass,
    gpuCount,
    modelId,
    modelParamsB,
    quant,
    horizonYears,
    attributableTcoUsd,
    fullTcoUsd,
    inferenceShare,
    allocationMethod,
    demandGrowthRate,
    fleetSystemsByYear,
    fleetGrowthConservative,
    activeHoursPerDay:
      activeHoursPerDay && activeHoursPerDay <= 24 ? activeHoursPerDay : null,
    blockers,
  };
}
