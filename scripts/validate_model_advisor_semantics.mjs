import { getCatalog, buildRecommendations, MARGINS, selectMetric } from "../src/modelAdvisorEngine.js";

const catalog = getCatalog();
const recommended = catalog.filter((m) => m.catalog_status === "recommended");
const recommendedIds = new Set(recommended.map((m) => m.canonical_model_id));
const expectedIds = new Set([
  "muse-glimmer-30b", "llama-4-scout", "llama-4-maverick",
  "granite-4.2-30b", "gpt-oss-20b", "gpt-oss-120b",
  "gemma-4-26b-a4b-it", "mistral-small-4", "mistral-large-3",
  "qwen3.8-27b", "deepseek-v4-flash-0731", "deepseek-v4-pro-0813", "nemotron-3-super-120b-a12b",
]);
if (recommended.length !== expectedIds.size) throw new Error(`Activated Advisor expected ${expectedIds.size} recommended models; found ${recommended.length}.`);
for (const id of expectedIds) if (!recommendedIds.has(id)) throw new Error(`Missing activated recommended model ${id}.`);

const expectedMargins = {
  intelligence_index: { "frontier-like": 1.0, strong: 10.0, economical: 16.0 },
  coding_index: { "frontier-like": 2.0, strong: 18.0, economical: 30.0 },
  agentic_index: { "frontier-like": 0.5, strong: 5.0, economical: 9.5 },
};
for (const [metric, priorities] of Object.entries(expectedMargins)) for (const [priority, expected] of Object.entries(priorities)) if (MARGINS[metric]?.[priority] !== expected) throw new Error(`Advisor margin drift for ${metric}/${priority}.`);

const qwen = recommended.find((m) => m.canonical_model_id === "qwen3.8-27b");
if (!qwen || qwen.intelligence_index !== 41.4 || qwen.coding_index !== 68.1 || qwen.agentic_index !== 46.8) throw new Error("Qwen3.8 sourced AA capability mapping drifted.");
const gemma = recommended.find((m) => m.canonical_model_id === "gemma-4-26b-a4b-it");
if (!gemma || gemma.intelligence_index !== 13.9 || gemma.coding_index != null || gemma.agentic_index != null) throw new Error("Gemma 4 default-semantics AA capability mapping drifted.");
for (const id of ["deepseek-v4-flash-0731", "deepseek-v4-pro-0813"]) {
  const model = recommended.find((m) => m.canonical_model_id === id);
  if (!model || model.intelligence_index != null || model.coding_index != null || model.agentic_index != null) throw new Error(`${id} must remain recommendation-eligible but scoreless until an approved default-semantics capability mapping exists.`);
}
const nemotron = recommended.find((m) => m.canonical_model_id === "nemotron-3-super-120b-a12b");
if (!nemotron || nemotron.intelligence_index !== 18.6 || nemotron.coding_index !== 37.7 || nemotron.agentic_index !== 4.2) throw new Error("Nemotron sourced capability mapping drifted.");

const workloads = ["chat", "coding", "agentic"];
const qualities = ["frontier-like", "strong", "economical"];
const optimizations = ["best-capability", "balanced", "infrastructure-efficiency"];
function inputs(primaryWorkload, qualityPriority, optimizationPriority, governance = "none") {
  return { primaryWorkload, qualityPriority, optimizationPriority, contextWindow: "none", multimodal: "none", license: "need-to-check", governance };
}

for (const workload of workloads) {
  for (const quality of qualities) {
    for (const optimization of optimizations) {
      const result = buildRecommendations(catalog, inputs(workload, quality, optimization));
      if (!result.cards.length) throw new Error(`Advisor returned no cards for ${workload}/${quality}/${optimization}.`);
      for (const card of result.cards) if (!recommendedIds.has(card.model.canonical_model_id)) throw new Error(`Advisor leaked non-recommended ${card.model.canonical_model_id}.`);
      const best = result.cards.find((c) => c.badges.includes("Best Performance"))?.model.canonical_model_id;
      if (best !== "qwen3.8-27b") throw new Error(`${workload}/${quality}/${optimization}: expected evidence-leading Qwen3.8 Best Performance; found ${best}.`);
      const overall = result.cards.find((c) => c.badges.includes("Best Overall Fit"))?.model.canonical_model_id;
      if (overall !== "qwen3.8-27b") throw new Error(`${workload}/${quality}/${optimization}: expected Qwen3.8 Best Overall Fit under current v4.3 evidence; found ${overall}.`);
      const metric = selectMetric(workload);
      const tier1 = result.ranking.tier1;
      for (let i = 1; i < tier1.length; i++) if ((tier1[i - 1][metric] ?? -Infinity) < (tier1[i][metric] ?? -Infinity)) throw new Error(`Metric ordering broken for ${workload}.`);
    }
  }
}

for (const workload of workloads) {
  const result = buildRecommendations(catalog, inputs(workload, "economical", "infrastructure-efficiency", "us-only"));
  const best = result.cards.find((c) => c.badges.includes("Best Performance"))?.model.canonical_model_id;
  if (best !== "muse-glimmer-30b") throw new Error(`${workload}/us-only: expected Muse Best Performance after governance filter; found ${best}.`);
  const overall = result.cards.find((c) => c.badges.includes("Best Overall Fit"))?.model.canonical_model_id;
  if (overall !== "gpt-oss-20b") throw new Error(`${workload}/us-only/economical/infrastructure-efficiency: expected gpt-oss-20b; found ${overall}.`);
}

console.log("Model Advisor semantic calibration PASS: thirteen current models are active; Qwen3.8 is the current unconstrained v4.3 evidence leader across intelligence/coding/agentic; Gemma 4 carries intelligence-only default-semantics evidence; DeepSeek V4 Flash/Pro remain deliberately scoreless; U.S.-only governance restores the expected Muse performance and gpt-oss-20b economical efficiency pattern.");
