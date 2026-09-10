// Phase 1 GPU Sizing recommendation policy.
//
// Auto-recommendations should compare what a customer would actually deploy,
// not only the theoretical unrounded GPU requirement. This is especially
// important when comparing 8-GPU systems with NVL72-class systems.
//
// Ranking order:
// 1. Fewer node-rounded/deployable GPUs.
// 2. Lower raw workload GPU requirement.
// 3. Lower acquisition cost when both candidates have priced configurations.
// 4. Stable catalog order as final deterministic tie-break.

export function withDeployableCount(candidate) {
  if (!candidate || !Number.isFinite(candidate.gpusWorkload) || !Number.isFinite(candidate.nodeSize) || candidate.nodeSize <= 0) {
    throw new Error("GPU candidate requires finite gpusWorkload and positive nodeSize");
  }
  const deployedCount = Math.ceil(candidate.gpusWorkload / candidate.nodeSize) * candidate.nodeSize;
  return { ...candidate, deployedCount };
}

export function selectDeployableRecommendation(candidates) {
  if (!Array.isArray(candidates) || candidates.length === 0) return null;

  const ranked = candidates.map((candidate, index) => ({
    ...withDeployableCount(candidate),
    __catalogIndex: index,
  }));

  ranked.sort((a, b) => {
    if (a.deployedCount !== b.deployedCount) return a.deployedCount - b.deployedCount;
    if (a.gpusWorkload !== b.gpusWorkload) return a.gpusWorkload - b.gpusWorkload;

    const aCost = Number.isFinite(a.deployedCost) ? a.deployedCost : null;
    const bCost = Number.isFinite(b.deployedCost) ? b.deployedCost : null;
    if (aCost != null && bCost != null && aCost !== bCost) return aCost - bCost;

    return a.__catalogIndex - b.__catalogIndex;
  });

  const { __catalogIndex, ...selected } = ranked[0];
  return selected;
}
