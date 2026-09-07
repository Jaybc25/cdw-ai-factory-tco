import fs from "node:fs";
import { MODEL_REGISTRY, getVisibleModelOptions } from "../src/modelRegistry.js";
import { getCatalog } from "../src/modelAdvisorEngine.js";
import { STAGED_TECHNICAL_MODEL_REGISTRY } from "../src/stagedModelRegistry.js";

const manifest = JSON.parse(fs.readFileSync(new URL("../data/model_catalog_tranche_1_qualification.json", import.meta.url), "utf8"));
const policy = JSON.parse(fs.readFileSync(new URL("../data/model_catalog_policy.json", import.meta.url), "utf8"));
const governance = JSON.parse(fs.readFileSync(new URL("../data/model_governance.json", import.meta.url), "utf8"));
const canonical = JSON.parse(fs.readFileSync(new URL("../data/canonical_models.json", import.meta.url), "utf8"));

const ACTIVE = new Set(["granite-4.2-30b", "gpt-oss-20b", "gpt-oss-120b", "gemma-4-26b-a4b-it", "mistral-small-4", "mistral-large-3"]);
const STAGED_READY = new Set(["qwen3.8-27b", "deepseek-v4-flash-0731", "deepseek-v4-pro-0813", "nemotron-3-super-120b-a12b"]);
const EXPECTED = new Set([...ACTIVE, ...STAGED_READY]);
const EXPECTED_AA_ALIASES = new Map([
  ["qwen3.8-27b", null], ["deepseek-v4-flash-0731", null], ["deepseek-v4-pro-0813", null], ["gemma-4-26b-a4b-it", null],
  ["mistral-small-4", "mistral-small-4"], ["mistral-large-3", "mistral-large-3"], ["gpt-oss-20b", "gpt-oss-20b"], ["gpt-oss-120b", "gpt-oss-120b"],
  ["nemotron-3-super-120b-a12b", "nvidia-nemotron-3-super-120b-a12b"], ["granite-4.2-30b", "granite-4-2-30b"],
]);
const EXPECTED_ACTIVATION_DEPENDENCIES = new Map([
  ["qwen3.8-27b", "activation-readiness-review"],
  ["deepseek-v4-flash-0731", "activation-readiness-review"],
  ["deepseek-v4-pro-0813", "activation-readiness-review"],
  ["nemotron-3-super-120b-a12b", "context-contract-reconciliation-and-activation-review"],
]);
const ALLOWED_ARCH = new Set(["dense", "moe", "hybrid"]);
const ALLOWED_COUNTRIES = new Set(["us", "cn", "fr"]);
function assert(condition, message) { if (!condition) throw new Error(message); }

assert(manifest.schema_version === 1, `Unexpected tranche manifest schema_version: ${manifest.schema_version}`);
assert(manifest.activation_policy?.state === "partially-activated-6-active-4-methodology-ready-staged", "Tranche activation-policy metadata must match the PR5 6-active / 4-methodology-ready-staged state.");
assert(Array.isArray(manifest.models) && manifest.models.length === 10, "Tranche 1 must contain exactly 10 qualified models.");
assert(ACTIVE.size === 6 && STAGED_READY.size === 4, "Tranche split must remain 6 active / 4 methodology-ready staged.");

const manifestById = new Map(manifest.models.map((m) => [m.canonical_model_id, m]));
const activePolicyById = new Map(policy.models.map((m) => [m.canonical_model_id, m]));
const stagedPolicyById = new Map(policy.staged_models.map((m) => [m.canonical_model_id, m]));
const canonicalById = new Map(canonical.models.map((m) => [m.canonical_model_id, m]));
const governanceById = new Map(governance.entries.map((m) => [m.canonical_model_id, m]));
const runtimeIds = new Set(MODEL_REGISTRY.map((m) => m.id));
const stagedRuntimeIds = new Set(STAGED_TECHNICAL_MODEL_REGISTRY.map((m) => m.id));
const visibleIds = new Set(getVisibleModelOptions({ includeExisting: true }).map((m) => m.id));
const advisorIds = new Set(getCatalog().map((m) => m.canonical_model_id));

for (const id of EXPECTED) {
  const model = manifestById.get(id);
  assert(model, `Tranche manifest missing ${id}.`);
  assert(model.qualification === "qualified", `${id} is not marked qualified.`);
  assert(model.display_name && model.upstream_model_id && model.developer && model.license, `${id} is missing identity/license metadata.`);
  assert(ALLOWED_COUNTRIES.has(model.developer_country), `${id} has unexpected developer_country.`);
  assert(ALLOWED_ARCH.has(model.architecture_family), `${id} has invalid architecture_family.`);
  assert(Number.isFinite(model.total_params_b) && model.total_params_b > 0, `${id} has invalid total_params_b.`);
  assert(Number.isFinite(model.active_params_b) && model.active_params_b > 0 && model.active_params_b <= model.total_params_b, `${id} has invalid active_params_b.`);
  assert(Number.isFinite(model.context_length) && model.context_length >= 8000, `${id} has invalid context_length.`);
  assert(Array.isArray(model.modalities) && model.modalities.length > 0, `${id} must declare modality.`);
  assert(typeof model.source === "string" && /^https:\/\//.test(model.source), `${id} lacks HTTPS primary source.`);
  const canonicalEntry = canonicalById.get(id);
  assert(canonicalEntry, `${id} is missing canonical identity.`);
  assert(canonicalEntry.aliases?.huggingface === model.upstream_model_id, `${id} canonical HF alias mismatch.`);
  assert((canonicalEntry.aliases?.artificial_analysis_slug ?? null) === EXPECTED_AA_ALIASES.get(id), `${id} Artificial Analysis alias drifted or ambiguous variant was guessed.`);
  assert(governanceById.get(id)?.developer_country === model.developer_country, `${id} governance country mismatch.`);
}

for (const id of ACTIVE) {
  assert(activePolicyById.get(id)?.catalog_status === "recommended", `${id} must be recommended in active policy.`);
  assert(!stagedPolicyById.has(id), `${id} remained staged after activation.`);
  assert(runtimeIds.has(id), `${id} is absent from production runtime.`);
  assert(!stagedRuntimeIds.has(id), `${id} remained in staged technical runtime after activation.`);
  assert(visibleIds.has(id), `${id} is absent from GPU/TCO current options.`);
  assert(advisorIds.has(id), `${id} is absent from the Advisor catalog join.`);
}
for (const id of STAGED_READY) {
  const stagedPolicy = stagedPolicyById.get(id);
  assert(stagedPolicy?.catalog_status === "staged", `${id} must remain staged pending explicit activation review.`);
  assert(stagedPolicy.activation_dependency === EXPECTED_ACTIVATION_DEPENDENCIES.get(id), `${id} activation dependency drifted.`);
  assert(stagedRuntimeIds.has(id), `${id} must retain its source-qualified staged technical record after methodology completion.`);
  assert(!activePolicyById.has(id), `${id} leaked into active product policy.`);
  assert(!runtimeIds.has(id), `${id} leaked into production runtime.`);
  assert(!visibleIds.has(id), `${id} leaked into GPU/TCO options.`);
  assert(!advisorIds.has(id), `${id} leaked into Advisor catalog.`);
}

console.log("Modern model tranche 1 PASS: exactly six models are active and four hybrid-state models are methodology-ready but remain explicitly staged pending activation review; source/governance/canonical identity coverage remains intact and ambiguous AA mappings remain unmapped.");
