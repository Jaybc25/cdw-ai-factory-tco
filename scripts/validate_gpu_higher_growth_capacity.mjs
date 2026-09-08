import { selectHigherGrowthConfiguration } from "../src/gpuSizingAlternatives.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const b300 = { id: "B300", nodeSize: 8, deployedCount: 8, effectiveAnchor: 15200, peakTFLOPS: 5500, deployedCost: 800000 };
const h200 = { id: "H200", nodeSize: 8, deployedCount: 8, effectiveAnchor: 4373, peakTFLOPS: 1979, deployedCost: 400000 };
const b200 = { id: "B200", nodeSize: 8, deployedCount: 8, effectiveAnchor: 12357, peakTFLOPS: 4500, deployedCost: 700000 };
const gb200 = { id: "GB200 NVL72", nodeSize: 72, deployedCount: 72, effectiveAnchor: 12022, peakTFLOPS: 4500, deployedCost: 3000000 };

const topCatalogGrowth = selectHigherGrowthConfiguration(b300, [h200, b200, gb200, b300], "effectiveAnchor");
assert(topCatalogGrowth?.id === "B300", "Top-of-catalog B300 should grow within the same class.");
assert(topCatalogGrowth.deployedCount === 16, "8x B300 should step to 16x B300, not return no alternative.");
assert(topCatalogGrowth.growthBasis === "next-deployment-quantum", "B300 same-class growth must identify the next deployment quantum.");

const multiNodeSelected = { ...h200, deployedCount: 16 };
const multiNodeGrowth = selectHigherGrowthConfiguration(multiNodeSelected, [multiNodeSelected, b200, b300], "effectiveAnchor");
assert(multiNodeGrowth?.deployedCount > 16, "Higher-growth capacity must exceed the selected deployment capacity.");
assert(multiNodeGrowth.deployedCapacity > multiNodeGrowth.baselineCapacity, "Higher-growth throughput capacity must be strictly higher than baseline.");

const rackSelected = { ...gb200, deployedCount: 72 };
const rackGrowth = selectHigherGrowthConfiguration(rackSelected, [rackSelected, b300], "effectiveAnchor");
assert(rackGrowth?.id === "GB200 NVL72", "A rack-scale top-capacity recommendation must be allowed to grow within the same class.");
assert(rackGrowth.deployedCount === 144, "One additional NVL72 deployment quantum should produce 144 GPUs.");

const trainGrowth = selectHigherGrowthConfiguration(b300, [h200, b200, b300], "peakTFLOPS");
assert(trainGrowth?.id === "B300" && trainGrowth.deployedCount === 16, "Training should use the same deployable-capacity semantics.");

console.log("GPU higher-growth capacity PASS: growth means the next valid deployable capacity step, including same-class expansion at the top of the catalog.");
