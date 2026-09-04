// Shared model context for Model Advisor, GPU Sizing, and TCO handoffs.
// Canonical IDs match data/model_specs.json. Technical architecture fields are
// the GPU Sizing inputs and remain authoritative for GPU Sizing calculations.
// TCO consumes only identity and totalParamsB for its directional capacity and
// unit-economics layer. TCO does not duplicate GPU Sizing's technical engine.

export const DEFAULT_MODEL_ID = "llama-3.1-70b";

export const MODEL_REGISTRY = [
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

export const CUSTOM_MODEL = {
  id: "custom",
  legacyIds: [],
  label: "Custom model...",
  totalParamsB: null,
  layers: null,
  kvHeads: null,
  headDim: null,
  status: "CUSTOM",
};

export const GPU_SIZING_MODELS = [...MODEL_REGISTRY, CUSTOM_MODEL];
export const TCO_MODEL_OPTIONS = [...MODEL_REGISTRY, CUSTOM_MODEL];

const BY_ID = new Map();
for (const model of GPU_SIZING_MODELS) {
  BY_ID.set(model.id, model);
  for (const legacyId of model.legacyIds || []) BY_ID.set(legacyId, model);
}

export function getModelById(id) {
  return id ? BY_ID.get(id) || null : null;
}

export function getDefaultModel() {
  return getModelById(DEFAULT_MODEL_ID);
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
