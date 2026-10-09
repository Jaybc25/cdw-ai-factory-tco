import {
  getInferencePrecisionScale,
  getInferenceThroughputScale,
  getResidencyParamsB,
} from "./modelSizingMethodology.js";
import {
  getInferenceEconomicsEvidence,
  qualifyInferenceEconomicsEvidence,
} from "./inferenceEconomicsEvidence.js";
import { getRtxProBenchmarkById } from "./rtxProGpuSizing.js";

function positiveNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function normalizedLabel(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

const WEIGHT_BYTES_BY_PRECISION = Object.freeze({ FP16: 2, FP8: 1, FP4: 0.5 });

/**
 * Shared throughput adapter for Inference Economics Preview.
 *
 * This deliberately consumes the same model- and precision-adjustment functions
 * used by GPU Sizing after M3. No independent precision table or model scaling
 * is maintained here.
 *
 * Exact benchmark counts remain the highest-confidence case. When the deployed
 * count is a whole multiple of the benchmark group and the selected model's
 * weights fit inside one benchmark-sized group, IE may aggregate independent
 * serving replicas. This is deliberately NOT a model-parallel scaling claim.
 *
 * RTX PRO is a separate evidence path: GPU Sizing admits a direct single-GPU
 * TensorRT-LLM benchmark for an exact model/precision/context envelope. IE may
 * scale that anchor only through independent replicas and only when the exact
 * internal benchmark id is carried through the handoff.
 */
export function deriveInferenceEconomicsThroughput({
  hardwareClass,
  deployedGpuCount,
  quant,
  model,
  customParamsB = null,
  benchmarkId = null,
}) {
  const count = positiveNumber(deployedGpuCount);
  if (!count) {
    return {
      ok: false,
      reason: "INVALID_INPUT",
      errors: ["deployedGpuCount must be > 0."],
    };
  }

  if (hardwareClass === "RTX PRO 6000") {
    const benchmark = getRtxProBenchmarkById(benchmarkId);
    if (!benchmark) {
      return {
        ok: false,
        reason: "INSUFFICIENT_EVIDENCE",
        errors: ["The inherited RTX PRO benchmark could not be resolved from the admitted GPU Sizing evidence registry."],
      };
    }
    if (benchmark.modelId !== model?.id) {
      return {
        ok: false,
        reason: "BENCHMARK_MODEL_MISMATCH",
        errors: [`RTX PRO benchmark ${benchmark.id} is qualified for ${benchmark.modelId}, not ${model?.id || "the selected model"}.`],
      };
    }
    if (benchmark.precision !== quant) {
      return {
        ok: false,
        reason: "UNSUPPORTED_PRECISION",
        errors: [`RTX PRO benchmark ${benchmark.id} is qualified at ${benchmark.precision}; ${quant} economics are suppressed.`],
      };
    }

    const record = {
      id: benchmark.id,
      hardwareClass: "RTX PRO 6000",
      benchmarkGpuCount: 1,
      memoryGBPerGpu: 96,
      throughputTokPerSec: benchmark.throughputTokPerSecPerGpu,
      referenceModel: model?.label || benchmark.modelId,
      precision: benchmark.precision,
      scenario: Number.isFinite(benchmark.maxContextTokens)
        ? `DIRECT_CONTEXT_UP_TO_${benchmark.maxContextTokens}`
        : `DIRECT_CONTEXT_${benchmark.inputTokens}_${benchmark.outputTokens}`,
      sourceType: benchmark.sourceType || "NVIDIA_TENSORRT_LLM",
      sourceLabel: benchmark.source,
      sourceUrl: benchmark.sourceUrl,
      qualified: true,
      directBenchmark: true,
    };
    const effectiveThroughputTokPerSec = benchmark.throughputTokPerSecPerGpu * count;
    const evidence = qualifyInferenceEconomicsEvidence(record, {
      modelMatch: true,
      hardwareMatch: true,
      precisionMatch: true,
      workloadScenarioMatch: false,
      adjustmentFactor: count,
      adjustmentBasis: count === 1
        ? `Exact direct single-GPU RTX PRO benchmark ${benchmark.id}; no deployment scaling is inferred.`
        : `Independent-replica scaling: ${count} RTX PRO GPUs × direct single-GPU benchmark ${benchmark.id}. This is not a model-parallel scaling claim.`,
    });

    return {
      ok: true,
      hardwareClass,
      deployedGpuCount: count,
      benchmarkGpuCount: 1,
      replicaGroupCount: count,
      deploymentEvidenceBasis: count === 1 ? "EXACT_BENCHMARK" : "REPLICA_SCALED",
      sourceThroughputTokPerSec: benchmark.throughputTokPerSecPerGpu,
      effectiveThroughputTokPerSec,
      economicsInput: {
        throughputTokPerSec: benchmark.throughputTokPerSecPerGpu,
        evidence,
      },
      modelScale: { factor: 1, basis: "Exact RTX PRO benchmark model match" },
      precisionScale: { factor: 1, basis: "Exact RTX PRO benchmark precision match", anchorPrecision: benchmark.precision },
      deploymentScale: count,
      deploymentMatch: count === 1,
      evidence,
      rtxBenchmark: benchmark,
    };
  }

  const record = getInferenceEconomicsEvidence(hardwareClass);
  if (!record) {
    return {
      ok: false,
      reason: "INSUFFICIENT_EVIDENCE",
      errors: [`No qualified inference benchmark is loaded for ${hardwareClass}.`],
    };
  }

  const benchmarkGpuCount = record.benchmarkGpuCount;
  const replicaGroupCount = count / benchmarkGpuCount;
  const exactDeployment = count === benchmarkGpuCount;
  const replicaScaledDeployment =
    count > benchmarkGpuCount &&
    Number.isInteger(replicaGroupCount);
  const deploymentEvidenceBasis = exactDeployment
    ? "EXACT_BENCHMARK"
    : replicaScaledDeployment
      ? "REPLICA_SCALED"
      : null;

  if (!exactDeployment && !replicaScaledDeployment) {
    return {
      ok: false,
      reason: "UNSUPPORTED_DEPLOYMENT_SCALING",
      errors: [
        `Inference economics can use the exact ${benchmarkGpuCount} × ${hardwareClass} benchmark or whole benchmark-sized replica groups. ${count} GPUs is not a whole multiple of the ${benchmarkGpuCount}-GPU benchmark group, so topology-dependent scaling is suppressed.`,
      ],
      hardwareClass,
      deployedGpuCount: count,
      benchmarkGpuCount,
    };
  }

  const residencyParamsB = getResidencyParamsB(model, customParamsB);
  const weightBytesPerParam = WEIGHT_BYTES_BY_PRECISION[quant];
  const aggregateMemoryGB =
    positiveNumber(record.memoryGBPerGpu) != null
      ? record.memoryGBPerGpu * benchmarkGpuCount
      : null;
  const weightMemoryGB =
    residencyParamsB && weightBytesPerParam
      ? residencyParamsB * weightBytesPerParam
      : null;

  if (weightMemoryGB != null && aggregateMemoryGB != null && weightMemoryGB > aggregateMemoryGB) {
    return {
      ok: false,
      reason: "MODEL_DOES_NOT_FIT_BENCHMARK_CONFIG",
      errors: [
        `${model?.label || model?.name || model?.id || "Selected model"} requires at least ${weightMemoryGB.toFixed(1)} GB for model weights at ${quant}, which exceeds the ${aggregateMemoryGB.toFixed(1)} GB aggregate HBM in one ${benchmarkGpuCount} × ${hardwareClass} benchmark-sized serving group. This deployment therefore requires topology/model-parallel scaling evidence rather than independent replica aggregation.`,
      ],
      hardwareClass,
      deployedGpuCount: count,
      benchmarkGpuCount,
      replicaGroupCount,
      deploymentEvidenceBasis,
      weightMemoryGB,
      aggregateMemoryGB,
      residencyBasis: "model-weights-only necessary-condition check",
    };
  }

  const modelScale = getInferenceThroughputScale(model, customParamsB);
  const precisionScale = getInferencePrecisionScale(hardwareClass, quant);

  if (!precisionScale.anchorPrecision) {
    const benchmarkPrecision = normalizedLabel(record.precision);
    const selectedPrecision = normalizedLabel(quant);
    if (!benchmarkPrecision.startsWith(selectedPrecision)) {
      return {
        ok: false,
        reason: "UNSUPPORTED_PRECISION",
        errors: [
          `${hardwareClass} currently has qualified inference evidence at ${record.precision}; ${quant} economics are suppressed until precision-specific evidence is loaded.`,
        ],
      };
    }
  }

  const deploymentScale = exactDeployment ? 1 : replicaGroupCount;
  const adjustmentFactor = modelScale.factor * precisionScale.factor * deploymentScale;
  const effectiveThroughputTokPerSec = record.throughputTokPerSec * adjustmentFactor;

  const modelLabel = model?.label || model?.name || model?.id || null;
  const modelMatch = normalizedLabel(modelLabel) === normalizedLabel(record.referenceModel);
  const precisionMatch = precisionScale.factor === 1 && normalizedLabel(quant) === normalizedLabel(precisionScale.anchorPrecision);
  const hardwareMatch = true;
  const deploymentMatch = exactDeployment;
  const workloadScenarioMatch = false;

  const evidence = qualifyInferenceEconomicsEvidence(record, {
    modelMatch,
    hardwareMatch,
    precisionMatch,
    workloadScenarioMatch,
    adjustmentFactor,
    adjustmentBasis: [
      `GPU Sizing model factor ${modelScale.factor.toFixed(4)}x: ${modelScale.basis}`,
      `GPU Sizing precision factor ${precisionScale.factor.toFixed(4)}x: ${precisionScale.basis}`,
      exactDeployment
        ? `Deployment count matches the ${benchmarkGpuCount}-GPU benchmark configuration; no deployment scaling is inferred.`
        : `Replica-scaled deployment: ${count} GPUs = ${replicaGroupCount} independent ${benchmarkGpuCount}-GPU benchmark-sized serving groups. Aggregate benchmark capacity is multiplied by ${replicaGroupCount.toFixed(4)}x; this is not a model-parallel scaling claim.`,
    ].join(" "),
  });

  return {
    ok: true,
    hardwareClass,
    deployedGpuCount: count,
    benchmarkGpuCount,
    replicaGroupCount,
    deploymentEvidenceBasis,
    sourceThroughputTokPerSec: record.throughputTokPerSec,
    effectiveThroughputTokPerSec,
    economicsInput: {
      throughputTokPerSec: record.throughputTokPerSec,
      evidence,
    },
    modelScale,
    precisionScale,
    deploymentScale,
    deploymentMatch,
    evidence,
  };
}
