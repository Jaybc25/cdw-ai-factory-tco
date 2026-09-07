import { getCatalog, rankModels, MARGINS } from "../src/modelAdvisorEngine.js";

const ACCEPTED_MARGINS = Object.freeze({
  intelligence_index: Object.freeze({ "frontier-like": 1.0, strong: 10.0, economical: 16.0 }),
  coding_index: Object.freeze({ "frontier-like": 2.0, strong: 18.0, economical: 30.0 }),
  agentic_index: Object.freeze({ "frontier-like": 0.5, strong: 5.0, economical: 9.5 }),
});
function assert(condition, message) { if (!condition) throw new Error(message); }

for (const [metric, priorities] of Object.entries(ACCEPTED_MARGINS)) {
  for (const [priority, expected] of Object.entries(priorities)) assert(MARGINS[metric]?.[priority] === expected, `Live Advisor margin drift for ${metric}/${priority}.`);
}

const production = getCatalog().filter((m) => m.catalog_status === "recommended");
assert(production.length === 9, `Expected 9-model activated Advisor population; found ${production.length}.`);
const metricByWorkload = { chat: "intelligence_index", coding: "coding_index", agentic: "agentic_index" };
for (const [workload, metric] of Object.entries(metricByWorkload)) {
  for (const quality of ["frontier-like", "strong", "economical"]) {
    const result = rankModels(production, metric, quality);
    assert(result.bestPerformance?.canonical_model_id === "muse-glimmer-30b", `${workload}/${quality}: Muse must remain Best Performance.`);
    assert(result.balanced?.canonical_model_id === "muse-glimmer-30b", `${workload}/${quality}: Muse must remain balanced choice.`);
    const expectedEfficiency = quality === "economical" ? "gpt-oss-20b" : "muse-glimmer-30b";
    assert(result.efficiency?.canonical_model_id === expectedEfficiency, `${workload}/${quality}: expected efficiency ${expectedEfficiency}; found ${result.efficiency?.canonical_model_id}.`);
  }
}

console.log("Model Advisor activated calibration PASS: accepted AA 4.2 margins remain exact across the nine-model production population; Muse remains performance/balanced leader and gpt-oss-20b appears only under explicit economical infrastructure-efficiency tolerance.");
