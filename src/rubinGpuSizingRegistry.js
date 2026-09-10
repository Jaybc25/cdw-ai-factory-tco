// NVIDIA Rubin GPU Sizing technical evidence registry.
//
// This module intentionally separates technical sizing eligibility from
// inference-benchmark eligibility and TCO/commercial activation. Rubin can be
// used for training/memory sizing only where the existing methodology has
// first-party inputs; inference remains unavailable until a qualifying absolute
// per-GPU throughput result is published.
//
// Evidence basis: RubinEvidenceFoundation.md (research frozen 2026-09-10).

export const RUBIN_GPU_SIZING_SPECS = Object.freeze([
  Object.freeze({
    id: "Rubin NVL8",
    systemName: "DGX Rubin NVL8",
    architecture: "Rubin",
    vramGB: 288,
    bf16Tflops: 4000,
    fp8Tflops: 17500,
    nodeSize: 8,
    trainingSizingEnabled: true,
    memorySizingEnabled: true,
    inferenceSizingEnabled: false,
    inferenceAnchor: null,
    inferenceConfidence: "UNAVAILABLE",
    inferenceReason: "Awaiting a qualifying absolute per-GPU throughput benchmark; do not derive from peak FLOPS, ratios, or tokens/MW.",
    technicalConfidence: "LISTED",
    technicalSource: "NVIDIA DGX Rubin NVL8 product page/datasheet; Rubin GPU architecture specifications",
    technicalVerifiedAt: "2026-09-10",
    notes: "288 GB HBM4 per GPU; 4,000 TFLOPS BF16 dense and 17,500 TFLOPS FP8/FP6 dense. NVIDIA specifications are preliminary.",
  }),
  Object.freeze({
    id: "Vera Rubin NVL72",
    systemName: "DGX Vera Rubin NVL72",
    architecture: "Vera Rubin",
    vramGB: 288,
    bf16Tflops: 4000,
    fp8Tflops: 17500,
    nodeSize: 72,
    trainingSizingEnabled: true,
    memorySizingEnabled: true,
    inferenceSizingEnabled: false,
    inferenceAnchor: null,
    inferenceConfidence: "UNAVAILABLE",
    inferenceReason: "Awaiting a qualifying absolute per-GPU throughput benchmark; do not derive from peak FLOPS, ratios, or tokens/MW.",
    technicalConfidence: "LISTED",
    technicalSource: "NVIDIA DGX Vera Rubin NVL72 product page/datasheet; Rubin GPU architecture specifications",
    technicalVerifiedAt: "2026-09-10",
    notes: "72 Rubin GPUs; 20.7 TB HBM4 total, equivalent to 288 GB per GPU; 4,000 TFLOPS BF16 dense and 17,500 TFLOPS FP8/FP6 dense per GPU. NVIDIA specifications are preliminary.",
  }),
]);

export const RUBIN_TRAINING_CANDIDATES = Object.freeze(
  RUBIN_GPU_SIZING_SPECS.filter((gpu) => gpu.trainingSizingEnabled)
);

export const RUBIN_INFERENCE_CANDIDATES = Object.freeze(
  RUBIN_GPU_SIZING_SPECS.filter((gpu) => gpu.inferenceSizingEnabled && Number.isFinite(gpu.inferenceAnchor))
);

export function getRubinGpuSizingSpec(id) {
  return RUBIN_GPU_SIZING_SPECS.find((gpu) => gpu.id === id) || null;
}

export function isRubinInferenceSizingAvailable(id) {
  const gpu = getRubinGpuSizingSpec(id);
  return Boolean(gpu?.inferenceSizingEnabled && Number.isFinite(gpu.inferenceAnchor));
}
