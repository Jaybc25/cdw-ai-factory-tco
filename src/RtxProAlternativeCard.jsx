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

function TradeoffNote({ candidate = false }) {
  return (
    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
      <strong>Scale-up trade-off:</strong> RTX PRO 6000 does not provide NVLink/NVSwitch-style scale-up. It is strongest when the model fits on one GPU and capacity grows through independent serving replicas. Larger future models or workloads that need tightly coupled multi-GPU memory/compute may favor DGX/HGX-class infrastructure instead{candidate ? ", so engineering validation is required before treating RTX PRO as the production choice for this workload" : ""}.
    </div>
  );
}

export default function RtxProAlternativeCard({ rtxAlt, compact = false }) {
  if (!rtxAlt) return null;

  // GPU Sizing's legacy aggregate-memory result remains authoritative for its
  // DGX/HGX recommendation. RTX PRO uses independent replicas, so sequence
  // state must be distributed across those GPUs instead of treated as if all
  // concurrent users live on one 96 GB GPU.
  const evaluatedAlt = rebuildDistributedMemoryAlternative(rtxAlt);
  const shell = compact
    ? "rounded-xl p-5 flex-1 min-w-[220px] border border-blue-200 bg-blue-50"
    : "mb-4 rounded-xl p-4 border border-blue-200 bg-blue-50";

  if (!evaluatedAlt.eligible) {
    const evidenceCandidate = evaluatedAlt.status === "EVIDENCE_REQUIRED" && evaluatedAlt.fitsOneGpu;
    return (
      <div className={shell} data-testid="rtx-lower-cost-candidate">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="text-xs font-bold uppercase tracking-wide text-blue-800">
            {evidenceCandidate ? "Potential lower-cost alternative" : "Lower-cost alternative evaluation"}
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900">
            {evidenceCandidate ? "VALIDATION REQUIRED" : evaluatedAlt.status}
          </span>
        </div>
        <div className="text-lg font-bold text-blue-950 mb-1">NVIDIA RTX PRO 6000 Blackwell Server Edition</div>
        {evidenceCandidate ? (
          <>
            <p className="text-xs text-blue-900 mb-2">
              The model fits the autonomous single-GPU memory gate, but there is not yet a direct admitted RTX PRO throughput benchmark for this exact model, precision, and context envelope. A production GPU count is therefore not inferred.
            </p>
            <p className="text-xs text-blue-900">
              <strong>Why consider it:</strong> RTX PRO may provide a lower-cost entry point than an 8-GPU DGX/HGX-class system when the workload can be served through independent replicas.
            </p>
            <TradeoffNote candidate />
          </>
        ) : (
          <>
            <p className="text-xs text-blue-900">{evaluatedAlt.reason}</p>
            <TradeoffNote candidate />
          </>
        )}
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
    <div className={shell} data-testid="rtx-lower-cost-qualified">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="text-xs font-bold uppercase tracking-wide text-blue-800">Lower-cost alternative · Right-sized private AI</div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">EVIDENCE-GATED</span>
      </div>
      <div className="text-lg font-bold text-blue-950 mb-1">
        {deployment.totalDeployedGpus} × NVIDIA RTX PRO 6000 Blackwell Server Edition
      </div>
      <p className="text-xs text-blue-900 mb-2">
        {evaluatedAlt.replicas} independent serving {evaluatedAlt.replicas === 1 ? "replica" : "replicas"} rounded to {deployment.servers} × {deployment.serverGpuCount}-GPU {serverLabel}. Model weights are replicated per GPU while concurrent sequence state is distributed across the serving replicas; this path does not require model splitting.
      </p>
      <p className="text-xs text-blue-900 mb-2">
        <strong>Why choose this:</strong> Lower initial infrastructure cost and a smaller production footprint when today's inference workload fits the RTX PRO evidence and memory boundaries.
      </p>
      {evaluatedAlt.memoryBasis && (
        <div className="text-xs text-blue-900 mb-1"><strong>Per-GPU memory check:</strong> {evaluatedAlt.memoryBasis.totalMemoryGB.toFixed(1)} GB modeled on the busiest replica · {evaluatedAlt.memoryBasis.sequencesPerGpu} active sequences/GPU · 90 GB autonomous planning ceiling.</div>
      )}
      <div className="text-xs text-blue-900 mb-1"><strong>Direct benchmark:</strong> {benchmark.throughputTokPerSecPerGpu.toLocaleString()} tok/s/GPU · {benchmark.modelId} · {benchmark.precision} · {benchmark.inputTokens.toLocaleString()} input / {benchmark.outputTokens.toLocaleString()} output tokens.</div>
      <div className="text-xs text-blue-900 mb-1"><strong>Estimated peak utilization:</strong> {Math.round(evaluatedAlt.utilization * 100)}% of deployed RTX replica capacity.</div>
      <div className="text-xs text-blue-900"><strong>Hardware budget status:</strong> {budgetText}. Support, NVIDIA software, shared infrastructure, storage, facilities, operations, and transition costs are not included here.</div>
      <TradeoffNote />
      {tcoEligible ? (
        <a
          href={`/tco/rtx-pro?${tcoParams.toString()}`}
          className="inline-flex mt-3 text-xs font-semibold px-3 py-1.5 rounded-lg text-white"
          style={{ background: "#CC0000" }}
        >
          Select RTX PRO for TCO
        </a>
      ) : (
        <div className="mt-3 text-xs font-semibold text-blue-900">Multi-server RTX TCO remains project-specific; autonomous TCO activation is limited to one physical RTX PRO server.</div>
      )}
    </div>
  );
}
