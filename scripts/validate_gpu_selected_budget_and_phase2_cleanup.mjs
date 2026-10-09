import fs from "node:fs";

const source = fs.readFileSync("src/GpuSizingCalculator.jsx", "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(source.includes('const selectedBudget = effectiveTcoSelection === "rtx" ? null : effectiveTcoSelection === "higher-growth" ? result?.budget?.higherGrowth : result?.budget?.recommended;'), "GPU Sizing must derive the visible enterprise budget from the selected Recommended/Higher-growth configuration while RTX uses its dedicated lifecycle TCO path.");
assert(source.includes('<BudgetPanel budget={selectedBudget ? { recommended: selectedBudget } : null} />'), "BudgetPanel must render the selected enterprise TCO configuration budget and remain empty for RTX selection.");
assert(source.includes('effectiveTcoSelection === "rtx" && rtxTcoHref'), "RTX selection must route to the dedicated RTX lifecycle TCO handoff instead of reusing the enterprise budget/TCO path.");
assert(source.includes('data-testid="rtx-selected-handoff"'), "RTX selection must expose a dedicated selected next-step handoff.");
assert(!source.includes("function PodSizingHandoff()"), "Phase 2 Pod Sizing placeholder component should be removed from the production GPU Sizing experience.");
assert(!source.includes("<PodSizingHandoff />"), "Phase 2 Pod Sizing placeholder should not render in the production GPU Sizing experience.");

assert(!source.includes("Phase 1 TCO"), "Customer-facing GPU Sizing copy should use planning TCO wording, not internal Phase 1 labels.");
assert(!source.includes("Phase 2 activity"), "Customer-facing GPU Sizing copy should not expose internal Phase 2 project-stage language.");
assert(!source.includes("before client use"), "Customer-facing GPU Sizing copy should use pricing freshness language rather than internal client-use instructions.");

assert(source.includes("Recommended next step · Compare total cost"), "GPU Sizing should label enterprise TCO as the recommended next step.");
assert(source.includes("Already know your private AI cost?"), "GPU Sizing should expose the advanced direct-to-Inference-Economics shortcut.");
assert(source.includes("buildInferenceEconomicsGpuSizingHandoff"), "GPU Sizing should use the qualified technical-context IE handoff builder.");
assert(source.includes("inferenceHandoff?.eligible"), "The direct IE shortcut must be gated by exact benchmark eligibility.");
assert(source.includes("You will still need to enter or confirm the private cost assigned to this workload."), "GPU Sizing must not imply that technical sizing established private cost.");

console.log("GPU selected-budget/Phase 2 cleanup PASS: enterprise budget follows Recommended/Higher-growth selection, RTX uses dedicated lifecycle TCO, and the Pod Sizing placeholder is absent.");
