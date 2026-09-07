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
]);
const DELIBERATELY_UNMAPPED_STAGE_IDS = new Set([
  "qwen3.8-27b",
  "deepseek-v4-flash-0731",
  "deepseek-v4-pro-0813",
  "gemma-4-26b-a4b-it",
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
  const rec = capById.get(id);
  if (!rec) throw new Error(`${id} did not resolve into the Artificial Analysis capability snapshot.`);
  if (rec.needs_alias_mapping !== false) throw new Error(`${id} still reports needs_alias_mapping=true.`);
  if (!(Number.isFinite(rec.intelligence_index) && Number.isFinite(rec.coding_index))) {
    throw new Error(`${id} must have source-returned intelligence and coding indices for Advisor calibration.`);
  }
  if (rec.confidence !== "HIGH") throw new Error(`${id} capability confidence is not HIGH.`);
}

for (const id of DELIBERATELY_UNMAPPED_STAGE_IDS) {
  const canonicalEntry = canonicalById.get(id);
  if (canonicalEntry.aliases?.artificial_analysis_slug != null) {
    throw new Error(`${id} unexpectedly acquired an Artificial Analysis alias; verify exact variant before mapping.`);
  }
  if (capById.has(id)) {
    throw new Error(`${id} leaked into the capability snapshot without an exact Artificial Analysis mapping.`);
  }
}

const resolvedStage = [...EXACT_AA_STAGE_IDS].map((id) => capById.get(id));
const metricLeaders = {
  intelligence_index: [...resolvedStage].sort((a, b) => b.intelligence_index - a.intelligence_index)[0],
  coding_index: [...resolvedStage].sort((a, b) => b.coding_index - a.coding_index)[0],
  agentic_index: [...resolvedStage]
    .filter((m) => Number.isFinite(m.agentic_index))
    .sort((a, b) => b.agentic_index - a.agentic_index)[0] || null,
};

console.log(
  `Model Advisor expansion data PASS: ${EXACT_AA_STAGE_IDS.size} exact staged AA mappings resolved; ` +
  `${DELIBERATELY_UNMAPPED_STAGE_IDS.size} ambiguous staged variants remain deliberately unmapped; ` +
  `capability snapshot has ${capability.record_count} records, synced ${capability.synced_at}, index version ${capability.intelligence_index_version}.`
);
console.log(
  `Staged evidence leaders — intelligence: ${metricLeaders.intelligence_index.canonical_model_id} (${metricLeaders.intelligence_index.intelligence_index}); ` +
  `coding: ${metricLeaders.coding_index.canonical_model_id} (${metricLeaders.coding_index.coding_index}); ` +
  `agentic: ${metricLeaders.agentic_index ? `${metricLeaders.agentic_index.canonical_model_id} (${metricLeaders.agentic_index.agentic_index})` : "no sourced values"}.`
);
