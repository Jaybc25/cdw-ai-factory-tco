import { MODEL_REGISTRY, getVisibleModelOptions } from "../src/modelRegistry.js";
import { STAGED_TECHNICAL_MODEL_REGISTRY, getStagedTechnicalModelById } from "../src/stagedModelRegistry.js";
import { getInferenceThroughputScale, getTrainingParameterSemantics } from "../src/modelSizingMethodology.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function approx(actual, expected, tolerance = 1e-9) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`Expected ${expected}; received ${actual}.`);
  }
}

const expectedIds = new Set([
  "granite-4.2-30b",
  "gpt-oss-20b",
  "gpt-oss-120b",
  "gemma-4-26b-a4b-it",
  "mistral-small-4",
  "mistral-large-3",
]);
assert(STAGED_TECHNICAL_MODEL_REGISTRY.length === expectedIds.size, `Expected ${expectedIds.size} staged technical runtime models at this checkpoint.`);
for (const model of STAGED_TECHNICAL_MODEL_REGISTRY) {
  assert(expectedIds.has(model.id), `Unexpected staged technical runtime model: ${model.id}.`);
  assert(model.catalogStatus === "staged", `${model.id} must remain catalogStatus=staged before activation.`);
  assert(model.status === "VERIFIED", `${model.id} staged runtime record must remain source-verified.`);
  assert(model.layers > 0, `${model.id} is missing a verified layer count.`);
  if (model.attentionType === "MLA") {
    assert(model.kvLoraRank > 0 && model.qkRopeHeadDim > 0, `${model.id} is missing required MLA KV sizing fields.`);
  } else {
    assert(model.attentionType === "standard", `${model.id} has an unsupported attentionType.`);
    assert(model.kvHeads > 0 && model.headDim > 0, `${model.id} is missing required standard KV sizing fields.`);
  }
}

const granite = getStagedTechnicalModelById("granite-4.2-30b");
assert(granite.architectureType === "dense", "Granite architecture type drifted from source-qualified dense semantics.");
approx(granite.totalParamsB, 30);
approx(granite.activeParamsB, 30);
approx(granite.layers, 64);
approx(granite.kvHeads, 8);
approx(granite.headDim, 128);
approx(granite.contextLength, 131072);
assert(granite.attentionType === "standard", "Granite must use the source-qualified standard-attention KV contract.");

const graniteInference = getInferenceThroughputScale(granite);
approx(graniteInference.factor, 1);
approx(graniteInference.activeParamsB, 30);
assert(!graniteInference.basis.includes("reduced in proportion"), "Granite should not receive a >70B active-compute throughput penalty.");
const graniteTraining = getTrainingParameterSemantics(granite);
approx(graniteTraining.residencyParamsB, 30);
approx(graniteTraining.activeComputeParamsB, 30);
assert(graniteTraining.architectureType === "dense", "Granite training semantics must remain dense.");

for (const [id, expected] of Object.entries({
  "gpt-oss-20b": { total: 21, active: 3.6, layers: 24, experts: 32 },
  "gpt-oss-120b": { total: 117, active: 5.1, layers: 36, experts: 128 },
})) {
  const model = getStagedTechnicalModelById(id);
  assert(model.architectureType === "moe", `${id} must remain MoE.`);
  approx(model.totalParamsB, expected.total);
  approx(model.activeParamsB, expected.active);
  approx(model.layers, expected.layers);
  approx(model.kvHeads, 8);
  approx(model.headDim, 64);
  approx(model.numExperts, expected.experts);
  approx(model.routedExpertsPerToken, 4);
  approx(model.activeExpertsPerToken, 4);
  approx(model.contextLength, 131072);
  assert(model.attentionType === "standard", `${id} must use the standard KV-cache field contract.`);
  assert(model.kvSizingNote?.includes("conservative"), `${id} must disclose the conservative full-context treatment of alternating sliding attention.`);

  const inference = getInferenceThroughputScale(model);
  approx(inference.factor, 1);
  assert(inference.factor <= 1, `${id} received an unsupported throughput uplift.`);
  const training = getTrainingParameterSemantics(model);
  approx(training.residencyParamsB, expected.total);
  approx(training.activeComputeParamsB, expected.active);
}

const gemma = getStagedTechnicalModelById("gemma-4-26b-a4b-it");
assert(gemma.architectureType === "moe", "Gemma 4 26B-A4B IT must remain MoE.");
approx(gemma.totalParamsB, 26);
approx(gemma.activeParamsB, 4);
approx(gemma.layers, 30);
approx(gemma.kvHeads, 8);
approx(gemma.headDim, 256);
approx(gemma.numExperts, 128);
approx(gemma.routedExpertsPerToken, 8);
approx(gemma.activeExpertsPerToken, 8);
approx(gemma.contextLength, 262144);
assert(gemma.kvSizingNote?.includes("over-estimating"), "Gemma must disclose conservative full-context KV treatment of sliding attention.");
approx(getInferenceThroughputScale(gemma).factor, 1);
const gemmaTraining = getTrainingParameterSemantics(gemma);
approx(gemmaTraining.residencyParamsB, 26);
approx(gemmaTraining.activeComputeParamsB, 4);

for (const [id, expected] of Object.entries({
  "mistral-small-4": { total: 119, active: 6.5, layers: 36, rank: 256, experts: 128 },
  "mistral-large-3": { total: 675, active: 41, layers: 61, rank: 512, experts: 128 },
})) {
  const model = getStagedTechnicalModelById(id);
  assert(model.architectureType === "moe", `${id} must remain MoE.`);
  assert(model.attentionType === "MLA", `${id} must use the MLA KV-cache contract.`);
  approx(model.totalParamsB, expected.total);
  approx(model.activeParamsB, expected.active);
  approx(model.layers, expected.layers);
  approx(model.kvLoraRank, expected.rank);
  approx(model.qkRopeHeadDim, 64);
  approx(model.numExperts, expected.experts);
  approx(model.routedExpertsPerToken, 4);
  approx(model.activeExpertsPerToken, 5);
  approx(model.contextLength, 262144);
  const inference = getInferenceThroughputScale(model);
  approx(inference.factor, 1);
  assert(inference.factor <= 1, `${id} received an unsupported throughput uplift.`);
  const training = getTrainingParameterSemantics(model);
  approx(training.residencyParamsB, expected.total);
  approx(training.activeComputeParamsB, expected.active);
}

// Critical staging barrier: technical validation may exercise these models,
// but the production registry and visible GPU/TCO option builders must exclude them.
const visibleIds = new Set(getVisibleModelOptions({ includeExisting: true }).map((model) => model.id));
for (const id of expectedIds) {
  assert(!MODEL_REGISTRY.some((model) => model.id === id), `${id} leaked into production MODEL_REGISTRY before activation.`);
  assert(!visibleIds.has(id), `${id} leaked into GPU/TCO visible options before activation.`);
}

console.log(
  "Staged model runtime PASS: six source-backed models exercise guarded dense/MoE standard-KV/MLA sizing semantics, " +
  "conservative sliding-attention treatment remains explicit where required, and all staged models remain absent from production customer-facing options."
);
