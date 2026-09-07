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
]);

const STAGED_BY_ID = new Map(STAGED_TECHNICAL_MODEL_REGISTRY.map((model) => [model.id, model]));

export function getStagedTechnicalModelById(id) {
  return id ? STAGED_BY_ID.get(id) || null : null;
}
