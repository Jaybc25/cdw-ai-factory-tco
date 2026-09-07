// Source-verified technical model records that are intentionally NOT yet part
// of the customer-facing MODEL_REGISTRY. These records may be exercised by
// methodology/readiness validation while product-policy activation remains
// blocked. Moving an entry from here into MODEL_REGISTRY is a separate,
// deliberate activation step.

export const STAGED_TECHNICAL_MODEL_REGISTRY = Object.freeze([
  Object.freeze({
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
    catalogStatus: "staged",
    architectureSource: "https://huggingface.co/ibm-granite/granite-4.2-30b",
  }),
  Object.freeze({
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
    catalogStatus: "staged",
    kvSizingNote: "Upstream alternates sliding and full attention. Current GPU Sizing applies the full-context standard KV formula to every layer, which is conservative for memory and may over-size rather than under-size this model.",
    architectureSource: "https://huggingface.co/openai/gpt-oss-20b/blob/main/config.json",
  }),
  Object.freeze({
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
    catalogStatus: "staged",
    kvSizingNote: "Upstream alternates sliding and full attention. Current GPU Sizing applies the full-context standard KV formula to every layer, which is conservative for memory and may over-size rather than under-size this model.",
    architectureSource: "https://huggingface.co/openai/gpt-oss-120b/blob/main/config.json",
  }),
]);

const STAGED_BY_ID = new Map(STAGED_TECHNICAL_MODEL_REGISTRY.map((model) => [model.id, model]));

export function getStagedTechnicalModelById(id) {
  return id ? STAGED_BY_ID.get(id) || null : null;
}
