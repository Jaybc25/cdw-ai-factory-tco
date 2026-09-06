// Shared model context for Model Advisor, GPU Sizing, and TCO handoffs.
// Canonical IDs match data/model_specs.json. Technical architecture fields are
// the GPU Sizing inputs and remain authoritative for GPU Sizing calculations.
// TCO consumes only identity and totalParamsB for its directional capacity and
// unit-economics layer. TCO does not duplicate GPU Sizing's technical engine.
//
// CDW product-facing model status is deliberately separate from upstream
// lifecycle_status and lives in data/model_catalog_policy.json. A model can be
// technically active upstream while CDW treats it as an existing-deployment
// option rather than a greenfield recommendation.
//
// Architecture schema v2 deliberately separates resident model size from
// sparse per-token compute. `totalParamsB` is the full parameter/residency
// concept. `activeParamsB`, when known, is the routed/active parameter concept
// for sparse models. Neither field may silently substitute for the other.
// GPU Sizing continues to use totalParamsB in the existing formulas until the
// methodology PR explicitly introduces architecture-aware performance math.

import catalogPolicyData from "../data/model_catalog_policy.json" with { type: "json" };

export const MODEL_ARCHITECTURE_SCHEMA_VERSION = 2;
export const MODEL_ARCHITECTURE_TYPES = Object.freeze(["dense", "moe", "hybrid"]);

// Standalone sessions should start on a current CDW-recommended model rather
// than an existing-deployment option. Muse Glimmer is the smallest of the
// current recommended set and therefore the least infrastructure-prescriptive
// newcomer default until the expanded catalog/recalibration work lands.
export const DEFAULT_MODEL_ID = "muse-glimmer-30b";

const CATALOG_STATUS = new Map(
  catalogPolicyData.models.map((entry) => [entry.canonical_model_id, entry.catalog_status])
);

const TECHNICAL_MODEL_REGISTRY = [
  { id: "llama-3.1-8b", legacyIds: ["llama31-8b"], label: "Llama 3.1 8B Instruct", architectureType: "dense", totalParamsB: 8.03, activeParamsB: 8.03, layers: 32, attentionType: "standard", kvHeads: 8, headDim: 128, status: "VERIFIED" },
  { id: "llama-3.1-70b", legacyIds: ["llama31-70b"], label: "Llama 3.1 70B Instruct", architectureType: "dense", totalParamsB: 70.6, activeParamsB: 70.6, layers: 80, attentionType: "standard", kvHeads: 8, headDim: 128, status: "VERIFIED" },
  { id: "llama-3.1-405b", legacyIds: ["llama31-405b"], label: "Llama 3.1 405B Instruct", architectureType: "dense", totalParamsB: 405, activeParamsB: 405, layers: 126, attentionType: "standard", kvHeads: 8, headDim: 128, status: "VERIFIED" },
  { id: "llama-3.3-70b", legacyIds: ["llama33-70b"], label: "Llama 3.3 70B Instruct", architectureType: "dense", totalParamsB: 70.6, activeParamsB: 70.6, layers: 80, attentionType: "standard", kvHeads: 8, headDim: 128, status: "VERIFIED" },
  { id: "mixtral-8x7b", legacyIds: [], label: "Mixtral 8x7B Instruct", architectureType: "moe", totalParamsB: 46.7, activeParamsB: 12.9, numExperts: 8, activeExpertsPerToken: 2, layers: 32, attentionType: "standard", kvHeads: 8, headDim: 128, status: "VERIFIED" },
  { id: "muse-glimmer-30b", legacyIds: [], label: "Meta Muse Glimmer 30B", architectureType: "dense", totalParamsB: 29.6, activeParamsB: 29.6, layers: 52, attentionType: "standard", kvHeads: 2, headDim: 128, status: "VERIFIED" },
  { id: "llama-4-scout", legacyIds: ["llama4-scout"], label: "Llama 4 Scout 17B-16E", architectureType: "moe", totalParamsB: 109, activeParamsB: 17, numExperts: 16, activeExpertsPerToken: null, layers: 48, attentionType: "standard", kvHeads: 8, headDim: 128, status: "VERIFIED" },
  { id: "llama-4-maverick", legacyIds: ["llama4-maverick"], label: "Llama 4 Maverick 17B-128E", architectureType: "moe", totalParamsB: 402, activeParamsB: 17, numExperts: 128, activeExpertsPerToken: null, layers: 48, attentionType: "standard", kvHeads: 8, headDim: 128, status: "VERIFIED" },
  { id: "gemma-3-27b", legacyIds: ["gemma3-27b"], label: "Gemma 3 27B", architectureType: "dense", totalParamsB: 27, activeParamsB: 27, layers: 62, attentionType: "standard", kvHeads: 16, headDim: 128, status: "VERIFIED" },
  { id: "deepseek-v3", legacyIds: [], label: "DeepSeek V3", architectureType: "moe", totalParamsB: 671, activeParamsB: 37, numExperts: null, activeExpertsPerToken: null, layers: 61, attentionType: "MLA", kvLoraRank: 512, qkRopeHeadDim: 64, status: "VERIFIED" },
  { id: "deepseek-r1", legacyIds: [], label: "DeepSeek R1", architectureType: "moe", totalParamsB: 671, activeParamsB: 37, numExperts: null, activeExpertsPerToken: null, layers: 61, attentionType: "MLA", kvLoraRank: 512, qkRopeHeadDim: 64, status: "VERIFIED" },
];

export const MODEL_REGISTRY = TECHNICAL_MODEL_REGISTRY.map((model) => ({
  ...model,
  schemaVersion: MODEL_ARCHITECTURE_SCHEMA_VERSION,
  contextLength: model.contextLength ?? null,
  modalities: model.modalities ?? ["text"],
  catalogStatus: CATALOG_STATUS.get(model.id) || "retired",
}));

export const CUSTOM_MODEL = {
  id: "custom",
  legacyIds: [],
  label: "Custom model...",
  schemaVersion: MODEL_ARCHITECTURE_SCHEMA_VERSION,
  architectureType: "dense",
  totalParamsB: null,
  activeParamsB: null,
  numExperts: null,
  activeExpertsPerToken: null,
  layers: null,
  attentionType: "standard",
  kvHeads: null,
  headDim: null,
  kvLoraRank: null,
  qkRopeHeadDim: null,
  contextLength: null,
  modalities: ["text"],
  status: "CUSTOM",
  catalogStatus: "custom",
};

export const RECOMMENDED_MODELS = MODEL_REGISTRY.filter((model) => model.catalogStatus === "recommended");
export const EXISTING_DEPLOYMENT_MODELS = MODEL_REGISTRY.filter((model) => model.catalogStatus === "existing-deployment");
export const SUPPORTED_NAMED_MODELS = MODEL_REGISTRY.filter((model) => model.catalogStatus !== "retired");

const BY_ID = new Map();
for (const model of [...MODEL_REGISTRY, CUSTOM_MODEL]) {
  BY_ID.set(model.id, model);
  for (const legacyId of model.legacyIds || []) BY_ID.set(legacyId, model);
}

export function getModelById(id) {
  return id ? BY_ID.get(id) || null : null;
}

export function getDefaultModel() {
  return getModelById(DEFAULT_MODEL_ID);
}

export function isRecommendedModel(modelOrId) {
  const model = typeof modelOrId === "string" ? getModelById(modelOrId) : modelOrId;
  return model?.catalogStatus === "recommended";
}

export function isExistingDeploymentModel(modelOrId) {
  const model = typeof modelOrId === "string" ? getModelById(modelOrId) : modelOrId;
  return model?.catalogStatus === "existing-deployment";
}

export function getModelResidencyParamsB(modelOrId, customParamsB = null) {
  const model = typeof modelOrId === "string" ? getModelById(modelOrId) : modelOrId;
  if (!model) return null;
  if (model.id === "custom") {
    const n = Number(customParamsB);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  return Number.isFinite(model.totalParamsB) && model.totalParamsB > 0 ? model.totalParamsB : null;
}

export function getModelActiveParamsB(modelOrId, customParamsB = null) {
  const model = typeof modelOrId === "string" ? getModelById(modelOrId) : modelOrId;
  if (!model) return null;
  if (model.id === "custom") return getModelResidencyParamsB(model, customParamsB);
  return Number.isFinite(model.activeParamsB) && model.activeParamsB > 0 ? model.activeParamsB : null;
}

// Default UI list = current recommended models + Custom. When a restored or
// deep-linked existing-deployment model is active, keep that one visible even
// with the opt-in toggle off so a valid historical scenario never becomes an
// invisible/invalid select value.
export function getVisibleModelOptions({ includeExisting = false, selectedId = null, selectedIds = null, includeCustom = true } = {}) {
  const options = [...RECOMMENDED_MODELS];
  if (includeExisting) options.push(...EXISTING_DEPLOYMENT_MODELS);

  const preserveIds = selectedIds ?? (selectedId ? [selectedId] : []);
  for (const id of preserveIds) {
    const selected = getModelById(id);
    if (selected && selected.id !== "custom" && selected.catalogStatus === "existing-deployment" && !options.some((m) => m.id === selected.id)) {
      options.push(selected);
    }
  }

  if (includeCustom) options.push(CUSTOM_MODEL);
  return options;
}

function replaceVisibleOptions(target, options) {
  target.splice(0, target.length, ...options);
  return target;
}

// These arrays are intentionally mutable references. GPU Sizing and TCO have
// historically imported them once at module scope, so mutating the existing
// array lets a lightweight route wrapper change visibility without breaking
// those imports or duplicating model lists inside either calculator.
export const GPU_SIZING_MODELS = getVisibleModelOptions();
export const TCO_MODEL_OPTIONS = getVisibleModelOptions();

export const GPU_SIZING_RECOMMENDED_MODELS = [...RECOMMENDED_MODELS, CUSTOM_MODEL];
export const GPU_SIZING_EXISTING_DEPLOYMENT_MODELS = EXISTING_DEPLOYMENT_MODELS;
export const TCO_RECOMMENDED_MODEL_OPTIONS = [...RECOMMENDED_MODELS, CUSTOM_MODEL];
export const TCO_EXISTING_DEPLOYMENT_MODEL_OPTIONS = EXISTING_DEPLOYMENT_MODELS;

export function setGpuSizingModelVisibility({ includeExisting = false, selectedIds = [] } = {}) {
  return replaceVisibleOptions(
    GPU_SIZING_MODELS,
    getVisibleModelOptions({ includeExisting, selectedIds })
  );
}

export function setTcoModelVisibility({ includeExisting = false, selectedIds = [] } = {}) {
  return replaceVisibleOptions(
    TCO_MODEL_OPTIONS,
    getVisibleModelOptions({ includeExisting, selectedIds })
  );
}

// Backward-compatible alias used by current handoffs/TCO. This intentionally
// returns residency/total parameters; active parameters are never substituted.
export function getModelParamsB(model, customParamsB = null) {
  return getModelResidencyParamsB(model, customParamsB);
}

export function formatModelContext(model, paramsB = null) {
  const resolvedParams = paramsB ?? model?.totalParamsB;
  const paramText = Number.isFinite(Number(resolvedParams)) ? `${Number(resolvedParams)}B` : "size unverified";
  return model && model.id !== "custom" ? `${model.label} (${paramText})` : `Custom model (${paramText})`;
}
