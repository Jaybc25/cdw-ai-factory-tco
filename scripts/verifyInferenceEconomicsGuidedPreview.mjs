import assert from "node:assert/strict";
import fs from "node:fs";

const app = fs.readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const guided = fs.readFileSync(new URL("../src/InferenceEconomicsGuidedPreview.jsx", import.meta.url), "utf8");

assert.ok(app.includes('/tco/inference-economics-preview"'));
assert.ok(app.includes('/tco/inference-economics-preview-guided"'));
assert.ok(app.includes("InferenceEconomicsPreview"));
assert.ok(app.includes("InferenceEconomicsGuidedPreview"));

for (const title of [
  "Your private AI scenario",
  "Expected AI usage",
  "Your private AI economics",
  "Compare with a managed API",
]) {
  assert.ok(guided.includes(title), `Missing guided stage: ${title}`);
}

assert.ok(guided.includes("Customize API assumptions"));
assert.ok(guided.includes("Technical assumptions"));
assert.ok(guided.includes("Capacity check:"));
assert.ok(guided.includes("Production throughput assumption"));
assert.ok(guided.includes("complete the capacity check"));
assert.ok(guided.includes("Evidence & methodology"));
assert.ok(guided.includes("Peak capacity used"));
assert.ok(guided.includes("peakDemandUtilizationOfCapacity"));
assert.ok(guided.includes("Limited production headroom:"));
assert.ok(guided.includes(">= 0.85"));
assert.ok(guided.includes("calculateDemandBoundInferenceEconomics"));
assert.ok(guided.includes("calculateManagedApiWorkloadEconomics"));
assert.ok(guided.includes("comparePrivateAndManagedApi"));
assert.ok(guided.includes("getManagedApiRate"));
assert.ok(guided.includes("0.70 / 0.30"));
assert.ok(guided.includes("does not assert equivalent model capability"));
assert.ok(guided.includes("Inference cost allocation"));
assert.ok(guided.includes("inference share = 1 − training share"));
assert.ok(guided.includes("TCO attribution basis:"));
assert.ok(guided.includes("Shared and fixed infrastructure costs may not fall in direct proportion to workload share"));
assert.ok(guided.includes('"Private AI · " + (model?.label || "Selected model")'));
assert.ok(guided.includes("Reference mix: 70% input / 30% output · no cache discount"));
assert.ok(guided.includes("coveredYearsBeforeCapacityCliff"));
assert.ok(guided.includes("Capacity covers through Year"));
assert.ok(guided.includes("is the first year above modeled capacity"));
assert.ok(guided.includes("Peak annual shortfall:"));
assert.ok(guided.includes('<details style={details} open={!productionServingFactor}>'));
assert.ok(guided.includes("evidenceStatus: throughput.evidence?.status"));
assert.ok(guided.includes('<b>Evidence status:</b> {e.evidenceStatus || "—"}'));
assert.ok(!guided.includes("<b>Evidence status:</b> MODELED"));

console.log("Guided inference economics Preview contract verified.");
