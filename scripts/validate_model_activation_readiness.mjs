import fs from "node:fs";
import { MODEL_REGISTRY } from "../src/modelRegistry.js";
import { STAGED_TECHNICAL_MODEL_REGISTRY } from "../src/stagedModelRegistry.js";
import { getInferenceSequenceStateMemory } from "../src/modelSizingMethodology.js";

const manifest = JSON.parse(
  fs.readFileSync(new URL("../data/model_catalog_tranche_1_qualification.json", import.meta.url), "utf8")
);
const policy = JSON.parse(fs.readFileSync(new URL("../data/model_catalog_policy.json", import.meta.url), "utf8"));
const runtimeById = new Map(MODEL_REGISTRY.map((m) => [m.id, m]));
const sourceById = new Map(STAGED_TECHNICAL_MODEL_REGISTRY.map((m) => [m.id, m]));
const activePolicyById = new Map(policy.models.map((m) => [m.canonical_model_id, m]));
function assert(c, m) {
  if (!c) throw new Error(m);
}

assert(
  manifest.activation_policy?.state === "fully-activated-10-active",
  "Manifest must record full tranche activation."
);
assert((policy.staged_models || []).length === 0, "No tranche model may remain staged in policy.");

for (const entry of manifest.models) {
  const id = entry.canonical_model_id;
  const runtime = runtimeById.get(id);
  assert(runtime, `${id} is absent from production runtime.`);
  assert(activePolicyById.get(id)?.catalog_status === "recommended", `${id} is not recommended in product policy.`);
  const state = getInferenceSequenceStateMemory(runtime, 8192, 2);
  assert(state.bytesPerSequence > 0, `${id} production sequence-state contract is not computable.`);
  if (sourceById.has(id)) {
    const source = sourceById.get(id);
    assert(source.sequenceStateType === runtime.sequenceStateType, `${id} runtime/source sequenceStateType drifted.`);
    assert(
      source.totalParamsB === runtime.totalParamsB && source.activeParamsB === runtime.activeParamsB,
      `${id} runtime/source parameter semantics drifted.`
    );
  }
}

console.log(
  "Model activation readiness PASS: all 10 tranche models are active/recommended with computable production sequence-state contracts; the four hybrid source records reconcile with their promoted runtime records."
);
