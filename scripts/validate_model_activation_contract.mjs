import fs from "node:fs";
import { MARGINS } from "../src/modelAdvisorEngine.js";
import { STAGED_TECHNICAL_MODEL_REGISTRY } from "../src/stagedModelRegistry.js";

const manifest = JSON.parse(fs.readFileSync(new URL("../data/model_catalog_tranche_1_qualification.json", import.meta.url), "utf8"));
const policy = JSON.parse(fs.readFileSync(new URL("../data/model_catalog_policy.json", import.meta.url), "utf8"));
const capability = JSON.parse(fs.readFileSync(new URL("../data/model_capability_db.json", import.meta.url), "utf8"));
const governance = JSON.parse(fs.readFileSync(new URL("../data/model_governance.json", import.meta.url), "utf8"));
const canonical = JSON.parse(fs.readFileSync(new URL("../data/canonical_models.json", import.meta.url), "utf8"));

const READY = new Set([
  "granite-4.2-30b",
  "gpt-oss-20b",
  "gpt-oss-120b",
  "gemma-4-26b-a4b-it",
  "mistral-small-4",
  "mistral-large-3",
]);
const BLOCKED = new Map([
  ["qwen3.8-27b", "hybrid-deltanet-attention"],
  ["deepseek-v4-flash-0731", "hybrid-csa-hca"],
  ["deepseek-v4-pro-0813", "hybrid-csa-hca"],
  ["nemotron-3-super-120b-a12b", "hybrid-mamba-transformer"],
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const manifestById = new Map(manifest.models.map((m) => [m.canonical_model_id, m]));
const stagedRuntimeById = new Map(STAGED_TECHNICAL_MODEL_REGISTRY.map((m) => [m.id, m]));
const stagedPolicyById = new Map(policy.staged_models.map((m) => [m.canonical_model_id, m]));
const activePolicyIds = new Set(policy.models.map((m) => m.canonical_model_id));
const capById = new Map(capability.data.models.map((m) => [m.canonical_model_id, m]));
const govById = new Map(governance.entries.map((m) => [m.canonical_model_id, m]));
const canonicalById = new Map(canonical.models.map((m) => [m.canonical_model_id, m]));

assert(READY.size === 6, "Activation contract must contain exactly six ready models.");
assert(BLOCKED.size === 4, "Activation contract must contain exactly four methodology-blocked models.");
assert(READY.size + BLOCKED.size === manifest.models.length, "Ready + blocked sets must cover tranche 1 exactly.");

for (const id of READY) {
  const qualified = manifestById.get(id);
  assert(qualified?.qualification === "qualified", `${id} is not source-qualified.`);
  assert(stagedRuntimeById.has(id), `${id} lacks a staged technical runtime record.`);
  assert(stagedPolicyById.get(id)?.catalog_status === "staged", `${id} must still be staged before the activation commit.`);
  assert(!activePolicyIds.has(id), `${id} became active before the coordinated activation commit.`);
  assert(canonicalById.has(id), `${id} is missing canonical identity.`);
  assert(govById.has(id), `${id} is missing governance evidence.`);

  // Capability scores are required for immediate Advisor activation unless the
  // exact variant is deliberately allowed to enter without a benchmark. At
  // this six-model checkpoint, Gemma 4 is the only ready model without an exact
  // AA variant mapping, so it may be activated for sizing but must not silently
  // receive fabricated Advisor scores.
  if (id === "gemma-4-26b-a4b-it") {
    assert(!capById.has(id), "Gemma 4 unexpectedly acquired capability data; verify exact variant before using it.");
  } else {
    const cap = capById.get(id);
    assert(cap?.confidence === "HIGH", `${id} lacks HIGH-confidence capability evidence for Advisor activation.`);
    assert(Number.isFinite(cap.intelligence_index), `${id} lacks sourced intelligence_index.`);
    assert(Number.isFinite(cap.coding_index), `${id} lacks sourced coding_index.`);
  }
}

for (const [id, sequenceArchitecture] of BLOCKED) {
  const qualified = manifestById.get(id);
  assert(qualified?.sequence_architecture === sequenceArchitecture,
    `${id} methodology block no longer matches qualified sequence architecture.`);
  assert(!stagedRuntimeById.has(id), `${id} entered staged technical runtime without methodology support.`);
  assert(stagedPolicyById.get(id)?.catalog_status === "staged", `${id} must remain staged.`);
  assert(!activePolicyIds.has(id), `${id} must not enter active product policy while methodology-blocked.`);
}

const expectedMargins = {
  intelligence_index: { "frontier-like": 1.0, strong: 10.0, economical: 16.0 },
  coding_index: { "frontier-like": 2.0, strong: 18.0, economical: 30.0 },
  agentic_index: { "frontier-like": 0.5, strong: 5.0, economical: 9.5 },
};
for (const [metric, priorities] of Object.entries(expectedMargins)) {
  for (const [priority, value] of Object.entries(priorities)) {
    assert(MARGINS[metric]?.[priority] === value,
      `Activation cannot proceed with unaccepted Advisor margin ${metric}/${priority}.`);
  }
}

console.log(
  "Model activation contract PASS: six source/runtime-ready models are prepared for coordinated promotion, " +
  "four unsupported hybrid-state models remain explicitly staged, and accepted Advisor calibration is locked."
);
