import fs from "node:fs";
import { MARGINS, getCatalog, applyHardFilters } from "../src/modelAdvisorEngine.js";
import { MODEL_REGISTRY, getVisibleModelOptions } from "../src/modelRegistry.js";
import { STAGED_TECHNICAL_MODEL_REGISTRY } from "../src/stagedModelRegistry.js";
import { getInferenceSequenceStateMemory } from "../src/modelSizingMethodology.js";

const manifest = JSON.parse(
  fs.readFileSync(new URL("../data/model_catalog_tranche_1_qualification.json", import.meta.url), "utf8")
);
const policy = JSON.parse(fs.readFileSync(new URL("../data/model_catalog_policy.json", import.meta.url), "utf8"));
const capability = JSON.parse(fs.readFileSync(new URL("../data/model_capability_db.json", import.meta.url), "utf8"));
const governance = JSON.parse(fs.readFileSync(new URL("../data/model_governance.json", import.meta.url), "utf8"));
const canonical = JSON.parse(fs.readFileSync(new URL("../data/canonical_models.json", import.meta.url), "utf8"));

const ACTIVE = new Set(manifest.models.map((m) => m.canonical_model_id));
const SCORELESS = new Set(["deepseek-v4-flash-0731", "deepseek-v4-pro-0813"]);
const RESOLVED_CAPABILITY = new Set(["gemma-4-26b-a4b-it", "qwen3.8-27b"]);
const HYBRID_SOURCE = new Set([
  "qwen3.8-27b",
  "deepseek-v4-flash-0731",
  "deepseek-v4-pro-0813",
  "nemotron-3-super-120b-a12b",
]);
function assert(c, m) {
  if (!c) throw new Error(m);
}

const runtimeById = new Map(MODEL_REGISTRY.map((m) => [m.id, m]));
const policyById = new Map(policy.models.map((m) => [m.canonical_model_id, m]));
const capById = new Map(capability.data.models.map((m) => [m.canonical_model_id, m]));
const govById = new Map(governance.entries.map((m) => [m.canonical_model_id, m]));
const canonicalById = new Map(canonical.models.map((m) => [m.canonical_model_id, m]));
const advisorById = new Map(getCatalog().map((m) => [m.canonical_model_id, m]));
const visibleIds = new Set(getVisibleModelOptions({ includeExisting: true }).map((m) => m.id));
const sourceById = new Map(STAGED_TECHNICAL_MODEL_REGISTRY.map((m) => [m.id, m]));

assert(ACTIVE.size === 10, "Activation contract must cover all ten tranche models.");
assert((policy.staged_models || []).length === 0, "No tranche model may remain staged after activation.");
for (const id of ACTIVE) {
  assert(runtimeById.get(id)?.catalogStatus === "recommended", `${id} is not production-recommended.`);
  assert(policyById.get(id)?.catalog_status === "recommended", `${id} is not active in product policy.`);
  assert(visibleIds.has(id), `${id} is not visible in GPU/TCO current options.`);
  assert(advisorById.get(id)?.catalog_status === "recommended", `${id} is absent from Advisor catalog.`);
  assert(canonicalById.has(id) && govById.has(id), `${id} lacks canonical/governance evidence.`);
  assert(
    getInferenceSequenceStateMemory(runtimeById.get(id), 8192, 2).bytesPerSequence > 0,
    `${id} sequence-state contract is not computable.`
  );
  if (SCORELESS.has(id)) {
    assert(
      !capById.has(id),
      `${id} unexpectedly acquired capability data; exact default-semantics variant must be verified before scoring.`
    );
    const advisor = advisorById.get(id);
    assert(
      advisor.intelligence_index == null && advisor.coding_index == null && advisor.agentic_index == null,
      `${id} must remain scoreless until an approved exact capability mapping exists.`
    );
  }
  if (RESOLVED_CAPABILITY.has(id)) {
    const cap = capById.get(id);
    const advisor = advisorById.get(id);
    assert(cap?.confidence === "HIGH", `${id} must retain HIGH-confidence Artificial Analysis evidence.`);
    assert(
      Number.isFinite(advisor?.intelligence_index),
      `${id} must expose its approved intelligence evidence in Advisor.`
    );
  }
  if (HYBRID_SOURCE.has(id)) {
    const source = sourceById.get(id);
    assert(
      source && source.sequenceStateType === runtimeById.get(id).sequenceStateType,
      `${id} promoted hybrid runtime drifted from source-qualified methodology.`
    );
  }
}

const nemotron = advisorById.get("nemotron-3-super-120b-a12b");
assert(
  capById.get("nemotron-3-super-120b-a12b")?.confidence === "HIGH",
  "Nemotron must retain HIGH-confidence AA mapping."
);
const permissive = applyHardFilters([nemotron], {
  license: "permissive-commercial",
  governance: "none",
  contextWindow: "8k",
  multimodal: "any",
})[0];
assert(
  permissive.filterDetails.licenseState === "PASS",
  "Nemotron NVIDIA open-model license must pass permissive-commercial filtering after explicit heuristic support."
);

const expectedMargins = {
  intelligence_index: { "frontier-like": 1.0, strong: 10.0, economical: 16.0 },
  coding_index: { "frontier-like": 2.0, strong: 18.0, economical: 30.0 },
  agentic_index: { "frontier-like": 0.5, strong: 5.0, economical: 9.5 },
};
for (const [metric, priorities] of Object.entries(expectedMargins))
  for (const [priority, value] of Object.entries(priorities))
    assert(MARGINS[metric]?.[priority] === value, `Unexpected Advisor margin ${metric}/${priority}.`);

console.log(
  "Model activation contract PASS: all ten tranche models are production-active/recommended; Gemma 4 and Qwen3.8 retain approved AA evidence, DeepSeek V4 Flash/Pro remain deliberately scoreless, Nemotron passes explicit NVIDIA commercial-license handling, hybrid runtime records reconcile to source-qualified methodology, and Advisor margins remain locked."
);
