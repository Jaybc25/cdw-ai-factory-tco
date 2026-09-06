import fs from "node:fs";
import { MODEL_REGISTRY, getVisibleModelOptions } from "../src/modelRegistry.js";
import { getCatalog, buildRecommendations } from "../src/modelAdvisorEngine.js";

const manifest = JSON.parse(
  fs.readFileSync(new URL("../data/model_catalog_tranche_1_qualification.json", import.meta.url), "utf8")
);
const policy = JSON.parse(
  fs.readFileSync(new URL("../data/model_catalog_policy.json", import.meta.url), "utf8")
);
const governance = JSON.parse(
  fs.readFileSync(new URL("../data/model_governance.json", import.meta.url), "utf8")
);
const canonical = JSON.parse(
  fs.readFileSync(new URL("../data/canonical_models.json", import.meta.url), "utf8")
);

const EXPECTED_IDS = new Set([
  "qwen3.8-27b",
  "deepseek-v4-flash-0731",
  "deepseek-v4-pro-0813",
  "gemma-4-26b-a4b-it",
  "mistral-small-4",
  "mistral-large-3",
  "gpt-oss-20b",
  "gpt-oss-120b",
  "nemotron-3-super-120b-a12b",
  "granite-4.2-30b",
]);

const EXPECTED_AA_ALIASES = new Map([
  ["qwen3.8-27b", null],
  ["deepseek-v4-flash-0731", null],
  ["deepseek-v4-pro-0813", null],
  ["gemma-4-26b-a4b-it", null],
  ["mistral-small-4", "mistral-small-4"],
  ["mistral-large-3", "mistral-large-3"],
  ["gpt-oss-20b", "gpt-oss-20b"],
  ["gpt-oss-120b", "gpt-oss-120b"],
  ["nemotron-3-super-120b-a12b", "nvidia-nemotron-3-super-120b-a12b"],
  ["granite-4.2-30b", "granite-4-2-30b"],
]);

const ALLOWED_ARCH = new Set(["dense", "moe", "hybrid"]);
const ALLOWED_COUNTRIES = new Set(["us", "cn", "fr"]);

if (manifest.schema_version !== 1) {
  throw new Error(`Unexpected tranche manifest schema_version: ${manifest.schema_version}`);
}
if (manifest.activation_policy?.state !== "staged-until-methodology") {
  throw new Error("Tranche 1 must remain staged until architecture-aware methodology and Advisor recalibration are complete.");
}
if (!Array.isArray(manifest.models) || manifest.models.length !== EXPECTED_IDS.size) {
  throw new Error(`Expected exactly ${EXPECTED_IDS.size} staged models; found ${manifest.models?.length ?? 0}.`);
}
if (!Array.isArray(policy.models)) {
  throw new Error("Catalog policy must retain an active `models` collection.");
}
if (!Array.isArray(policy.staged_models)) {
  throw new Error("Catalog policy must declare a separate `staged_models` collection for pre-activation candidates.");
}
if (!Array.isArray(canonical.models)) {
  throw new Error("Canonical model registry must declare a models collection.");
}

const activePolicyIds = new Set(policy.models.map((entry) => entry.canonical_model_id));
const stagedPolicyIds = new Set(policy.staged_models.map((entry) => entry.canonical_model_id));
if (policy.staged_models.length !== EXPECTED_IDS.size || stagedPolicyIds.size !== EXPECTED_IDS.size) {
  throw new Error("Catalog policy staged_models must contain each tranche model exactly once.");
}
for (const id of EXPECTED_IDS) {
  if (activePolicyIds.has(id)) {
    throw new Error(`${id} leaked into the active catalog-policy collection before PR4 activation.`);
  }
}
if ([...EXPECTED_IDS].some((id) => !stagedPolicyIds.has(id))) {
  throw new Error("Catalog policy staged_models must match tranche 1 exactly before PR4 activation.");
}

const canonicalIds = canonical.models.map((entry) => entry.canonical_model_id);
const canonicalIdSet = new Set(canonicalIds);
if (canonicalIds.length !== canonicalIdSet.size) {
  throw new Error("Canonical model registry contains duplicate canonical_model_id values.");
}
const canonicalById = new Map(canonical.models.map((entry) => [entry.canonical_model_id, entry]));
const aaAliases = canonical.models
  .map((entry) => entry.aliases?.artificial_analysis_slug)
  .filter(Boolean);
if (aaAliases.length !== new Set(aaAliases).size) {
  throw new Error("Canonical model registry contains duplicate Artificial Analysis aliases.");
}

const policyById = new Map(policy.staged_models.map((entry) => [entry.canonical_model_id, entry]));
const governanceById = new Map(governance.entries.map((entry) => [entry.canonical_model_id, entry]));
const runtimeIds = new Set(MODEL_REGISTRY.map((model) => model.id));
const advisorCatalogIds = new Set(getCatalog().map((model) => model.canonical_model_id));

const seen = new Set();
for (const model of manifest.models) {
  if (!EXPECTED_IDS.has(model.canonical_model_id)) {
    throw new Error(`Unexpected tranche model id: ${model.canonical_model_id}`);
  }
  if (seen.has(model.canonical_model_id)) {
    throw new Error(`Duplicate tranche model id: ${model.canonical_model_id}`);
  }
  seen.add(model.canonical_model_id);

  if (model.qualification !== "qualified") {
    throw new Error(`${model.canonical_model_id} is not marked qualified.`);
  }
  if (!model.display_name || !model.upstream_model_id || !model.developer || !model.license) {
    throw new Error(`${model.canonical_model_id} is missing required identity/license metadata.`);
  }
  if (!ALLOWED_COUNTRIES.has(model.developer_country)) {
    throw new Error(`${model.canonical_model_id} has unexpected developer_country: ${model.developer_country}`);
  }
  if (!ALLOWED_ARCH.has(model.architecture_family)) {
    throw new Error(`${model.canonical_model_id} has invalid architecture_family: ${model.architecture_family}`);
  }
  if (!(Number.isFinite(model.total_params_b) && model.total_params_b > 0)) {
    throw new Error(`${model.canonical_model_id} has invalid total_params_b: ${model.total_params_b}`);
  }
  if (!(Number.isFinite(model.active_params_b) && model.active_params_b > 0)) {
    throw new Error(`${model.canonical_model_id} has invalid active_params_b: ${model.active_params_b}`);
  }
  if (model.active_params_b > model.total_params_b) {
    throw new Error(`${model.canonical_model_id} active_params_b exceeds total_params_b.`);
  }
  if (model.architecture_family === "dense" && model.active_params_b !== model.total_params_b) {
    throw new Error(`${model.canonical_model_id} is dense but active_params_b differs from total_params_b.`);
  }
  if (model.architecture_family !== "dense" && !(model.active_params_b < model.total_params_b)) {
    throw new Error(`${model.canonical_model_id} is sparse but active_params_b is not lower than total_params_b.`);
  }
  if (!(Number.isFinite(model.context_length) && model.context_length >= 8000)) {
    throw new Error(`${model.canonical_model_id} has invalid context_length: ${model.context_length}`);
  }
  if (!Array.isArray(model.modalities) || model.modalities.length === 0) {
    throw new Error(`${model.canonical_model_id} must declare at least one modality.`);
  }
  if (typeof model.source !== "string" || !/^https:\/\//.test(model.source)) {
    throw new Error(`${model.canonical_model_id} is missing an HTTPS primary source.`);
  }

  if (model.num_experts != null && (!(Number.isFinite(model.num_experts)) || model.num_experts < 1)) {
    throw new Error(`${model.canonical_model_id} has invalid num_experts: ${model.num_experts}`);
  }
  if (model.active_experts_per_token != null) {
    if (!(Number.isFinite(model.active_experts_per_token) && model.active_experts_per_token > 0)) {
      throw new Error(`${model.canonical_model_id} has invalid active_experts_per_token: ${model.active_experts_per_token}`);
    }
    if (model.num_experts != null && model.active_experts_per_token > model.num_experts) {
      throw new Error(`${model.canonical_model_id} active_experts_per_token exceeds num_experts.`);
    }
  }

  const canonicalEntry = canonicalById.get(model.canonical_model_id);
  if (!canonicalEntry) {
    throw new Error(`${model.canonical_model_id} is missing from the canonical model registry.`);
  }
  if (canonicalEntry.aliases?.huggingface !== model.upstream_model_id) {
    throw new Error(`${model.canonical_model_id} canonical Hugging Face alias does not match the qualified upstream_model_id.`);
  }
  const expectedAaAlias = EXPECTED_AA_ALIASES.get(model.canonical_model_id);
  if ((canonicalEntry.aliases?.artificial_analysis_slug ?? null) !== expectedAaAlias) {
    throw new Error(`${model.canonical_model_id} has an unexpected Artificial Analysis alias; ambiguous variants must remain unmapped.`);
  }

  const policyEntry = policyById.get(model.canonical_model_id);
  if (!policyEntry) {
    throw new Error(`${model.canonical_model_id} is missing a staged CDW catalog-policy record.`);
  }
  if (policyEntry.catalog_status !== "staged") {
    throw new Error(`${model.canonical_model_id} must remain catalog_status=staged before PR4 activation.`);
  }
  if (policyEntry.activation_dependency !== "pr4-methodology-and-advisor-recalibration") {
    throw new Error(`${model.canonical_model_id} must declare the PR4 activation dependency.`);
  }

  const governanceEntry = governanceById.get(model.canonical_model_id);
  if (!governanceEntry) {
    throw new Error(`${model.canonical_model_id} is missing a governance record.`);
  }
  if (governanceEntry.developer_country !== model.developer_country) {
    throw new Error(`${model.canonical_model_id} governance country does not match qualification manifest.`);
  }

  if (runtimeIds.has(model.canonical_model_id)) {
    throw new Error(`${model.canonical_model_id} leaked into MODEL_REGISTRY before PR4 activation.`);
  }
  if (advisorCatalogIds.has(model.canonical_model_id)) {
    throw new Error(`${model.canonical_model_id} leaked into the Model Advisor catalog before PR4 activation.`);
  }
}

const missing = [...EXPECTED_IDS].filter((id) => !seen.has(id));
if (missing.length) {
  throw new Error(`Tranche manifest missing expected models: ${missing.join(", ")}`);
}

const visibleIds = new Set(getVisibleModelOptions({ includeExisting: true }).map((model) => model.id));
for (const id of EXPECTED_IDS) {
  if (visibleIds.has(id)) {
    throw new Error(`${id} leaked into GPU/TCO model selection before PR4 activation.`);
  }
}

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
for (const id of EXPECTED_IDS) {
  if (advisorSurfaceIds.has(id)) {
    throw new Error(`${id} leaked into a customer-facing Model Advisor surface before PR4 activation.`);
  }
}

console.log(
  `Modern model tranche 1 PASS: ${manifest.models.length} staged models; canonical HF identities complete; ` +
  `${[...EXPECTED_AA_ALIASES.values()].filter(Boolean).length} exact AA aliases mapped and ambiguous variants intentionally unmapped; ` +
  `identity/license/source present; staged policy/governance coverage complete; dense-vs-sparse semantics valid; ` +
  `no staged model is active in Model Advisor, GPU Sizing, or TCO before PR4.`
);
