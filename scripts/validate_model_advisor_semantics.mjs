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

// Quality tolerances must broaden monotonically. The engine is intentionally
// explainable: frontier-like is the narrowest score window, economical widest.
for (const metric of ["intelligence_index", "coding_index", "agentic_index"]) {
  const frontier = MARGINS[metric]["frontier-like"];
  const strong = MARGINS[metric].strong;
  const economical = MARGINS[metric].economical;
  if (!(frontier <= strong && strong <= economical)) {
    throw new Error(`Non-monotonic Advisor margins for ${metric}: ${frontier}, ${strong}, ${economical}.`);
  }
}

// Current three-model baseline is intentionally recorded before activation.
// Muse Glimmer currently dominates both source capability scores and size among
// the recommended set, so margin tuning alone cannot manufacture diversity.
// This is a diagnostic, not a target behavior: the assertion must be replaced
// with expanded-catalog semantic expectations in the activation commit.
for (const workload of workloads) {
  if (topByWorkload.get(workload) !== "muse-glimmer-30b") {
    throw new Error(`Unexpected pre-activation Best Performance baseline for ${workload}: ${topByWorkload.get(workload)}.`);
  }
}
if (featuredAcrossMatrix.size !== 1 || !featuredAcrossMatrix.has("muse-glimmer-30b")) {
  throw new Error(`Pre-activation recommendation concentration changed (${[...featuredAcrossMatrix].join(", ")}). Re-evaluate calibration before activating staged models.`);
}

console.log(
  "Model Advisor semantic calibration PASS: current 3-model recommended baseline is isolated, margin widening is monotonic, and the known Muse-dominant pre-activation concentration is explicitly regression-tracked rather than hidden by margin changes."
);
