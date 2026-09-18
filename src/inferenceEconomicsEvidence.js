// Preview inference-economics evidence registry.
//
// These records mirror the source-qualified inference anchors already used by
// GPU Sizing on the current main branch. They are deliberately represented at
// the full benchmark-system level so the economics layer does not erase NVL72
// topology effects by pretending every platform has a universal per-GPU rate.
//
// Current records are MLPerf Offline anchors. Offline throughput is NOT assumed
// to be a latency-constrained production-serving result. Therefore these
// records default workloadScenarioMatch=false for interactive serving and will
// produce MODELED rather than VALIDATED economics unless the caller supplies a
// scenario-matched record later.

export const INFERENCE_ECONOMICS_EVIDENCE = Object.freeze({
  "H200": Object.freeze({
    id: "h200-llama2-70b-mlperf-v5",
    hardwareClass: "H200",
    benchmarkGpuCount: 8,
    throughputTokPerSec: 34984,
    referenceModel: "Llama 2 70B",
    precision: "FP8",
    scenario: "OFFLINE",
    sourceType: "MLPerf",
    sourceLabel: "MLCommons Inference v5.0 official H200 submissions",
    sourceUrl: "https://mlcommons.org/benchmarks/inference-datacenter/",
    qualified: true,
    directBenchmark: true,
  }),
  "B200": Object.freeze({
    id: "b200-llama2-70b-mlperf-v6",
    hardwareClass: "B200",
    benchmarkGpuCount: 8,
    throughputTokPerSec: 104572,
    referenceModel: "Llama 2 70B",
    precision: "FP4 (NVFP4)",
    scenario: "OFFLINE",
    sourceType: "NVIDIA_MLPERF",
    sourceLabel: "NVIDIA MLPerf Inference v6.0",
    sourceUrl: "https://developer.nvidia.com/deep-learning-performance-training-inference/ai-inference",
    qualified: true,
    directBenchmark: true,
  }),
  "GB200 NVL72": Object.freeze({
    id: "gb200-nvl72-llama2-70b-mlperf-v6",
    hardwareClass: "GB200 NVL72",
    benchmarkGpuCount: 72,
    throughputTokPerSec: 888054,
    referenceModel: "Llama 2 70B",
    precision: "FP4 (NVFP4)",
    scenario: "OFFLINE",
    sourceType: "NVIDIA_MLPERF",
    sourceLabel: "NVIDIA MLPerf Inference v6.0",
    sourceUrl: "https://developer.nvidia.com/deep-learning-performance-training-inference/ai-inference",
    qualified: true,
    directBenchmark: true,
  }),
  "B300": Object.freeze({
    id: "b300-llama2-70b-mlperf-v6",
    hardwareClass: "B300",
    benchmarkGpuCount: 8,
    throughputTokPerSec: 112954,
    referenceModel: "Llama 2 70B",
    precision: "FP4 (NVFP4)",
    scenario: "OFFLINE",
    sourceType: "NVIDIA_MLPERF",
    sourceLabel: "NVIDIA MLPerf Inference v6.0",
    sourceUrl: "https://developer.nvidia.com/deep-learning-performance-training-inference/ai-inference",
    qualified: true,
    directBenchmark: true,
  }),
  "GB300 NVL72": Object.freeze({
    id: "gb300-nvl72-llama2-70b-mlperf-v6",
    hardwareClass: "GB300 NVL72",
    benchmarkGpuCount: 72,
    throughputTokPerSec: 1126850,
    referenceModel: "Llama 2 70B",
    precision: "FP4 (NVFP4)",
    scenario: "OFFLINE",
    sourceType: "NVIDIA_MLPERF",
    sourceLabel: "NVIDIA MLPerf Inference v6.0",
    sourceUrl: "https://developer.nvidia.com/deep-learning-performance-training-inference/ai-inference",
    qualified: true,
    directBenchmark: true,
  }),
});

export function getInferenceEconomicsEvidence(hardwareClass) {
  return INFERENCE_ECONOMICS_EVIDENCE[hardwareClass] || null;
}

/**
 * Builds the evidence object expected by calculateInferenceEconomics.
 *
 * We require the caller to state whether model, hardware, precision, and
 * scenario match the benchmark. This prevents the preview from silently
 * upgrading a hardware benchmark into a universal workload claim.
 */
export function qualifyInferenceEconomicsEvidence(
  record,
  {
    modelMatch = false,
    hardwareMatch = false,
    precisionMatch = false,
    workloadScenarioMatch = false,
    adjustmentFactor = 1,
    adjustmentBasis = null,
  } = {},
) {
  if (!record) return null;

  return {
    ...record,
    modelMatch: modelMatch === true,
    hardwareMatch: hardwareMatch === true,
    precisionMatch: precisionMatch === true,
    workloadScenarioMatch: workloadScenarioMatch === true,
    adjustmentFactor:
      Number.isFinite(Number(adjustmentFactor)) && Number(adjustmentFactor) > 0
        ? Number(adjustmentFactor)
        : 1,
    adjustmentBasis,
  };
}
