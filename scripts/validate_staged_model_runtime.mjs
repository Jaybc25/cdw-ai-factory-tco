import { MODEL_REGISTRY, getVisibleModelOptions, getModelById } from "../src/modelRegistry.js";
import { STAGED_TECHNICAL_MODEL_REGISTRY } from "../src/stagedModelRegistry.js";
import { getInferenceThroughputScale, getTrainingParameterSemantics } from "../src/modelSizingMethodology.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function approx(actual, expected, tolerance = 1e-9) {
  if (Math.abs(actual - expected) > tolerance) throw new Error(`Expected ${expected}; received ${actual}.`);
}

const expectedIds = new Set([
  "granite-4.2-30b",
  "gpt-oss-20b",
  "gpt-oss-120b",
  "gemma-4-26b-a4b-it",
  "mistral-small-4",
  "mistral-large-3",
]);

assert(STAGED_TECHNICAL_MODEL_REGISTRY.length === 0, "Promoted tranche models must no longer remain in staged technical runtime.");
for (const id of expectedIds) {
  const model = getModelById(id);
  assert(model, `${id} is missing from production MODEL_REGISTRY after activation.`);
  assert(model.catalogStatus === "recommended", `${id} must be catalogStatus=recommended after activation.`);
  assert(model.status === "VERIFIED", `${id} production runtime record must remain source-verified.`);
  assert(model.layers > 0, `${id} is missing a verified layer count.`);
  if (model.attentionType === "MLA") {
    assert(model.kvLoraRank > 0 && model.qkRopeHeadDim > 0, `${id} is missing required MLA KV sizing fields.`);
  } else {
    assert(model.attentionType === "standard", `${id} has an unsupported attentionType.`);
    assert(model.kvHeads > 0 && model.headDim > 0, `${id} is missing required standard KV sizing fields.`);
  }
}

const granite = getModelById("granite-4.2-30b");
assert(granite.architectureType === "dense", "Granite architecture type drifted from source-qualified dense semantics.");
approx(granite.totalParamsB, 30); approx(granite.activeParamsB, 30); approx(granite.layers, 64); approx(granite.kvHeads, 8); approx(granite.headDim, 128); approx(granite.contextLength, 131072);
approx(getInferenceThroughputScale(granite).factor, 1);
const graniteTraining = getTrainingParameterSemantics(granite);
approx(graniteTraining.residencyParamsB, 30); approx(graniteTraining.activeComputeParamsB, 30);

for (const [id, expected] of Object.entries({
  "gpt-oss-20b": { total: 21, active: 3.6, layers: 24, experts: 32 },
  "gpt-oss-120b": { total: 117, active: 5.1, layers: 36, experts: 128 },
})) {
  const model = getModelById(id);
  assert(model.architectureType === "moe", `${id} must remain MoE.`);
  approx(model.totalParamsB, expected.total); approx(model.activeParamsB, expected.active); approx(model.layers, expected.layers);
  approx(model.kvHeads, 8); approx(model.headDim, 64); approx(model.numExperts, expected.experts); approx(model.routedExpertsPerToken, 4); approx(model.activeExpertsPerToken, 4); approx(model.contextLength, 131072);
  assert(model.kvSizingNote?.includes("conservative"), `${id} must disclose conservative sliding-attention treatment.`);
  approx(getInferenceThroughputScale(model).factor, 1);
  const training = getTrainingParameterSemantics(model);
  approx(training.residencyParamsB, expected.total); approx(training.activeComputeParamsB, expected.active);
}

const gemma = getModelById("gemma-4-26b-a4b-it");
assert(gemma.architectureType === "moe", "Gemma 4 26B-A4B IT must remain MoE.");
approx(gemma.totalParamsB, 26); approx(gemma.activeParamsB, 4); approx(gemma.layers, 30); approx(gemma.kvHeads, 8); approx(gemma.headDim, 256); approx(gemma.numExperts, 128); approx(gemma.routedExpertsPerToken, 8); approx(gemma.activeExpertsPerToken, 8); approx(gemma.contextLength, 262144);
assert(gemma.kvSizingNote?.includes("over-estimating"), "Gemma must disclose conservative full-context KV treatment of sliding attention.");
approx(getInferenceThroughputScale(gemma).factor, 1);
const gemmaTraining = getTrainingParameterSemantics(gemma);
approx(gemmaTraining.residencyParamsB, 26); approx(gemmaTraining.activeComputeParamsB, 4);

for (const [id, expected] of Object.entries({
  "mistral-small-4": { total: 119, active: 6.5, layers: 36, rank: 256, experts: 128 },
  "mistral-large-3": { total: 675, active: 41, layers: 61, rank: 512, experts: 128 },
})) {
  const model = getModelById(id);
  assert(model.architectureType === "moe", `${id} must remain MoE.`);
  assert(model.attentionType === "MLA", `${id} must use the MLA KV-cache contract.`);
  approx(model.totalParamsB, expected.total); approx(model.activeParamsB, expected.active); approx(model.layers, expected.layers); approx(model.kvLoraRank, expected.rank); approx(model.qkRopeHeadDim, 64); approx(model.numExperts, expected.experts); approx(model.routedExpertsPerToken, 4); approx(model.activeExpertsPerToken, 5); approx(model.contextLength, 262144);
  approx(getInferenceThroughputScale(model).factor, 1);
  const training = getTrainingParameterSemantics(model);
  approx(training.residencyParamsB, expected.total); approx(training.activeComputeParamsB, expected.active);
}

const visibleIds = new Set(getVisibleModelOptions({ includeExisting: true }).map((model) => model.id));
for (const id of expectedIds) {
  assert(MODEL_REGISTRY.some((model) => model.id === id), `${id} is absent from production MODEL_REGISTRY after activation.`);
  assert(visibleIds.has(id), `${id} is absent from GPU/TCO visible options after activation.`);
}

console.log("Activated model runtime PASS: six source-backed models are production-recommended, retain guarded dense/MoE standard-KV/MLA sizing semantics, and are visible to GPU/TCO while conservative memory disclosures remain intact.");
