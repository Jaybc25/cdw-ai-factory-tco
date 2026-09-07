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

assert(STAGED_TECHNICAL_MODEL_REGISTRY.length === 1, "Expected exactly one staged technical runtime model at this checkpoint.");
const granite = getStagedTechnicalModelById("granite-4.2-30b");
assert(granite, "Granite 4.2 30B is missing from the staged technical runtime registry.");
assert(granite.catalogStatus === "staged", "Granite must remain catalogStatus=staged before activation.");
assert(granite.architectureType === "dense", "Granite architecture type drifted from source-qualified dense semantics.");
approx(granite.totalParamsB, 30);
approx(granite.activeParamsB, 30);
approx(granite.layers, 64);
approx(granite.kvHeads, 8);
approx(granite.headDim, 128);
approx(granite.contextLength, 131072);
assert(granite.attentionType === "standard", "Granite must use the source-qualified standard-attention KV contract.");
assert(granite.status === "VERIFIED", "Granite staged runtime record must remain source-verified.");

const inference = getInferenceThroughputScale(granite);
approx(inference.factor, 1);
approx(inference.activeParamsB, 30);
assert(!inference.basis.includes("reduced in proportion"), "Granite should not receive a >70B active-compute throughput penalty.");

const training = getTrainingParameterSemantics(granite);
approx(training.residencyParamsB, 30);
approx(training.activeComputeParamsB, 30);
assert(training.architectureType === "dense", "Granite training semantics must remain dense.");

// Critical staging barrier: technical validation may exercise Granite, but the
// production registry and visible GPU/TCO option builders must still exclude it.
assert(!MODEL_REGISTRY.some((model) => model.id === granite.id), "Granite leaked into production MODEL_REGISTRY before activation.");
const visibleIds = new Set(getVisibleModelOptions({ includeExisting: true }).map((model) => model.id));
assert(!visibleIds.has(granite.id), "Granite leaked into GPU/TCO visible options before activation.");

console.log(
  "Staged model runtime PASS: Granite 4.2 30B has complete source-backed dense/KV sizing fields, " +
  "uses guarded inference/training methodology correctly, and remains absent from production customer-facing model options."
);
