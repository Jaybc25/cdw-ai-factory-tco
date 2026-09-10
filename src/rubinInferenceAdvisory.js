// Rubin inference advisory policy.
//
// Rubin remains excluded from benchmark-qualified GPU-count recommendations until
// a qualifying absolute per-GPU inference-throughput anchor exists. However, a
// large verified Blackwell result should not imply Rubin is irrelevant.
//
// Phase 1 policy: when the benchmark-qualified Blackwell recommendation reaches
// rack scale (72+ deployed GPUs), surface Rubin as an architecture-evaluation
// advisory. Do not calculate or imply a Rubin GPU count, throughput, utilization,
// or cost-per-token from this advisory.

export const RUBIN_INFERENCE_ADVISORY_THRESHOLD_GPUS = 72;

export function getRubinInferenceAdvisory({ recommended, selectedClass, totalThroughputNeeded }) {
  if (!Number.isFinite(recommended) || recommended < RUBIN_INFERENCE_ADVISORY_THRESHOLD_GPUS) return null;

  return Object.freeze({
    eligible: true,
    confidence: "PROVISIONAL",
    title: "Rubin architecture evaluation recommended",
    verifiedBaselineClass: selectedClass || null,
    verifiedBaselineGpus: recommended,
    totalThroughputNeeded: Number.isFinite(totalThroughputNeeded) ? totalThroughputNeeded : null,
    architectures: Object.freeze(["DGX Rubin NVL8", "DGX Vera Rubin NVL72"]),
    exactRubinSizingAvailable: false,
    reason: "The benchmark-qualified Blackwell recommendation has reached rack-scale deployment. NVIDIA publishes strong Rubin inference efficiency and platform-performance claims, but no qualifying absolute per-GPU throughput anchor is available for this sizing methodology yet.",
    guidance: "Treat the Blackwell result as the verified sizing baseline and evaluate Rubin with CDW/NVIDIA solution engineering before committing to a large Blackwell deployment. Do not infer a Rubin GPU count from FLOPS, relative ratios, or tokens/MW claims.",
  });
}
