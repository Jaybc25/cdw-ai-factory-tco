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
}) {
  if (!isWorkloadMode) {
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

  const storageConfirmed = workloadStorageConfirmed === true;
  const isRackScaleSystem = Number(system?.gpus) >= 72;

  // Current NVIDIA BasePOD guidance explicitly covers up to eight B200/H200/H100
  // systems as one reference architecture. Rack-scale NVL systems and Rubin
  // require topology-specific architecture/quote treatment once more than one
  // rack/system is involved. Rubin Phase 1 already excludes quoted high-density
  // rack/cooling infrastructure from the loaded system price.
  let clusterScaleStatus = "PLANNING_ALLOWANCE";
  if (isRubinPhase1) {
    clusterScaleStatus = "ARCHITECTURE_QUOTE_REQUIRED";
  } else if (isRackScaleSystem && systemCount > 1) {
    clusterScaleStatus = "ARCHITECTURE_REVIEW_REQUIRED";
  } else if (!isRackScaleSystem && systemCount > BASEPOD_MAX_8_GPU_SYSTEMS) {
    clusterScaleStatus = "ARCHITECTURE_REVIEW_REQUIRED";
  }

  const rackCostStatus = system?.rackPlanningBasis
    ? "QUOTE_REQUIRED"
    : "MODELED";

  const requiresArchitectureReview =
    clusterScaleStatus !== "PLANNING_ALLOWANCE" ||
    rackCostStatus === "QUOTE_REQUIRED";

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
    storageStatus: storageConfirmed ? "CONFIRMED_INPUT" : "UNCONFIRMED_PLANNING_INPUT",
    clusterScaleStatus,
    rackCostStatus,
    requiresArchitectureReview,
    clientReady: storageConfirmed && !requiresArchitectureReview,
    summary: summaryParts.join(" · "),
    storageNote: storageConfirmed
      ? "Storage capacity is an explicit workload assumption."
      : "Storage capacity is not derived from GPU count, model size, or training tokens; the current values are planning inputs that must be confirmed or edited for this workload.",
    architectureNote: requiresArchitectureReview
      ? "The modeled subtotal retains the current shared cluster/storage assumptions. Validate management/network topology, rack/power/cooling, and storage design before treating the savings delta as client-ready."
      : "The shared cluster allowance remains within the current small-cluster planning envelope; storage capacity is still workload-specific.",
  };
}
