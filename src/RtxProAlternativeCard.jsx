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
    targetTokPerUser,
    avgInputTokens,
    avgOutputTokens,
  });
}

export function buildRtxProTcoHref(rtxAlt) {
  const evaluatedAlt = rebuildDistributedMemoryAlternative(rtxAlt);
  if (!evaluatedAlt?.eligible || evaluatedAlt.deployment?.servers !== 1 || !evaluatedAlt.benchmark) return null;
  const params = new URLSearchParams({
    gpuCount: String(evaluatedAlt.deployment.serverGpuCount),
    model: evaluatedAlt.benchmark.modelId,
    precision: evaluatedAlt.benchmark.precision,
    benchmarkId: evaluatedAlt.benchmark.id,
    source: "gpu-sizing",
  });
  return `/tco/rtx-pro?${params.toString()}`;
}

function CandidateDetails({ evaluatedAlt }) {
  return (
    <details className="mt-3 text-xs text-blue-900">
      <summary className="cursor-pointer font-semibold text-blue-800">Why validation is required</summary>
      <div className="mt-2 space-y-2 leading-relaxed">
        <p>{evaluatedAlt.reason}</p>
        <p><strong>Scale-up trade-off:</strong> RTX PRO 6000 does not provide NVLink/NVSwitch-style scale-up. It is strongest when the model fits on one GPU and capacity grows through independent serving replicas.</p>
      </div>
    </details>
  );
}

export default function RtxProAlternativeCard({ rtxAlt, compact = false, reportOnly = false, selectable = false, selected = false, onSelect = null }) {
  if (!rtxAlt) return null;

  const evaluatedAlt = rebuildDistributedMemoryAlternative(rtxAlt);
  const selectedClasses = selected ? "border-red-500 ring-2 ring-red-100" : "border-gray-200";
  const shell = compact
    ? `rounded-xl p-5 w-full border ${selectedClasses} bg-white text-left`
    : `mb-4 rounded-xl p-4 w-full border ${selectedClasses} bg-white text-left`;

  if (!evaluatedAlt.eligible) {
    const evidenceCandidate = evaluatedAlt.status === "EVIDENCE_REQUIRED" && evaluatedAlt.fitsOneGpu;
    return (
      <div className={shell} data-testid="rtx-lower-cost-candidate">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="text-xs font-bold uppercase tracking-wide text-gray-500">
            {evidenceCandidate ? "Potential lower-cost alternative" : "Lower-cost alternative evaluation"}
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 whitespace-nowrap">
            {evidenceCandidate ? "VALIDATION REQUIRED" : evaluatedAlt.status}
          </span>
        </div>
        <div className="text-lg font-bold mb-1" style={{ color: "#2D2D2D" }}>NVIDIA RTX PRO 6000</div>
        <div className="text-xs text-gray-600 leading-relaxed">
          {evidenceCandidate
            ? "The model fits RTX PRO memory, but the current evidence registry cannot yet prove a production GPU count for this workload."
            : "RTX PRO is not autonomously recommended for this workload under the current evidence and topology guardrails."}
        </div>
        {evidenceCandidate && !reportOnly && <CandidateDetails evaluatedAlt={evaluatedAlt} />}
      </div>
    );
  }

  const deployment = evaluatedAlt.deployment;
  const journeyEligible = deployment.servers === 1;
  const sourceLabel = evaluatedAlt.benchmark?.sourceType === "INDEPENDENT_MEASURED" ? "Measured serving evidence" : "Direct benchmark evidence";

  const content = (
    <>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Lower-cost alternative</div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 whitespace-nowrap">{sourceLabel}</span>
      </div>
      {selectable && !reportOnly && (
        <div className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{ color: selected ? "#CC0000" : "#707070" }}>
          {selected ? "Selected for TCO" : "Tap to select for TCO"}
        </div>
      )}
      <div className="text-3xl font-bold mb-1" style={{ color: "#2D2D2D" }}>
        {deployment.totalDeployedGpus} <span className="text-base font-normal">GPUs</span>
      </div>
      <div className="text-sm font-semibold" style={{ color: "#2D2D2D" }}>NVIDIA RTX PRO 6000</div>
      <div className="text-xs text-gray-500 mt-1">Right-sized private AI · independent serving replicas</div>
      <div className="text-[11px] text-gray-500 mt-3">No NVLink scale-up; best when the model fits on one GPU.</div>
      {!journeyEligible && <div className="text-[11px] font-semibold text-amber-800 mt-2">Multi-server RTX TCO requires engineering validation.</div>}
    </>
  );

  if (selectable && journeyEligible && !reportOnly) {
    return (
      <button type="button" className={shell} data-testid="rtx-lower-cost-qualified" aria-pressed={selected} onClick={onSelect}>
        {content}
      </button>
    );
  }

  return <div className={shell} data-testid="rtx-lower-cost-qualified">{content}</div>;
}