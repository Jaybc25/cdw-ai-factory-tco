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
import { SEQUENCE_STATE_TYPES, getInferenceSequenceStateMemory } from "../src/modelSizingMethodology.js";

const baseSpecs = JSON.parse(fs.readFileSync(new URL("../data/model_specs.json", import.meta.url), "utf8"));
const activationSpecs = JSON.parse(
  fs.readFileSync(new URL("../data/model_specs_activation.json", import.meta.url), "utf8")
);
const policy = JSON.parse(fs.readFileSync(new URL("../data/model_catalog_policy.json", import.meta.url), "utf8"));
const catalog = [...baseSpecs.data.models, ...activationSpecs.data.models];
const catalogIds = new Set(catalog.map((m) => m.canonical_model_id));
const registryIds = new Set(MODEL_REGISTRY.map((m) => m.id));
const policyIds = new Set(policy.models.map((m) => m.canonical_model_id));
function diff(a, b) {
  return [...a].filter((id) => !b.has(id));
}

const missing = diff(catalogIds, registryIds);
const extra = diff(registryIds, catalogIds);
if (missing.length || extra.length)
  throw new Error(
    `Shared model registry coverage mismatch. Missing: ${missing.join(", ") || "none"}. Extra: ${extra.join(", ") || "none"}.`
  );
const policyMissing = diff(registryIds, policyIds);
const policyExtra = diff(policyIds, registryIds);
if (policyMissing.length || policyExtra.length)
  throw new Error(
    `Model catalog policy coverage mismatch. Missing: ${policyMissing.join(", ") || "none"}. Extra: ${policyExtra.join(", ") || "none"}.`
  );
if ((policy.staged_models || []).length !== 0)
  throw new Error("No tranche model should remain in staged product policy after coordinated activation.");

const allowedStatuses = new Set(["recommended", "existing-deployment", "retired"]);
if (!getModelById(DEFAULT_MODEL_ID) || !isRecommendedModel(DEFAULT_MODEL_ID))
  throw new Error(`Default model ${DEFAULT_MODEL_ID} must be registered and recommended.`);
const architectureTypes = new Set(MODEL_ARCHITECTURE_TYPES);
const sequenceStateTypes = new Set(SEQUENCE_STATE_TYPES);
const allowedAttentionTypes = new Set(["standard", "MLA"]);
const allowedModalities = new Set(["text", "image", "audio", "video"]);
const seenAliases = new Map();

for (const model of MODEL_REGISTRY) {
  if (model.schemaVersion !== MODEL_ARCHITECTURE_SCHEMA_VERSION)
    throw new Error(`Model ${model.id} schema version mismatch.`);
  if (!architectureTypes.has(model.architectureType))
    throw new Error(`Model ${model.id} has invalid architectureType.`);
  if (
    !(
      Number.isFinite(model.totalParamsB) &&
      model.totalParamsB > 0 &&
      Number.isFinite(model.activeParamsB) &&
      model.activeParamsB > 0 &&
      model.activeParamsB <= model.totalParamsB
    )
  )
    throw new Error(`Model ${model.id} has invalid total/active parameter semantics.`);
  if (model.architectureType === "dense" && Math.abs(model.activeParamsB - model.totalParamsB) > 1e-9)
    throw new Error(`Dense model ${model.id} must have active=total.`);
  if (
    (model.architectureType === "moe" || model.architectureType === "hybrid") &&
    !(model.activeParamsB < model.totalParamsB)
  )
    throw new Error(`Sparse model ${model.id} must have active<total.`);
  if (!(Number.isFinite(model.layers) && model.layers > 0))
    throw new Error(`Model ${model.id} has invalid layer count.`);

  if (model.sequenceStateType) {
    if (!sequenceStateTypes.has(model.sequenceStateType))
      throw new Error(`Model ${model.id} has unsupported sequenceStateType ${model.sequenceStateType}.`);
    const state = getInferenceSequenceStateMemory(model, 8192, 2);
    if (!(state.bytesPerSequence > 0))
      throw new Error(`Model ${model.id} hybrid sequence-state contract is not computable.`);
  } else {
    if (!allowedAttentionTypes.has(model.attentionType))
      throw new Error(`Model ${model.id} has unsupported attention type.`);
    if (model.attentionType === "MLA") {
      if (
        !(
          Number.isFinite(model.kvLoraRank) &&
          model.kvLoraRank > 0 &&
          Number.isFinite(model.qkRopeHeadDim) &&
          model.qkRopeHeadDim > 0
        )
      )
        throw new Error(`MLA model ${model.id} lacks KV fields.`);
    } else if (
      !(Number.isFinite(model.kvHeads) && model.kvHeads > 0 && Number.isFinite(model.headDim) && model.headDim > 0)
    )
      throw new Error(`Standard model ${model.id} lacks KV fields.`);
  }

  const sparse = model.architectureType !== "dense";
  if (sparse) {
    if (
      !(
        Number.isFinite(model.numExperts) &&
        model.numExperts >= 1 &&
        Number.isFinite(model.numSharedExperts) &&
        model.numSharedExperts >= 0 &&
        Number.isFinite(model.routedExpertsPerToken) &&
        model.routedExpertsPerToken >= 1 &&
        Number.isFinite(model.activeExpertsPerToken) &&
        model.activeExpertsPerToken >= 1
      )
    )
      throw new Error(`Sparse model ${model.id} has incomplete expert-routing fields.`);
    if (
      model.routedExpertsPerToken > model.numExperts ||
      model.activeExpertsPerToken !== model.routedExpertsPerToken + model.numSharedExperts
    )
      throw new Error(`Sparse model ${model.id} has inconsistent expert-routing semantics.`);
  } else if (
    [model.numExperts, model.numSharedExperts, model.routedExpertsPerToken, model.activeExpertsPerToken].some(
      (v) => v != null
    )
  )
    throw new Error(`Dense model ${model.id} must not define MoE routing fields.`);

  if (!Array.isArray(model.modalities) || !model.modalities.length || !model.modalities.includes("text"))
    throw new Error(`Model ${model.id} must include text modality.`);
  for (const modality of model.modalities)
    if (!allowedModalities.has(modality)) throw new Error(`Model ${model.id} has unsupported modality ${modality}.`);
  if (!(typeof model.architectureSource === "string" && /^https:\/\//.test(model.architectureSource)))
    throw new Error(`Model ${model.id} lacks architecture provenance.`);
  if (!allowedStatuses.has(model.catalogStatus))
    throw new Error(`Model ${model.id} has invalid resolved status ${model.catalogStatus}.`);
  if (getModelResidencyParamsB(model) !== model.totalParamsB || getModelActiveParamsB(model) !== model.activeParamsB)
    throw new Error(`Parameter helpers drifted for ${model.id}.`);

  for (const key of [model.id, ...(model.legacyIds || [])]) {
    if (seenAliases.has(key)) throw new Error(`Duplicate model identifier/alias ${key}.`);
    seenAliases.set(key, model.id);
    if (getModelById(key)?.id !== model.id) throw new Error(`Lookup failed for ${key}.`);
  }

  const spec = catalog.find((m) => m.canonical_model_id === model.id);
  const catalogParams = spec?.param_count_billion?.value;
  if (Number.isFinite(catalogParams) && Math.abs(model.totalParamsB - catalogParams) / catalogParams > 0.05)
    throw new Error(`Technical parameters for ${model.id} differ from Advisor specs by >5%.`);
}

const defaultVisible = getVisibleModelOptions();
if (defaultVisible.some((m) => m.catalogStatus === "existing-deployment"))
  throw new Error("Default visible list exposed existing-deployment model.");
if (!defaultVisible.some((m) => m.id === "custom")) throw new Error("Custom model must remain available.");
for (const model of RECOMMENDED_MODELS)
  if (!defaultVisible.some((m) => m.id === model.id))
    throw new Error(`Recommended model ${model.id} missing from default visible list.`);
const withExisting = getVisibleModelOptions({ includeExisting: true });
for (const model of EXISTING_DEPLOYMENT_MODELS)
  if (!withExisting.some((m) => m.id === model.id)) throw new Error(`Existing-deployment toggle missing ${model.id}.`);

const advisorResult = buildRecommendations(getCatalog(), {
  license: "need-to-check",
  governance: "none",
  contextWindow: "8k",
  multimodal: "any",
  primaryWorkload: "rag",
  qualityPriority: "strong",
  optimizationPriority: "balanced",
});
const advisorSurfaceIds = new Set(
  [...advisorResult.cards, ...advisorResult.otherEligible, ...advisorResult.verificationCandidates].map(
    (x) => x.model?.canonical_model_id || x.canonical_model_id
  )
);
for (const model of EXISTING_DEPLOYMENT_MODELS)
  if (advisorSurfaceIds.has(model.id)) throw new Error(`Advisor exposed existing-deployment model ${model.id}.`);
if (advisorResult.totalCount !== RECOMMENDED_MODELS.length)
  throw new Error(
    `Advisor totalCount ${advisorResult.totalCount} != recommended registry size ${RECOMMENDED_MODELS.length}.`
  );

console.log(
  `Shared model registry PASS: schema v${MODEL_ARCHITECTURE_SCHEMA_VERSION}; ${MODEL_REGISTRY.length} canonical models; ${RECOMMENDED_MODELS.length} recommended; ${EXISTING_DEPLOYMENT_MODELS.length} existing-deployment; activation specs/policy/runtime coverage aligned; standard, MLA, and hybrid sequence-state semantics valid.`
);
