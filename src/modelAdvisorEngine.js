// Model Advisor scoring engine — implements Model-Advisor-Matching-Engine-v1-Spec.docx
// exactly: hard filters -> workload metric selection -> two-tier ranking ->
// per-metric quality margin -> slot filling -> tie-breaking -> verification surface.
// No hidden weighted formula anywhere in this file -- every slot is filled by one
// named, explainable sort, per the spec's governing principle.

import modelSpecsData from "../data/model_specs.json" with { type: "json" };
import capabilityData from "../data/model_capability_db.json" with { type: "json" };
import governanceData from "../data/model_governance.json" with { type: "json" };
import catalogPolicyData from "../data/model_catalog_policy.json" with { type: "json" };

// ---------------------------------------------------------------------------
// Catalog assembly -- joins the three live registries plus CDW's product-facing
// catalog policy into one flat list. Upstream lifecycle_status remains distinct
// from catalog_status: a technically active model can still be kept only for
// existing-deployment sizing rather than greenfield recommendations.
// ---------------------------------------------------------------------------
export function getCatalog() {
  const specs = modelSpecsData.data.models;
  const capability = capabilityData.data.models;
  const governance = governanceData.entries;
  const policy = catalogPolicyData.models;

  const capByCanonical = Object.fromEntries(capability.map((c) => [c.canonical_model_id, c]));
  const govByCanonical = Object.fromEntries(governance.map((g) => [g.canonical_model_id, g]));
  const policyByCanonical = Object.fromEntries(policy.map((p) => [p.canonical_model_id, p]));

  return specs.map((spec) => {
    const cap = capByCanonical[spec.canonical_model_id] || {};
    const gov = govByCanonical[spec.canonical_model_id] || {};
    const catalogPolicy = policyByCanonical[spec.canonical_model_id] || {};
    return {
      canonical_model_id: spec.canonical_model_id,
      license: spec.license ? spec.license.value : null,
      param_count_billion: spec.param_count_billion ? spec.param_count_billion.value : null,
      context_length: spec.context_length ?? null,
      modality: spec.modality,
      confidence: spec.confidence, // model_data_confidence: HIGH / MEDIUM
      lifecycle_status: spec.lifecycle_status,
      catalog_status: catalogPolicy.catalog_status || "retired",
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
  if (requirement === "need-to-check") return "PASS";
  const lic = (model.license || "").toLowerCase();
  if (!lic || lic === "unknown" || lic === "other") return "REQUIRES_VERIFICATION";
  const isPermissive = PERMISSIVE_LICENSE_KEYWORDS.some((k) => lic.includes(k));
  if (requirement === "permissive-commercial") return isPermissive ? "PASS" : "FAIL";
  return "PASS";
}

function checkGovernance(model, requirement) {
  if (requirement === "none") return "PASS";
  if (!model.developer_country) return "REQUIRES_VERIFICATION";
  if (requirement === "us-only") return model.developer_country === "us" ? "PASS" : "FAIL";
  return "PASS";
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

const WORKLOAD_METRIC = { coding: "coding_index", agentic: "agentic_index" };

export function selectMetric(primaryWorkload) {
  return WORKLOAD_METRIC[primaryWorkload] || "intelligence_index";
}

export const METRIC_LABELS = {
  intelligence_index: "overall capability",
  coding_index: "coding performance",
  agentic_index: "agentic performance",
};

// Recalibrated for the Artificial Analysis 4.2 score distribution and the
// expanded modern-model shadow population. These windows are intentionally
// capability-preserving: frontier-like is narrowest, strong is moderate, and
// economical is the only tier broad enough to accept a material capability
// trade-off for a smaller infrastructure footprint.
export const MARGINS = {
  intelligence_index: { "frontier-like": 1.0, strong: 10.0, economical: 16.0 },
  coding_index: { "frontier-like": 2.0, strong: 18.0, economical: 30.0 },
  agentic_index: { "frontier-like": 0.5, strong: 5.0, economical: 9.5 },
};

function tieBreakSort(list) {
  return [...list].sort((a, b) => {
    if (a.confidence !== b.confidence) return a.confidence === "HIGH" ? -1 : 1;
    if (a.lifecycle_status !== b.lifecycle_status) return a.lifecycle_status === "active" ? -1 : 1;
    return a.canonical_model_id.localeCompare(b.canonical_model_id);
  });
}

function sortByMetricDesc(list, metric) {
  const withMetric = tieBreakSort(list.filter((m) => m[metric] != null))
    .sort((a, b) => (b[metric] ?? 0) - (a[metric] ?? 0));
  const withoutMetric = tieBreakSort(list.filter((m) => m[metric] == null));
  return [...withMetric, ...withoutMetric];
}

const EPSILON = 1e-9;

export function rankModels(eligible, metric, qualityPriority) {
  const tier1 = tieBreakSort(eligible.filter((m) => m[metric] != null)).sort((a, b) => (b[metric] ?? 0) - (a[metric] ?? 0));
  const tier2 = eligible.filter((m) => m[metric] == null);
  const tier2ByIntelligence = tieBreakSort(tier2).sort((a, b) => (b.intelligence_index ?? 0) - (a.intelligence_index ?? 0));
  const bestPerformance = tier1[0] || tier2ByIntelligence[0] || null;
  const bestPerformanceIsFallback = tier1.length === 0 && !!bestPerformance;
  const bestPerformanceFallbackPool = bestPerformanceIsFallback ? tier2ByIntelligence : [];

  const margins = MARGINS[metric];
  const fullMargin = margins[qualityPriority];
  const halfMargin = fullMargin / 2;

  function sizeQualified(marginValue) {
    if (tier1.length === 0) return [];
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
  let sizeSlotMetric = metric;
  let sizeSlotFullMargin = fullMargin;
  let sizeSlotHalfMargin = halfMargin;
  let sizeSlotTopScore = tier1.length ? tier1[0][metric] : null;
  let efficiencyQualified = sizeQualified(fullMargin);
  let balancedQualified = sizeQualified(halfMargin);

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
    tier1, tier2, bestPerformance, bestPerformanceIsFallback, bestPerformanceFallbackPool,
    efficiency, balanced, metric, fullMargin, halfMargin, restarted,
    sizeSlotMetric, sizeSlotFullMargin, sizeSlotHalfMargin, sizeSlotTopScore,
    efficiencyQualified, balancedQualified,
  };
}

export function explainCard(card, ranking, inputs) {
  const metricLabel = METRIC_LABELS[ranking.metric];
  const sizeSlotMetricLabel = METRIC_LABELS[ranking.sizeSlotMetric];
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
    lines.push(`Smallest model (${model.param_count_billion}B parameters) maintaining ${sizeSlotMetricLabel} within your ${inputs.qualityPriority} tolerance of the top eligible model.`);
  }
  if (card.badges.includes("Best Overall Fit") && !card.badges.includes("Best Performance") && !card.badges.includes("Most Efficient Qualifying Model")) {
    lines.push(`Smallest model within half your ${inputs.qualityPriority} tolerance of the top ${sizeSlotMetricLabel} score -- a balanced pick between capability and size.`);
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

export function explainOtherEligible(model, ranking) {
  const metricLabel = METRIC_LABELS[ranking.metric];
  if (model[ranking.metric] != null) {
    return `Meets your stated requirements. ${metricLabel}: ${model[ranking.metric]}.`;
  }
  return `Meets your stated requirements. ${metricLabel} not available for this model.`;
}

export function buildRecommendations(catalog, inputs) {
  // Model Advisor is a greenfield decision aid. Existing-deployment models
  // remain in the shared technical catalog for sizing/costing and saved-state
  // compatibility, but they must never enter the recommendation population.
  const advisorCatalog = catalog.filter((model) => model.catalog_status === "recommended");
  const filtered = applyHardFilters(advisorCatalog, inputs);
  const eligible = filtered.filter((m) => m.filterState === "PASS");
  const verificationPool = filtered.filter((m) => m.filterState === "REQUIRES_VERIFICATION");
  const excludedModels = filtered.filter((m) => m.filterState === "FAIL");

  const exclusionCounts = { license: 0, governance: 0, context: 0, modality: 0 };
  excludedModels.forEach((m) => {
    if (m.filterDetails.licenseState === "FAIL") exclusionCounts.license++;
    if (m.filterDetails.govState === "FAIL") exclusionCounts.governance++;
    if (m.filterDetails.contextState === "FAIL") exclusionCounts.context++;
    if (m.filterDetails.modalityState === "FAIL") exclusionCounts.modality++;
  });

  const metric = selectMetric(inputs.primaryWorkload);
  const ranking = rankModels(eligible, metric, inputs.qualityPriority);

  let overallFitModel;
  if (inputs.optimizationPriority === "best-capability") {
    overallFitModel = ranking.bestPerformance;
  } else if (inputs.optimizationPriority === "infrastructure-efficiency") {
    overallFitModel = ranking.efficiency;
  } else {
    overallFitModel = ranking.balanced;
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
    eligibleCount: eligible.length, totalCount: advisorCatalog.length,
    verificationCount: verificationPool.length,
    eligibilityTrace: { allModels: filtered, excludedModels, exclusionCounts },
  };
}
