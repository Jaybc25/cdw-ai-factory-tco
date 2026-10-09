import React from "react";
import { loadSessionState } from "./sessionState.js";
import { getModelById, getModelParamsB } from "./modelRegistry.js";
import { getInferenceSequenceStateMemory } from "./modelSizingMethodology.js";
import { sizeRtxProInference } from "./rtxProGpuSizing.js";

const QUANT_BYTES = { FP16: 2, FP8: 1, FP4: 0.5 };

function rebuildDistributedMemoryAlternative(original) {
  if (!original || original.eligible || original.status !== "ENGINEERING_VALIDATION_REQUIRED") return original;

  const saved = loadSessionState("gpu-sizing");
  if (!saved || saved.mode !== "Inference") return original;

  const model = getModelById(saved.infModelId);
  const quantBytes = QUANT_BYTES[saved.quant];
  const concurrentUsers = Number(saved.concurrentUsers);
  const targetTokPerUser = Number(saved.targetTokPerUser);
  const avgInputTokens = Number(saved.avgInputTokens);
  const avgOutputTokens = Number(saved.avgOutputTokens);
  const kvBytesPerElement = Number(saved.kvBytesPerElement);
  const overheadPct = Number(saved.overheadPct);
  const paramsB = getModelParamsB(model, saved.customParamsB);

  if (!model || !Number.isFinite(paramsB) || !Number.isFinite(quantBytes) ||
      !(concurrentUsers > 0) || !(targetTokPerUser > 0) ||
      !(avgInputTokens >= 0) || !(avgOutputTokens >= 0) ||
      !(kvBytesPerElement > 0) || !(overheadPct >= 0)) {
    return original;
  }

  const sequenceState = getInferenceSequenceStateMemory(
    model,
    avgInputTokens + avgOutputTokens,
    kvBytesPerElement,
  );

  return sizeRtxProInference({
    modelId: model.id,
    precision: saved.quant,
    weightMemoryGB: paramsB * quantBytes,
    sequenceStateGBPerSequence: sequenceState.totalGBPerSequence,
    concurrentUsers,
    overheadPct,
    aggregateTokensPerSecond: concurrentUsers * targetTokPerUser,
    avgInputTokens,
    avgOutputTokens,
  });
}

export default function RtxProAlternativeCard({ rtxAlt }) {
  if (!rtxAlt) return null;

  // GPU Sizing's legacy aggregate-memory result remains authoritative for its
  // DGX/HGX recommendation. RTX PRO uses independent replicas, so sequence
  // state must be distributed across those GPUs instead of treated as if all
  // concurrent users live on one 96 GB GPU.
  const evaluatedAlt = rebuildDistributedMemoryAlternative(rtxAlt);

  if (!evaluatedAlt.eligible) {
    return (
      <div className="mb-4 rounded-xl p-4 border border-gray-200 bg-gray-50">
        <div className="text-xs font-bold uppercase tracking-wide text-gray-600 mb-1">Right-sized private AI · RTX PRO evaluation</div>
        <div className="text-xs font-semibold text-gray-700 mb-1">{evaluatedAlt.status}</div>
        <p className="text-xs text-gray-600">{evaluatedAlt.reason}</p>
      </div>
    );
  }

  const deployment = evaluatedAlt.deployment;
  const benchmark = evaluatedAlt.benchmark;
  const budget = evaluatedAlt.budget;
  const serverLabel = deployment.servers === 1 ? "server" : "servers";
  const budgetText = Number.isFinite(budget?.amount)
    ? `$${Math.round(budget.amount).toLocaleString("en-US")} configured server hardware · ${budget.confidence}`
    : "Configured system price requires quote / evidence validation";
  const tcoEligible = deployment.servers === 1;
  const tcoParams = new URLSearchParams({
    gpuCount: String(deployment.serverGpuCount),
    model: benchmark.modelId,
    precision: benchmark.precision,
    benchmarkId: benchmark.id,
    source: "gpu-sizing",
  });

  return (
    <div className="mb-4 rounded-xl p-4 bg-blue-50 border border-blue-200">
      <div className="flex items-center justify-between gap-3 mb-1">
        <div className="text-xs font-bold uppercase tracking-wide text-blue-800">Right-sized private AI · RTX PRO production alternative</div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">EVIDENCE-GATED</span>
      </div>
      <div className="text-lg font-bold text-blue-950 mb-1">
        {deployment.totalDeployedGpus} × NVIDIA RTX PRO 6000 Blackwell Server Edition
      </div>
      <p className="text-xs text-blue-900 mb-2">
        {evaluatedAlt.replicas} independent serving {evaluatedAlt.replicas === 1 ? "replica" : "replicas"} rounded to {deployment.servers} × {deployment.serverGpuCount}-GPU {serverLabel}. Model weights are replicated per GPU while concurrent sequence state is distributed across the serving replicas; this path does not require PCIe model splitting.
      </p>
      {evaluatedAlt.memoryBasis && (
        <div className="text-xs text-blue-900 mb-1"><strong>Per-GPU memory check:</strong> {evaluatedAlt.memoryBasis.totalMemoryGB.toFixed(1)} GB modeled on the busiest replica · {evaluatedAlt.memoryBasis.sequencesPerGpu} active sequences/GPU · {90} GB autonomous planning ceiling.</div>
      )}
      <div className="text-xs text-blue-900 mb-1"><strong>Direct benchmark:</strong> {benchmark.throughputTokPerSecPerGpu.toLocaleString()} tok/s/GPU · {benchmark.modelId} · {benchmark.precision} · {benchmark.inputTokens.toLocaleString()} input / {benchmark.outputTokens.toLocaleString()} output tokens.</div>
      <div className="text-xs text-blue-900 mb-1"><strong>Estimated peak utilization:</strong> {Math.round(evaluatedAlt.utilization * 100)}% of the deployed RTX replica capacity.</div>
      <div className="text-xs text-blue-900"><strong>Hardware budget status:</strong> {budgetText}. Support, NVIDIA software, shared infrastructure, storage, facilities, operations, and transition costs are not included here.</div>
      {tcoEligible ? (
        <a
          href={`/tco/rtx-pro?${tcoParams.toString()}`}
          className="inline-flex mt-3 text-xs font-semibold px-3 py-1.5 rounded-lg text-white"
          style={{ background: "#CC0000" }}
        >
          Continue to RTX PRO TCO
        </a>
      ) : (
        <div className="mt-3 text-xs font-semibold text-blue-900">Multi-server RTX TCO remains project-specific; v1 TCO activation is limited to one physical RTX PRO server.</div>
      )}
    </div>
  );
}
