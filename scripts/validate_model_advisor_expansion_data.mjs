import fs from "node:fs";

const capability = JSON.parse(
  fs.readFileSync(new URL("../data/model_capability_db.json", import.meta.url), "utf8")
);
const canonical = JSON.parse(
  fs.readFileSync(new URL("../data/canonical_models.json", import.meta.url), "utf8")
);
const manifest = JSON.parse(
  fs.readFileSync(new URL("../data/model_catalog_tranche_1_qualification.json", import.meta.url), "utf8")
);

const EXACT_AA_STAGE_IDS = new Set([
  "mistral-small-4",
  "mistral-large-3",
  "gpt-oss-20b",
  "gpt-oss-120b",
  "nemotron-3-super-120b-a12b",
  "granite-4.2-30b",
  "qwen3.8-27b",
  "gemma-4-26b-a4b-it",
]);
const DELIBERATELY_UNMAPPED_STAGE_IDS = new Set([
  "deepseek-v4-flash-0731",
  "deepseek-v4-pro-0813",
]);
const EXPECTED_AA_SLUGS = new Map([
  ["qwen3.8-27b", "qwen3-8-27b"],
  ["gemma-4-26b-a4b-it", "gemma-4-26b-a4b-non-reasoning"],
]);

if (capability.source !== "artificial_analysis_api") {
  throw new Error(`Unexpected capability source: ${capability.source}`);
}
if (!Array.isArray(capability.data?.models)) {
  throw new Error("Capability snapshot is missing data.models.");
}

const capById = new Map(capability.data.models.map((m) => [m.canonical_model_id, m]));
const canonicalById = new Map(canonical.models.map((m) => [m.canonical_model_id, m]));
const manifestIds = new Set(manifest.models.map((m) => m.canonical_model_id));

for (const id of [...EXACT_AA_STAGE_IDS, ...DELIBERATELY_UNMAPPED_STAGE_IDS]) {
  if (!manifestIds.has(id)) throw new Error(`${id} is not present in the staged tranche manifest.`);
  if (!canonicalById.has(id)) throw new Error(`${id} is not present in the canonical registry.`);
}

for (const id of EXACT_AA_STAGE_IDS) {
  const canonicalEntry = canonicalById.get(id);
  if (!canonicalEntry.aliases?.artificial_analysis_slug) {
    throw new Error(`${id} must have an exact Artificial Analysis slug before capability ingestion.`);
  }
  if (EXPECTED_AA_SLUGS.has(id) && canonicalEntry.aliases.artificial_analysis_slug !== EXPECTED_AA_SLUGS.get(id)) {
    throw new Error(`${id} AA slug does not match the approved evidence-resolution mapping.`);
  }
  const rec = capById.get(id);
  if (!rec) throw new Error(`${id} did not resolve into the Artificial Analysis capability snapshot.`);
  if (rec.needs_alias_mapping !== false) throw new Error(`${id} still reports needs_alias_mapping=true.`);
  if (!Number.isFinite(rec.intelligence_index)) {
    throw new Error(`${id} must have a source-returned intelligence index for Advisor calibration.`);
  }
  if (id !== "gemma-4-26b-a4b-it" && !Number.isFinite(rec.coding_index)) {
    throw new Error(`${id} must have a source-returned coding index for Advisor calibration.`);
  }
  if (rec.confidence !== "HIGH") throw new Error(`${id} capability confidence is not HIGH.`);
}

for (const id of DELIBERATELY_UNMAPPED_STAGE_IDS) {
  const canonicalEntry = canonicalById.get(id);
  if (canonicalEntry.aliases?.artificial_analysis_slug != null) {
    throw new Error(`${id} unexpectedly acquired an Artificial Analysis alias; verify exact default-semantics variant before mapping.`);
  }
  if (capById.has(id)) {
    throw new Error(`${id} leaked into the capability snapshot without an approved exact Artificial Analysis mapping.`);
  }
}

const resolvedStage = [...EXACT_AA_STAGE_IDS].map((id) => capById.get(id));
const metricLeaders = {
  intelligence_index: [...resolvedStage]
    .filter((m) => Number.isFinite(m.intelligence_index))
    .sort((a, b) => b.intelligence_index - a.intelligence_index)[0] || null,
  coding_index: [...resolvedStage]
    .filter((m) => Number.isFinite(m.coding_index))
    .sort((a, b) => b.coding_index - a.coding_index)[0] || null,
  agentic_index: [...resolvedStage]
    .filter((m) => Number.isFinite(m.agentic_index))
    .sort((a, b) => b.agentic_index - a.agentic_index)[0] || null,
};

console.log(
  `Model Advisor expansion data PASS: ${EXACT_AA_STAGE_IDS.size} approved exact AA mappings resolved; ` +
  `${DELIBERATELY_UNMAPPED_STAGE_IDS.size} DeepSeek variants remain deliberately unmapped; ` +
  `capability snapshot has ${capability.record_count} records, synced ${capability.synced_at}, index version ${capability.intelligence_index_version}.`
);
console.log(
  `Current evidence leaders — intelligence: ${metricLeaders.intelligence_index ? `${metricLeaders.intelligence_index.canonical_model_id} (${metricLeaders.intelligence_index.intelligence_index})` : "none"}; ` +
  `coding: ${metricLeaders.coding_index ? `${metricLeaders.coding_index.canonical_model_id} (${metricLeaders.coding_index.coding_index})` : "none"}; ` +
  `agentic: ${metricLeaders.agentic_index ? `${metricLeaders.agentic_index.canonical_model_id} (${metricLeaders.agentic_index.agentic_index})` : "none"}.`
);
