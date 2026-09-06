import fs from "node:fs";
import {
  MODEL_REGISTRY,
  MODEL_ARCHITECTURE_SCHEMA_VERSION,
  MODEL_ARCHITECTURE_TYPES,
  DEFAULT_MODEL_ID,
  RECOMMENDED_MODELS,
  EXISTING_DEPLOYMENT_MODELS,
  getModelById,
  getVisibleModelOptions,
  isRecommendedModel,
  getModelResidencyParamsB,
  getModelActiveParamsB,
} from "../src/modelRegistry.js";
import { getCatalog, buildRecommendations } from "../src/modelAdvisorEngine.js";

const specs = JSON.parse(fs.readFileSync(new URL("../data/model_specs.json", import.meta.url), "utf8"));
const policy = JSON.parse(fs.readFileSync(new URL("../data/model_catalog_policy.json", import.meta.url), "utf8"));
const catalog = specs.data.models;
const catalogIds = new Set(catalog.map((m) => m.canonical_model_id));
const registryIds = new Set(MODEL_REGISTRY.map((m) => m.id));
const policyIds = new Set(policy.models.map((m) => m.canonical_model_id));

const missing = [...catalogIds].filter((id) => !registryIds.has(id));
const extra = [...registryIds].filter((id) => !catalogIds.has(id));
if (missing.length || extra.length) {
  throw new Error(`Shared model registry coverage mismatch. Missing: ${missing.join(", ") || "none"}. Extra: ${extra.join(", ") || "none"}.`);
}

const policyMissing = [...registryIds].filter((id) => !policyIds.has(id));
const policyExtra = [...policyIds].filter((id) => !registryIds.has(id));
if (policyMissing.length || policyExtra.length) {
  throw new Error(`Model catalog policy coverage mismatch. Missing: ${policyMissing.join(", ") || "none"}. Extra: ${policyExtra.join(", ") || "none"}.`);
}

const allowedStatuses = new Set(["recommended", "existing-deployment", "retired"]);
for (const entry of policy.models) {
  if (!allowedStatuses.has(entry.catalog_status)) {
    throw new Error(`Model ${entry.canonical_model_id} has invalid catalog_status: ${entry.catalog_status}`);
  }
}

if (!getModelById(DEFAULT_MODEL_ID)) throw new Error(`Default model ${DEFAULT_MODEL_ID} is not registered.`);
if (!RECOMMENDED_MODELS.length) throw new Error("At least one recommended model is required.");
if (!isRecommendedModel(DEFAULT_MODEL_ID)) {
  throw new Error(`Default model ${DEFAULT_MODEL_ID} must be in the current recommended catalog.`);
}

const architectureTypes = new Set(MODEL_ARCHITECTURE_TYPES);
const allowedAttentionTypes = new Set(["standard", "MLA"]);
const allowedModalities = new Set(["text", "image", "audio", "video"]);
const seenAliases = new Map();
for (const model of MODEL_REGISTRY) {
  if (model.schemaVersion !== MODEL_ARCHITECTURE_SCHEMA_VERSION) {
    throw new Error(`Model ${model.id} has schemaVersion ${model.schemaVersion}; expected ${MODEL_ARCHITECTURE_SCHEMA_VERSION}.`);
  }
  if (!architectureTypes.has(model.architectureType)) {
    throw new Error(`Model ${model.id} has invalid architectureType: ${model.architectureType}`);
  }
  if (!(Number.isFinite(model.totalParamsB) && model.totalParamsB > 0)) {
    throw new Error(`Model ${model.id} has invalid technical totalParamsB: ${model.totalParamsB}`);
  }
  if (!(Number.isFinite(model.activeParamsB) && model.activeParamsB > 0)) {
    throw new Error(`Model ${model.id} has invalid technical activeParamsB: ${model.activeParamsB}`);
  }
  if (model.activeParamsB > model.totalParamsB) {
    throw new Error(`Model ${model.id} activeParamsB (${model.activeParamsB}) cannot exceed totalParamsB (${model.totalParamsB}).`);
  }
  if (model.architectureType === "dense" && Math.abs(model.activeParamsB - model.totalParamsB) > 1e-9) {
    throw new Error(`Dense model ${model.id} must have activeParamsB equal to totalParamsB.`);
  }
  if ((model.architectureType === "moe" || model.architectureType === "hybrid") && !(model.activeParamsB < model.totalParamsB)) {
    throw new Error(`Sparse model ${model.id} must have activeParamsB lower than totalParamsB.`);
  }
  if (!(Number.isFinite(model.layers) && model.layers > 0)) {
    throw new Error(`Model ${model.id} has invalid layers: ${model.layers}`);
  }
  if (!allowedAttentionTypes.has(model.attentionType)) {
    throw new Error(`Model ${model.id} has unsupported attentionType: ${model.attentionType}`);
  }
  if (model.attentionType === "MLA") {
    if (!(Number.isFinite(model.kvLoraRank) && model.kvLoraRank > 0 && Number.isFinite(model.qkRopeHeadDim) && model.qkRopeHeadDim > 0)) {
      throw new Error(`MLA model ${model.id} requires positive kvLoraRank and qkRopeHeadDim.`);
    }
  } else if (!(Number.isFinite(model.kvHeads) && model.kvHeads > 0 && Number.isFinite(model.headDim) && model.headDim > 0)) {
    throw new Error(`Standard-attention model ${model.id} requires positive kvHeads and headDim.`);
  }

  const isSparse = model.architectureType === "moe" || model.architectureType === "hybrid";
  if (isSparse) {
    if (!(Number.isFinite(model.numExperts) && model.numExperts >= 1)) {
      throw new Error(`Sparse model ${model.id} requires positive routed numExperts.`);
    }
    if (!(Number.isFinite(model.numSharedExperts) && model.numSharedExperts >= 0)) {
      throw new Error(`Sparse model ${model.id} requires non-negative numSharedExperts.`);
    }
    if (!(Number.isFinite(model.routedExpertsPerToken) && model.routedExpertsPerToken >= 1)) {
      throw new Error(`Sparse model ${model.id} requires positive routedExpertsPerToken.`);
    }
    if (model.routedExpertsPerToken > model.numExperts) {
      throw new Error(`Model ${model.id} routedExpertsPerToken cannot exceed routed numExperts.`);
    }
    if (!(Number.isFinite(model.activeExpertsPerToken) && model.activeExpertsPerToken >= 1)) {
      throw new Error(`Sparse model ${model.id} requires positive activeExpertsPerToken.`);
    }
    const expectedActiveExperts = model.routedExpertsPerToken + model.numSharedExperts;
    if (model.activeExpertsPerToken !== expectedActiveExperts) {
      throw new Error(`Model ${model.id} activeExpertsPerToken (${model.activeExpertsPerToken}) must equal routedExpertsPerToken + numSharedExperts (${expectedActiveExperts}).`);
    }
  } else if ([model.numExperts, model.numSharedExperts, model.routedExpertsPerToken, model.activeExpertsPerToken].some((v) => v != null)) {
    throw new Error(`Dense model ${model.id} must not define MoE expert-routing fields.`);
  }

  if (model.contextLength != null && !(Number.isFinite(model.contextLength) && model.contextLength > 0)) {
    throw new Error(`Model ${model.id} has invalid contextLength: ${model.contextLength}`);
  }
  if (!Array.isArray(model.modalities) || model.modalities.length === 0) {
    throw new Error(`Model ${model.id} must have at least one modality.`);
  }
  for (const modality of model.modalities) {
    if (!allowedModalities.has(modality)) throw new Error(`Model ${model.id} has unsupported modality: ${modality}.`);
  }
  if (!model.modalities.includes("text")) {
    throw new Error(`Current language-model catalog entry ${model.id} must include text modality.`);
  }
  if (!(typeof model.architectureSource === "string" && /^https:\/\//.test(model.architectureSource))) {
    throw new Error(`Model ${model.id} requires an architectureSource URL before architecture metadata is treated as verified.`);
  }
  if (!allowedStatuses.has(model.catalogStatus)) {
    throw new Error(`Model ${model.id} has invalid resolved catalogStatus: ${model.catalogStatus}`);
  }

  // Semantic contract: residency and active-compute accessors are distinct.
  if (getModelResidencyParamsB(model) !== model.totalParamsB) {
    throw new Error(`Residency parameter helper changed semantics for ${model.id}.`);
  }
  if (getModelActiveParamsB(model) !== model.activeParamsB) {
    throw new Error(`Active parameter helper changed semantics for ${model.id}.`);
  }

  for (const key of [model.id, ...(model.legacyIds || [])]) {
    if (seenAliases.has(key)) throw new Error(`Duplicate model identifier/alias ${key} used by ${seenAliases.get(key)} and ${model.id}.`);
    seenAliases.set(key, model.id);
    if (getModelById(key)?.id !== model.id) throw new Error(`Lookup failed for ${key} -> ${model.id}.`);
  }

  const spec = catalog.find((m) => m.canonical_model_id === model.id);
  const catalogParams = spec?.param_count_billion?.value;
  if (Number.isFinite(catalogParams) && catalogParams > 0) {
    const relativeDifference = Math.abs(model.totalParamsB - catalogParams) / catalogParams;
    if (relativeDifference > 0.05) {
      throw new Error(`Technical totalParamsB for ${model.id} (${model.totalParamsB}B) differs from Model Advisor catalog (${catalogParams}B) by more than 5%.`);
    }
  }
}

for (const model of EXISTING_DEPLOYMENT_MODELS) {
  if (getModelById(model.id)?.id !== model.id) {
    throw new Error(`Existing-deployment model ${model.id} is no longer resolvable for saved sessions/handoffs.`);
  }
}

const defaultVisible = getVisibleModelOptions();
if (defaultVisible.some((m) => m.catalogStatus === "existing-deployment")) {
  throw new Error("Default visible model list must not expose existing-deployment models.");
}
if (!defaultVisible.some((m) => m.id === "custom")) {
  throw new Error("Custom model must remain available in the default visible model list.");
}

const withExisting = getVisibleModelOptions({ includeExisting: true });
for (const model of EXISTING_DEPLOYMENT_MODELS) {
  if (!withExisting.some((m) => m.id === model.id)) {
    throw new Error(`Existing-deployment toggle list is missing ${model.id}.`);
  }
}

const restoredExisting = EXISTING_DEPLOYMENT_MODELS[0];
if (restoredExisting) {
  const restoredVisible = getVisibleModelOptions({ selectedId: restoredExisting.id });
  if (!restoredVisible.some((m) => m.id === restoredExisting.id)) {
    throw new Error(`Selected existing-deployment model ${restoredExisting.id} must remain visible with the toggle off.`);
  }
}

// Model Advisor is a greenfield recommender: existing-deployment models may
// remain in the underlying shared catalog but must never enter its ranking,
// verification, or "other eligible" surfaces.
const advisorResult = buildRecommendations(getCatalog(), {
  license: "need-to-check",
  governance: "none",
  contextWindow: "8k",
  multimodal: "any",
  primaryWorkload: "rag",
  qualityPriority: "strong",
  optimizationPriority: "balanced",
});
const advisorSurfaceIds = new Set([
  ...advisorResult.cards.map((card) => card.model.canonical_model_id),
  ...advisorResult.otherEligible.map((model) => model.canonical_model_id),
  ...advisorResult.verificationCandidates.map((model) => model.canonical_model_id),
  ...advisorResult.eligibilityTrace.allModels.map((model) => model.canonical_model_id),
]);
for (const model of EXISTING_DEPLOYMENT_MODELS) {
  if (advisorSurfaceIds.has(model.id)) {
    throw new Error(`Model Advisor exposed existing-deployment model ${model.id}.`);
  }
}
if (advisorResult.totalCount !== RECOMMENDED_MODELS.length) {
  throw new Error(`Model Advisor totalCount ${advisorResult.totalCount} does not match recommended catalog size ${RECOMMENDED_MODELS.length}.`);
}

console.log(
  `Shared model registry PASS: schema v${MODEL_ARCHITECTURE_SCHEMA_VERSION}; ${MODEL_REGISTRY.length} canonical models; ` +
  `${RECOMMENDED_MODELS.length} recommended; ${EXISTING_DEPLOYMENT_MODELS.length} existing-deployment; ` +
  `dense/MoE/hybrid parameter, expert-routing, attention, context, modality, and provenance semantics valid; ` +
  `residency/active helpers distinct; recommended default; visibility policy valid; Advisor greenfield-only; aliases unique; policy coverage complete.`
);
