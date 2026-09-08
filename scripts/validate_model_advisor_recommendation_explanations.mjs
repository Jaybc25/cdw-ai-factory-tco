import { getCatalog, buildRecommendations } from "../src/modelAdvisorEngine.js";

function assert(condition, message) { if (!condition) throw new Error(message); }

const catalog = getCatalog();
const scenarios = [
  { primaryWorkload: "chat", qualityPriority: "strong", contextWindow: "none", multimodal: "none", license: "need-to-check", governance: "none", optimizationPriority: "balanced" },
  { primaryWorkload: "coding", qualityPriority: "economical", contextWindow: "none", multimodal: "none", license: "need-to-check", governance: "none", optimizationPriority: "infrastructure-efficiency" },
  { primaryWorkload: "agentic", qualityPriority: "frontier-like", contextWindow: "none", multimodal: "none", license: "need-to-check", governance: "none", optimizationPriority: "best-capability" },
  { primaryWorkload: "chat", qualityPriority: "strong", contextWindow: "none", multimodal: "none", license: "need-to-check", governance: "us-only", optimizationPriority: "balanced" },
];

for (const inputs of scenarios) {
  const result = buildRecommendations(catalog, inputs);
  const allowedAlternates = new Set([
    result.ranking.bestPerformance?.canonical_model_id,
    result.ranking.efficiency?.canonical_model_id,
    result.ranking.balanced?.canonical_model_id,
    ...result.otherEligible.map((m) => m.canonical_model_id),
  ].filter(Boolean));

  for (const card of result.cards) {
    assert(card.advisory?.whyItFits, `${inputs.primaryWorkload}: missing Why it fits.`);
    assert(card.advisory?.tradeoff, `${inputs.primaryWorkload}: missing Primary tradeoff.`);
    assert(card.advisory.whyItFits.includes("Highest") || card.advisory.whyItFits.includes("Smallest") || card.advisory.whyItFits.includes("balanced") || card.advisory.whyItFits.includes("High overall-capability"), `${inputs.primaryWorkload}: advisory rationale stopped using named rule-path explanation.`);
    if (card.advisory.alternate) {
      assert(card.advisory.alternate.canonical_model_id !== card.model.canonical_model_id, `${inputs.primaryWorkload}: alternate repeats recommended model.`);
      assert(allowedAlternates.has(card.advisory.alternate.canonical_model_id), `${inputs.primaryWorkload}: alternate was not derived from existing ranking/eligible outputs.`);
    }
  }
}

console.log("Model Advisor recommendation explanations PASS: advisory sections are present and alternates are derived only from existing ranking/eligible outputs.");
