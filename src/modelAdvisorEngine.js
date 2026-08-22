// Model Advisor scoring engine — implements Model-Advisor-Matching-Engine-v1-Spec.docx
// exactly: hard filters -> workload metric selection -> two-tier ranking ->
// per-metric quality margin -> slot filling -> tie-breaking -> verification surface.
// No hidden weighted formula anywhere in this file -- every slot is filled by one
// named, explainable sort, per the spec's governing principle.

import modelSpecsData from "../data/model_specs.json" with { type: "json" };
import capabilityData from "../data/model_capability_db.json" with { type: "json" };
import governanceData from "../data/model_governance.json" with { type: "json" };

// ---------------------------------------------------------------------------
// Catalog assembly -- joins the three live registries into one flat list.
// Read at build time via Vite's native JSON import, so a new sync commit ->
// Vercel rebuild bakes fresh data into the next deploy automatically.
// ---------------------------------------------------------------------------
export function getCatalog() {
  const specs = modelSpecsData.data.models;
  const capability = capabilityData.data.models;
  const governance = governanceData.entries;

  const capByCanonical = Object.fromEntries(capability.map((c) => [c.canonical_model_id, c]));
  const govByCanonical = Object.fromEntries(governance.map((g) => [g.canonical_model_id, g]));

  return specs.map((spec) => {
    const cap = capByCanonical[spec.canonical_model_id] || {};
    const gov = govByCanonical[spec.canonical_model_id] || {};
    return {
      canonical_model_id: spec.canonical_model_id,
      license: spec.license ? spec.license.value : null,
      param_count_billion: spec.param_count_billion ? spec.param_count_billion.value : null,
      context_length: spec.context_length ?? null,
      modality: spec.modality,
      confidence: spec.confidence, // model_data_confidence: HIGH / MEDIUM
      lifecycle_status: spec.lifecycle_status,
      intelligence_index: cap.intelligence_index ?? null,
      coding_index: cap.coding_index ?? null,
      agentic_index: cap.agentic_index ?? null,
      developer_country: gov.developer_country ?? null,
    };
  });
}

export const CATALOG_META = {
  specsSyncedAt: modelSpecsData.synced_at,
  capabilitySyncedAt: capabilityData.synced_at,
  recordCount: modelSpecsData.record_count,
};

// ---------------------------------------------------------------------------
// Step 1 -- Hard filters. Every check returns PASS / FAIL / REQUIRES_VERIFICATION.
// Unknown is never silently treated as a pass or a fail.
// ---------------------------------------------------------------------------

// Simplified beta heuristic, disclosed in the UI: license text known to
// generally permit commercial use for typical (non-hyperscale) customers.
// Meta's Llama licenses carry a >700M-MAU commercial exception CDW customers
// are very unlikely to hit; flagged in the UI copy rather than modeled here.
const PERMISSIVE_LICENSE_KEYWORDS = ["apache", "mit", "llama3.1", "llama3.3", "llama4", "gemma", "mixtral"];

function checkLicense(model, requirement) {
  if (requirement === "need-to-check") return "PASS"; // customer hasn't stated a requirement yet
  const lic = (model.license || "").toLowerCase();
  if (!lic || lic === "unknown" || lic === "other") return "REQUIRES_VERIFICATION";
  const isPermissive = PERMISSIVE_LICENSE_KEYWORDS.some((k) => lic.includes(k));
  if (requirement === "permissive-commercial") return isPermissive ? "PASS" : "FAIL";
  return "PASS"; // research-only-ok: any known license clears this bar
}

function checkGovernance(model, requirement) {
  if (requirement === "none") return "PASS";
  if (!model.developer_country) return "REQUIRES_VERIFICATION";
  if (requirement === "us-only") return model.developer_country === "us" ? "PASS" : "FAIL";
  return "PASS"; // approved-vendor-families: no vendor-family list defined in V1, informational only
}

function checkContext(model, requirement) {
  const need = { "8k": 8000, "32k": 32000, "128k+": 128000 }[requirement];
  if (!need) return "PASS";
  if (model.context_length == null) return "REQUIRES_VERIFICATION";
  return model.context_length >= need ? "PASS" : "FAIL";
}

function checkModality(model, requirement) {
  if (requirement === "text-only") return model.modality === "text" ? "PASS" : "FAIL";
  if (requirement === "image-text") return model.modality === "multimodal" ? "PASS" : "FAIL";
  return "PASS";
}

function worstState(states) {
  if (states.includes("FAIL")) return "FAIL";
  if (states.includes("REQUIRES_VERIFICATION")) return "REQUIRES_VERIFICATION";
  return "PASS";
}

export function applyHardFilters(catalog, inputs) {
  return catalog.map((model) => {
    const licenseState = checkLicense(model, inputs.license);
    const govState = checkGovernance(model, inputs.governance);
    const contextState = checkContext(model, inputs.contextWindow);
    const modalityState = checkModality(model, inputs.multimodal);
    return {
      ...model,
      filterState: worstState([licenseState, govState, contextState, modalityState]),
      filterDetails: { licenseState, govState, contextState, modalityState },
    };
  });
}

// ---------------------------------------------------------------------------
// Step 2 -- Metric selection by primary workload (ask, don't infer).
// ---------------------------------------------------------------------------
const WORKLOAD_METRIC = { coding: "coding_index", agentic: "agentic_index" };

export function selectMetric(primaryWorkload) {
  return WORKLOAD_METRIC[primaryWorkload] || "intelligence_index";
}

export const METRIC_LABELS = {
  intelligence_index: "overall capability",
  coding_index: "coding performance",
  agentic_index: "agentic performance",
};

// ---------------------------------------------------------------------------
// Step 4 -- Per-metric quality margins. Derived from live data gaps/clusters,
// tagged tentative beta calibration per the spec -- NOT a fixed percentage
// formula, verified against the real distribution for each metric.
//
// RECALIBRATED 2026-08-12 (same day as original calibration): adding Muse
// Glimmer (Meta, released 2 days prior) as an 11th model made the original
// margins non-functional. It scores far above every other tracked model on
// all three metrics (35.1 vs previous top 20.4 on intelligence, 49 vs 23 on
// coding, 22.9 vs 1.6 on agentic) -- the original margins, sized for a
// catalog without that outlier, no longer reached ANY second-place model.
// All three quality tiers were silently collapsing to the identical
// single-model result regardless of which one the customer selected. This
// is exactly the "catalog grows materially" trigger the spec's own
// calibration-metadata section anticipated -- caught by re-running the same
// real-data verification used for the original calibration, not assumed
// safe just because it worked before.
// intelligence_index: n=11. coding_index: n=7. agentic_index: n=5 (still
// thin -- treat as a placeholder, revisit again as coverage grows).
// ---------------------------------------------------------------------------
export const MARGINS = {
  intelligence_index: { "frontier-like": 1.0, strong: 21.0, economical: 28.0 },
  coding_index: { "frontier-like": 1.0, strong: 33.0, economical: 41.0 },
  agentic_index: { "frontier-like": 0.1, strong: 21.5, economical: 23.0 },
};

// ---------------------------------------------------------------------------
// Step 6 -- Deterministic tie-breaking cascade: HIGH > MEDIUM, then
// lifecycle active > other, then canonical_model_id alphabetical.
// ---------------------------------------------------------------------------
function tieBreakSort(list) {
  return [...list].sort((a, b) => {
    if (a.confidence !== b.confidence) return a.confidence === "HIGH" ? -1 : 1;
    if (a.lifecycle_status !== b.lifecycle_status) return a.lifecycle_status === "active" ? -1 : 1;
    return a.canonical_model_id.localeCompare(b.canonical_model_id);
  });
}

// Sorts a list by the given metric, descending, with models missing that
// metric placed after all models that have it (each group internally
// tie-broken the same deterministic way). Used for the "other eligible
// models" list, where there's no margin/slot logic -- just a plain,
// explainable ordering of everyone who passed the hard filters.
function sortByMetricDesc(list, metric) {
  const withMetric = tieBreakSort(list.filter((m) => m[metric] != null))
    .sort((a, b) => (b[metric] ?? 0) - (a[metric] ?? 0));
  const withoutMetric = tieBreakSort(list.filter((m) => m[metric] == null));
  return [...withMetric, ...withoutMetric];
}

// Floating point tolerance for margin threshold comparisons -- JS arithmetic
// (e.g. 1.6 - 1.3 = 0.30000000000000004) can otherwise wrongly exclude a
// model whose score sits exactly at the qualifying threshold.
const EPSILON = 1e-9;

// ---------------------------------------------------------------------------
// Step 3 + 4 + 8.1/8.2 -- Two-tier ranking, margin qualification, and the
// null-param-count / Tier-2 eligibility rules for the size-based slots.
// ---------------------------------------------------------------------------
export function rankModels(eligible, metric, qualityPriority) {
  const tier1 = tieBreakSort(eligible.filter((m) => m[metric] != null)).sort((a, b) => (b[metric] ?? 0) - (a[metric] ?? 0));
  const tier2 = eligible.filter((m) => m[metric] == null);

  const bestPerformance = tier1[0] || (tieBreakSort(tier2).sort((a, b) => (b.intelligence_index ?? 0) - (a.intelligence_index ?? 0))[0] || null);
  const bestPerformanceIsFallback = tier1.length === 0 && !!bestPerformance;

  const margins = MARGINS[metric];
  const fullMargin = margins[qualityPriority];
  const halfMargin = fullMargin / 2;

  // Per spec 8.1: Tier 2 models are ineligible for the size-based slots
  // whenever at least one Tier 1 model exists. Per spec 8.2: a model with
  // unknown param_count_billion.value is ineligible for the same slots.
  function sizeQualified(marginValue) {
    if (tier1.length === 0) return []; // handled by the intelligence_index restart below
    const top = tier1[0][metric];
    return tier1.filter((m) => m[metric] >= top - marginValue - EPSILON && m.param_count_billion != null);
  }

  function smallest(candidates) {
    if (!candidates.length) return null;
    const minParam = Math.min(...candidates.map((m) => m.param_count_billion));
    const atMin = candidates.filter((m) => m.param_count_billion === minParam);
    return tieBreakSort(atMin)[0];
  }

  let efficiency = smallest(sizeQualified(fullMargin));
  let balanced = smallest(sizeQualified(halfMargin));

  // Decision-trace intermediates for the size slots specifically -- kept
  // separate from fullMargin/halfMargin above because those describe the
  // PRIMARY metric's margin, which is not necessarily what actually governed
  // the size-slot decision once the zero-Tier-1 restart (below) fires. An
  // audit trail showing fullMargin/halfMargin for a restarted decision would
  // be citing the wrong number for that specific choice.
  let sizeSlotMetric = metric;
  let sizeSlotFullMargin = fullMargin;
  let sizeSlotHalfMargin = halfMargin;
  let sizeSlotTopScore = tier1.length ? tier1[0][metric] : null;
  let efficiencyQualified = sizeQualified(fullMargin);
  let balancedQualified = sizeQualified(halfMargin);

  // Spec 8.1 zero-Tier-1 restart: if the selected metric has no Tier 1
  // candidates at all, restart size-slot ranking using intelligence_index
  // for the whole eligible pool, with intelligence_index's own margins.
  let restarted = false;
  if (tier1.length === 0 && metric !== "intelligence_index") {
    restarted = true;
    const intelTier1 = tieBreakSort(eligible.filter((m) => m.intelligence_index != null))
      .sort((a, b) => (b.intelligence_index ?? 0) - (a.intelligence_index ?? 0));
    if (intelTier1.length) {
      const im = MARGINS.intelligence_index;
      const iFull = im[qualityPriority];
      const iHalf = iFull / 2;
      const top = intelTier1[0].intelligence_index;
      const qualFull = intelTier1.filter((m) => m.intelligence_index >= top - iFull - EPSILON && m.param_count_billion != null);
      const qualHalf = intelTier1.filter((m) => m.intelligence_index >= top - iHalf - EPSILON && m.param_count_billion != null);
      efficiency = smallest(qualFull);
      balanced = smallest(qualHalf);
      sizeSlotMetric = "intelligence_index";
      sizeSlotFullMargin = iFull;
      sizeSlotHalfMargin = iHalf;
      sizeSlotTopScore = top;
      efficiencyQualified = qualFull;
      balancedQualified = qualHalf;
    } else {
      sizeSlotTopScore = null;
      efficiencyQualified = [];
      balancedQualified = [];
    }
  }

  return {
    tier1, tier2, bestPerformance, bestPerformanceIsFallback,
    efficiency, balanced, metric, fullMargin, halfMargin, restarted,
    sizeSlotMetric, sizeSlotFullMargin, sizeSlotHalfMargin, sizeSlotTopScore,
    efficiencyQualified, balancedQualified,
  };
}

// ---------------------------------------------------------------------------
// Step 14 -- Explanation text. Every card names the specific metric and
// value that won it the slot -- no generic "great fit" text anywhere.
// ---------------------------------------------------------------------------
export function explainCard(card, ranking, inputs) {
  const metricLabel = METRIC_LABELS[ranking.metric];
  const model = card.model;
  const isFallback = ranking.bestPerformanceIsFallback && card.badges.includes("Best Performance");
  const lines = [];

  if (card.badges.includes("Best Performance")) {
    if (isFallback) {
      lines.push(`High overall-capability candidate; ${metricLabel === "coding performance" ? "coding" : "agentic"}-specific benchmark unavailable for this model, ranked by overall capability instead.`);
    } else {
      lines.push(`Highest ${metricLabel} among models meeting your stated requirements.`);
    }
  }
  if (card.badges.includes("Most Efficient Qualifying Model")) {
    lines.push(`Smallest model (${model.param_count_billion}B parameters) maintaining ${metricLabel} within your ${inputs.qualityPriority} tolerance of the top eligible model.`);
  }
  if (card.badges.includes("Best Overall Fit") && !card.badges.includes("Best Performance") && !card.badges.includes("Most Efficient Qualifying Model")) {
    lines.push(`Smallest model within half your ${inputs.qualityPriority} tolerance of the top ${metricLabel} score -- a balanced pick between capability and size.`);
  }
  return lines.join(" ");
}

export function explainVerificationCandidate(model) {
  const details = model.filterDetails;
  const reasons = [];
  if (details.licenseState === "REQUIRES_VERIFICATION") reasons.push("commercial-use eligibility could not be verified");
  if (details.govState === "REQUIRES_VERIFICATION") reasons.push("developer-country could not be verified");
  if (details.contextState === "REQUIRES_VERIFICATION") reasons.push("context window could not be verified");
  return `May be a strong candidate, but ${reasons.join(" and ")}. Excluded from the recommendation ranking until confirmed.`;
}

// Explanation line for the "other models meeting your requirements" list --
// same rule as explainCard: name the actual metric and value, never a
// generic "also a good fit" line.
export function explainOtherEligible(model, ranking) {
  const metricLabel = METRIC_LABELS[ranking.metric];
  if (model[ranking.metric] != null) {
    return `Meets your stated requirements. ${metricLabel}: ${model[ranking.metric]}.`;
  }
  return `Meets your stated requirements. ${metricLabel} not available for this model.`;
}

// ---------------------------------------------------------------------------
// Step 5 -- Fill up to 3 output slots, dedupe into combined badges.
// ---------------------------------------------------------------------------
export function buildRecommendations(catalog, inputs) {
  const filtered = applyHardFilters(catalog, inputs);
  const eligible = filtered.filter((m) => m.filterState === "PASS");
  const verificationPool = filtered.filter((m) => m.filterState === "REQUIRES_VERIFICATION");

  const metric = selectMetric(inputs.primaryWorkload);
  const ranking = rankModels(eligible, metric, inputs.qualityPriority);

  let overallFitModel;
  let overallFitReason;
  if (inputs.optimizationPriority === "best-capability") {
    overallFitModel = ranking.bestPerformance;
    overallFitReason = "performance";
  } else if (inputs.optimizationPriority === "infrastructure-efficiency") {
    overallFitModel = ranking.efficiency;
    overallFitReason = "efficiency";
  } else {
    overallFitModel = ranking.balanced;
    overallFitReason = "balanced";
  }

  const slotDefs = [
    { key: "performance", label: "Best Performance", model: ranking.bestPerformance },
    { key: "efficiency", label: "Most Efficient Qualifying Model", model: ranking.efficiency },
    { key: "overall", label: "Best Overall Fit", model: overallFitModel },
  ];

  const cardsByModel = {};
  const order = [];
  slotDefs.forEach((s) => {
    if (!s.model) return;
    const id = s.model.canonical_model_id;
    if (!cardsByModel[id]) {
      cardsByModel[id] = { model: s.model, badges: [] };
      order.push(id);
    }
    cardsByModel[id].badges.push(s.label);
  });

  const cards = order.map((id) => cardsByModel[id]);

  // Every eligible model NOT already featured in a slot card, so a single
  // model sweeping all three slots (e.g. one clear best-in-class release)
  // doesn't make the rest of the eligible pool disappear from view. Capped
  // at 3 -- enough to give a seller real alternatives to present without
  // turning this into a full re-listing of everyone who passed the filters.
  const featuredIds = new Set(order);
  const otherEligible = sortByMetricDesc(
    eligible.filter((m) => !featuredIds.has(m.canonical_model_id)),
    metric
  ).slice(0, 3);

  const verificationCandidates = tieBreakSort(
    verificationPool.filter((m) => m[metric] != null)
  ).sort((a, b) => (b[metric] ?? 0) - (a[metric] ?? 0)).slice(0, 2);

  return {
    cards, otherEligible, verificationCandidates, metric, ranking,
    eligibleCount: eligible.length, totalCount: catalog.length,
    verificationCount: verificationPool.length,
  };
}
