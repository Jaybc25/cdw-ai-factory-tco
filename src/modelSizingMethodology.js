// Architecture-aware model sizing primitives for GPU Sizing.
//
// The current GPU throughput anchors are MLPerf/NVIDIA Llama 2 70B results.
// They are hardware benchmark anchors, not universal per-GPU throughput for
// every model. This module applies only conservative, explainable adjustments:
// larger per-token active compute may reduce the anchor; smaller active models
// do NOT receive an inferred speedup without model-specific benchmark evidence.
//
// Memory residency and per-token compute are deliberately separate:
// - totalParamsB drives resident model/training-state memory;
// - activeParamsB may drive sparse per-token compute when source-verified;
// - neither silently substitutes for the other.

export const INFERENCE_REFERENCE_MODEL = Object.freeze({
  label: "Llama 2 70B",
  activeParamsB: 70,
  source: "https://developer.nvidia.com/blog/nvidia-blackwell-delivers-massive-performance-leaps-in-mlperf-inference-v5-0/",
});

function positiveNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function getResidencyParamsB(model, customParamsB = null) {
  if (!model) return null;
  if (model.id === "custom") return positiveNumber(customParamsB);
  return positiveNumber(model.totalParamsB);
}

export function getActiveComputeParamsB(model, customParamsB = null) {
  if (!model) return null;
  if (model.id === "custom") return positiveNumber(customParamsB);
  return positiveNumber(model.activeParamsB);
}

// One-sided conservative scaling contract:
// - A model with more active parameters per token than the 70B benchmark
//   reference gets a proportional downward throughput adjustment.
// - A model with fewer active parameters gets NO automatic uplift. Sparse/MoE
//   routing, attention design, kernels, tensor-parallel layout, quantization,
//   interconnect and serving stack can materially change realized throughput.
//   Granting an inverse-parameter speedup without direct evidence would create
//   false precision and systematic under-sizing risk.
export function getInferenceThroughputScale(model, customParamsB = null) {
  const activeParamsB = getActiveComputeParamsB(model, customParamsB);
  if (!activeParamsB) {
    return {
      factor: 1,
      activeParamsB: null,
      confidence: "LOW",
      basis: "No verified active-compute parameter count; hardware reference anchor retained without model speedup.",
    };
  }

  const factor = Math.min(1, INFERENCE_REFERENCE_MODEL.activeParamsB / activeParamsB);
  const isPenalty = factor < 1;
  return {
    factor,
    activeParamsB,
    confidence: model?.status === "VERIFIED" ? (isPenalty ? "MEDIUM" : "MEDIUM-LOW") : "LOW",
    basis: isPenalty
      ? `Per-token active compute (${activeParamsB}B) exceeds the ${INFERENCE_REFERENCE_MODEL.activeParamsB}B MLPerf reference; throughput is conservatively reduced in proportion to active compute.`
      : `Per-token active compute (${activeParamsB}B) is at or below the ${INFERENCE_REFERENCE_MODEL.activeParamsB}B MLPerf reference; no inferred speedup is granted without model-specific benchmark evidence.`,
  };
}

// Training separates resident optimizer/model-state memory from token-level
// compute. Sparse MoE/hybrid models still need the full parameter set resident
// for full-model training state, while a token executes only its routed/active
// subset. Dense models naturally have totalParamsB === activeParamsB.
export function getTrainingParameterSemantics(model, customParamsB = null) {
  const residencyParamsB = getResidencyParamsB(model, customParamsB);
  const activeComputeParamsB = getActiveComputeParamsB(model, customParamsB) ?? residencyParamsB;

  return {
    residencyParamsB,
    activeComputeParamsB,
    architectureType: model?.architectureType || "custom",
    confidence: model?.status === "VERIFIED" && residencyParamsB && activeComputeParamsB ? "MEDIUM" : "LOW",
    basis: model?.architectureType === "moe" || model?.architectureType === "hybrid"
      ? "Sparse training keeps full model state resident while token-level FLOPs use the source-verified active-parameter concept; communication/routing overhead is not modeled as a hidden multiplier."
      : "Dense training uses the same parameter count for resident state and token-level compute.",
  };
}
