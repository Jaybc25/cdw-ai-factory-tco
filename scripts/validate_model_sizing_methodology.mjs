import fs from "node:fs";
import {
  INFERENCE_REFERENCE_MODEL,
  FULL_MODEL_TRAINING_STATE_BYTES_PER_PARAM,
  getInferencePrecisionScale,
  getInferenceThroughputScale,
  getTrainingMemoryModel,
  getTrainingParameterSemantics,
} from "../src/modelSizingMethodology.js";

function approx(actual, expected, tolerance = 1e-9) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`Expected ${expected}; received ${actual}.`);
  }
}

const dense70 = {
  id: "dense-70",
  architectureType: "dense",
  totalParamsB: 70,
  activeParamsB: 70,
  status: "VERIFIED",
};
const dense140 = {
  id: "dense-140",
  architectureType: "dense",
  totalParamsB: 140,
  activeParamsB: 140,
  status: "VERIFIED",
};
const sparse120a12 = {
  id: "sparse-120-a12",
  architectureType: "moe",
  totalParamsB: 120,
  activeParamsB: 12,
  status: "VERIFIED",
};

approx(getInferenceThroughputScale(dense70).factor, 1);
approx(getInferenceThroughputScale(dense140).factor, 0.5);
approx(getInferenceThroughputScale(sparse120a12).factor, 1);

if (getInferenceThroughputScale(sparse120a12).factor > 1) {
  throw new Error("Sparse/small-active models must not receive an unsupported inferred throughput uplift.");
}

approx(getInferencePrecisionScale("B200", "FP4").factor, 1);
approx(getInferencePrecisionScale("B200", "FP8").factor, 0.5);
approx(getInferencePrecisionScale("B200", "FP16").factor, 0.25);
approx(getInferencePrecisionScale("GB200 NVL72", "FP8").factor, 0.5);
approx(getInferencePrecisionScale("B300", "FP8").factor, 1 / 3);
approx(getInferencePrecisionScale("B300", "FP16").factor, 1 / 6);
approx(getInferencePrecisionScale("GB300 NVL72", "FP8").factor, 1 / 3);
if (getInferencePrecisionScale("B200", "FP8").factor >= getInferencePrecisionScale("B200", "FP4").factor) {
  throw new Error("FP8 must not reuse the B200 FP4 benchmark anchor unchanged.");
}

const sparseTraining = getTrainingParameterSemantics(sparse120a12);
approx(sparseTraining.residencyParamsB, 120);
approx(sparseTraining.activeComputeParamsB, 12);
if (sparseTraining.residencyParamsB === sparseTraining.activeComputeParamsB) {
  throw new Error("Sparse training residency and active-compute parameter concepts were collapsed.");
}

const denseTraining = getTrainingParameterSemantics(dense70);
approx(denseTraining.residencyParamsB, 70);
approx(denseTraining.activeComputeParamsB, 70);
const bf16FullMemory = getTrainingMemoryModel("Full fine-tune", "BF16");
const fp8FullMemory = getTrainingMemoryModel("Full fine-tune", "FP8");
const bf16PretrainMemory = getTrainingMemoryModel("Pretraining", "BF16");
approx(FULL_MODEL_TRAINING_STATE_BYTES_PER_PARAM, 18);
approx(bf16FullMemory.bytesPerParam, 18);
approx(fp8FullMemory.bytesPerParam, 18);
approx(bf16PretrainMemory.bytesPerParam, 18);
if (fp8FullMemory.bytesPerParam !== bf16FullMemory.bytesPerParam) {
  throw new Error("FP8 compute precision must not silently halve full-model resident optimizer/model-state memory.");
}


const unknown = getInferenceThroughputScale({ id: "unknown", status: "CUSTOM" });
approx(unknown.factor, 1);
if (unknown.confidence !== "LOW") throw new Error("Unknown active-compute semantics must remain LOW confidence.");

// Wiring contract: the production GPU Sizing calculator must consume these
// primitives rather than leaving them as disconnected documentation/tests.
const gpuSizingSource = fs.readFileSync(
  new URL("../src/GpuSizingCalculator.jsx", import.meta.url),
  "utf8"
);
const requiredSourceSnippets = [
  'from "./modelSizingMethodology.js"',
  "getInferenceThroughputScale(model, inputs.customParamsB)",
  "getInferencePrecisionScale(gpu.id, inputs.quant)",
  "gpu.anchor * throughputScale.factor * precisionScale.factor",
  "getTrainingParameterSemantics(model, inputs.customParamsB)",
  "getTrainingMemoryModel(inputs.taskType, inputs.precision, inputs.memMultiplierOverride)",
  "trainingSemantics.residencyParamsB * memoryModel.bytesPerParam",
  "6 * trainingSemantics.activeComputeParamsB * inputs.datasetTokensB * 1e18",
];
for (const snippet of requiredSourceSnippets) {
  if (!gpuSizingSource.includes(snippet)) {
    throw new Error(`GPU Sizing architecture-aware integration missing required source contract: ${snippet}`);
  }
}
if (gpuSizingSource.includes("const effectiveAnchor = gpu.anchor * throughputScale.factor;")) {
  throw new Error("GPU Sizing still reuses the benchmark throughput anchor without a precision guardrail.");
}
if (gpuSizingSource.includes("trainingSemantics.residencyParamsB * precisionBytes * multiplier")) {
  throw new Error("GPU Sizing still scales the entire full-model training state footprint by selected compute precision.");
}
if (gpuSizingSource.includes("const flopsRequired = 6 * model.totalParamsB * inputs.datasetTokensB * 1e18")) {
  throw new Error("GPU Sizing still uses totalParamsB for sparse token-level training FLOPs.");
}
if (gpuSizingSource.includes("const gpusPerf = ceilDiv(totalThroughputNeeded, gpu.anchor)")) {
  throw new Error("GPU Sizing still applies the raw hardware anchor universally without model-aware adjustment.");
}

console.log(
  `Model sizing methodology PASS: ${INFERENCE_REFERENCE_MODEL.label} ${INFERENCE_REFERENCE_MODEL.activeParamsB}B reference; ` +
  "one-sided inference scaling prevents unsupported model speedups; FP4 inference anchors receive explicit NVIDIA-spec precision guardrails for FP8/FP16; full-model training memory uses an explicit 18 B/param state baseline independent of BF16/FP8 compute precision; training residency and active-compute semantics remain distinct; " +
  "production GPU Sizing is wired to the guarded methodology."
);
