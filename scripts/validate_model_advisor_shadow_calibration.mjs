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
for (const id of ["qwen3.8-27b", "deepseek-v4-flash-0731", "deepseek-v4-pro-0813"]) {
  const m = production.find((x) => x.canonical_model_id === id);
  assert(m && m.intelligence_index == null && m.coding_index == null && m.agentic_index == null, `${id} must remain scoreless until exact AA mapping exists.`);
}
const nemotron = production.find((m) => m.canonical_model_id === "nemotron-3-super-120b-a12b");
assert(nemotron?.intelligence_index === 18.6 && nemotron?.coding_index === 37.7 && nemotron?.agentic_index === 4.2, "Nemotron AA mapping drifted.");

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

console.log("Model Advisor activated calibration PASS: accepted AA 4.2 margins remain exact across the 13-model recommended population; scoreless exact variants do not distort rankings; Nemotron retains sourced scores without displacing Muse, and gpt-oss-20b appears only under explicit economical efficiency tolerance.");
