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

import catalogPolicyData from "../data/model_catalog_policy.json" with { type: "json" };

export const DEFAULT_MODEL_ID = "muse-glimmer-30b";

const CATALOG_STATUS = new Map(
  catalogPolicyData.models.map((entry) => [entry.canonical_model_id, entry.catalog_status])
);

const TECHNICAL_MODEL_REGISTRY = [
  {
    id: "llama-3.1-8b",
    legacyIds: ["llama31-8b"],
    label: "Llama 3.1 8B Instruct",
    totalParamsB: 8.03,
    layers: 32,
    kvHeads: 8,
    headDim: 128,
    status: "VERIFIED",
  },
  {
    id: "llama-3.1-70b",
    legacyIds: ["llama31-70b"],
    label: "Llama 3.1 70B Instruct",
    totalParamsB: 70.6,
    layers: 80,
    kvHeads: 8,
    headDim: 128,
    status: "VERIFIED",
  },
  {
    id: "llama-3.1-405b",
    legacyIds: ["llama31-405b"],
    label: "Llama 3.1 405B Instruct",
    totalParamsB: 405,
    layers: 126,
    kvHeads: 8,
    headDim: 128,
    status: "VERIFIED",
  },
  {
    id: "llama-3.3-70b",
    legacyIds: ["llama33-70b"],
    label: "Llama 3.3 70B Instruct",
    totalParamsB: 70.6,
    layers: 80,
    kvHeads: 8,
    headDim: 128,
    status: "VERIFIED",
  },
  {
    id: "mixtral-8x7b",
    legacyIds: [],
    label: "Mixtral 8x7B Instruct",
    totalParamsB: 46.7,
    layers: 32,
    kvHeads: 8,
    headDim: 128,
    status: "VERIFIED",
  },
  {
    id: "muse-glimmer-30b",
    legacyIds: [],
    label: "Meta Muse Glimmer 30B",
    totalParamsB: 29.6,
    layers: 52,
    kvHeads: 2,
    headDim: 128,
    status: "VERIFIED",
  },
  {
    id: "llama-4-scout",
    legacyIds: ["llama4-scout"],
    label: "Llama 4 Scout 17B-16E",
    totalParamsB: 109,
    layers: 48,
    kvHeads: 8,
    headDim: 128,
    status: "VERIFIED",
  },
  {
    id: "llama-4-maverick",
    legacyIds: ["llama4-maverick"],
    label: "Llama 4 Maverick 17B-128E",
    totalParamsB: 402,
    layers: 48,
    kvHeads: 8,
    headDim: 128,
    status: "VERIFIED",
  },
  {
    id: "gemma-3-27b",
    legacyIds: ["gemma3-27b"],
    label: "Gemma 3 27B",
    totalParamsB: 27,
    layers: 62,
    kvHeads: 16,
    headDim: 128,
    status: "VERIFIED",
  },
  {
    id: "deepseek-v3",
    legacyIds: [],
    label: "DeepSeek V3",
    totalParamsB: 671,
    layers: 61,
    attentionType: "MLA",
    kvLoraRank: 512,
    qkRopeHeadDim: 64,
    status: "VERIFIED",
  },
  {
    id: "deepseek-r1",
    legacyIds: [],
    label: "DeepSeek R1",
    totalParamsB: 671,
    layers: 61,
    attentionType: "MLA",
    kvLoraRank: 512,
    qkRopeHeadDim: 64,
    status: "VERIFIED",
  },
];

export const MODEL_REGISTRY = TECHNICAL_MODEL_REGISTRY.map((model) => ({
  ...model,
  catalogStatus: CATALOG_STATUS.get(model.id) || "retired",
}));

export const CUSTOM_MODEL = {
  id: "custom",
  legacyIds: [],
  label: "Custom model...",
  totalParamsB: null,
  layers: null,
  kvHeads: null,
  headDim: null,
  status: "CUSTOM",
  catalogStatus: "custom",
};

export const RECOMMENDED_MODELS = MODEL_REGISTRY.filter((model) => model.catalogStatus === "recommended");
export const EXISTING_DEPLOYMENT_MODELS = MODEL_REGISTRY.filter((model) => model.catalogStatus === "existing-deployment");
export const SUPPORTED_NAMED_MODELS = MODEL_REGISTRY.filter((model) => model.catalogStatus !== "retired");

// Default selectors present the newcomer-oriented recommended set. Existing
// deployments remain fully resolvable through getModelById() and are exposed
// separately for the opt-in UI toggle added by this workstream.
export const GPU_SIZING_MODELS = [...RECOMMENDED_MODELS, CUSTOM_MODEL];
export const GPU_SIZING_EXISTING_DEPLOYMENT_MODELS = EXISTING_DEPLOYMENT_MODELS;
export const GPU_SIZING_ALL_SUPPORTED_MODELS = [...SUPPORTED_NAMED_MODELS, CUSTOM_MODEL];
export const TCO_MODEL_OPTIONS = [...RECOMMENDED_MODELS, CUSTOM_MODEL];
export const TCO_EXISTING_DEPLOYMENT_MODEL_OPTIONS = EXISTING_DEPLOYMENT_MODELS;
export const TCO_ALL_SUPPORTED_MODEL_OPTIONS = [...SUPPORTED_NAMED_MODELS, CUSTOM_MODEL];

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

export function getModelParamsB(model, customParamsB = null) {
  if (!model) return null;
  if (model.id === "custom") {
    const n = Number(customParamsB);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  return model.totalParamsB;
}

export function formatModelContext(model, paramsB = null) {
  const resolvedParams = paramsB ?? model?.totalParamsB;
  const paramText = Number.isFinite(Number(resolvedParams)) ? `${Number(resolvedParams)}B` : "size unverified";
  return model && model.id !== "custom" ? `${model.label} (${paramText})` : `Custom model (${paramText})`;
}
