import assert from "node:assert/strict";
import fs from "node:fs";

const app = fs.readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const guided = fs.readFileSync(new URL("../src/InferenceEconomicsGuidedPreview.jsx", import.meta.url), "utf8");
const landing = fs.readFileSync(new URL("../src/LandingPage.jsx", import.meta.url), "utf8");

assert.ok(app.includes('/tco/inference-economics-preview"'));
assert.ok(app.includes('/tco/inference-economics-preview-guided"'));
assert.ok(app.includes('/inference-economics"'));
assert.ok(app.includes("InferenceEconomicsPreview"));
assert.ok(app.includes("InferenceEconomicsGuidedPreview"));
assert.ok(app.includes("function InferenceEconomicsRoute()"));
assert.ok(app.includes('source === "tco"'));
assert.ok(app.includes('"Adjust TCO assumptions"'));
assert.ok(app.includes('"Back to GPU Sizing"'));
assert.ok(app.includes('"All tools"'));

assert.ok(landing.includes('path: "/inference-economics"'));
assert.ok(landing.includes('name: "Inference\\nEconomics"'));
assert.ok(landing.includes("const ANALYSIS_TOOLS = ["));
assert.ok(landing.includes("const READINESS_TOOL = {"));
assert.ok(landing.includes('className="afl-readiness"'));
assert.ok(landing.includes("ANALYSIS_TOOLS.map"));
assert.ok(!landing.includes("{TOOLS.map((tool) => ("));
assert.ok(landing.includes("html, body, #root { max-width:100%; overflow-x:hidden; }"));
assert.ok(landing.includes("grid-template-columns:repeat(3,minmax(0,1fr))"));
assert.ok(landing.includes("max-width:100vw"));
const authWidget = fs.readFileSync(new URL("../src/AuthWidget.jsx", import.meta.url), "utf8");
assert.ok(authWidget.includes('flexWrap: "wrap"'));
assert.ok(authWidget.includes('overflowWrap: "anywhere"'));

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
assert.ok(guided.includes("TOPOLOGY_SCALEOUT_REQUIRED"));
assert.ok(guided.includes("topology-specific throughput evidence"));

assert.ok(guided.includes("Deployment evidence basis:"));
assert.ok(guided.includes('loadSessionState("inference-economics")'));
assert.ok(guided.includes('saveSessionState("inference-economics"'));
assert.ok(guided.includes('label="Deployment evidence basis"'));
assert.ok(guided.includes("Exact benchmark ·"));
assert.ok(guided.includes("Replica-scaled"));
assert.ok(guided.includes("-GPU serving groups"));
assert.ok(guided.includes("Deployed GPUs evaluated"));
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
assert.ok(guided.includes("Comparison basis:"));
assert.ok(guided.includes("70% input / 30% output token mix · no cache discount"));
assert.ok(guided.includes("coveredYearsBeforeCapacityCliff"));
assert.ok(guided.includes("Capacity covers through Year"));
assert.ok(guided.includes("is the first year above modeled capacity"));
assert.ok(guided.includes("Peak annual shortfall:"));
assert.ok(guided.includes('<details style={details} open={!productionServingFactor}>'));
assert.ok(guided.includes("evidenceStatus: throughput.evidence?.status"));
assert.ok(guided.includes('<b>Evidence status:</b> {e.evidenceStatus || "—"}'));
assert.ok(!guided.includes("<b>Evidence status:</b> MODELED"));
assert.ok(!guided.includes("ALTERNATIVE PREVIEW"));
assert.ok(!guided.includes("existing technical Preview"));
assert.ok(guided.includes("Estimate effective private-AI inference cost and compare it with managed-API token pricing."));
assert.ok(guided.includes("function compactMoney(v)"));
assert.ok(guided.includes('notation: "compact"'));
assert.ok(guided.includes("What this means"));
assert.ok(guided.includes("Modeled cost difference"));
assert.ok(guided.includes("cost per 1M output tokens"));
assert.ok(guided.includes("Comparison basis:"));
assert.ok(guided.includes("This is a cost comparison only and does not assert equivalent model capability."));
assert.ok(!guided.includes("API minus private"));
assert.ok(guided.includes("Get the full report (PDF)"));
assert.ok(guided.includes("Calculation Methodology & Audit Trail"));
assert.ok(guided.includes("Private cost per 1M output tokens"));
assert.ok(guided.includes("Effective managed API cost per 1M output"));
assert.ok(guided.includes('view === "report"'));
assert.ok(guided.includes('view === "audit"'));
assert.ok(guided.includes("Back to calculator"));
assert.ok(guided.includes("Back to report"));
assert.ok(guided.includes("Reproducible derivation"));
assert.ok(guided.includes("Horizon output demand"));
assert.ok(guided.includes("Dollar difference"));
assert.ok(guided.includes("window.print()"));
assert.ok(guided.includes("Next · Build the business case"));
assert.ok(guided.includes("Translate these inference economics into ROI and business value."));
assert.ok(guided.includes("Your original TCO upfront and annual recurring investment will carry forward exactly into ROI."));
assert.ok(guided.includes("Inference Economics knows the assigned workload cost, but not a defensible upfront-versus-recurring investment split."));
assert.ok(guided.includes("Continue to ROI"));
assert.ok(guided.includes("Open ROI Calculator"));
assert.ok(guided.includes("roiInitialCostUsd"));
assert.ok(guided.includes("roiRecurringCostUsd"));

console.log("Guided inference economics Preview contract verified.");
