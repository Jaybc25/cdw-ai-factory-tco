import fs from "node:fs";
import {
  MODEL_REGISTRY,
  DEFAULT_MODEL_ID,
  RECOMMENDED_MODELS,
  EXISTING_DEPLOYMENT_MODELS,
  getModelById,
  getVisibleModelOptions,
  isRecommendedModel,
} from "../src/modelRegistry.js";

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

const seenAliases = new Map();
for (const model of MODEL_REGISTRY) {
  if (!(Number.isFinite(model.totalParamsB) && model.totalParamsB > 0)) {
    throw new Error(`Model ${model.id} has invalid technical totalParamsB: ${model.totalParamsB}`);
  }
  if (!allowedStatuses.has(model.catalogStatus)) {
    throw new Error(`Model ${model.id} has invalid resolved catalogStatus: ${model.catalogStatus}`);
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
      throw new Error(`Technical param count for ${model.id} (${model.totalParamsB}B) differs from Model Advisor catalog (${catalogParams}B) by more than 5%.`);
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

console.log(
  `Shared model registry PASS: ${MODEL_REGISTRY.length} canonical models; ` +
  `${RECOMMENDED_MODELS.length} recommended; ${EXISTING_DEPLOYMENT_MODELS.length} existing-deployment; ` +
  `recommended default; visibility policy valid; aliases unique; policy coverage complete; parameter values within tolerance.`
);
