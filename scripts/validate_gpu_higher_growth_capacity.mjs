import { readFileSync } from "node:fs";
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
assert(topCatalogGrowth.deployedCapacity > topCatalogGrowth.baselineCapacity, "B300 higher-growth throughput capacity must exceed baseline.");

const multiNodeSelected = { ...h200, deployedCount: 16 };
const multiNodeGrowth = selectHigherGrowthConfiguration(multiNodeSelected, [multiNodeSelected, b200, b300], "effectiveAnchor");
assert(multiNodeGrowth != null, "A higher-growth configuration should be found when a higher-capacity deployment exists.");
assert(multiNodeGrowth.deployedCapacity > multiNodeGrowth.baselineCapacity, "Higher-growth throughput capacity must be strictly higher than baseline even when a more capable class uses fewer GPUs.");
assert(multiNodeGrowth.id === "B200", "The fixture should exercise a different-class higher-growth option.");
assert(multiNodeGrowth.growthBasis === "higher-capacity-class", "Different-class growth must identify the higher-capacity-class basis.");

const rackSelected = { ...gb200, deployedCount: 72 };
const rackGrowth = selectHigherGrowthConfiguration(rackSelected, [rackSelected, b300], "effectiveAnchor");
assert(rackGrowth?.id === "GB200 NVL72", "A rack-scale top-capacity recommendation must be allowed to grow within the same class.");
assert(rackGrowth.deployedCount === 144, "One additional NVL72 deployment quantum should produce 144 GPUs.");
assert(rackGrowth.deployedCapacity > rackGrowth.baselineCapacity, "Rack-scale higher-growth capacity must exceed baseline.");

const trainGrowth = selectHigherGrowthConfiguration(b300, [h200, b200, b300], "peakTFLOPS");
assert(trainGrowth?.id === "B300" && trainGrowth.deployedCount === 16, "Training should use the same deployable-capacity semantics.");
assert(trainGrowth.deployedCapacity > trainGrowth.baselineCapacity, "Training higher-growth capacity must exceed baseline.");

const uiSource = readFileSync(new URL("../src/GpuSizingCalculator.jsx", import.meta.url), "utf8");
assert(uiSource.includes("Higher-growth means more node-rounded deployed capacity, not necessarily a newer or faster GPU class"), "Calculator utilization copy must define higher-growth as deployed capacity/headroom, not GPU-class superiority.");
assert(uiSource.includes("Same GPU class, next deployment quantum for additional headroom"), "Same-class higher-growth wording must be explicit.");
assert(uiSource.includes("Different deployable configuration with more total capacity for additional headroom"), "Different-class higher-growth wording must describe total deployed capacity.");
assert((uiSource.match(/getHigherGrowthSubtitle\(result\.higherGrowth\)/g) || []).length === 3, "Calculator, selected-for-TCO report card, and alternatives report card should share the same higher-growth subtitle semantics.");
assert(uiSource.includes("getHigherGrowthAuditText(result.higherGrowth, mode)"), "Audit trail must use capacity-aware higher-growth wording.");
assert(!uiSource.includes("the other class with genuinely more real capability"), "Stale higher-growth wording must not imply a necessarily more capable GPU class.");

console.log("GPU higher-growth capacity PASS: growth means the next valid deployable capacity step, including same-class expansion at the top of the catalog.");
