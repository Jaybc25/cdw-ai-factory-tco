import fs from "node:fs";
import { MODEL_REGISTRY } from "../src/modelRegistry.js";
import { STAGED_TECHNICAL_MODEL_REGISTRY } from "../src/stagedModelRegistry.js";
import { getInferenceSequenceStateMemory } from "../src/modelSizingMethodology.js";

const manifest = JSON.parse(
  fs.readFileSync(new URL("../data/model_catalog_tranche_1_qualification.json", import.meta.url), "utf8")
);
const policy = JSON.parse(
  fs.readFileSync(new URL("../data/model_catalog_policy.json", import.meta.url), "utf8")
);

const trancheIds = new Set(manifest.models.map((model) => model.canonical_model_id));
const runtimeById = new Map(MODEL_REGISTRY.map((model) => [model.id, model]));
const stagedRuntimeById = new Map(STAGED_TECHNICAL_MODEL_REGISTRY.map((model) => [model.id, model]));
const activePolicyById = new Map(
  policy.models
    .filter((entry) => trancheIds.has(entry.canonical_model_id))
    .map((entry) => [entry.canonical_model_id, entry])
);
const stagedPolicyById = new Map(
  policy.staged_models
    .filter((entry) => trancheIds.has(entry.canonical_model_id))
    .map((entry) => [entry.canonical_model_id, entry])
);

const EXPECTED_METHODOLOGY_STAGED = new Map([
  ["qwen3.8-27b", "deltanet-attention-hybrid"],
  ["deepseek-v4-flash-0731", "deepseek-v4-compressed-attention"],
  ["deepseek-v4-pro-0813", "deepseek-v4-compressed-attention"],
  ["nemotron-3-super-120b-a12b", "mamba-attention-hybrid"],
]);

function positive(value) {
  return Number.isFinite(value) && value > 0;
}

function productionRuntimeSizingReadiness(model) {
  if (!model) return { ready: false, reason: "not present in production runtime" };
  if (!positive(model.totalParamsB) || !positive(model.activeParamsB)) {
    return { ready: false, reason: "missing total/active parameter semantics" };
  }
  if (!positive(model.layers)) {
    return { ready: false, reason: "missing verified layer count required by sequence-state sizing" };
  }

  try {
    const state = getInferenceSequenceStateMemory(model, 8192, 2);
    if (!(state.bytesPerSequence >= 0)) return { ready: false, reason: "sequence-state helper returned invalid memory" };
  } catch (error) {
    return { ready: false, reason: error.message };
  }

  return { ready: true, reason: "production model has a supported inference sequence-state contract" };
}

function stagedMethodologyReadiness(model) {
  if (!model) return { ready: false, reason: "missing staged technical record" };
  if (!positive(model.totalParamsB) || !positive(model.activeParamsB) || !positive(model.layers)) {
    return { ready: false, reason: "missing staged parameter/layer semantics" };
  }
  if (!model.sequenceStateType) return { ready: false, reason: "missing explicit sequence-state type" };
  try {
    const state = getInferenceSequenceStateMemory(model, 8192, 2);
    if (!(state.bytesPerSequence > 0)) return { ready: false, reason: "sequence-state memory is not positive" };
  } catch (error) {
    return { ready: false, reason: error.message };
  }
  return { ready: true, reason: "source-qualified staged sequence-state memory contract is computable" };
}

// The six previously activated tranche models must remain production-ready.
for (const [id, policyEntry] of activePolicyById) {
  if (policyEntry.catalog_status !== "recommended" && policyEntry.catalog_status !== "existing-deployment") continue;
  const readiness = productionRuntimeSizingReadiness(runtimeById.get(id));
  if (!readiness.ready) {
    throw new Error(`${id} is active in catalog policy but is not production GPU-sizing ready: ${readiness.reason}.`);
  }
}

// PR5 methodology state: the four formerly metadata-only blocks now have
// source-qualified staged technical records and computable memory contracts,
// but they remain deliberately outside product policy/runtime activation.
if (stagedRuntimeById.size !== EXPECTED_METHODOLOGY_STAGED.size) {
  throw new Error(`Expected ${EXPECTED_METHODOLOGY_STAGED.size} staged hybrid technical records; found ${stagedRuntimeById.size}.`);
}
for (const [id, stateType] of EXPECTED_METHODOLOGY_STAGED) {
  if (!trancheIds.has(id)) throw new Error(`Methodology-staged model ${id} is not in tranche 1.`);
  const model = stagedRuntimeById.get(id);
  if (!model) throw new Error(`${id} is missing its staged technical record.`);
  if (runtimeById.has(id)) throw new Error(`${id} entered production runtime before activation.`);
  if (model.sequenceStateType !== stateType) throw new Error(`${id} sequenceStateType drifted from ${stateType}.`);
  const readiness = stagedMethodologyReadiness(model);
  if (!readiness.ready) throw new Error(`${id} staged methodology is incomplete: ${readiness.reason}.`);
  if (stagedPolicyById.get(id)?.catalog_status !== "staged") throw new Error(`${id} must remain staged in product policy.`);
  if (activePolicyById.has(id)) throw new Error(`${id} entered active product policy before activation.`);
}

const unresolvedIds = [...trancheIds].filter((id) => !stagedRuntimeById.has(id) && !runtimeById.has(id));
if (unresolvedIds.length) {
  throw new Error(`Every tranche model must now be either production-active or methodology-staged; unresolved: ${unresolvedIds.join(", ")}.`);
}

const activeTrancheIds = [...activePolicyById.keys()];
console.log(
  `Model activation readiness PASS: ${activeTrancheIds.length}/${manifest.models.length} tranche models remain active with production sequence-state contracts; ` +
  `${stagedRuntimeById.size} are source-qualified methodology-staged with explicit hybrid state contracts and remain non-customer-facing.`
);
console.log(`Active-runtime-ready: ${activeTrancheIds.join(", ") || "none"}.`);
console.log(`Methodology-staged: ${[...EXPECTED_METHODOLOGY_STAGED.keys()].join(", ")}.`);
