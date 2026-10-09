import { getRtxProBenchmarkById } from "./rtxProGpuSizing.js";

function finitePositive(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function buildRtxProInferenceEconomicsHandoff({
  gpuCount,
  modelId,
  quant,
  horizonYears,
  onPremTcoUsd,
  benchmarkId,
}) {
  const benchmark = getRtxProBenchmarkById(benchmarkId);
  const count = finitePositive(gpuCount);
  const horizon = finitePositive(horizonYears);
  const tco = finitePositive(onPremTcoUsd);
  const blockers = [];

  if (!benchmark) blockers.push("RTX_BENCHMARK_NOT_FOUND");
  if (!count) blockers.push("INVALID_GPU_COUNT");
  if (!modelId) blockers.push("MISSING_MODEL");
  if (!quant) blockers.push("MISSING_PRECISION");
  if (!horizon) blockers.push("INVALID_HORIZON");
  if (!tco) blockers.push("INVALID_TCO");
  if (benchmark && modelId && benchmark.modelId !== modelId) blockers.push("RTX_BENCHMARK_MODEL_MISMATCH");
  if (benchmark && quant && benchmark.precision !== quant) blockers.push("RTX_BENCHMARK_PRECISION_MISMATCH");

  const params = new URLSearchParams();
  params.set("source", "tco");
  params.set("rtx", "1");
  params.set("hardware", "RTX PRO 6000");
  if (count) params.set("gpuCount", String(count));
  if (modelId) params.set("model", modelId);
  if (quant) params.set("quant", quant);
  if (horizon) params.set("horizon", String(horizon));
  if (tco) {
    params.set("fullTco", String(Math.round(tco)));
    params.set("tco", String(Math.round(tco)));
  }
  params.set("inferenceShare", "1");
  params.set("tcoAllocation", "DIRECT_INFERENCE_WORKLOAD");
  if (benchmark?.id) params.set("benchmarkId", benchmark.id);
  if (blockers.length) params.set("connectorBlockers", blockers.join(","));

  return {
    eligible: blockers.length === 0,
    blockers,
    hardwareClass: "RTX PRO 6000",
    gpuCount: count,
    benchmarkId: benchmark?.id || null,
    attributableTcoUsd: tco,
    fullTcoUsd: tco,
    horizonYears: horizon,
    inferenceShare: 1,
    allocationMethod: "DIRECT_INFERENCE_WORKLOAD",
    href: `/inference-economics?${params.toString()}`,
  };
}
