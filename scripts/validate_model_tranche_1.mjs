import fs from "node:fs";
import { MODEL_REGISTRY, getVisibleModelOptions } from "../src/modelRegistry.js";
import { getCatalog } from "../src/modelAdvisorEngine.js";
import { STAGED_TECHNICAL_MODEL_REGISTRY } from "../src/stagedModelRegistry.js";

const manifest = JSON.parse(fs.readFileSync(new URL("../data/model_catalog_tranche_1_qualification.json", import.meta.url), "utf8"));
const policy = JSON.parse(fs.readFileSync(new URL("../data/model_catalog_policy.json", import.meta.url), "utf8"));
const governance = JSON.parse(fs.readFileSync(new URL("../data/model_governance.json", import.meta.url), "utf8"));
const canonical = JSON.parse(fs.readFileSync(new URL("../data/canonical_models.json", import.meta.url), "utf8"));

const ACTIVE = new Set(manifest.models.map((m) => m.canonical_model_id));
const EXPECTED_HYBRID_SOURCE_IDS = new Set(["qwen3.8-27b", "deepseek-v4-flash-0731", "deepseek-v4-pro-0813", "nemotron-3-super-120b-a12b"]);
const EXPECTED_AA_ALIASES = new Map([
  ["qwen3.8-27b", "qwen3-8-27b"],
  ["deepseek-v4-flash-0731", null],
  ["deepseek-v4-pro-0813", null],
  ["gemma-4-26b-a4b-it", "gemma-4-26b-a4b-non-reasoning"],
  ["mistral-small-4", "mistral-small-4"],
  ["mistral-large-3", "mistral-large-3"],
  ["gpt-oss-20b", "gpt-oss-20b"],
  ["gpt-oss-120b", "gpt-oss-120b"],
  ["nemotron-3-super-120b-a12b", "nvidia-nemotron-3-super-120b-a12b"],
  ["granite-4.2-30b", "granite-4-2-30b"],
]);
function assert(c, m) { if (!c) throw new Error(m); }

assert(manifest.activation_policy?.state === "fully-activated-10-active", "Tranche manifest must record full 10-model activation.");
assert(manifest.models.length === 10, "Tranche 1 must contain exactly 10 qualified models.");
assert((policy.staged_models || []).length === 0, "No tranche model may remain staged in product policy after activation.");
assert(STAGED_TECHNICAL_MODEL_REGISTRY.length === 4, "Four hybrid source records must remain available for methodology fixtures/provenance.");
for (const source of STAGED_TECHNICAL_MODEL_REGISTRY) assert(EXPECTED_HYBRID_SOURCE_IDS.has(source.id), `Unexpected hybrid source record ${source.id}.`);

const runtimeIds = new Set(MODEL_REGISTRY.map((m) => m.id));
const visibleIds = new Set(getVisibleModelOptions({ includeExisting: true }).map((m) => m.id));
const advisorIds = new Set(getCatalog().map((m) => m.canonical_model_id));
const activePolicy = new Map(policy.models.map((m) => [m.canonical_model_id, m]));
const canonicalById = new Map(canonical.models.map((m) => [m.canonical_model_id, m]));
const governanceById = new Map(governance.entries.map((m) => [m.canonical_model_id, m]));

for (const model of manifest.models) {
  const id = model.canonical_model_id;
  assert(model.qualification === "qualified", `${id} is not source-qualified.`);
  assert(activePolicy.get(id)?.catalog_status === "recommended", `${id} must be recommended in active policy.`);
  assert(runtimeIds.has(id), `${id} is absent from production runtime.`);
  assert(visibleIds.has(id), `${id} is absent from GPU/TCO current options.`);
  assert(advisorIds.has(id), `${id} is absent from Advisor catalog.`);
  assert(canonicalById.get(id)?.aliases?.huggingface === model.upstream_model_id, `${id} canonical HF alias mismatch.`);
  assert((canonicalById.get(id)?.aliases?.artificial_analysis_slug ?? null) === EXPECTED_AA_ALIASES.get(id), `${id} AA mapping does not match the approved evidence-resolution policy.`);
  assert(governanceById.get(id)?.developer_country === model.developer_country, `${id} governance country mismatch.`);
}

console.log("Modern model tranche 1 PASS: all ten source-qualified tranche models are recommended and active across product policy, runtime, GPU/TCO, and Advisor; four hybrid architecture source records remain only as methodology/provenance inputs; Qwen3.8 and Gemma 4 use approved default-semantics AA mappings while DeepSeek V4 Flash/Pro remain deliberately unmapped.");
