import fs from "node:fs";
import { MARGINS, getCatalog } from "../src/modelAdvisorEngine.js";
import { MODEL_REGISTRY, getVisibleModelOptions } from "../src/modelRegistry.js";
import { STAGED_TECHNICAL_MODEL_REGISTRY } from "../src/stagedModelRegistry.js";
import { getInferenceSequenceStateMemory } from "../src/modelSizingMethodology.js";

const manifest = JSON.parse(fs.readFileSync(new URL("../data/model_catalog_tranche_1_qualification.json", import.meta.url), "utf8"));
const policy = JSON.parse(fs.readFileSync(new URL("../data/model_catalog_policy.json", import.meta.url), "utf8"));
const capability = JSON.parse(fs.readFileSync(new URL("../data/model_capability_db.json", import.meta.url), "utf8"));
const governance = JSON.parse(fs.readFileSync(new URL("../data/model_governance.json", import.meta.url), "utf8"));
const canonical = JSON.parse(fs.readFileSync(new URL("../data/canonical_models.json", import.meta.url), "utf8"));

const READY = new Set(["granite-4.2-30b", "gpt-oss-20b", "gpt-oss-120b", "gemma-4-26b-a4b-it", "mistral-small-4", "mistral-large-3"]);
const METHODOLOGY_STAGED = new Map([
  ["qwen3.8-27b", { manifest: "hybrid-deltanet-attention", state: "deltanet-attention-hybrid" }],
  ["deepseek-v4-flash-0731", { manifest: "hybrid-csa-hca", state: "deepseek-v4-compressed-attention" }],
  ["deepseek-v4-pro-0813", { manifest: "hybrid-csa-hca", state: "deepseek-v4-compressed-attention" }],
  ["nemotron-3-super-120b-a12b", { manifest: "hybrid-mamba-transformer", state: "mamba-attention-hybrid" }],
]);
function assert(condition, message) { if (!condition) throw new Error(message); }

const manifestById = new Map(manifest.models.map((m) => [m.canonical_model_id, m]));
const runtimeById = new Map(MODEL_REGISTRY.map((m) => [m.id, m]));
const stagedRuntimeById = new Map(STAGED_TECHNICAL_MODEL_REGISTRY.map((m) => [m.id, m]));
const stagedPolicyById = new Map(policy.staged_models.map((m) => [m.canonical_model_id, m]));
const activePolicyById = new Map(policy.models.map((m) => [m.canonical_model_id, m]));
const capById = new Map(capability.data.models.map((m) => [m.canonical_model_id, m]));
const govById = new Map(governance.entries.map((m) => [m.canonical_model_id, m]));
const canonicalById = new Map(canonical.models.map((m) => [m.canonical_model_id, m]));
const advisorById = new Map(getCatalog().map((m) => [m.canonical_model_id, m]));
const visibleIds = new Set(getVisibleModelOptions({ includeExisting: true }).map((m) => m.id));

assert(READY.size === 6, "Activation contract must contain exactly six activated models.");
assert(METHODOLOGY_STAGED.size === 4, "Activation contract must contain exactly four methodology-staged models.");
assert(READY.size + METHODOLOGY_STAGED.size === manifest.models.length, "Activated + methodology-staged sets must cover tranche 1 exactly.");
assert(STAGED_TECHNICAL_MODEL_REGISTRY.length === 4, "Exactly four hybrid models must occupy staged technical runtime during methodology work.");

for (const id of READY) {
  assert(manifestById.get(id)?.qualification === "qualified", `${id} is not source-qualified.`);
  assert(runtimeById.get(id)?.catalogStatus === "recommended", `${id} is not production-recommended.`);
  assert(activePolicyById.get(id)?.catalog_status === "recommended", `${id} is not active in product policy.`);
  assert(!stagedPolicyById.has(id), `${id} remained in staged policy after activation.`);
  assert(!stagedRuntimeById.has(id), `${id} unexpectedly re-entered staged technical runtime.`);
  assert(visibleIds.has(id), `${id} is not visible in GPU/TCO recommended options.`);
  assert(canonicalById.has(id), `${id} is missing canonical identity.`);
  assert(govById.has(id), `${id} is missing governance evidence.`);
  assert(advisorById.get(id)?.catalog_status === "recommended", `${id} is absent from the activated Advisor catalog join.`);
  if (id === "gemma-4-26b-a4b-it") {
    assert(!capById.has(id), "Gemma 4 unexpectedly acquired capability data; exact variant must be verified before scoring it.");
    assert(advisorById.get(id)?.intelligence_index == null && advisorById.get(id)?.coding_index == null && advisorById.get(id)?.agentic_index == null,
      "Gemma 4 must remain scoreless until an exact capability mapping exists.");
  } else {
    const cap = capById.get(id);
    assert(cap?.confidence === "HIGH", `${id} lacks HIGH-confidence capability evidence.`);
    assert(Number.isFinite(cap.intelligence_index), `${id} lacks sourced intelligence_index.`);
    assert(Number.isFinite(cap.coding_index), `${id} lacks sourced coding_index.`);
  }
}

for (const [id, expected] of METHODOLOGY_STAGED) {
  assert(manifestById.get(id)?.sequence_architecture === expected.manifest, `${id} source-qualified sequence architecture drifted.`);
  assert(!runtimeById.has(id), `${id} entered production runtime during methodology-only work.`);
  assert(stagedPolicyById.get(id)?.catalog_status === "staged", `${id} must remain staged in product policy.`);
  assert(!activePolicyById.has(id), `${id} must not enter active product policy before coordinated activation.`);
  assert(!advisorById.has(id), `${id} must not enter the Advisor catalog before coordinated activation.`);
  assert(!visibleIds.has(id), `${id} must not enter GPU/TCO customer-facing options before coordinated activation.`);
  const staged = stagedRuntimeById.get(id);
  assert(staged, `${id} is missing the technical record required for methodology development.`);
  assert(staged.sequenceStateType === expected.state, `${id} staged sequence-state contract drifted.`);
  const state = getInferenceSequenceStateMemory(staged, 8192, 2);
  assert(state.bytesPerSequence > 0, `${id} staged sequence-state methodology is not computable.`);
}

const expectedMargins = {
  intelligence_index: { "frontier-like": 1.0, strong: 10.0, economical: 16.0 },
  coding_index: { "frontier-like": 2.0, strong: 18.0, economical: 30.0 },
  agentic_index: { "frontier-like": 0.5, strong: 5.0, economical: 9.5 },
};
for (const [metric, priorities] of Object.entries(expectedMargins)) {
  for (const [priority, value] of Object.entries(priorities)) assert(MARGINS[metric]?.[priority] === value, `Unexpected Advisor margin ${metric}/${priority}.`);
}

console.log("Model activation contract PASS: six models remain production-active, four hybrid architectures have source-qualified staged sequence-state methodology but remain absent from all customer-facing surfaces, Gemma 4 remains scoreless without fabricated capability data, and accepted Advisor calibration is locked.");
