import {
  getCatalog,
  buildRecommendations,
  MARGINS,
  selectMetric,
} from "../src/modelAdvisorEngine.js";

const catalog = getCatalog();
const recommended = catalog.filter((m) => m.catalog_status === "recommended");
const recommendedIds = new Set(recommended.map((m) => m.canonical_model_id));

if (recommended.length !== 3) {
  throw new Error(`Pre-activation Advisor baseline expected 3 recommended models; found ${recommended.length}. Update this gate deliberately when staged models are activated.`);
}

const expectedCurrentIds = new Set(["muse-glimmer-30b", "llama-4-scout", "llama-4-maverick"]);
for (const id of expectedCurrentIds) {
  if (!recommendedIds.has(id)) throw new Error(`Missing current recommended model ${id}.`);
}

const expectedMargins = {
  intelligence_index: { "frontier-like": 1.0, strong: 10.0, economical: 16.0 },
  coding_index: { "frontier-like": 2.0, strong: 18.0, economical: 30.0 },
  agentic_index: { "frontier-like": 0.5, strong: 5.0, economical: 9.5 },
};
for (const [metric, priorities] of Object.entries(expectedMargins)) {
  for (const [priority, expected] of Object.entries(priorities)) {
    if (MARGINS[metric]?.[priority] !== expected) {
      throw new Error(`Advisor margin drift for ${metric}/${priority}: expected ${expected}, found ${MARGINS[metric]?.[priority]}.`);
    }
  }
}

const workloads = ["chat", "coding", "agentic"];
const qualityPriorities = ["frontier-like", "strong", "economical"];
const optimizationPriorities = ["best-capability", "balanced", "infrastructure-efficiency"];

function baseInputs(primaryWorkload, qualityPriority, optimizationPriority) {
  return {
    primaryWorkload,
    qualityPriority,
    optimizationPriority,
    contextWindow: "none",
    multimodal: "none",
    license: "need-to-check",
    governance: "none",
  };
}

const featuredAcrossMatrix = new Set();
const topByWorkload = new Map();

for (const primaryWorkload of workloads) {
  for (const qualityPriority of qualityPriorities) {
    for (const optimizationPriority of optimizationPriorities) {
      const result = buildRecommendations(catalog, baseInputs(primaryWorkload, qualityPriority, optimizationPriority));
      if (!result.cards.length) {
        throw new Error(`Advisor returned no cards for ${primaryWorkload}/${qualityPriority}/${optimizationPriority}.`);
      }

      for (const card of result.cards) {
        const id = card.model.canonical_model_id;
        featuredAcrossMatrix.add(id);
        if (!recommendedIds.has(id)) {
          throw new Error(`Advisor leaked non-recommended model ${id} into a featured card.`);
        }
      }
      for (const model of result.otherEligible || []) {
        if (!recommendedIds.has(model.canonical_model_id)) {
          throw new Error(`Advisor leaked non-recommended model ${model.canonical_model_id} into otherEligible.`);
        }
      }

      const metric = selectMetric(primaryWorkload);
      const topCard = result.cards.find((c) => c.badges.includes("Best Performance"));
      if (!topCard) throw new Error(`Missing Best Performance card for ${primaryWorkload}.`);
      const previousTop = topByWorkload.get(primaryWorkload);
      if (previousTop && previousTop !== topCard.model.canonical_model_id) {
        throw new Error(`Best Performance changed across quality/optimization inputs for ${primaryWorkload}: ${previousTop} vs ${topCard.model.canonical_model_id}.`);
      }
      topByWorkload.set(primaryWorkload, topCard.model.canonical_model_id);

      const eligibleWithMetric = result.ranking.tier1;
      if (eligibleWithMetric.length) {
        const topScore = eligibleWithMetric[0][metric];
        for (const model of eligibleWithMetric) {
          if (model[metric] > topScore + 1e-9) {
            throw new Error(`Metric ordering broken for ${primaryWorkload}.`);
          }
        }
      }
    }
  }
}

for (const metric of ["intelligence_index", "coding_index", "agentic_index"]) {
  const frontier = MARGINS[metric]["frontier-like"];
  const strong = MARGINS[metric].strong;
  const economical = MARGINS[metric].economical;
  if (!(frontier <= strong && strong <= economical)) {
    throw new Error(`Non-monotonic Advisor margins for ${metric}: ${frontier}, ${strong}, ${economical}.`);
  }
}

for (const workload of workloads) {
  if (topByWorkload.get(workload) !== "muse-glimmer-30b") {
    throw new Error(`Unexpected pre-activation Best Performance baseline for ${workload}: ${topByWorkload.get(workload)}.`);
  }
}
if (featuredAcrossMatrix.size !== 1 || !featuredAcrossMatrix.has("muse-glimmer-30b")) {
  throw new Error(`Pre-activation recommendation concentration changed (${[...featuredAcrossMatrix].join(", ")}). Re-evaluate calibration before activating staged models.`);
}

console.log(
  "Model Advisor semantic calibration PASS: recalibrated AA 4.2 margins are exact and monotonic, current 3-model recommended behavior remains isolated, and Muse remains the evidence-backed pre-activation featured model."
);
