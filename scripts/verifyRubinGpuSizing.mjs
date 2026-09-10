import {
  RUBIN_GPU_SIZING_SPECS,
  RUBIN_TRAINING_CANDIDATES,
  RUBIN_INFERENCE_CANDIDATES,
  getRubinGpuSizingSpec,
  isRubinInferenceSizingAvailable,
} from "../src/rubinGpuSizingRegistry.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(RUBIN_GPU_SIZING_SPECS.length === 2, "Expected exactly two Rubin sizing classes.");

const nvl8 = getRubinGpuSizingSpec("Rubin NVL8");
const nvl72 = getRubinGpuSizingSpec("Vera Rubin NVL72");

assert(nvl8, "Rubin NVL8 spec missing.");
assert(nvl72, "Vera Rubin NVL72 spec missing.");

for (const gpu of RUBIN_GPU_SIZING_SPECS) {
  assert(gpu.vramGB === 288, `${gpu.id}: expected 288 GB HBM4 per GPU.`);
  assert(gpu.bf16Tflops === 4000, `${gpu.id}: expected 4,000 BF16 TFLOPS dense.`);
  assert(gpu.fp8Tflops === 17500, `${gpu.id}: expected 17,500 FP8/FP6 TFLOPS dense.`);
  assert(gpu.trainingSizingEnabled === true, `${gpu.id}: training sizing should be enabled.`);
  assert(gpu.memorySizingEnabled === true, `${gpu.id}: memory sizing should be enabled.`);
  assert(gpu.inferenceSizingEnabled === false, `${gpu.id}: inference must remain gated.`);
  assert(gpu.inferenceAnchor === null, `${gpu.id}: inference anchor must remain null.`);
  assert(gpu.inferenceConfidence === "UNAVAILABLE", `${gpu.id}: inference confidence must be UNAVAILABLE.`);
  assert(isRubinInferenceSizingAvailable(gpu.id) === false, `${gpu.id}: inference helper must remain false.`);
}

assert(nvl8.nodeSize === 8, "Rubin NVL8 must round to 8-GPU systems.");
assert(nvl72.nodeSize === 72, "Vera Rubin NVL72 must round to 72-GPU racks.");
assert(RUBIN_TRAINING_CANDIDATES.length === 2, "Both Rubin classes should be available for training sizing.");
assert(RUBIN_INFERENCE_CANDIDATES.length === 0, "No Rubin class may enter inference sizing without a verified anchor.");

console.log("Rubin GPU sizing registry verification passed.");
