import fs from "node:fs";

const manifest = JSON.parse(
  fs.readFileSync(new URL("../data/model_catalog_tranche_1_qualification.json", import.meta.url), "utf8")
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
}

const missing = [...EXPECTED_IDS].filter((id) => !seen.has(id));
if (missing.length) {
  throw new Error(`Tranche manifest missing expected models: ${missing.join(", ")}`);
}

console.log(
  `Modern model tranche 1 PASS: ${manifest.models.length} staged models; identity/license/source present; ` +
  `dense-vs-sparse parameter semantics valid; context/modality metadata present; activation remains gated on PR4 methodology.`
);
