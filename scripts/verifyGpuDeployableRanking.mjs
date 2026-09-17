#!/usr/bin/env node

import fs from "node:fs";
import { selectDeployableRecommendation } from "../src/gpuSizingRecommendation.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// 9 B300 -> 16 deployed vs 6 Rubin NVL8 -> 8 deployed: Rubin must win.
const rubinWins = selectDeployableRecommendation([
  { id: "B300", gpusWorkload: 9, nodeSize: 8 },
  { id: "Rubin NVL8", gpusWorkload: 6, nodeSize: 8 },
]);
assert(rubinWins.id === "Rubin NVL8", `Expected Rubin NVL8, got ${rubinWins.id}`);
assert(rubinWins.deployedCount === 8, `Expected 8 deployed Rubin GPUs, got ${rubinWins.deployedCount}`);

// 60 B300 -> 64 deployed vs 40 Vera Rubin -> 72 deployed: B300 must win.
const b300Wins = selectDeployableRecommendation([
  { id: "B300", gpusWorkload: 60, nodeSize: 8 },
  { id: "Vera Rubin NVL72", gpusWorkload: 40, nodeSize: 72 },
]);
assert(b300Wins.id === "B300", `Expected B300, got ${b300Wins.id}`);
assert(b300Wins.deployedCount === 64, `Expected 64 deployed B300 GPUs, got ${b300Wins.deployedCount}`);

// Equal deployed footprint: favor lower raw requirement.
const rawTieBreak = selectDeployableRecommendation([
  { id: "A", gpusWorkload: 8, nodeSize: 8 },
  { id: "B", gpusWorkload: 5, nodeSize: 8 },
]);
assert(rawTieBreak.id === "B", `Expected lower raw requirement tie-break, got ${rawTieBreak.id}`);

// Equal technical footprint: acquisition cost may break a true tie when both priced.
const costTieBreak = selectDeployableRecommendation([
  { id: "A", gpusWorkload: 8, nodeSize: 8, deployedCost: 900000 },
  { id: "B", gpusWorkload: 8, nodeSize: 8, deployedCost: 800000 },
]);
assert(costTieBreak.id === "B", `Expected lower cost tie-break, got ${costTieBreak.id}`);

// F4: when both options deploy the same node count and both retain adequate
// headroom, do not spend more just because one has a lower raw GPU requirement.
const safeCostWins = selectDeployableRecommendation([
  { id: "EXPENSIVE", gpusWorkload: 4, nodeSize: 8, deployedCost: 900000, technicalUtilization: 0.50 },
  { id: "CHEAPER", gpusWorkload: 6, nodeSize: 8, deployedCost: 750000, technicalUtilization: 0.75 },
]);
assert(safeCostWins.id === "CHEAPER", `Expected lower-cost safe-headroom option, got ${safeCostWins.id}`);

// F4/F5 boundary: cost must not promote a materially saturated option over an
// equally sized deployed alternative with reasonable production headroom.
const headroomWins = selectDeployableRecommendation([
  { id: "CHEAP-SATURATED", gpusWorkload: 8, nodeSize: 8, deployedCost: 700000, technicalUtilization: 0.96 },
  { id: "HEADROOM", gpusWorkload: 6, nodeSize: 8, deployedCost: 900000, technicalUtilization: 0.75 },
]);
assert(headroomWins.id === "HEADROOM", `Expected production-headroom option, got ${headroomWins.id}`);

const source = fs.readFileSync("src/GpuSizingCalculator.jsx", "utf8");
assert((source.match(/selectDeployableRecommendation\(priced\)/g) || []).length === 2, "Inference and training must rank priced, node-rounded candidates");
assert((source.match(/technicalUtilization: Math\.min\(c\.gpusWorkloadExact \/ count, 1\)/g) || []).length === 2, "Inference and training must supply continuous technical utilization before ranking");
assert(!source.includes('Loaded budget/TCO economics are intentionally not shown yet'), "Stale Rubin TCO-gated report copy must be removed");
assert(source.includes('Inference candidates remain limited to classes with defensible absolute'), "Rubin inference evidence gate must remain explicit");

console.log("GPU deployable recommendation ranking PASS");
console.log("- node-rounded deployment beats raw GPU-count ranking");
console.log("- same-footprint options preserve headroom first, then prefer lower deployed cost");
console.log("- Rubin NVL8 can win when it reduces actual deployed capacity");
console.log("- NVL72 does not win when node rounding makes the real deployment larger");
console.log("- inference Rubin evidence gate remains unchanged");
console.log("- stale Rubin TCO-disabled messaging is absent");
