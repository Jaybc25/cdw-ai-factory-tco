import fs from "node:fs";
import { getCatalog, rankModels, MARGINS } from "../src/modelAdvisorEngine.js";
import { STAGED_TECHNICAL_MODEL_REGISTRY } from "../src/stagedModelRegistry.js";

const capability = JSON.parse(
  fs.readFileSync(new URL("../data/model_capability_db.json", import.meta.url), "utf8")
);
const governance = JSON.parse(
  fs.readFileSync(new URL("../data/model_governance.json", import.meta.url), "utf8")
);

const SHADOW_MARGINS = Object.freeze({
  intelligence_index: Object.freeze({ "frontier-like": 1.0, strong: 10.0, economical: 16.0 }),
  coding_index: Object.freeze({ "frontier-like": 2.0, strong: 18.0, economical: 30.0 }),
  agentic_index: Object.freeze({ "frontier-like": 0.5, strong: 5.0, economical: 9.5 }),
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

for (const [metric, priorities] of Object.entries(SHADOW_MARGINS)) {
  for (const [priority, expected] of Object.entries(priorities)) {
    assert(MARGINS[metric]?.[priority] === expected,
      `Live Advisor margin does not match accepted shadow calibration for ${metric}/${priority}: expected ${expected}, found ${MARGINS[metric]?.[priority]}.`);
  }
}

const capById = new Map(capability.data.models.map((model) => [model.canonical_model_id, model]));
const govById = new Map(governance.entries.map((entry) => [entry.canonical_model_id, entry]));
const currentRecommended = getCatalog().filter((model) => model.catalog_status === "recommended");

const stagedShadow = STAGED_TECHNICAL_MODEL_REGISTRY.map((runtime) => {
  const cap = capById.get(runtime.id) || {};
  const gov = govById.get(runtime.id) || {};
  return {
    canonical_model_id: runtime.id,
    license: null,
    param_count_billion: runtime.totalParamsB,
    context_length: runtime.contextLength,
    modality: runtime.modalities.includes("image") ? "multimodal" : "text",
    confidence: runtime.status === "VERIFIED" ? "HIGH" : "MEDIUM",
    lifecycle_status: "active",
    catalog_status: "recommended",
    intelligence_index: cap.intelligence_index ?? null,
    coding_index: cap.coding_index ?? null,
    agentic_index: cap.agentic_index ?? null,
    developer_country: gov.developer_country ?? null,
  };
});

const shadowCatalog = [...currentRecommended, ...stagedShadow];
assert(currentRecommended.length === 3, `Expected 3 current recommended models before activation; found ${currentRecommended.length}.`);
assert(stagedShadow.length === 6, `Expected 6 staged-runtime models in shadow Advisor population; found ${stagedShadow.length}.`);
assert(shadowCatalog.length === 9, `Expected 9-model expanded shadow population; found ${shadowCatalog.length}.`);

function rankWithShadowMargins(eligible, metric, qualityPriority) {
  const ordered = [...eligible]
    .filter((model) => model[metric] != null)
    .sort((a, b) => (b[metric] ?? 0) - (a[metric] ?? 0) || a.canonical_model_id.localeCompare(b.canonical_model_id));
  assert(ordered.length > 0, `No sourced ${metric} values in shadow population.`);
  const top = ordered[0][metric];
  const fullMargin = SHADOW_MARGINS[metric][qualityPriority];
  const halfMargin = fullMargin / 2;

  const within = (margin) => ordered.filter(
    (model) => model[metric] >= top - margin && Number.isFinite(model.param_count_billion)
  );
  const smallest = (models) => [...models].sort(
    (a, b) => a.param_count_billion - b.param_count_billion || a.canonical_model_id.localeCompare(b.canonical_model_id)
  )[0] || null;

  return {
    bestPerformance: ordered[0],
    efficiency: smallest(within(fullMargin)),
    balanced: smallest(within(halfMargin)),
    top,
    fullMargin,
    halfMargin,
  };
}

const metricByWorkload = {
  chat: "intelligence_index",
  coding: "coding_index",
  agentic: "agentic_index",
};

for (const metric of Object.values(metricByWorkload)) {
  const margins = SHADOW_MARGINS[metric];
  assert(margins["frontier-like"] <= margins.strong && margins.strong <= margins.economical,
    `${metric} margins must widen monotonically.`);
}

for (const [workload, metric] of Object.entries(metricByWorkload)) {
  for (const quality of ["frontier-like", "strong", "economical"]) {
    const result = rankWithShadowMargins(shadowCatalog, metric, quality);
    assert(result.bestPerformance.canonical_model_id === "muse-glimmer-30b",
      `${workload}/${quality}: expected Muse Glimmer to remain evidence-backed Best Performance.`);
    assert(result.balanced.canonical_model_id === "muse-glimmer-30b",
      `${workload}/${quality}: balanced slot should not manufacture diversity when the top model is already ~30B.`);

    if (quality === "economical") {
      assert(result.efficiency.canonical_model_id === "gpt-oss-20b",
        `${workload}/economical: expected gpt-oss-20b as the smallest evidence-backed model inside the deliberately wider tolerance.`);
    } else {
      assert(result.efficiency.canonical_model_id === "muse-glimmer-30b",
        `${workload}/${quality}: efficiency slot should stay with Muse until the user explicitly chooses economical tolerance.`);
    }
  }
}

// The live engine now uses the accepted shadow margins, while the product
// catalog remains pre-activation. Verify that the currently visible three-model
// population still preserves its established Best Performance behavior.
const productionStrong = rankModels(currentRecommended, "intelligence_index", "strong");
assert(productionStrong.bestPerformance?.canonical_model_id === "muse-glimmer-30b",
  "Current production-catalog Advisor behavior drifted after margin promotion.");

console.log(
  "Model Advisor calibration PASS: live margins equal the accepted 9-model shadow calibration, Muse remains evidence-backed performance/balanced leader, " +
  "gpt-oss-20b appears only for explicit economical infrastructure-efficiency tolerance, and the current three-model product surface remains stable."
);
