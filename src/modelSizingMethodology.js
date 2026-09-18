// Architecture-aware model sizing primitives for GPU Sizing.
//
// The current GPU throughput anchors are MLPerf/NVIDIA Llama 2 70B results.
// They are hardware benchmark anchors, not universal per-GPU throughput for
// every model. This module applies only conservative, explainable adjustments:
// larger per-token active compute may reduce the anchor; smaller active models
// do NOT receive an inferred speedup without model-specific benchmark evidence.
//
// Memory residency, per-token compute, and inference sequence state are three
// deliberately separate concepts:
// - totalParamsB drives resident model/training-state memory;
// - activeParamsB may drive sparse per-token compute when source-verified;
// - sequence state covers token-growing KV/compressed attention plus fixed
//   recurrent state for architectures such as DeltaNet and Mamba.
// None of these concepts silently substitutes for another.

export const INFERENCE_REFERENCE_MODEL = Object.freeze({
  label: "Llama 2 70B",
  activeParamsB: 70,
  source: "https://developer.nvidia.com/blog/nvidia-blackwell-delivers-massive-performance-leaps-in-mlperf-inference-v5-0/",
});

export const INFERENCE_SERVING_ANCHOR_SEMANTICS = Object.freeze({
  benchmarkScenario: "MLPerf Offline",
  planningPurpose: "aggregate output-throughput capacity planning",
  validatesPerRequestLatency: false,
  latencyMetrics: Object.freeze(["TTFT", "TPOT"]),
  basis: "MLPerf Offline measures throughput with requests available for throughput-oriented scheduling. It does not enforce the latency constraints used by MLPerf Server/Interactive scenarios, so it cannot by itself validate per-request streaming speed, time to first token (TTFT), or time per output token (TPOT).",
  source: "https://mlcommons.org/2024/03/mlperf-llama2-70b/",
});

export function getInferenceServingDemand(concurrentRequests, desiredTokensPerActiveRequest) {
  const aggregateTokensPerSecond = concurrentRequests * desiredTokensPerActiveRequest;
  return {
    concurrentRequests,
    desiredTokensPerActiveRequest,
    aggregateTokensPerSecond,
    basis: `Aggregate capacity demand = ${concurrentRequests} active requests × ${desiredTokensPerActiveRequest} desired output tok/s per request. This is a capacity-planning demand, not a guarantee that each request will achieve that streaming rate.`,
  };
}

// M3 precision guardrail for inference throughput anchors.
//
// Current Blackwell throughput anchors are empirical FP4/NVFP4 MLPerf results.
// Reusing those token-throughput numbers unchanged for FP8 or FP16 would imply
// precision-invariant performance that the evidence does not support. Until a
// precision-matched LLM benchmark is loaded, scale only downward using NVIDIA's
// published *dense* Tensor Core peak ratios for the corresponding platform.
// This is intentionally a conservative planning guardrail, not a claim that
// application token throughput scales linearly with peak FLOPS.
export const INFERENCE_PRECISION_PROFILES = Object.freeze({
  B200: Object.freeze({
    anchorPrecision: "FP4",
    scales: Object.freeze({ FP4: 1, FP8: 0.5, FP16: 0.25 }),
    source: "NVIDIA HGX B200 specifications: dense FP4 72 PFLOPS/system; dense FP8 36 PFLOPS/system; dense FP16/BF16 18 PFLOPS/system.",
  }),
  "GB200 NVL72": Object.freeze({
    anchorPrecision: "FP4",
    scales: Object.freeze({ FP4: 1, FP8: 0.5, FP16: 0.25 }),
    source: "NVIDIA GB200 NVL72 specifications: dense NVFP4 720 PFLOPS/rack; dense FP8 360 PFLOPS/rack; dense FP16/BF16 180 PFLOPS/rack.",
  }),
  B300: Object.freeze({
    anchorPrecision: "FP4",
    scales: Object.freeze({ FP4: 1, FP8: 1 / 3, FP16: 1 / 6 }),
    source: "NVIDIA HGX/DGX B300 specifications: dense FP4 108 PFLOPS/system; dense FP8 36 PFLOPS/system; dense FP16/BF16 18 PFLOPS/system.",
  }),
  "GB300 NVL72": Object.freeze({
    anchorPrecision: "FP4",
    scales: Object.freeze({ FP4: 1, FP8: 1 / 3, FP16: 1 / 6 }),
    source: "NVIDIA GB300 NVL72 specifications: dense FP4 1,080 PFLOPS/rack; dense FP8 360 PFLOPS/rack; dense FP16/BF16 180 PFLOPS/rack.",
  }),
});

export function getInferencePrecisionScale(gpuId, quant) {
  const profile = INFERENCE_PRECISION_PROFILES[gpuId];
  if (!profile) {
    return {
      factor: 1,
      anchorPrecision: null,
      selectedPrecision: quant,
      confidence: "LOW",
      basis: `No precision profile is loaded for ${gpuId}; no precision-specific throughput adjustment is applied.`,
      source: null,
    };
  }

  const factor = profile.scales[quant];
  if (!Number.isFinite(factor) || factor <= 0 || factor > 1) {
    throw new Error(`${gpuId} has no valid inference precision scale for ${quant}.`);
  }

  const matched = quant === profile.anchorPrecision;
  return {
    factor,
    anchorPrecision: profile.anchorPrecision,
    selectedPrecision: quant,
    confidence: matched ? "BENCHMARK-MATCHED" : "DERIVED",
    basis: matched
      ? `${quant} matches the loaded ${profile.anchorPrecision} benchmark precision; no precision penalty is applied.`
      : `${quant} differs from the loaded ${profile.anchorPrecision} benchmark precision; throughput is conservatively capped at ${(factor * 100).toFixed(1)}% of the benchmark anchor using NVIDIA published dense Tensor Core peak ratios. This is a guardrail, not a precision-matched token benchmark.`,
    source: profile.source,
  };
}

export const SEQUENCE_STATE_TYPES = Object.freeze([
  "standard-kv",
  "mla",
  "deltanet-attention-hybrid",
  "deepseek-v4-compressed-attention",
  "mamba-attention-hybrid",
]);

function positiveNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function nonNegativeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function requirePositive(value, field, model) {
  const n = positiveNumber(value);
  if (!n) throw new Error(`${model?.id || "model"} missing positive ${field}.`);
  return n;
}

function requireNonNegative(value, field, model) {
  const n = nonNegativeNumber(value);
  if (n == null) throw new Error(`${model?.id || "model"} missing non-negative ${field}.`);
  return n;
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

function standardKvState(model, tokens, cacheBytesPerElement) {
  const layers = requirePositive(model.layers, "layers", model);
  const kvHeads = requirePositive(model.kvHeads, "kvHeads", model);
  const headDim = requirePositive(model.headDim, "headDim", model);
  const bytes = 2 * layers * kvHeads * headDim * tokens * cacheBytesPerElement;
  return {
    stateType: "standard-kv",
    bytesPerSequence: bytes,
    tokenGrowingBytes: bytes,
    fixedBytes: 0,
    components: [{ name: "standard KV cache", bytes }],
    confidence: model.status === "VERIFIED" ? "MEDIUM" : "LOW",
    basis: "Classic attention stores separate K and V tensors for every cached token and modeled attention layer.",
  };
}

function mlaState(model, tokens, cacheBytesPerElement) {
  const layers = requirePositive(model.layers, "layers", model);
  const kvLoraRank = requirePositive(model.kvLoraRank, "kvLoraRank", model);
  const qkRopeHeadDim = requirePositive(model.qkRopeHeadDim, "qkRopeHeadDim", model);
  const bytes = layers * (kvLoraRank + qkRopeHeadDim) * tokens * cacheBytesPerElement;
  return {
    stateType: "mla",
    bytesPerSequence: bytes,
    tokenGrowingBytes: bytes,
    fixedBytes: 0,
    components: [{ name: "MLA latent + RoPE cache", bytes }],
    confidence: model.status === "VERIFIED" ? "MEDIUM" : "LOW",
    basis: "MLA caches the source-qualified latent KV rank plus the RoPE key dimension rather than a classic per-head K/V pair.",
  };
}

function deltaNetHybridState(model, tokens, cacheBytesPerElement) {
  const linearLayers = requirePositive(model.linearAttentionLayers, "linearAttentionLayers", model);
  const fullLayers = requirePositive(model.fullAttentionLayers, "fullAttentionLayers", model);
  const kvHeads = requirePositive(model.fullAttentionKvHeads, "fullAttentionKvHeads", model);
  const headDim = requirePositive(model.fullAttentionHeadDim, "fullAttentionHeadDim", model);
  const keyHeads = requirePositive(model.linearKeyHeads, "linearKeyHeads", model);
  const keyHeadDim = requirePositive(model.linearKeyHeadDim, "linearKeyHeadDim", model);
  const valueHeads = requirePositive(model.linearValueHeads, "linearValueHeads", model);
  const valueHeadDim = requirePositive(model.linearValueHeadDim, "linearValueHeadDim", model);
  const convKernel = requirePositive(model.linearConvKernel, "linearConvKernel", model);
  const recurrentBytes = requirePositive(model.recurrentStateBytesPerElement, "recurrentStateBytesPerElement", model);
  const convBytes = requirePositive(model.convolutionStateBytesPerElement, "convolutionStateBytesPerElement", model);

  const fullAttentionBytes = 2 * fullLayers * kvHeads * headDim * tokens * cacheBytesPerElement;
  const recurrentElementsPerLayer = valueHeads * keyHeadDim * valueHeadDim;
  const recurrentStateBytes = linearLayers * recurrentElementsPerLayer * recurrentBytes;
  const keyDim = keyHeads * keyHeadDim;
  const valueDim = valueHeads * valueHeadDim;
  const convElementsPerLayer = (2 * keyDim + valueDim) * convKernel;
  const convolutionStateBytes = linearLayers * convElementsPerLayer * convBytes;
  const fixedBytes = recurrentStateBytes + convolutionStateBytes;

  return {
    stateType: model.sequenceStateType,
    bytesPerSequence: fullAttentionBytes + fixedBytes,
    tokenGrowingBytes: fullAttentionBytes,
    fixedBytes,
    components: [
      { name: "full-attention KV cache", bytes: fullAttentionBytes },
      { name: "DeltaNet recurrent state", bytes: recurrentStateBytes },
      { name: "DeltaNet convolution state", bytes: convolutionStateBytes },
    ],
    confidence: "MEDIUM",
    basis: "Full-attention layers retain token-growing classic KV state; Gated DeltaNet layers retain source-shaped fixed recurrent and convolution state. Recurrent state uses its explicit float32 storage contract rather than the generic KV-cache precision control.",
  };
}

function deepseekV4CompressedState(model, tokens, cacheBytesPerElement) {
  const layers = requirePositive(model.layers, "layers", model);
  const kvHeads = requirePositive(model.sharedKvHeads, "sharedKvHeads", model);
  const headDim = requirePositive(model.sharedKvHeadDim, "sharedKvHeadDim", model);
  const slidingWindow = requirePositive(model.slidingWindow, "slidingWindow", model);
  const slidingOnlyLayers = requireNonNegative(model.slidingOnlyLayers, "slidingOnlyLayers", model);
  const csaLayers = requireNonNegative(model.csaLayers, "csaLayers", model);
  const hcaLayers = requireNonNegative(model.hcaLayers, "hcaLayers", model);
  const csaRate = requirePositive(model.csaCompressRate, "csaCompressRate", model);
  const hcaRate = requirePositive(model.hcaCompressRate, "hcaCompressRate", model);
  const indexHeadDim = requirePositive(model.indexHeadDim, "indexHeadDim", model);
  const auxBytes = requirePositive(model.compressionAuxBytesPerElement, "compressionAuxBytesPerElement", model);
  if (slidingOnlyLayers + csaLayers + hcaLayers !== layers) {
    throw new Error(`${model.id} DeepSeek layer counts do not reconcile to total layers.`);
  }

  const slidingTokens = Math.min(tokens, slidingWindow);
  const slidingBytes = layers * kvHeads * headDim * slidingTokens * cacheBytesPerElement;

  const csaEntries = Math.floor(tokens / csaRate);
  const csaRemainder = tokens % csaRate;
  const csaCompressedBytes = csaLayers * csaEntries * (headDim + indexHeadDim) * auxBytes;
  const csaBufferElementsPerLayer = 4 * csaRemainder * (headDim + indexHeadDim);
  const csaOverlapElementsPerLayer = csaEntries > 0 ? 2 * (headDim + indexHeadDim) : 0;
  const csaAuxBytes = csaLayers * (csaBufferElementsPerLayer + csaOverlapElementsPerLayer) * auxBytes;

  const hcaEntries = Math.floor(tokens / hcaRate);
  const hcaRemainder = tokens % hcaRate;
  const hcaCompressedBytes = hcaLayers * hcaEntries * headDim * auxBytes;
  const hcaBufferBytes = hcaLayers * 2 * hcaRemainder * headDim * auxBytes;

  const compressedBytes = csaCompressedBytes + hcaCompressedBytes;
  const auxFixedAtTokenCountBytes = csaAuxBytes + hcaBufferBytes;
  const total = slidingBytes + compressedBytes + auxFixedAtTokenCountBytes;

  return {
    stateType: model.sequenceStateType,
    bytesPerSequence: total,
    tokenGrowingBytes: slidingBytes + compressedBytes,
    fixedBytes: auxFixedAtTokenCountBytes,
    components: [
      { name: "shared K=V sliding-window cache", bytes: slidingBytes },
      { name: "CSA compressed long-range cache", bytes: csaCompressedBytes },
      { name: "CSA compressor/indexer buffer + overlap state", bytes: csaAuxBytes },
      { name: "HCA compressed long-range cache", bytes: hcaCompressedBytes },
      { name: "HCA compressor buffer state", bytes: hcaBufferBytes },
    ],
    confidence: "MEDIUM-LOW",
    basis: "Hugging Face DeepSeek V4 cache classes explicitly separate shared K=V sliding state, CSA compressor/indexer compressed state with overlap, and HCA non-overlapping compressed state. Compression auxiliaries are kept at the source model dtype and are not assumed quantizable by the generic KV-cache precision setting.",
  };
}

function mambaHybridState(model, tokens, cacheBytesPerElement) {
  const mambaLayers = requirePositive(model.mambaLayers, "mambaLayers", model);
  const attentionLayers = requirePositive(model.attentionLayers, "attentionLayers", model);
  const kvHeads = requirePositive(model.attentionKvHeads, "attentionKvHeads", model);
  const attentionHeadDim = requirePositive(model.attentionHeadDim, "attentionHeadDim", model);
  const mambaHeads = requirePositive(model.mambaNumHeads, "mambaNumHeads", model);
  const mambaHeadDim = requirePositive(model.mambaHeadDim, "mambaHeadDim", model);
  const stateSize = requirePositive(model.mambaStateSize, "mambaStateSize", model);
  const groups = requirePositive(model.mambaGroups, "mambaGroups", model);
  const convKernel = requirePositive(model.mambaConvKernel, "mambaConvKernel", model);
  const recurrentBytes = requirePositive(model.recurrentStateBytesPerElement, "recurrentStateBytesPerElement", model);
  const convBytes = requirePositive(model.convolutionStateBytesPerElement, "convolutionStateBytesPerElement", model);

  const attentionBytes = 2 * attentionLayers * kvHeads * attentionHeadDim * tokens * cacheBytesPerElement;
  const ssmElementsPerLayer = mambaHeads * mambaHeadDim * stateSize;
  const ssmBytes = mambaLayers * ssmElementsPerLayer * recurrentBytes;
  const intermediateSize = mambaHeads * mambaHeadDim;
  const convElementsPerLayer = (intermediateSize + 2 * groups * stateSize) * convKernel;
  const convolutionBytes = mambaLayers * convElementsPerLayer * convBytes;
  const fixedBytes = ssmBytes + convolutionBytes;

  return {
    stateType: model.sequenceStateType,
    bytesPerSequence: attentionBytes + fixedBytes,
    tokenGrowingBytes: attentionBytes,
    fixedBytes,
    components: [
      { name: "attention-layer KV cache", bytes: attentionBytes },
      { name: "Mamba SSM recurrent state", bytes: ssmBytes },
      { name: "Mamba convolution state", bytes: convolutionBytes },
    ],
    confidence: "MEDIUM",
    basis: "Only explicit attention layers contribute token-growing KV state. Source-shaped Mamba SSM and convolution caches are fixed-size per sequence; the SSM remains float32 independent of generic KV-cache precision.",
  };
}

// Returns persistent inference state for one sequence. `tokens` is the cached
// sequence length represented by average prompt + output tokens in GPU Sizing.
// The helper is backward-compatible with current standard/MLA production
// records while providing explicit contracts for staged hybrid architectures.
export function getInferenceSequenceStateMemory(model, tokens, cacheBytesPerElement = 2) {
  if (!model) throw new Error("Model is required for inference sequence-state sizing.");
  const sequenceTokens = requireNonNegative(tokens, "sequence tokens", model);
  const cacheBytes = requirePositive(cacheBytesPerElement, "cacheBytesPerElement", model);

  let state;
  if (model.sequenceStateType === "deltanet-attention-hybrid") {
    state = deltaNetHybridState(model, sequenceTokens, cacheBytes);
  } else if (model.sequenceStateType === "deepseek-v4-compressed-attention") {
    state = deepseekV4CompressedState(model, sequenceTokens, cacheBytes);
  } else if (model.sequenceStateType === "mamba-attention-hybrid") {
    state = mambaHybridState(model, sequenceTokens, cacheBytes);
  } else if (model.attentionType === "MLA") {
    state = mlaState(model, sequenceTokens, cacheBytes);
  } else if (model.attentionType === "standard") {
    state = standardKvState(model, sequenceTokens, cacheBytes);
  } else {
    throw new Error(`${model.id} has no supported inference sequence-state contract.`);
  }

  return {
    ...state,
    totalGBPerSequence: state.bytesPerSequence / 1e9,
    tokenGrowingGBPerSequence: state.tokenGrowingBytes / 1e9,
    fixedGBPerSequence: state.fixedBytes / 1e9,
  };
}

// Full-model training memory is modeled as an explicit state-memory baseline,
// not as compute-precision bytes multiplied by an optimizer-state factor.
// NVIDIA Megatron Core documents 18 bytes/parameter for the non-distributed
// BF16-parameter + FP32-gradient optimizer case. NVIDIA Transformer Engine also
// notes that FP8 compute does not automatically reduce stored weight/optimizer
// memory because higher-precision/master copies commonly remain resident.
export const FULL_MODEL_TRAINING_STATE_BYTES_PER_PARAM = 18;

export function getTrainingMemoryModel(taskType, precision, multiplierOverride = null) {
  const precisionBytes = precision === "FP8" ? 1 : 2;
  const override = Number(multiplierOverride);
  if (Number.isFinite(override) && override > 0) {
    return {
      bytesPerParam: precisionBytes * override,
      precisionBytes,
      multiplier: override,
      basis: `Explicit memory multiplier override: ${override} × ${precisionBytes} byte/param (${precision}).`,
      source: "User-supplied override",
    };
  }

  if (taskType === "LoRA/PEFT") {
    const multiplier = 2.5;
    return {
      bytesPerParam: precisionBytes * multiplier,
      precisionBytes,
      multiplier,
      basis: `Directional PEFT allowance retained at ${multiplier} × ${precisionBytes} byte/param (${precision}); M2 does not recalibrate PEFT memory.`,
      source: "Existing GPU Sizing PEFT planning assumption",
    };
  }

  return {
    bytesPerParam: FULL_MODEL_TRAINING_STATE_BYTES_PER_PARAM,
    precisionBytes,
    multiplier: null,
    basis: "NVIDIA Megatron Core mixed-precision Adam baseline: 18 bytes/parameter for resident model + optimizer state. FP8 is treated as compute precision and does not automatically halve stored model/optimizer state. Activation and temporary-workspace memory remains workload-specific and is not separately modeled here.",
    source: "NVIDIA Megatron Core Distributed Optimizer + NVIDIA Transformer Engine low-precision training guidance",
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
