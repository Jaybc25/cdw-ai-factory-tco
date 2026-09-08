function finitePositive(value) {
  return Number.isFinite(value) && value > 0;
}

function optionCapacity(option, capacityPerGpuKey) {
  const perGpu = Number(option?.[capacityPerGpuKey]);
  const count = Number(option?.deployedCount);
  if (!finitePositive(perGpu) || !finitePositive(count)) return null;
  return perGpu * count;
}

/**
 * Select the next sensible production-capacity step above the current
 * recommendation. This deliberately separates "growth" from "newer GPU".
 *
 * Candidates are the already-sized, node-rounded production configurations.
 * We also synthesize one additional deployment quantum of the selected class,
 * so a top-of-catalog recommendation can still offer useful growth headroom.
 */
export function selectHigherGrowthConfiguration(selected, candidates, capacityPerGpuKey) {
  if (!selected) return null;

  const selectedCapacity = optionCapacity(selected, capacityPerGpuKey);
  const nodeSize = Number(selected.nodeSize);
  if (!finitePositive(selectedCapacity) || !finitePositive(nodeSize) || !finitePositive(selected.deployedCount)) return null;

  const sameClassCount = selected.deployedCount + nodeSize;
  const sameClass = {
    ...selected,
    deployedCount: sameClassCount,
    deployedCost: Number.isFinite(selected.deployedCost)
      ? selected.deployedCost * (sameClassCount / selected.deployedCount)
      : null,
    growthBasis: "next-deployment-quantum",
  };

  const options = [sameClass];
  for (const candidate of candidates || []) {
    if (!candidate || candidate.id === selected.id) continue;
    const capacity = optionCapacity(candidate, capacityPerGpuKey);
    if (capacity != null && capacity > selectedCapacity) {
      options.push({ ...candidate, growthBasis: "higher-capacity-class" });
    }
  }

  options.sort((a, b) => {
    const capacityDelta = optionCapacity(a, capacityPerGpuKey) - optionCapacity(b, capacityPerGpuKey);
    if (capacityDelta !== 0) return capacityDelta;

    const costA = Number.isFinite(a.deployedCost) ? a.deployedCost : Number.POSITIVE_INFINITY;
    const costB = Number.isFinite(b.deployedCost) ? b.deployedCost : Number.POSITIVE_INFINITY;
    if (costA !== costB) return costA - costB;

    if (a.deployedCount !== b.deployedCount) return a.deployedCount - b.deployedCount;
    return String(a.id).localeCompare(String(b.id));
  });

  const chosen = options[0];
  return {
    ...chosen,
    baselineCapacity: selectedCapacity,
    deployedCapacity: optionCapacity(chosen, capacityPerGpuKey),
  };
}
