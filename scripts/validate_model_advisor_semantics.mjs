import { getCatalog, buildRecommendations, MARGINS, selectMetric } from "../src/modelAdvisorEngine.js";

const catalog = getCatalog();
const recommended = catalog.filter((m) => m.catalog_status === "recommended");
const recommendedIds = new Set(recommended.map((m) => m.canonical_model_id));
const expectedIds = new Set([
  "muse-glimmer-30b", "llama-4-scout", "llama-4-maverick",
  "granite-4.2-30b", "gpt-oss-20b", "gpt-oss-120b",
  "gemma-4-26b-a4b-it", "mistral-small-4", "mistral-large-3",
]);
if (recommended.length !== expectedIds.size) throw new Error(`Activated Advisor expected ${expectedIds.size} recommended models; found ${recommended.length}.`);
for (const id of expectedIds) if (!recommendedIds.has(id)) throw new Error(`Missing activated recommended model ${id}.`);

const expectedMargins = {
  intelligence_index: { "frontier-like": 1.0, strong: 10.0, economical: 16.0 },
  coding_index: { "frontier-like": 2.0, strong: 18.0, economical: 30.0 },
  agentic_index: { "frontier-like": 0.5, strong: 5.0, economical: 9.5 },
};
for (const [metric, priorities] of Object.entries(expectedMargins)) {
  for (const [priority, expected] of Object.entries(priorities)) if (MARGINS[metric]?.[priority] !== expected) throw new Error(`Advisor margin drift for ${metric}/${priority}.`);
}

const workloads = ["chat", "coding", "agentic"];
const qualities = ["frontier-like", "strong", "economical"];
const optimizations = ["best-capability", "balanced", "infrastructure-efficiency"];
function inputs(primaryWorkload, qualityPriority, optimizationPriority) {
  return { primaryWorkload, qualityPriority, optimizationPriority, contextWindow: "none", multimodal: "none", license: "need-to-check", governance: "none" };
}

for (const workload of workloads) {
  for (const quality of qualities) {
    for (const optimization of optimizations) {
      const result = buildRecommendations(catalog, inputs(workload, quality, optimization));
      if (!result.cards.length) throw new Error(`Advisor returned no cards for ${workload}/${quality}/${optimization}.`);
      for (const card of result.cards) if (!recommendedIds.has(card.model.canonical_model_id)) throw new Error(`Advisor leaked non-recommended ${card.model.canonical_model_id}.`);
      const best = result.cards.find((c) => c.badges.includes("Best Performance"))?.model.canonical_model_id;
      if (best !== "muse-glimmer-30b") throw new Error(`${workload}/${quality}/${optimization}: expected Muse Best Performance; found ${best}.`);
      const overall = result.cards.find((c) => c.badges.includes("Best Overall Fit"))?.model.canonical_model_id;
      if (optimization === "infrastructure-efficiency" && quality === "economical") {
        if (overall !== "gpt-oss-20b") throw new Error(`${workload}/${quality}: expected gpt-oss-20b infrastructure-efficiency overall fit; found ${overall}.`);
      } else if (overall !== "muse-glimmer-30b") {
        throw new Error(`${workload}/${quality}/${optimization}: expected Muse overall fit; found ${overall}.`);
      }
      const metric = selectMetric(workload);
      const tier1 = result.ranking.tier1;
      for (let i = 1; i < tier1.length; i++) if ((tier1[i - 1][metric] ?? -Infinity) < (tier1[i][metric] ?? -Infinity)) throw new Error(`Metric ordering broken for ${workload}.`);
    }
  }
}

const gemma = recommended.find((m) => m.canonical_model_id === "gemma-4-26b-a4b-it");
if (!gemma || gemma.intelligence_index != null || gemma.coding_index != null || gemma.agentic_index != null) throw new Error("Gemma 4 must remain recommendation-eligible but scoreless until exact capability mapping exists.");

console.log("Model Advisor semantic calibration PASS: nine current models are active, Muse remains evidence-backed performance/balanced leader, gpt-oss-20b appears for explicit economical infrastructure-efficiency tolerance, and Gemma 4 remains scoreless rather than receiving fabricated benchmarks.");
