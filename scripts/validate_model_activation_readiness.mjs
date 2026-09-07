import fs from "node:fs";
import { MODEL_REGISTRY } from "../src/modelRegistry.js";

const manifest = JSON.parse(
  fs.readFileSync(new URL("../data/model_catalog_tranche_1_qualification.json", import.meta.url), "utf8")
);
const policy = JSON.parse(
  fs.readFileSync(new URL("../data/model_catalog_policy.json", import.meta.url), "utf8")
);

const trancheIds = new Set(manifest.models.map((model) => model.canonical_model_id));
const runtimeById = new Map(MODEL_REGISTRY.map((model) => [model.id, model]));
const activePolicyById = new Map(
  policy.models
    .filter((entry) => trancheIds.has(entry.canonical_model_id))
    .map((entry) => [entry.canonical_model_id, entry])
);

function positive(value) {
  return Number.isFinite(value) && value > 0;
}

function runtimeSizingReadiness(model) {
  if (!model) return { ready: false, reason: "not present in runtime technical registry" };
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

function manifestEvidenceReadiness(model) {
  if (!positive(model.layers)) {
    return { ready: false, reason: "qualification manifest has no verified layer count" };
  }
  if (positive(model.kv_heads) && positive(model.head_dim)) {
    return { ready: true, reason: "manifest has layer + standard KV-cache fields" };
  }
  if (positive(model.kv_lora_rank) && positive(model.qk_rope_head_dim)) {
    return { ready: true, reason: "manifest has layer + MLA KV-cache fields" };
  }
  return { ready: false, reason: "qualification manifest lacks verified KV-cache fields" };
}

const evidenceReady = [];
const evidenceBlocked = [];
for (const model of manifest.models) {
  const state = manifestEvidenceReadiness(model);
  (state.ready ? evidenceReady : evidenceBlocked).push({ id: model.canonical_model_id, reason: state.reason });
}

// Activation safety contract: a tranche model may not move into the active
// product-policy collection until its runtime technical registry entry can be
// consumed safely by the actual GPU Sizing inference path. This specifically
// prevents missing/null architecture fields from being coerced into zero-value
// KV-cache math.
for (const [id, policyEntry] of activePolicyById) {
  if (policyEntry.catalog_status !== "recommended" && policyEntry.catalog_status !== "existing-deployment") {
    continue;
  }
  const readiness = runtimeSizingReadiness(runtimeById.get(id));
  if (!readiness.ready) {
    throw new Error(`${id} is active in catalog policy but is not GPU-sizing ready: ${readiness.reason}.`);
  }
}

// Any tranche model that has already been introduced into the runtime registry
// must itself be technically complete, even before policy activation.
for (const id of trancheIds) {
  if (!runtimeById.has(id)) continue;
  const readiness = runtimeSizingReadiness(runtimeById.get(id));
  if (!readiness.ready) {
    throw new Error(`${id} entered MODEL_REGISTRY without complete sizing fields: ${readiness.reason}.`);
  }
}

console.log(
  `Model activation readiness PASS: ${evidenceReady.length}/${manifest.models.length} staged models currently have ` +
  `source-recorded KV-cache evidence sufficient for the current inference sizing contract; activation remains blocked ` +
  `for incomplete runtime entries.`
);
console.log(`Evidence-ready: ${evidenceReady.map((item) => item.id).join(", ") || "none"}.`);
console.log(
  `Evidence-blocked: ${evidenceBlocked.map((item) => `${item.id} (${item.reason})`).join("; ") || "none"}.`
);
