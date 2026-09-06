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

console.log(
  `Model sizing methodology PASS: ${INFERENCE_REFERENCE_MODEL.label} ${INFERENCE_REFERENCE_MODEL.activeParamsB}B reference; ` +
  "one-sided inference scaling prevents unsupported speedups; training residency and active-compute semantics remain distinct."
);
