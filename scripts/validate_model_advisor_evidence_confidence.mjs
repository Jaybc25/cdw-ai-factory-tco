import { getCatalog, rankModels } from "../src/modelAdvisorEngine.js";

function assert(c, m) { if (!c) throw new Error(m); }

const catalog = getCatalog();
const byId = new Map(catalog.map((m) => [m.canonical_model_id, m]));

const exact = byId.get("qwen3.8-27b");
assert(exact?.benchmark_evidence_level === "exact", "Qwen3.8 must expose exact benchmark evidence.");
assert(exact.benchmark_evidence_metric_count === 3, "Qwen3.8 must expose all three recommendation metrics.");

const exactLimited = byId.get("gemma-4-26b-a4b-it");
assert(exactLimited?.benchmark_evidence_level === "exact-limited", "Gemma 4 must expose exact-but-limited benchmark evidence.");
assert(exactLimited.benchmark_evidence_metric_count === 1, "Gemma 4 should currently expose intelligence only.");

for (const id of ["deepseek-v4-flash-0731", "deepseek-v4-pro-0813"]) {
  const model = byId.get(id);
  assert(model?.benchmark_evidence_level === "comparative-limited", `${id} must disclose limited comparative evidence.`);
  assert(model.benchmark_evidence_metric_count === 0, `${id} must remain scoreless.`);
}

const recommended = catalog.filter((m) => m.catalog_status === "recommended");
for (const metric of ["intelligence_index", "coding_index", "agentic_index"]) {
  const before = rankModels(recommended.map((m) => ({ ...m, benchmark_evidence_level: undefined, benchmark_evidence_label: undefined, benchmark_evidence_detail: undefined, benchmark_evidence_metric_count: undefined })), metric, "strong");
  const after = rankModels(recommended, metric, "strong");
  assert(before.bestPerformance?.canonical_model_id === after.bestPerformance?.canonical_model_id, `${metric}: evidence disclosure changed Best Performance.`);
  assert(before.efficiency?.canonical_model_id === after.efficiency?.canonical_model_id, `${metric}: evidence disclosure changed efficiency ranking.`);
  assert(before.balanced?.canonical_model_id === after.balanced?.canonical_model_id, `${metric}: evidence disclosure changed balanced ranking.`);
}

console.log("Model Advisor evidence confidence PASS: benchmark evidence is distinct from technical-spec confidence, exact/limited/unmapped states are disclosed, and evidence metadata does not affect ranking.");
