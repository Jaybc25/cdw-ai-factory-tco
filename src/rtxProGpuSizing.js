import {
  RTX_PRO_6000_GPU_SPEC,
  RTX_PRO_SERVER_CONFIGURATION_POLICY,
  getRtxProServerConfigByGpuCount,
} from "./rtxProServerRegistry.js";

export const RTX_PRO_GPU_SIZING_VERSION = "2026-10-09.v2";

// Autonomous v1 deliberately admits only direct model/context/precision anchors.
// Do not convert B200/H200 throughput into a universal RTX factor.
export const RTX_PRO_INFERENCE_BENCHMARKS = Object.freeze([
  Object.freeze({
    id: "rtx-pro-6000-llama-3.3-70b-fp4-1k1k",
    gpuClass: RTX_PRO_6000_GPU_SPEC.id,
    modelId: "llama-3.3-70b",
    precision: "FP4",
    inputTokens: 1000,
    outputTokens: 1000,
    throughputTokPerSecPerGpu: 1724,
    topology: "TP1 / single GPU",
    framework: "TensorRT-LLM",
    source: "NVIDIA Data Center Deep Learning Inference Performance",
    sourceUrl: "https://developer.nvidia.com/deep-learning-performance-training-inference/ai-inference",
    provenance: "LISTED",
    derivation: "DIRECT",
    asOf: "2026-10-08",
  }),
  Object.freeze({
    id: "rtx-pro-6000-llama-3.3-70b-fp4-8k1k",
    gpuClass: RTX_PRO_6000_GPU_SPEC.id,
    modelId: "llama-3.3-70b",
    precision: "FP4",
    inputTokens: 8192,
    outputTokens: 1024,
    throughputTokPerSecPerGpu: 296,
    topology: "TP1 / single GPU",
    framework: "TensorRT-LLM",
    source: "NVIDIA Data Center Deep Learning Inference Performance",
    sourceUrl: "https://developer.nvidia.com/deep-learning-performance-training-inference/ai-inference",
    provenance: "LISTED",
    derivation: "DIRECT",
    asOf: "2026-10-08",
  }),
]);

export function getRtxProBenchmarkById(benchmarkId) {
  if (!benchmarkId) return null;
  return RTX_PRO_INFERENCE_BENCHMARKS.find((row) => row.id === benchmarkId) || null;
}

// Keep a small reserve beyond the calculator's explicit runtime-overhead input.
// NVIDIA's Llama 3.3 70B NIM system card recommends 90 GB for FP8 on a 96 GB
// class GPU, so v1 uses 90 GB as the autonomous single-GPU-fit ceiling.
export const RTX_PRO_AUTONOMOUS_USABLE_VRAM_GB = 90;

export function selectRtxProBenchmark({ modelId, precision, avgInputTokens, avgOutputTokens }) {
  const exactModel = RTX_PRO_INFERENCE_BENCHMARKS.filter(
    (row) => row.modelId === modelId && row.precision === precision,
  );
  if (!exactModel.length) return null;

  // Choose the smallest admitted context envelope that contains the workload.
  // This prevents a short-context anchor from being extrapolated into long RAG.
  return exactModel
    .filter((row) => Number(avgInputTokens) <= row.inputTokens && Number(avgOutputTokens) <= row.outputTokens)
    .sort((a, b) => (a.inputTokens + a.outputTokens) - (b.inputTokens + b.outputTokens))[0] || null;
}

export function roundRtxProReplicaDeployment(replicaCount) {
  const replicas = Math.max(1, Math.ceil(Number(replicaCount) || 0));
  const supported = RTX_PRO_SERVER_CONFIGURATION_POLICY.supportedGpuCounts;

  if (replicas <= supported[supported.length - 1]) {
    const serverGpuCount = supported.find((count) => replicas <= count);
    return {
      replicas,
      totalDeployedGpus: serverGpuCount,
      servers: 1,
      serverGpuCount,
      serverConfig: getRtxProServerConfigByGpuCount(serverGpuCount),
    };
  }

  // Beyond one server, preserve independent-replica semantics and round in
  // whole 8-GPU server quanta. Coordinated model-parallel clustering is not
  // inferred by this function.
  const serverGpuCount = 8;
  const servers = Math.ceil(replicas / serverGpuCount);
  return {
    replicas,
    totalDeployedGpus: servers * serverGpuCount,
    servers,
    serverGpuCount,
    serverConfig: getRtxProServerConfigByGpuCount(serverGpuCount),
  };
}

function hasDetailedReplicaMemoryInputs({ weightMemoryGB, sequenceStateGBPerSequence, concurrentUsers, overheadPct }) {
  return Number.isFinite(Number(weightMemoryGB)) && Number(weightMemoryGB) > 0 &&
    Number.isFinite(Number(sequenceStateGBPerSequence)) && Number(sequenceStateGBPerSequence) >= 0 &&
    Number.isFinite(Number(concurrentUsers)) && Number(concurrentUsers) > 0 &&
    Number.isFinite(Number(overheadPct)) && Number(overheadPct) >= 0;
}

function requiredGpuSlotsForMemory({ weightMemoryGB, sequenceStateGBPerSequence, concurrentUsers, overheadPct }) {
  const weight = Number(weightMemoryGB);
  const perSequence = Number(sequenceStateGBPerSequence);
  const users = Math.ceil(Number(concurrentUsers));
  const overhead = Number(overheadPct);
  const usableBeforeOverhead = RTX_PRO_AUTONOMOUS_USABLE_VRAM_GB / (1 + overhead);
  const sequenceBudgetGB = usableBeforeOverhead - weight;

  if (sequenceBudgetGB < 0) return Infinity;
  if (perSequence === 0) return 1;

  const sequencesPerGpuCapacity = Math.floor(sequenceBudgetGB / perSequence);
  if (sequencesPerGpuCapacity < 1) return Infinity;
  return Math.max(1, Math.ceil(users / sequencesPerGpuCapacity));
}

function perGpuMemoryForDeployment({ weightMemoryGB, sequenceStateGBPerSequence, concurrentUsers, overheadPct, totalDeployedGpus }) {
  const sequencesPerGpu = Math.max(1, Math.ceil(Number(concurrentUsers) / Number(totalDeployedGpus)));
  const baseMemoryGB = Number(weightMemoryGB) + (Number(sequenceStateGBPerSequence) * sequencesPerGpu);
  const runtimeOverheadGB = baseMemoryGB * Number(overheadPct);
  return {
    sequencesPerGpu,
    baseMemoryGB,
    runtimeOverheadGB,
    totalMemoryGB: baseMemoryGB + runtimeOverheadGB,
  };
}

export function sizeRtxProInference({
  modelId,
  precision,
  totalMemoryGB,
  weightMemoryGB,
  sequenceStateGBPerSequence,
  concurrentUsers,
  overheadPct,
  aggregateTokensPerSecond,
  avgInputTokens,
  avgOutputTokens,
}) {
  const demandTokPerSec = Number(aggregateTokensPerSecond);
  const detailedMemory = hasDetailedReplicaMemoryInputs({
    weightMemoryGB,
    sequenceStateGBPerSequence,
    concurrentUsers,
    overheadPct,
  });

  // Backward-compatible fallback for older callers/validators. New production
  // GPU Sizing passes the detailed components so aggregate sequence state is
  // distributed across independent RTX replicas rather than assigned to one GPU.
  if (!detailedMemory) {
    const memoryGB = Number(totalMemoryGB);
    const fitsOneGpu = Number.isFinite(memoryGB) && memoryGB > 0 && memoryGB <= RTX_PRO_AUTONOMOUS_USABLE_VRAM_GB;
    if (!fitsOneGpu) {
      return {
        status: "ENGINEERING_VALIDATION_REQUIRED",
        eligible: false,
        reason: `Modeled serving memory (${Number.isFinite(memoryGB) ? memoryGB.toFixed(1) : "unknown"} GB) does not fit within the ${RTX_PRO_AUTONOMOUS_USABLE_VRAM_GB} GB autonomous single-GPU planning ceiling. Multi-GPU model splitting over PCIe is not autonomously sized in v1.`,
        fitsOneGpu: false,
        benchmark: null,
        deployment: null,
        budget: null,
      };
    }
  } else {
    const modelOnlyMemoryGB = Number(weightMemoryGB) * (1 + Number(overheadPct));
    if (modelOnlyMemoryGB > RTX_PRO_AUTONOMOUS_USABLE_VRAM_GB) {
      return {
        status: "ENGINEERING_VALIDATION_REQUIRED",
        eligible: false,
        reason: `Model weights plus configured runtime overhead require ${modelOnlyMemoryGB.toFixed(1)} GB per GPU, above the ${RTX_PRO_AUTONOMOUS_USABLE_VRAM_GB} GB autonomous single-GPU planning ceiling. Multi-GPU model splitting over PCIe is not autonomously sized in v1.`,
        fitsOneGpu: false,
        benchmark: null,
        deployment: null,
        budget: null,
      };
    }
  }

  const benchmark = selectRtxProBenchmark({ modelId, precision, avgInputTokens, avgOutputTokens });
  if (!benchmark) {
    return {
      status: "EVIDENCE_REQUIRED",
      eligible: false,
      reason: "The model fits one RTX PRO GPU, but no direct admitted RTX PRO benchmark matches this model, precision, and context envelope. V1 does not substitute a universal RTX-to-DGX performance factor.",
      fitsOneGpu: true,
      benchmark: null,
      deployment: null,
      budget: null,
    };
  }

  if (!(Number.isFinite(demandTokPerSec) && demandTokPerSec > 0)) {
    return {
      status: "INVALID_DEMAND",
      eligible: false,
      reason: "Aggregate serving demand must be greater than zero.",
      fitsOneGpu: true,
      benchmark,
      deployment: null,
      budget: null,
    };
  }

  const throughputReplicaCount = Math.ceil(demandTokPerSec / benchmark.throughputTokPerSecPerGpu);
  const memoryGpuSlots = detailedMemory
    ? requiredGpuSlotsForMemory({ weightMemoryGB, sequenceStateGBPerSequence, concurrentUsers, overheadPct })
    : 1;

  if (!Number.isFinite(memoryGpuSlots)) {
    return {
      status: "ENGINEERING_VALIDATION_REQUIRED",
      eligible: false,
      reason: `The model fits by weights, but one active sequence plus configured runtime overhead exceeds the ${RTX_PRO_AUTONOMOUS_USABLE_VRAM_GB} GB autonomous per-GPU planning ceiling.`,
      fitsOneGpu: false,
      benchmark,
      deployment: null,
      budget: null,
    };
  }

  const replicas = Math.max(throughputReplicaCount, memoryGpuSlots);
  const deployment = roundRtxProReplicaDeployment(replicas);
  const config = deployment.serverConfig;
  const listedSingleServer = deployment.servers === 1 && Number.isFinite(config?.configuredSystemPriceUSD);
  const perGpuMemory = detailedMemory
    ? perGpuMemoryForDeployment({
        weightMemoryGB,
        sequenceStateGBPerSequence,
        concurrentUsers,
        overheadPct,
        totalDeployedGpus: deployment.totalDeployedGpus,
      })
    : null;

  if (perGpuMemory && perGpuMemory.totalMemoryGB > RTX_PRO_AUTONOMOUS_USABLE_VRAM_GB) {
    return {
      status: "ENGINEERING_VALIDATION_REQUIRED",
      eligible: false,
      reason: `Distributed serving memory remains ${perGpuMemory.totalMemoryGB.toFixed(1)} GB per GPU after deployment rounding, above the ${RTX_PRO_AUTONOMOUS_USABLE_VRAM_GB} GB autonomous planning ceiling.`,
      fitsOneGpu: false,
      benchmark,
      deployment,
      budget: null,
      memoryBasis: perGpuMemory,
    };
  }

  return {
    status: "AUTONOMOUS_REPLICA_SIZING",
    eligible: true,
    reason: detailedMemory
      ? "Model weights fit one RTX PRO GPU; concurrent sequence state is distributed across independent replicas, and a direct model/context/precision benchmark is admitted."
      : "Model fits one RTX PRO GPU and a direct model/context/precision benchmark is admitted; capacity scales through independent replicas rather than model splitting.",
    fitsOneGpu: true,
    benchmark,
    replicas,
    throughputReplicaCount,
    memoryGpuSlots,
    memoryBasis: perGpuMemory,
    deployment,
    utilization: Math.min(demandTokPerSec / (deployment.totalDeployedGpus * benchmark.throughputTokPerSecPerGpu), 1),
    budget: listedSingleServer
      ? {
          amount: config.configuredSystemPriceUSD,
          confidence: config.priceProvenance,
          derivation: config.priceDerivation,
          source: config.pricingSource,
          asOf: config.priceAsOf,
          scope: "configured server hardware only; support and NVIDIA software remain quote-required",
        }
      : {
          amount: null,
          confidence: "QUOTE",
          derivation: "DIRECT_CONFIG_REQUIRED",
          source: config?.pricingSource || "Project-specific OEM/CDW configuration required",
          asOf: config?.priceAsOf || null,
          scope: "configured server price unresolved; no arithmetic price is manufactured",
        },
  };
}
