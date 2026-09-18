import assert from "node:assert/strict";
import fs from "node:fs";

const app = fs.readFileSync("src/App.jsx", "utf8");
const ui = fs.readFileSync("src/InferenceEconomicsPreview.jsx", "utf8");

assert.ok(app.includes('path="/tco/inference-economics-preview"'));
assert.ok(app.includes('title="Inference Economics Preview"'));
assert.ok(app.includes('backHref="/tco"'));

// Preview stays a separate route; IE-5 adds only an explicit one-way Preview link from TCO.
const tco = fs.readFileSync("src/TcoCalculator.jsx", "utf8");
assert.ok(tco.includes("Open Inference Economics Preview"));
assert.ok(tco.includes("Preview only — does not change TCO calculations or reports"));

// Guardrails that should remain visible in the Preview UI.
assert.ok(ui.includes("PREVIEW — IE-5.4"));
assert.ok(ui.includes("Capacity is not consumption") === false); // principle lives in methodology, not marketing copy
assert.ok(ui.includes("Unused capacity does not lower this result."));
assert.ok(ui.includes("Configuration does not meet stated demand"));
assert.ok(ui.includes("MODELED"));
assert.ok(ui.includes("Production-serving factor"));
assert.ok(ui.includes('useState("")'));
assert.ok(ui.includes("No universal MLPerf Offline → production-serving conversion is assumed."));
assert.ok(ui.includes("Year 1 demand / serving capacity"));
assert.ok(ui.includes("exact source benchmark configuration"));
assert.ok(ui.includes("It does not automatically recalculate the TCO numerator"));
assert.ok(ui.includes('H200: ["FP8"]'));
assert.ok(ui.includes("Cost/token currently uses generated output tokens"));

console.log("Inference economics preview UI contract verified.");


// IE-5.1 usability contract: non-expert users must have in-context guidance.
assert.ok(ui.includes("function HelpDot"));
assert.ok(ui.includes("How do I determine the production-serving factor?"));
assert.ok(ui.includes("Measured sustained output tok/s"));
assert.ok(ui.includes("not 100% GPU utilization"));
assert.ok(ui.includes("If you do not have this measurement, use Request forecast instead."));
assert.ok(ui.includes("people, applications, copilots, agents, automations, and sub-agents"));


// IE-5.2 explanation hardening: help is click-to-expand, consistent with TCO.
assert.ok(ui.includes('aria-expanded={open}'));
assert.ok(ui.includes("function TipBox"));
assert.ok(ui.includes("Benchmark-adjusted throughput ceiling"));
assert.ok(ui.includes("This is a capacity-consumption ratio, not measured GPU utilization."));
assert.ok(ui.includes("MODELED ?"));
assert.ok(ui.includes("Modeled TCO allocation"));
assert.ok(ui.includes("Annual demand growth"));
assert.ok(ui.includes("demandGrowthRate"));


// IE-5.3 handoff transparency contract.
assert.ok(ui.includes("inheritedScenarioBlocked"));
assert.ok(ui.includes("INHERITED_SCENARIO_UNSUPPORTED"));
assert.ok(ui.includes("Inherited TCO scenario is not yet eligible for token economics"));


// IE-5.4 conservative fleet-growth disclosure.
assert.ok(ui.includes("Conservative fleet-growth treatment"));
assert.ok(ui.includes("Additional fleet cost is counted in TCO"));
