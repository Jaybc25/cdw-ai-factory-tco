import {
  getInferencePrecisionScale,
  getInferenceThroughputScale,
} from "./modelSizingMethodology.js";
import {
  getInferenceEconomicsEvidence,
  qualifyInferenceEconomicsEvidence,
} from "./inferenceEconomicsEvidence.js";

function positiveNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function normalizedLabel(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Shared throughput adapter for Inference Economics Preview.
 *
 * This deliberately consumes the same model- and precision-adjustment functions
 * used by GPU Sizing after M3. No independent precision table or model scaling
 * is maintained here.
 *
 * Benchmark-system throughput is only used at the exact benchmark deployment
 * count. IE-4.1 deliberately blocks arbitrary count scaling because no default
 * cross-node/rack scaling efficiency is defensible enough for cost-per-token
 * economics. A later evidence-backed scaling model may relax this guardrail.
 */
export function deriveInferenceEconomicsThroughput({
  hardwareClass,
  deployedGpuCount,
  quant,
  model,
  customParamsB = null,
}) {
  const record = getInferenceEconomicsEvidence(hardwareClass);
  if (!record) {
    return {
      ok: false,
      reason: "INSUFFICIENT_EVIDENCE",
      errors: [`No qualified inference benchmark is loaded for ${hardwareClass}.`],
    };
  }

  const count = positiveNumber(deployedGpuCount);
  if (!count) {
    return {
      ok: false,
      reason: "INVALID_INPUT",
      errors: ["deployedGpuCount must be > 0."],
    };
  }

  if (count !== record.benchmarkGpuCount) {
    return {
      ok: false,
      reason: "UNSUPPORTED_DEPLOYMENT_SCALING",
      errors: [
        `Inference economics is currently limited to the source benchmark configuration: ${record.benchmarkGpuCount} × ${hardwareClass}. Scaling to ${count} GPUs is suppressed until qualified scaling-efficiency evidence is available.`,
      ],
      hardwareClass,
      deployedGpuCount: count,
      benchmarkGpuCount: record.benchmarkGpuCount,
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

  const deploymentScale = 1;

  const adjustmentFactor =
    modelScale.factor *
    precisionScale.factor;

  const effectiveThroughputTokPerSec =
    record.throughputTokPerSec * adjustmentFactor;

  const modelLabel = model?.label || model?.name || model?.id || null;
  const modelMatch =
    normalizedLabel(modelLabel) === normalizedLabel(record.referenceModel);
  const precisionMatch =
    precisionScale.factor === 1 &&
    normalizedLabel(quant) === normalizedLabel(precisionScale.anchorPrecision);
  const hardwareMatch = true;
  const deploymentMatch = count === record.benchmarkGpuCount;

  // The currently loaded benchmark records are Offline scenarios. Until a
  // scenario-specific serving benchmark/translation exists, this adapter does
  // not claim an interactive workload match.
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
`Deployment count matches the ${record.benchmarkGpuCount}-GPU benchmark configuration; no cross-node/rack scaling is inferred.`,
    ].join(" "),
  });

  return {
    ok: true,
    hardwareClass,
    deployedGpuCount: count,
    benchmarkGpuCount: record.benchmarkGpuCount,
    sourceThroughputTokPerSec: record.throughputTokPerSec,
    effectiveThroughputTokPerSec,
    // Safe direct input contract for calculateInferenceEconomics(): the engine
    // receives the unadjusted benchmark throughput and applies evidence.adjustmentFactor once.
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
