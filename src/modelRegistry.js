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
// `architectureType` describes the language backbone's FFN topology: `dense`
// for dense-only, `moe` for MoE throughout, and `hybrid` when dense and MoE
// layers coexist. Vision/perception towers do not by themselves make a model
// `hybrid`. `modalities` describes accepted input modalities.
//
// Expert semantics are explicit: `numExperts` means routed experts per MoE
// layer, `numSharedExperts` means always-on shared experts, and
// `routedExpertsPerToken` is the routed top-k. `activeExpertsPerToken` is the
// sum of routed + shared experts that execute for a token in an MoE layer.

import catalogPolicyData from "../data/model_catalog_policy.json" with { type: "json" };
import { STAGED_TECHNICAL_MODEL_REGISTRY } from "./stagedModelRegistry.js";

export const MODEL_ARCHITECTURE_SCHEMA_VERSION = 2;
export const MODEL_ARCHITECTURE_TYPES = Object.freeze(["dense", "moe", "hybrid"]);

// Standalone sessions should start on a current CDW-recommended model rather
// than an existing-deployment option. Muse Glimmer remains the neutral default
// even as the greenfield catalog expands.
export const DEFAULT_MODEL_ID = "muse-glimmer-30b";

const CATALOG_STATUS = new Map(
  catalogPolicyData.models.map((entry) => [entry.canonical_model_id, entry.catalog_status])
);

const TECHNICAL_MODEL_REGISTRY = [
  {
    id: "llama-3.1-8b",
    legacyIds: ["llama31-8b"],
    label: "Llama 3.1 8B Instruct",
    architectureType: "dense",
    totalParamsB: 8.03,
    activeParamsB: 8.03,
    numExperts: null,
    numSharedExperts: null,
    routedExpertsPerToken: null,
    activeExpertsPerToken: null,
    layers: 32,
    attentionType: "standard",
    kvHeads: 8,
    headDim: 128,
    contextLength: 131072,
    modalities: ["text"],
    status: "VERIFIED",
    architectureSource: "https://huggingface.co/meta-llama/Meta-Llama-3.1-8B-Instruct",
  },
  {
    id: "llama-3.1-70b",
    legacyIds: ["llama31-70b"],
    label: "Llama 3.1 70B Instruct",
    architectureType: "dense",
    totalParamsB: 70.6,
    activeParamsB: 70.6,
    numExperts: null,
    numSharedExperts: null,
    routedExpertsPerToken: null,
    activeExpertsPerToken: null,
    layers: 80,
    attentionType: "standard",
    kvHeads: 8,
    headDim: 128,
    contextLength: 131072,
    modalities: ["text"],
    status: "VERIFIED",
    architectureSource: "https://huggingface.co/meta-llama/Meta-Llama-3.1-70B-Instruct",
  },
  {
    id: "llama-3.1-405b",
    legacyIds: ["llama31-405b"],
    label: "Llama 3.1 405B Instruct",
    architectureType: "dense",
    totalParamsB: 405,
    activeParamsB: 405,
    numExperts: null,
    numSharedExperts: null,
    routedExpertsPerToken: null,
    activeExpertsPerToken: null,
    layers: 126,
    attentionType: "standard",
    kvHeads: 8,
    headDim: 128,
    contextLength: 131072,
    modalities: ["text"],
    status: "VERIFIED",
    architectureSource: "https://huggingface.co/meta-llama/Meta-Llama-3.1-405B-Instruct",
  },
  {
    id: "llama-3.3-70b",
    legacyIds: ["llama33-70b"],
    label: "Llama 3.3 70B Instruct",
    architectureType: "dense",
    totalParamsB: 70.6,
    activeParamsB: 70.6,
    numExperts: null,
    numSharedExperts: null,
    routedExpertsPerToken: null,
    activeExpertsPerToken: null,
    layers: 80,
    attentionType: "standard",
    kvHeads: 8,
    headDim: 128,
    contextLength: 131072,
    modalities: ["text"],
    status: "VERIFIED",
    architectureSource: "https://huggingface.co/meta-llama/Llama-3.3-70B-Instruct",
  },
  {
    id: "mixtral-8x7b",
    legacyIds: [],
    label: "Mixtral 8x7B Instruct",
    architectureType: "moe",
    totalParamsB: 46.7,
    activeParamsB: 12.9,
    numExperts: 8,
    numSharedExperts: 0,
    routedExpertsPerToken: 2,
    activeExpertsPerToken: 2,
    layers: 32,
    attentionType: "standard",
    kvHeads: 8,
    headDim: 128,
    contextLength: 32768,
    modalities: ["text"],
    status: "VERIFIED",
    architectureSource: "https://mistral.ai/news/mixtral-of-experts/",
  },
  {
    id: "muse-glimmer-30b",
    legacyIds: [],
    label: "Meta Muse Glimmer 30B",
    architectureType: "dense",
    totalParamsB: 29.6,
    activeParamsB: 29.6,
    numExperts: null,
    numSharedExperts: null,
    routedExpertsPerToken: null,
    activeExpertsPerToken: null,
    layers: 52,
    attentionType: "standard",
    kvHeads: 2,
    headDim: 128,
    contextLength: 131072,
    modalities: ["text", "image"],
    status: "VERIFIED",
    architectureSource: "https://docs.api.nvidia.com/nim/reference/meta-muse-glimmer-30b",
  },
  {
    id: "llama-4-scout",
    legacyIds: ["llama4-scout"],
    label: "Llama 4 Scout 17B-16E",
    architectureType: "moe",
    totalParamsB: 109,
    activeParamsB: 17,
    numExperts: 16,
    numSharedExperts: 1,
    routedExpertsPerToken: 1,
    activeExpertsPerToken: 2,
    layers: 48,
    attentionType: "standard",
    kvHeads: 8,
    headDim: 128,
    contextLength: 10000000,
    modalities: ["text", "image"],
    status: "VERIFIED",
    architectureSource: "https://ai.meta.com/blog/llama-4-multimodal-intelligence/",
  },
  {
    id: "llama-4-maverick",
    legacyIds: ["llama4-maverick"],
    label: "Llama 4 Maverick 17B-128E",
    architectureType: "hybrid",
    totalParamsB: 400,
    activeParamsB: 17,
    numExperts: 128,
    numSharedExperts: 1,
    routedExpertsPerToken: 1,
    activeExpertsPerToken: 2,
    layers: 48,
    attentionType: "standard",
    kvHeads: 8,
    headDim: 128,
    contextLength: 1000000,
    modalities: ["text", "image"],
    status: "VERIFIED",
    architectureSource: "https://ai.meta.com/blog/llama-4-multimodal-intelligence/",
  },
  {
    id: "gemma-3-27b",
    legacyIds: ["gemma3-27b"],
    label: "Gemma 3 27B",
    architectureType: "dense",
    totalParamsB: 27,
    activeParamsB: 27,
    numExperts: null,
    numSharedExperts: null,
    routedExpertsPerToken: null,
    activeExpertsPerToken: null,
    layers: 62,
    attentionType: "standard",
    kvHeads: 16,
    headDim: 128,
    contextLength: 131072,
    modalities: ["text", "image"],
    status: "VERIFIED",
    architectureSource: "https://ai.google.dev/gemma/docs/core/model_card_3",
  },
  {
    id: "deepseek-v3",
    legacyIds: [],
    label: "DeepSeek V3",
    architectureType: "hybrid",
    totalParamsB: 671,
    activeParamsB: 37,
    numExperts: 256,
    numSharedExperts: 1,
    routedExpertsPerToken: 8,
    activeExpertsPerToken: 9,
    layers: 61,
    attentionType: "MLA",
    kvLoraRank: 512,
    qkRopeHeadDim: 64,
    contextLength: 131072,
    modalities: ["text"],
    status: "VERIFIED",
    architectureSource: "https://arxiv.org/abs/2412.19437",
  },
  {
    id: "deepseek-r1",
    legacyIds: [],
    label: "DeepSeek R1",
    architectureType: "hybrid",
    totalParamsB: 671,
    activeParamsB: 37,
    numExperts: 256,
    numSharedExperts: 1,
    routedExpertsPerToken: 8,
    activeExpertsPerToken: 9,
    layers: 61,
    attentionType: "MLA",
    kvLoraRank: 512,
    qkRopeHeadDim: 64,
    contextLength: 131072,
    modalities: ["text"],
    status: "VERIFIED",
    architectureSource: "https://github.com/deepseek-ai/DeepSeek-R1",
  },
  {
    id: "granite-4.2-30b",
    legacyIds: [],
    label: "IBM Granite 4.2 30B",
    architectureType: "dense",
    totalParamsB: 30,
    activeParamsB: 30,
    numExperts: null,
    numSharedExperts: null,
    routedExpertsPerToken: null,
    activeExpertsPerToken: null,
    layers: 64,
    attentionType: "standard",
    kvHeads: 8,
    headDim: 128,
    contextLength: 131072,
    modalities: ["text"],
    status: "VERIFIED",
    architectureSource: "https://huggingface.co/ibm-granite/granite-4.2-30b",
  },
  {
    id: "gpt-oss-20b",
    legacyIds: [],
    label: "gpt-oss-20b",
    architectureType: "moe",
    totalParamsB: 21,
    activeParamsB: 3.6,
    numExperts: 32,
    numSharedExperts: 0,
    routedExpertsPerToken: 4,
    activeExpertsPerToken: 4,
    layers: 24,
    attentionType: "standard",
    kvHeads: 8,
    headDim: 64,
    contextLength: 131072,
    modalities: ["text"],
    status: "VERIFIED",
    kvSizingNote:
      "Upstream alternates sliding and full attention. Current GPU Sizing applies the full-context standard KV formula to every layer, which is conservative for memory and may over-size rather than under-size this model.",
    architectureSource: "https://huggingface.co/openai/gpt-oss-20b/blob/main/config.json",
  },
  {
    id: "gpt-oss-120b",
    legacyIds: [],
    label: "gpt-oss-120b",
    architectureType: "moe",
    totalParamsB: 117,
    activeParamsB: 5.1,
    numExperts: 128,
    numSharedExperts: 0,
    routedExpertsPerToken: 4,
    activeExpertsPerToken: 4,
    layers: 36,
    attentionType: "standard",
    kvHeads: 8,
    headDim: 64,
    contextLength: 131072,
    modalities: ["text"],
    status: "VERIFIED",
    kvSizingNote:
      "Upstream alternates sliding and full attention. Current GPU Sizing applies the full-context standard KV formula to every layer, which is conservative for memory and may over-size rather than under-size this model.",
    architectureSource: "https://huggingface.co/openai/gpt-oss-120b/blob/main/config.json",
  },
  {
    id: "gemma-4-26b-a4b-it",
    legacyIds: [],
    label: "Gemma 4 26B-A4B IT",
    architectureType: "moe",
    totalParamsB: 26,
    activeParamsB: 4,
    numExperts: 128,
    numSharedExperts: 0,
    routedExpertsPerToken: 8,
    activeExpertsPerToken: 8,
    layers: 30,
    attentionType: "standard",
    kvHeads: 8,
    headDim: 256,
    contextLength: 262144,
    modalities: ["text", "image"],
    status: "VERIFIED",
    kvSizingNote:
      "Upstream uses five sliding-attention layers followed by one full-attention layer. Current GPU Sizing applies the full-context standard KV formula to all 30 language layers, intentionally over-estimating KV memory rather than under-sizing it.",
    architectureSource: "https://huggingface.co/google/gemma-4-26B-A4B-it/blob/main/config.json",
  },
  {
    id: "mistral-small-4",
    legacyIds: [],
    label: "Mistral Small 4",
    architectureType: "moe",
    totalParamsB: 119,
    activeParamsB: 6.5,
    numExperts: 128,
    numSharedExperts: 1,
    routedExpertsPerToken: 4,
    activeExpertsPerToken: 5,
    layers: 36,
    attentionType: "MLA",
    kvLoraRank: 256,
    qkRopeHeadDim: 64,
    contextLength: 262144,
    modalities: ["text", "image"],
    status: "VERIFIED",
    architectureSource: "https://huggingface.co/mistralai/Mistral-Small-4-119B-2603/blob/main/config.json",
  },
  {
    id: "mistral-large-3",
    legacyIds: [],
    label: "Mistral Large 3",
    architectureType: "moe",
    totalParamsB: 675,
    activeParamsB: 41,
    numExperts: 128,
    numSharedExperts: 1,
    routedExpertsPerToken: 4,
    activeExpertsPerToken: 5,
    layers: 61,
    attentionType: "MLA",
    kvLoraRank: 512,
    qkRopeHeadDim: 64,
    contextLength: 262144,
    modalities: ["text", "image"],
    status: "VERIFIED",
    architectureSource: "https://huggingface.co/mistralai/Mistral-Large-3-675B-Instruct-2512/blob/main/params.json",
  },
];

export const MODEL_REGISTRY = [...TECHNICAL_MODEL_REGISTRY, ...STAGED_TECHNICAL_MODEL_REGISTRY].map((model) => ({
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
  numSharedExperts: null,
  routedExpertsPerToken: null,
  activeExpertsPerToken: null,
  layers: null,
  attentionType: "standard",
  kvHeads: null,
  headDim: null,
  kvLoraRank: null,
  qkRopeHeadDim: null,
  contextLength: null,
  modalities: ["text"],
  architectureSource: null,
  status: "CUSTOM",
  catalogStatus: "custom",
};

export const RECOMMENDED_MODELS = MODEL_REGISTRY.filter((model) => model.catalogStatus === "recommended");
export const EXISTING_DEPLOYMENT_MODELS = MODEL_REGISTRY.filter(
  (model) => model.catalogStatus === "existing-deployment"
);
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
export function getVisibleModelOptions({
  includeExisting = false,
  selectedId = null,
  selectedIds = null,
  includeCustom = true,
} = {}) {
  const options = [...RECOMMENDED_MODELS];
  if (includeExisting) options.push(...EXISTING_DEPLOYMENT_MODELS);

  const preserveIds = selectedIds ?? (selectedId ? [selectedId] : []);
  for (const id of preserveIds) {
    const selected = getModelById(id);
    if (
      selected &&
      selected.id !== "custom" &&
      selected.catalogStatus === "existing-deployment" &&
      !options.some((m) => m.id === selected.id)
    ) {
      options.push(selected);
    }
  }

  if (includeCustom) options.push(CUSTOM_MODEL);
  return options;
}

// Backward-compatible mutable exports (used by some tests/validators directly).
// Prefer passing `visibleModelOptions` as props from `ModelCatalogVisibilityRoute`.
export const GPU_SIZING_MODELS = getVisibleModelOptions();
export const TCO_MODEL_OPTIONS = getVisibleModelOptions();

export const GPU_SIZING_RECOMMENDED_MODELS = [...RECOMMENDED_MODELS, CUSTOM_MODEL];
export const GPU_SIZING_EXISTING_DEPLOYMENT_MODELS = EXISTING_DEPLOYMENT_MODELS;
export const TCO_RECOMMENDED_MODEL_OPTIONS = [...RECOMMENDED_MODELS, CUSTOM_MODEL];
export const TCO_EXISTING_DEPLOYMENT_MODEL_OPTIONS = EXISTING_DEPLOYMENT_MODELS;

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
