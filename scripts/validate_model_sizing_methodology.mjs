import fs from "node:fs";
import {
  INFERENCE_REFERENCE_MODEL,
  getInferenceThroughputScale,
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

const sparseTraining = getTrainingParameterSemantics(sparse120a12);
approx(sparseTraining.residencyParamsB, 120);
approx(sparseTraining.activeComputeParamsB, 12);
if (sparseTraining.residencyParamsB === sparseTraining.activeComputeParamsB) {
  throw new Error("Sparse training residency and active-compute parameter concepts were collapsed.");
}

const denseTraining = getTrainingParameterSemantics(dense70);
approx(denseTraining.residencyParamsB, 70);
approx(denseTraining.activeComputeParamsB, 70);

const unknown = getInferenceThroughputScale({ id: "unknown", status: "CUSTOM" });
approx(unknown.factor, 1);
if (unknown.confidence !== "LOW") throw new Error("Unknown active-compute semantics must remain LOW confidence.");

// Wiring contract: the production GPU Sizing calculator must consume these
// primitives rather than leaving them as disconnected documentation/tests.
const gpuSizingSource = fs.readFileSync(new URL("../src/GpuSizingCalculator.jsx", import.meta.url), "utf8");
const requiredSourceSnippets = [
  'from "./modelSizingMethodology.js"',
  "getInferenceThroughputScale(model, inputs.customParamsB)",
  "gpu.anchor * throughputScale.factor",
  "getTrainingParameterSemantics(model, inputs.customParamsB)",
  "trainingSemantics.residencyParamsB * precisionBytes * multiplier",
  "6 * trainingSemantics.activeComputeParamsB * inputs.datasetTokensB * 1e18",
];
for (const snippet of requiredSourceSnippets) {
  if (!gpuSizingSource.includes(snippet)) {
    throw new Error(`GPU Sizing architecture-aware integration missing required source contract: ${snippet}`);
  }
}
if (gpuSizingSource.includes("const flopsRequired = 6 * model.totalParamsB * inputs.datasetTokensB * 1e18")) {
  throw new Error("GPU Sizing still uses totalParamsB for sparse token-level training FLOPs.");
}
if (gpuSizingSource.includes("const gpusPerf = ceilDiv(totalThroughputNeeded, gpu.anchor)")) {
  throw new Error("GPU Sizing still applies the raw hardware anchor universally without model-aware adjustment.");
}

console.log(
  `Model sizing methodology PASS: ${INFERENCE_REFERENCE_MODEL.label} ${INFERENCE_REFERENCE_MODEL.activeParamsB}B reference; ` +
    "one-sided inference scaling prevents unsupported speedups; training residency and active-compute semantics remain distinct; " +
    "production GPU Sizing is wired to the guarded methodology."
);
