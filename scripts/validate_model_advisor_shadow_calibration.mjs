import capabilityData from "../data/model_capability_db.json" with { type: "json" };
import { getCatalog, rankModels, MARGINS } from "../src/modelAdvisorEngine.js";

const ACCEPTED_MARGINS = Object.freeze({
  intelligence_index: Object.freeze({ "frontier-like": 1.0, strong: 10.0, economical: 16.0 }),
  coding_index: Object.freeze({ "frontier-like": 2.0, strong: 18.0, economical: 30.0 }),
  agentic_index: Object.freeze({ "frontier-like": 0.5, strong: 5.0, economical: 9.5 }),
});
function assert(c, m) { if (!c) throw new Error(m); }

for (const [metric, priorities] of Object.entries(ACCEPTED_MARGINS)) for (const [priority, expected] of Object.entries(priorities)) assert(MARGINS[metric]?.[priority] === expected, `Live Advisor margin drift for ${metric}/${priority}.`);

const production = getCatalog().filter((m) => m.catalog_status === "recommended");
assert(production.length === 13, `Expected 13-model activated Advisor population; found ${production.length}.`);
const capabilityById = new Map(capabilityData.data.models.map((m) => [m.canonical_model_id, m]));

function assertSnapshotMapping(id, coverage) {
  const source = capabilityById.get(id);
  const model = production.find((m) => m.canonical_model_id === id);
  assert(source && model, `${id} AA mapping is missing.`);
  assert(source.confidence === "HIGH", `${id} AA source confidence drifted.`);
  for (const metric of ["intelligence_index", "coding_index", "agentic_index"]) {
    assert(model[metric] === (source[metric] ?? null), `${id} ${metric} does not match the checked-in AA snapshot.`);
  }
  const count = [model.intelligence_index, model.coding_index, model.agentic_index].filter(Number.isFinite).length;
  if (coverage === "exact") assert(count === 3, `${id} must expose all three recommendation metrics.`);
  if (coverage === "intelligence-only") assert(Number.isFinite(model.intelligence_index) && model.coding_index == null && model.agentic_index == null, `${id} must retain intelligence-only evidence until coverage is explicitly reviewed.`);
}

assertSnapshotMapping("qwen3.8-27b", "exact");
assertSnapshotMapping("gemma-4-26b-a4b-it", "intelligence-only");
for (const id of ["deepseek-v4-flash-0731", "deepseek-v4-pro-0813"]) {
  const m = production.find((x) => x.canonical_model_id === id);
  assert(m && m.intelligence_index == null && m.coding_index == null && m.agentic_index == null, `${id} must remain scoreless until an approved default-semantics AA mapping exists.`);
}
assertSnapshotMapping("nemotron-3-super-120b-a12b", "exact");

const metricByWorkload = { chat: "intelligence_index", coding: "coding_index", agentic: "agentic_index" };
for (const [workload, metric] of Object.entries(metricByWorkload)) {
  for (const quality of ["frontier-like", "strong", "economical"]) {
    const result = rankModels(production, metric, quality);
    assert(result.bestPerformance?.canonical_model_id === "qwen3.8-27b", `${workload}/${quality}: Qwen3.8 must be Best Performance under the current v4.3 evidence snapshot.`);
    assert(result.balanced?.canonical_model_id === "qwen3.8-27b", `${workload}/${quality}: Qwen3.8 must remain the balanced choice under the current v4.3 evidence snapshot.`);
    assert(result.efficiency?.canonical_model_id === "qwen3.8-27b", `${workload}/${quality}: Qwen3.8 must remain the efficiency choice under the current v4.3 evidence snapshot.`);
  }
}

console.log("Model Advisor activated calibration PASS: accepted margins remain exact across the 13-model recommended population; mutable AA scores reconcile to the current checked-in snapshot; Qwen3.8 remains the current unconstrained intelligence/coding/agentic leader and all three ranking slots; Gemma 4 carries intelligence-only default-semantics evidence; DeepSeek V4 Flash/Pro remain deliberately scoreless.");
