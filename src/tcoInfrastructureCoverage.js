// M5: Infrastructure-cost coverage guardrails for TCO workload mode.
//
// The goal is intentionally NOT to invent a universal storage-per-GPU ratio or
// linear cluster-cost multiplier. NVIDIA reference architectures scale in
// discrete topology units, while storage capacity depends on the workload.
// This helper therefore classifies when the current planning allowances are
// still within a documented small-cluster envelope and when architecture-level
// validation is required before treating the modeled delta as client-ready.

export const BASEPOD_MAX_8_GPU_SYSTEMS = 8;

export function getTcoInfrastructureCoverage({
  isWorkloadMode,
  isRubinPhase1,
  system,
  systemName,
  systemCount,
  rackCount,
  fastPB,
  bulkPB,
  workloadStorageConfirmed,
  clusterAllowance,
  facility,
  powerRate,
  retrofit,
  growth,
  horizon,
  rateCard,
  coloRateOverridden,
  quoteReview,
}) {
  const isRackScaleSystem = Number(system?.gpus) >= 72;
  if (!isWorkloadMode && !isRackScaleSystem && !isRubinPhase1) {
    return {
      applies: false,
      storageConfirmed: true,
      clusterScaleStatus: "NOT_APPLICABLE",
      rackCostStatus: "NOT_APPLICABLE",
      requiresArchitectureReview: false,
      clientReady: true,
      summary: "Spend mode retains its existing audited TCO basis.",
    };
  }

  const storageConfirmed = !isWorkloadMode || workloadStorageConfirmed === true;
  // The review is tied to the actual modeled inputs. Changing system, fleet,
  // facility, or a cost assumption invalidates the prior acknowledgment.
  const reviewBasis = JSON.stringify({ systemName, systemCount, rackCount, facility, powerRate, growth, horizon, retrofit: facility === "Self-hosted (retrofit)" ? retrofit : null,
    rateCard: rateCard && Object.fromEntries(["perSysCost", "cluster", "sysKw", "equinixMo", "adminRatio", "opFTE", "netMo", "fastPB", "bulkPB", "fastSupPB", "bulkSupPB", "kwPerPB", "racksPerPB", "setupRack", "opsGrowth"].map((key) => [key, rateCard[key]])),
    coloRateOverridden, fastPB, bulkPB });
  const highDensityReviewConfirmed = isRackScaleSystem && !isRubinPhase1 &&
    quoteReview?.confirmed === true && Boolean(quoteReview.reference?.trim()) &&
    quoteReview.basis === reviewBasis && (facility !== "Equinix" || coloRateOverridden === true);

  // Current NVIDIA BasePOD guidance explicitly covers up to eight B200/H200/H100
  // systems as one reference architecture. Rack-scale NVL systems and Rubin
  // require topology-specific architecture/quote treatment once more than one
  // rack/system is involved. Rubin Phase 1 already excludes quoted high-density
  // rack/cooling infrastructure from the loaded system price.
  let clusterScaleStatus = "PLANNING_ALLOWANCE";
  if (isRubinPhase1) {
    clusterScaleStatus = "ARCHITECTURE_QUOTE_REQUIRED";
  } else if (isRackScaleSystem && !highDensityReviewConfirmed) {
    clusterScaleStatus = "ARCHITECTURE_REVIEW_REQUIRED";
  } else if (!isRackScaleSystem && systemCount > BASEPOD_MAX_8_GPU_SYSTEMS) {
    clusterScaleStatus = "ARCHITECTURE_REVIEW_REQUIRED";
  }

  const rackCostStatus = system?.rackPlanningBasis
    ? "QUOTE_REQUIRED"
    : isRackScaleSystem && !highDensityReviewConfirmed ? "COVERAGE_REVIEW_REQUIRED" : "MODELED";

  const requiresArchitectureReview =
    clusterScaleStatus !== "PLANNING_ALLOWANCE" ||
    rackCostStatus !== "MODELED";

  const totalPB = Number(fastPB || 0) + Number(bulkPB || 0);
  const summaryParts = [
    `${systemCount} × ${systemName}`,
    `${rackCount} modeled rack${rackCount === 1 ? "" : "s"}`,
    `${totalPB.toFixed(2)} PB storage`,
    `${Math.round(clusterAllowance || 0).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })} shared cluster allowance`,
  ];

  return {
    applies: true,
    storageConfirmed,
    storageStatus: !isWorkloadMode ? "NOT_APPLICABLE" : storageConfirmed ? "CONFIRMED_INPUT" : "UNCONFIRMED_PLANNING_INPUT",
    clusterScaleStatus,
    rackCostStatus,
    highDensityReviewRequired: isRackScaleSystem,
    highDensityReviewConfirmed,
    reviewBasis,
    reviewReference: highDensityReviewConfirmed ? quoteReview.reference.trim() : null,
    requiresArchitectureReview,
    clientReady: storageConfirmed && !requiresArchitectureReview,
    summary: summaryParts.join(" · "),
    storageNote: !isWorkloadMode ? "Spend-derived storage retains its existing planning basis." : storageConfirmed
      ? "Storage capacity is an explicit workload assumption."
      : "Storage capacity is not derived from GPU count, model size, or training tokens; the current values are planning inputs that must be confirmed or edited for this workload.",
    architectureNote: isRubinPhase1
      ? "Rubin Phase 1 still excludes quoted high-density infrastructure; confirm rack, cooling, power distribution, fabric, installation, software, and facility costs in a project-specific design before client use."
      : isRackScaleSystem && !highDensityReviewConfirmed
      ? `High-density quote/coverage review required. Confirm rack, cooling, power distribution, fabric, installation, selected software, and facility costs against a customer/CDW quote or documented existing-facility coverage.${facility === "Equinix" && !coloRateOverridden ? " The generic Equinix bundle is calibrated for eight-GPU systems; enter a quoted NVL72 bundle rate in the rate card." : ""}`
      : requiresArchitectureReview
      ? "The modeled subtotal retains the current shared cluster/storage assumptions. Validate management/network topology, rack/power/cooling, and storage design before treating the savings delta as client-ready."
      : "The shared cluster allowance remains within the current small-cluster planning envelope; storage capacity is still workload-specific.",
  };
}
