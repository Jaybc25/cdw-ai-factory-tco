import { getInferenceEconomicsEvidence } from "./inferenceEconomicsEvidence.js";

export const INFERENCE_SCALEOUT_CLASSIFICATION = Object.freeze({
  REPLICA_CAPACITY_SCALEOUT: "REPLICA_CAPACITY_SCALEOUT",
  TOPOLOGY_SCALEOUT_REQUIRED: "TOPOLOGY_SCALEOUT_REQUIRED",
  UNCLASSIFIED: "UNCLASSIFIED",
});

function positive(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function nonNegative(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * Classify why a larger inference fleet exists without mistaking aggregate
 * concurrency for per-instance topology requirements.
 *
 * The classification asks only whether ONE modeled serving instance can reside
 * within one qualified benchmark-sized GPU group:
 *   model weights + one modeled sequence + the existing runtime-overhead rate.
 *
 * Fleet-wide KV/cache demand and throughput demand remain GPU Sizing concerns
 * and may legitimately create multiple independent replica groups.
 */
export function classifyInferenceScaleout({
  hardwareClass,
  weightMemoryGB,
  sequenceMemoryGB,
  overheadPct,
}) {
  const evidence = getInferenceEconomicsEvidence(hardwareClass);
  const weights = positive(weightMemoryGB);
  const sequence = nonNegative(sequenceMemoryGB);
  const overhead = nonNegative(overheadPct);

  if (!evidence || !weights || sequence == null || overhead == null) {
    return {
      classification: INFERENCE_SCALEOUT_CLASSIFICATION.UNCLASSIFIED,
      benchmarkGpuCount: evidence?.benchmarkGpuCount || null,
      benchmarkGroupMemoryGB: evidence
        ? evidence.benchmarkGpuCount * evidence.memoryGBPerGpu
        : null,
      minimumServingInstanceMemoryGB: null,
      basis: "Scale-out classification requires qualified hardware evidence plus modeled weight, sequence-state, and runtime-overhead inputs.",
    };
  }

  const benchmarkGroupMemoryGB =
    evidence.benchmarkGpuCount * evidence.memoryGBPerGpu;
  const minimumServingInstanceMemoryGB =
    (weights + sequence) * (1 + overhead);

  const requiresTopology =
    minimumServingInstanceMemoryGB > benchmarkGroupMemoryGB;

  return {
    classification: requiresTopology
      ? INFERENCE_SCALEOUT_CLASSIFICATION.TOPOLOGY_SCALEOUT_REQUIRED
      : INFERENCE_SCALEOUT_CLASSIFICATION.REPLICA_CAPACITY_SCALEOUT,
    benchmarkGpuCount: evidence.benchmarkGpuCount,
    benchmarkGroupMemoryGB,
    minimumServingInstanceMemoryGB,
    basis: requiresTopology
      ? `One modeled serving instance requires ${minimumServingInstanceMemoryGB.toFixed(1)} GB, exceeding the ${benchmarkGroupMemoryGB.toFixed(1)} GB memory envelope of one ${evidence.benchmarkGpuCount}-GPU ${hardwareClass} benchmark-sized group.`
      : `One modeled serving instance requires ${minimumServingInstanceMemoryGB.toFixed(1)} GB within the ${benchmarkGroupMemoryGB.toFixed(1)} GB memory envelope of one ${evidence.benchmarkGpuCount}-GPU ${hardwareClass} benchmark-sized group; additional fleet GPUs may be treated as aggregate replica capacity when deployment-count guardrails also pass.`,
  };
}
