import fs from "node:fs";

const source = fs.readFileSync("src/GpuSizingCalculator.jsx", "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(
  source.includes("const selectedBudget =") &&
    source.includes(
      'effectiveTcoSelection === "higher-growth" ? result?.budget?.higherGrowth : result?.budget?.recommended'
    ),
  "GPU Sizing must derive the visible budget from the configuration selected for TCO."
);
assert(
  source.includes("<BudgetPanel budget={selectedBudget ? { recommended: selectedBudget } : null} />"),
  "BudgetPanel must render the selected TCO configuration budget."
);
assert(
  !source.includes("function PodSizingHandoff()"),
  "Phase 2 Pod Sizing placeholder component should be removed from the production GPU Sizing experience."
);
assert(
  !source.includes("<PodSizingHandoff />"),
  "Phase 2 Pod Sizing placeholder should not render in the production GPU Sizing experience."
);

console.log(
  "GPU selected-budget/Phase 2 cleanup PASS: budget follows the selected TCO configuration and the Pod Sizing placeholder is absent."
);
