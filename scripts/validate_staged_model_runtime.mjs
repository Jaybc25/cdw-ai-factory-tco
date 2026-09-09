import { MODEL_REGISTRY, getVisibleModelOptions, getModelById } from "../src/modelRegistry.js";
import { STAGED_TECHNICAL_MODEL_REGISTRY, getStagedTechnicalModelById } from "../src/stagedModelRegistry.js";
import {
  getInferenceThroughputScale,
  getTrainingParameterSemantics,
  getInferenceSequenceStateMemory,
} from "../src/modelSizingMethodology.js";

function assert(c, m) {
  if (!c) throw new Error(m);
}
function approx(a, e, t = 1e-9) {
  if (Math.abs(a - e) > t) throw new Error(`Expected ${e}; received ${a}.`);
}

const trancheIds = [
  "granite-4.2-30b",
  "gpt-oss-20b",
  "gpt-oss-120b",
  "gemma-4-26b-a4b-it",
  "mistral-small-4",
  "mistral-large-3",
  "qwen3.8-27b",
  "deepseek-v4-flash-0731",
  "deepseek-v4-pro-0813",
  "nemotron-3-super-120b-a12b",
];
const hybridIds = ["qwen3.8-27b", "deepseek-v4-flash-0731", "deepseek-v4-pro-0813", "nemotron-3-super-120b-a12b"];

for (const id of trancheIds) {
  const model = getModelById(id);
  assert(model, `${id} is missing from production MODEL_REGISTRY.`);
  assert(model.catalogStatus === "recommended", `${id} must be catalogStatus=recommended.`);
  assert(model.status === "VERIFIED", `${id} runtime record must remain source-verified.`);
  assert(
    getInferenceSequenceStateMemory(model, 8192, 2).bytesPerSequence > 0,
    `${id} production sequence-state contract failed.`
  );
  const training = getTrainingParameterSemantics(model);
  approx(training.residencyParamsB, model.totalParamsB);
  approx(training.activeComputeParamsB, model.activeParamsB);
  assert(getInferenceThroughputScale(model).factor <= 1, `${id} received unsupported inferred throughput uplift.`);
}

for (const id of hybridIds) {
  const source = getStagedTechnicalModelById(id);
  const runtime = getModelById(id);
  assert(source, `${id} is missing its hybrid methodology source record.`);
  assert(runtime.sequenceStateType === source.sequenceStateType, `${id} promoted sequenceStateType drifted.`);
  assert(
    runtime.totalParamsB === source.totalParamsB &&
      runtime.activeParamsB === source.activeParamsB &&
      runtime.layers === source.layers,
    `${id} promoted core architecture fields drifted.`
  );
  assert(runtime.stateSizingNote === source.stateSizingNote, `${id} promoted state-sizing disclosure drifted.`);
}

const nemotron = getModelById("nemotron-3-super-120b-a12b");
approx(nemotron.numExperts, 512);
approx(nemotron.numSharedExperts, 1);
approx(nemotron.routedExpertsPerToken, 22);
approx(nemotron.activeExpertsPerToken, 23);
approx(nemotron.contextLength, 262144);
approx(nemotron.advertisedExtendedContextLength, 1000000);

const visibleIds = new Set(getVisibleModelOptions({ includeExisting: true }).map((m) => m.id));
for (const id of trancheIds) assert(visibleIds.has(id), `${id} is absent from GPU/TCO visible options.`);
assert(
  STAGED_TECHNICAL_MODEL_REGISTRY.length === 4,
  "Four hybrid methodology/provenance source records must remain available after activation."
);

console.log(
  "Model runtime PASS: all ten tranche models are production-recommended; the four hybrid runtime records reconcile to source-qualified methodology fixtures, Nemotron routing/context semantics are explicit, and no unsupported throughput uplift is introduced."
);
