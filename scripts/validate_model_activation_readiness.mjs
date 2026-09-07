import fs from "node:fs";
import { MODEL_REGISTRY } from "../src/modelRegistry.js";
import { STAGED_TECHNICAL_MODEL_REGISTRY } from "../src/stagedModelRegistry.js";

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

const EXPECTED_METHODOLOGY_BLOCKS = new Map([
  ["qwen3.8-27b", "hybrid DeltaNet/attention state is not represented by the current standard-KV/MLA cache formulas"],
  ["deepseek-v4-flash-0731", "hybrid compressed/sparse attention state is not faithfully represented by the current KV-cache formulas"],
  ["deepseek-v4-pro-0813", "hybrid compressed/sparse attention state is not faithfully represented by the current KV-cache formulas"],
  ["nemotron-3-super-120b-a12b", "hybrid Mamba/Transformer recurrent state is not represented by the current KV-cache formulas"],
]);

function positive(value) {
  return Number.isFinite(value) && value > 0;
}

function runtimeSizingReadiness(model) {
  if (!model) return { ready: false, reason: "not present in a technical runtime registry" };
  if (!positive(model.totalParamsB) || !positive(model.activeParamsB)) {
    return { ready: false, reason: "missing total/active parameter semantics" };
  }
  if (!positive(model.layers)) {
    return { ready: false, reason: "missing verified layer count required by KV-cache sizing" };
  }

  if (model.attentionType === "MLA") {
    if (!positive(model.kvLoraRank) || !positive(model.qkRopeHeadDim)) {
      return { ready: false, reason: "MLA model missing verified kvLoraRank/qkRopeHeadDim" };
    }
  } else if (model.attentionType === "standard") {
    if (!positive(model.kvHeads) || !positive(model.headDim)) {
      return { ready: false, reason: "standard-attention model missing verified kvHeads/headDim" };
    }
  } else {
    return { ready: false, reason: "attention type is not explicitly modeled" };
  }

  return { ready: true, reason: "runtime fields required by current inference sizing are present" };
}

const stagedRuntimeReady = [];
for (const [id, model] of stagedRuntimeById) {
  if (!trancheIds.has(id)) {
    throw new Error(`${id} exists in staged technical runtime but is not part of the qualified tranche.`);
  }
  if (runtimeById.has(id)) {
    throw new Error(`${id} exists in both staged and production runtime registries.`);
  }
  const readiness = runtimeSizingReadiness(model);
  if (!readiness.ready) {
    throw new Error(`${id} entered staged technical runtime without complete sizing fields: ${readiness.reason}.`);
  }
  stagedRuntimeReady.push(id);
}

const unresolvedIds = [...trancheIds].filter((id) => !stagedRuntimeById.has(id) && !runtimeById.has(id));
if (unresolvedIds.length !== EXPECTED_METHODOLOGY_BLOCKS.size) {
  throw new Error(`Expected ${EXPECTED_METHODOLOGY_BLOCKS.size} methodology-blocked tranche models; found ${unresolvedIds.length}: ${unresolvedIds.join(", ")}.`);
}
for (const id of unresolvedIds) {
  if (!EXPECTED_METHODOLOGY_BLOCKS.has(id)) {
    throw new Error(`${id} is unresolved without an explicit methodology block.`);
  }
}
for (const id of EXPECTED_METHODOLOGY_BLOCKS.keys()) {
  if (!trancheIds.has(id)) throw new Error(`Methodology block references non-tranche model ${id}.`);
  if (stagedRuntimeById.has(id) || runtimeById.has(id)) {
    throw new Error(`${id} remains listed as methodology-blocked after entering a technical runtime registry.`);
  }
}

// Activation safety contract: a tranche model may not move into the active
// product-policy collection until its production runtime technical record can
// be consumed safely by the actual GPU Sizing inference path. Staged-runtime
// readiness is an intermediate validation state, not customer activation.
for (const [id, policyEntry] of activePolicyById) {
  if (policyEntry.catalog_status !== "recommended" && policyEntry.catalog_status !== "existing-deployment") {
    continue;
  }
  const readiness = runtimeSizingReadiness(runtimeById.get(id));
  if (!readiness.ready) {
    throw new Error(`${id} is active in catalog policy but is not production GPU-sizing ready: ${readiness.reason}.`);
  }
}

for (const id of trancheIds) {
  if (!runtimeById.has(id)) continue;
  const readiness = runtimeSizingReadiness(runtimeById.get(id));
  if (!readiness.ready) {
    throw new Error(`${id} entered MODEL_REGISTRY without complete sizing fields: ${readiness.reason}.`);
  }
}

console.log(
  `Model activation readiness PASS: ${stagedRuntimeReady.length}/${manifest.models.length} tranche models have complete staged technical runtime records; ` +
  `${unresolvedIds.length} remain deliberately methodology-blocked; customer-facing activation remains a separate gated step.`
);
console.log(`Staged-runtime-ready: ${stagedRuntimeReady.join(", ") || "none"}.`);
console.log(
  `Methodology-blocked: ${unresolvedIds.map((id) => `${id} (${EXPECTED_METHODOLOGY_BLOCKS.get(id)})`).join("; ") || "none"}.`
);
