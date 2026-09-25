import React, { useState, useMemo, useEffect } from "react";
import { Cpu, Zap, TrendingDown, TrendingUp, Info, ChevronDown, X } from "lucide-react";
import cdwLogo from "./cdw-logo.png";
import { AuthProvider, useAuth, useAutosaveSnapshot } from "./AuthContext";
import AuthWidget from "./AuthWidget";
import { loadSessionState, saveSessionState } from "./sessionState.js";
import { ONPREM_PRICING_VERIFIED_AT, stalenessOf, fmtVerifiedDate } from "./pricingProvenance.js";
import { GPU_SIZING_PRICE_USD as GPU_PRICE_USD } from "./pricingRegistry.js";
import { GPU_SIZING_MODELS as MODELS, getDefaultModel, getModelById, getModelParamsB } from "./modelRegistry.js";
import { INFERENCE_SERVING_ANCHOR_SEMANTICS, getInferencePrecisionScale, getInferenceSequenceStateMemory, getInferenceServingDemand, getInferenceThroughputScale, getTrainingMemoryModel, getTrainingParameterSemantics } from "./modelSizingMethodology.js";
import { selectHigherGrowthConfiguration } from "./gpuSizingAlternatives.js";
import { selectDeployableRecommendation } from "./gpuSizingRecommendation.js";
import { getRubinInferenceAdvisory } from "./rubinInferenceAdvisory.js";
import { RUBIN_GPU_SIZING_SPECS, RUBIN_TRAINING_CANDIDATES } from "./rubinGpuSizingRegistry.js";
import { buildInferenceEconomicsGpuSizingHandoff } from "./inferenceEconomicsConnector.js";
import { classifyInferenceScaleout } from "./inferenceScaleoutClassification.js";

// ---------------------------------------------------------------------------
// Tooltip copy -- same rubric as the TCO tool: <=2 sentences core (3 with a
// default), what-it-is -> why/if-unsure, always resolves to an action.
// ---------------------------------------------------------------------------
const TIPS = {
  infModel: "The model you plan to run. This list defaults to current choices; enable existing-deployment models only when sizing something you already run. If you're not sure which current model fits, start in Model Advisor.",
  quant: "How compressed the model's weights are in memory. FP8 is the safe default for H200-class hardware and up; FP4 only applies to Blackwell-class GPUs (B200/GB200/B300/GB300) and roughly halves memory again.",
  concurrentUsers: "The maximum number of simultaneous active request streams during your busiest period. Include human users, AI agents, copilots, automations, and parallel sub-agents that may be generating model requests at the same time.",
  targetTokPerUser: "The desired output rate for each simultaneously active request, used to convert concurrency into aggregate token demand for capacity planning. The hardware anchors are MLPerf Offline throughput, so this input does not guarantee per-request streaming speed or validate TTFT/TPOT.",
  environment: "Whether this is a real production deployment or something lighter-weight. Dev/Test/POC unlocks a note about cheaper workstation-class GPUs, since production reliability requirements don't apply yet.",
  infGpuOverride: "Leave this on Auto-recommend to let the tool pick the most efficient class for your workload. Only override it if you already own a specific GPU class and want to see how it performs.",
  avgInputTokens: "The typical length of what a user sends in, in tokens (~4 characters per token). 2,000 is a reasonable default for a chat-style prompt with some context; raise it for document-heavy use cases.",
  avgOutputTokens: "The typical length of the model's response, in tokens. 500 covers a solid paragraph-to-page answer; lower it for short-form chat, raise it for long-form generation.",
  kvBytesPerElement: "Precision used for token-growing attention/KV cache state (separate from the model weights). 2 bytes (FP16) is the safe default; dropping to 1 (FP8) needs backend support, and source-defined recurrent/compression state may retain its own precision instead of following this control.",
  overheadPct: "A safety margin added on top of weights and KV cache for runtime/activation memory. 15% is a conservative default -- lower it only if you know your serving stack is unusually memory-efficient.",
  trainModel: "The model you're training or fine-tuning. This list defaults to current choices; enable existing-deployment models only when modeling an existing environment.",
  taskType: "Full fine-tune updates every weight and needs the most memory; LoRA/PEFT trains a small adapter and needs far less. If you're unsure which you need, LoRA is the cheaper starting point for most use cases.",
  precision: "The compute precision used during training. BF16 is the safe, widely-supported default; FP8 can accelerate supported training, but it does not automatically halve resident model/optimizer-state memory because higher-precision/master state commonly remains in memory.",
  datasetTokensB: "The size of your training dataset, in billions of tokens. If you're not sure, 10-50B tokens is a common range for a domain-specific fine-tune; pretraining runs are far larger (trillions).",
  targetDays: "How quickly the training run needs to finish. Shorter deadlines need more GPUs working in parallel -- if there's no hard deadline, a few weeks is a reasonable default to size against.",
  mfu: "Model FLOPs Utilization -- how much of a GPU's theoretical peak speed your training run actually achieves. 40% is a well-supported real-world default (Meta's Llama 3 paper reports 38-43% at scale).",
  workingDayHours: "How many hours a day this deployment actually sees business-hours load. Outside this window, demand is assumed to drop off -- capacity during those hours is either idle or available for other work.",
};

function TipDot({ tipKey }) {
  const [open, setOpen] = useState(false);
  const boxRef = React.useRef(null);

  React.useEffect(() => {
    if (!open) return;
    function handleOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    function handleKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", handleOutside, true);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("pointerdown", handleOutside, true);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  if (!TIPS[tipKey]) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="More info"
        className="inline-flex items-center justify-center w-4 h-4 rounded-full border text-[10px] font-bold leading-none ml-1.5 align-middle"
        style={{ borderColor: RED, color: RED }}
      >
        ?
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(45,45,45,0.35)" }}
        >
          <div
            ref={boxRef}
            className="w-full max-w-sm text-sm bg-white rounded-xl shadow-xl p-5"
            style={{ border: `1.5px solid ${RED}`, color: CHARCOAL }}
          >
            <div className="flex justify-between items-center gap-3 mb-3">
              <span className="text-xs font-bold uppercase tracking-wide" style={{ color: RED }}>About this field</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="flex items-center justify-center w-8 h-8 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 -mr-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>{TIPS[tipKey]}</div>
          </div>
        </div>
      )}
    </>
  );
}

// Inference candidates remain limited to classes with defensible absolute
// throughput anchors. Rubin must not enter this array until the evidence gate in
// rubinGpuSizingRegistry.js is deliberately cleared.
const GPU_SPECS = [
  { id: "H200", vram: 141, bf16: 989, fp8: 1979, anchor: 4373, anchorPrecision: "FP8", confidence: "LISTED", source: "MLCommons Inference v5.0, multiple official 8xH200 submissions cluster at ~34,700-34,988 tok/s / 8", nodeSize: 8 },
  { id: "B200", vram: 180, bf16: 2250, fp8: 4500, anchor: 13072, anchorPrecision: "FP4 (NVFP4)", confidence: "LISTED", source: "NVIDIA MLPerf Inference v6.0, Llama 2 70B Offline: 104,572 tok/s on 8x B200 / 8 = 13,071.5 tok/s/GPU", nodeSize: 8 },
  { id: "GB200 NVL72", vram: 186, bf16: 2250, fp8: 4500, anchor: 12334, anchorPrecision: "FP4 (NVFP4)", confidence: "LISTED", source: "NVIDIA MLPerf Inference v6.0, Llama 2 70B Offline: 888,054 tok/s on 72x GB200 / 72 = 12,334.1 tok/s/GPU", nodeSize: 72 },
  { id: "B300", vram: 288, bf16: 2250, fp8: 5500, anchor: 14119, anchorPrecision: "FP4 (NVFP4)", confidence: "LISTED", source: "NVIDIA MLPerf Inference v6.0, Llama 2 70B Offline: 112,954 tok/s on 8x B300 / 8 = 14,119.3 tok/s/GPU", nodeSize: 8 },
  { id: "GB300 NVL72", vram: 288, bf16: 2250, fp8: 5500, anchor: 15651, anchorPrecision: "FP4 (NVFP4)", confidence: "LISTED", source: "NVIDIA MLPerf Inference v6.0, Llama 2 70B Offline: 1,126,850 tok/s on 72x GB300 / 72 = 15,650.7 tok/s/GPU", nodeSize: 72 },
].filter((gpu) => GPU_PRICE_USD[gpu.id]);

// Training uses the same hardware capacity fields as inference for the
// pre-Rubin classes, but it must not inherit inference benchmark provenance.
// These labels describe the evidence basis for the BF16/FP8 peak-compute fields
// only; M1 intentionally does not change or re-calibrate any numeric TFLOPS value.
const TRAINING_GPU_SOURCE = Object.freeze({
  H200: "NVIDIA H200 Tensor Core GPU published specifications; peak BF16/FP8 Tensor Core throughput used for training sizing.",
  B200: "NVIDIA Blackwell / DGX B200 published specifications; peak BF16/FP8 Tensor Core throughput used for training sizing.",
  "GB200 NVL72": "NVIDIA GB200 NVL72 published specifications; peak BF16/FP8 Tensor Core throughput used for training sizing.",
  B300: "NVIDIA Blackwell Ultra / DGX B300 published specifications; peak BF16/FP8 Tensor Core throughput used for training sizing.",
  "GB300 NVL72": "NVIDIA GB300 NVL72 published specifications; peak BF16/FP8 Tensor Core throughput used for training sizing.",
});

const TRAINING_GPU_SPECS = [
  ...GPU_SPECS.map((gpu) => ({
    id: gpu.id,
    vram: gpu.vram,
    bf16: gpu.bf16,
    fp8: gpu.fp8,
    nodeSize: gpu.nodeSize,
    confidence: gpu.confidence,
    source: TRAINING_GPU_SOURCE[gpu.id],
  })),
  ...RUBIN_TRAINING_CANDIDATES.map((gpu) => ({
    id: gpu.id,
    vram: gpu.vramGB,
    bf16: gpu.bf16Tflops,
    fp8: gpu.fp8Tflops,
    nodeSize: gpu.nodeSize,
    confidence: gpu.technicalConfidence,
    source: gpu.technicalSource,
    rubin: true,
  })),
];

const RUBIN_INFERENCE_NAMES = RUBIN_GPU_SIZING_SPECS.map((gpu) => gpu.id).join(" and ");
const isRubinClass = (id) => RUBIN_GPU_SIZING_SPECS.some((gpu) => gpu.id === id);

const RUBIN_TRAINING_TCO_NOTICE = "Technical sizing uses NVIDIA-published memory and training FLOPS. Phase 1 TCO is available using transparent EST/PROVISIONAL planning assumptions; detailed fabric, liquid-cooling, rack, and facility engineering remains a quote/Phase 2 activity.";

function getHigherGrowthSubtitle(higherGrowth) {
  if (!higherGrowth?.class) return null;
  return higherGrowth.growthBasis === "next-deployment-quantum"
    ? "Same GPU class, next deployment quantum for additional headroom"
    : "Different deployable configuration with more total capacity for additional headroom";
}

function getHigherGrowthAuditText(higherGrowth, mode) {
  if (!higherGrowth?.class) return "none -- no valid node-rounded capacity step above the recommendation is available.";
  const capacityMetric = mode === "Inference" ? "throughput" : "training compute";
  return higherGrowth.growthBasis === "next-deployment-quantum"
    ? `${higherGrowth.class}, the same GPU class expanded to the next deployment quantum, increasing total deployed ${capacityMetric} capacity and headroom.`
    : `${higherGrowth.class}, a different deployable configuration whose node-rounded total ${capacityMetric} capacity exceeds the recommendation, providing additional headroom.`;
}

const QUANT_BYTES = { FP16: 2, FP8: 1, FP4: 0.5 };

const RTX_SPEC = {
  id: "RTX PRO 6000 Blackwell",
  vram: 96,
  anchor: 2095,
  anchorPrecision: "FP8",
  source: "EST, derived from memory-bandwidth ratio vs H100 -- no MLPerf datacenter submission exists for workstation-class GPUs; community vLLM benchmarks (CloudRift, Oct 2025) confirm the same bandwidth-bound scaling pattern on smaller models",
  maxWorkstationGPUs: 4,
  price: { amount: 8500, confidence: "LISTED", source: "StorageReview.com RTX PRO 6000 Workstation review, listed retail price" },
};

function ceilDiv(a, b) {
  return Math.ceil(a / b);
}

function validateInference(inputs) {
  const errors = [];
  const isCustom = inputs.model.id === "custom";
  if (isCustom) {
    if (!(inputs.customParamsB > 0)) errors.push("Custom model params (B) must be greater than 0.");
    if (!(inputs.customLayers > 0)) errors.push("Custom model layers must be greater than 0.");
    if (!(inputs.customKvHeads > 0)) errors.push("Custom model KV heads must be greater than 0.");
    if (!(inputs.customHeadDim > 0)) errors.push("Custom model head dim must be greater than 0.");
  }
  if (!(inputs.concurrentUsers > 0)) errors.push("Peak concurrent users must be greater than 0.");
  if (!(inputs.targetTokPerUser > 0)) errors.push("Desired output tokens/sec per active request must be greater than 0.");
  if (!(inputs.avgInputTokens >= 0)) errors.push("Avg input tokens can't be negative.");
  if (!(inputs.avgOutputTokens >= 0)) errors.push("Avg output tokens can't be negative.");
  if (inputs.avgInputTokens + inputs.avgOutputTokens <= 0) errors.push("Avg input + output tokens must add up to more than 0.");
  if (!(inputs.kvBytesPerElement > 0)) errors.push("Attention/KV cache precision (bytes/element) must be greater than 0.");
  if (!(inputs.overheadPct >= 0)) errors.push("Runtime/activation overhead % can't be negative.");
  if (inputs.overheadPct > 2) errors.push("Runtime/activation overhead % over 200% is almost certainly a typo -- check the value.");
  if (!(inputs.workingDayHours > 0) || inputs.workingDayHours > 24) errors.push("Length of working day must be between 0 and 24 hours.");
  return errors;
}

function validateTraining(inputs) {
  const errors = [];
  const isCustom = inputs.model.id === "custom";
  if (isCustom && !(inputs.customParamsB > 0)) errors.push("Custom model params (B) must be greater than 0.");
  if (!(inputs.datasetTokensB > 0)) errors.push("Dataset size (billions of tokens) must be greater than 0.");
  if (!(inputs.targetDays > 0)) errors.push("Target time to train (days) must be greater than 0.");
  if (!(inputs.mfu > 0)) errors.push("MFU must be greater than 0.");
  if (inputs.mfu > 1) errors.push("MFU over 1.0 (100%) isn't physically possible -- check the value.");
  return errors;
}

function computeInference(inputs) {
  const model = inputs.model.id === "custom"
    ? { id: "custom", totalParamsB: inputs.customParamsB, activeParamsB: inputs.customParamsB, architectureType: "dense", layers: inputs.customLayers, attentionType: "standard", kvHeads: inputs.customKvHeads, headDim: inputs.customHeadDim, status: "CUSTOM" }
    : inputs.model;

  const quantBytes = QUANT_BYTES[inputs.quant];
  const weightMemoryGB = model.totalParamsB * quantBytes;
  const avgTokens = inputs.avgInputTokens + inputs.avgOutputTokens;
  const sequenceStateMemory = getInferenceSequenceStateMemory(model, avgTokens, inputs.kvBytesPerElement);
  const kvBytesPerToken = avgTokens > 0 ? sequenceStateMemory.tokenGrowingBytes / avgTokens : 0;
  const kvCacheGBPerSeq = sequenceStateMemory.totalGBPerSequence;
  const kvCacheTotalGB = kvCacheGBPerSeq * inputs.concurrentUsers;
  const runtimeOverheadGB = (weightMemoryGB + kvCacheTotalGB) * inputs.overheadPct;
  const totalMemoryGB = weightMemoryGB + kvCacheTotalGB + runtimeOverheadGB;
  const servingDemand = getInferenceServingDemand(inputs.concurrentUsers, inputs.targetTokPerUser);
  const totalThroughputNeeded = servingDemand.aggregateTokensPerSecond;
  const throughputScale = getInferenceThroughputScale(model, inputs.customParamsB);

  const candidates = GPU_SPECS.map((gpu) => {
    const precisionScale = getInferencePrecisionScale(gpu.id, inputs.quant);
    const effectiveAnchor = gpu.anchor * throughputScale.factor * precisionScale.factor;
    const gpusMemExact = totalMemoryGB / gpu.vram;
    const gpusPerfExact = totalThroughputNeeded / effectiveAnchor;
    const gpusMem = Math.ceil(gpusMemExact);
    const gpusPerf = Math.ceil(gpusPerfExact);
    return { ...gpu, precisionScale, effectiveAnchor, gpusMem, gpusPerf, gpusWorkloadExact: Math.max(gpusMemExact, gpusPerfExact), gpusWorkload: Math.max(gpusMem, gpusPerf) };
  });

  function budgetFor(gpuId, deployedCount) {
    const price = GPU_PRICE_USD[gpuId];
    if (!price) return null;
    return { amount: deployedCount * price.amount, confidence: price.confidence, source: price.source };
  }

  const priced = candidates.map((c) => {
    const count = Math.ceil(c.gpusWorkload / c.nodeSize) * c.nodeSize;
    const b = budgetFor(c.id, count);
    return { ...c, deployedCount: count, deployedCost: b ? b.amount : null, technicalUtilization: Math.min(c.gpusWorkloadExact / count, 1) };
  });
  const autoRecommended = selectDeployableRecommendation(priced);
  const selected = inputs.gpuClassOverride === "Auto-recommend"
    ? autoRecommended
    : priced.find((c) => c.id === inputs.gpuClassOverride);
  const selectedPriced = priced.find((c) => c.id === selected.id);
  const nonRecommended = priced.filter((c) => c.id !== selected.id);

  const pricedOthers = nonRecommended.filter((c) => c.deployedCost != null);
  const cheapestOther = pricedOthers.length
    ? pricedOthers.reduce((best, c) => (c.deployedCost < best.deployedCost ? c : best))
    : null;
  const lowerCost = cheapestOther && selectedPriced.deployedCost != null && cheapestOther.deployedCost < selectedPriced.deployedCost
    ? cheapestOther : null;

  const higherGrowth = selectHigherGrowthConfiguration(selectedPriced, priced, "effectiveAnchor");

  const confidence =
    model.status !== "VERIFIED"
      ? { level: "LOW", note: "Model architecture not yet verified (custom entry); hardware reference anchors are not treated as model-specific throughput." }
      : { level: "MEDIUM", note: `${throughputScale.basis} ${selected.precisionScale.basis} ${INFERENCE_SERVING_ANCHOR_SEMANTICS.basis} GPU anchors remain hardware benchmark references rather than universal model-specific throughput.` };

  const rtxEffectiveAnchor = RTX_SPEC.anchor * throughputScale.factor;
  const rtxGpusMem = ceilDiv(totalMemoryGB, RTX_SPEC.vram);
  const rtxGpusPerf = ceilDiv(totalThroughputNeeded, rtxEffectiveAnchor);
  const rtxWorkload = Math.max(rtxGpusMem, rtxGpusPerf);
  const rtxEligible = inputs.environment === "Dev/Test/POC" && rtxWorkload <= RTX_SPEC.maxWorkstationGPUs;
  const rtxAlt = {
    eligible: rtxEligible,
    class: RTX_SPEC.id,
    gpus: rtxWorkload,
    vram: RTX_SPEC.vram,
    overCap: rtxWorkload > RTX_SPEC.maxWorkstationGPUs,
  };

  const recommendedCount = selectedPriced.deployedCount;
  const lowerCostCount = lowerCost ? lowerCost.deployedCount : null;
  const higherGrowthCount = higherGrowth ? higherGrowth.deployedCount : null;
  const budget = {
    recommended: budgetFor(selected.id, recommendedCount),
    lowerCost: lowerCost ? budgetFor(lowerCost.id, lowerCostCount) : null,
    higherGrowth: higherGrowth ? budgetFor(higherGrowth.id, higherGrowthCount) : null,
  };

  function utilizationFor(effectiveAnchor, deployedCount) {
    const capacity = deployedCount * effectiveAnchor;
    return capacity > 0 ? Math.min(totalThroughputNeeded / capacity, 1) : 0;
  }
  const utilization = {
    recommended: utilizationFor(selected.effectiveAnchor, recommendedCount),
    lowerCost: lowerCost ? utilizationFor(lowerCost.effectiveAnchor, lowerCostCount) : null,
    higherGrowth: higherGrowth ? utilizationFor(higherGrowth.effectiveAnchor, higherGrowthCount) : null,
  };
  const workingDayHours = inputs.workingDayHours;
  const afterHours = 24 - workingDayHours;
  const idleGpuHoursAfterHours = recommendedCount * afterHours;
  const headroomGpuHoursDuringDay = recommendedCount * (1 - utilization.recommended) * workingDayHours;
  const rubinAdvisory = getRubinInferenceAdvisory({
    recommended: recommendedCount,
    selectedClass: selected.id,
    totalThroughputNeeded,
  });

  return {
    totalMemoryGB,
    totalThroughputNeeded,
    servingDemand,
    candidates,
    selectedClass: selected.id,
    selectedNodeSize: selected.nodeSize,
    minTechnical: selected.gpusWorkload,
    recommended: recommendedCount,
    lowerCost: lowerCost ? { class: lowerCost.id, workload: lowerCost.gpusWorkload, recommended: lowerCostCount } : { class: null, workload: null, recommended: null },
    higherGrowth: higherGrowth ? { class: higherGrowth.id, workload: higherGrowth.gpusWorkload, recommended: higherGrowthCount, growthBasis: higherGrowth.growthBasis } : { class: null, workload: null, recommended: null, growthBasis: null },
    confidence,
    rtxAlt,
    budget,
    utilization,
    rubinAdvisory,
    workingDayHours,
    afterHours,
    idleGpuHoursAfterHours,
    headroomGpuHoursDuringDay,
    throughputScale,
    model, quantBytes, weightMemoryGB, sequenceStateMemory, kvBytesPerToken, kvCacheGBPerSeq, kvCacheTotalGB, runtimeOverheadGB,
  };
}

function computeTraining(inputs) {
  const model = inputs.model.id === "custom"
    ? { id: "custom", totalParamsB: inputs.customParamsB, activeParamsB: inputs.customParamsB, architectureType: "dense", status: "CUSTOM" }
    : inputs.model;

  const trainingSemantics = getTrainingParameterSemantics(model, inputs.customParamsB);
  const memoryModel = getTrainingMemoryModel(inputs.taskType, inputs.precision, inputs.memMultiplierOverride);
  const trainingMemoryGB = trainingSemantics.residencyParamsB * memoryModel.bytesPerParam;
  const flopsRequired = 6 * trainingSemantics.activeComputeParamsB * inputs.datasetTokensB * 1e18;
  const secondsTarget = inputs.targetDays * 86400;

  const candidates = TRAINING_GPU_SPECS.map((gpu) => {
    const peakTFLOPS = inputs.precision === "FP8" ? (gpu.fp8 ?? gpu.bf16) : gpu.bf16;
    const gpusFitExact = trainingMemoryGB / gpu.vram;
    const gpusFit = Math.ceil(gpusFitExact);
    const achievableFlopsPerSec = peakTFLOPS * 1e12 * inputs.mfu;
    const gpusTimeExact = flopsRequired / (achievableFlopsPerSec * secondsTarget);
    const gpusTime = Math.ceil(gpusTimeExact);
    return { ...gpu, peakTFLOPS, gpusFit, gpusTime, gpusWorkloadExact: Math.max(gpusFitExact, gpusTimeExact), gpusWorkload: Math.max(gpusFit, gpusTime) };
  });

  function budgetFor(gpuId, deployedCount) {
    const price = GPU_PRICE_USD[gpuId];
    if (!price) return null;
    return { amount: deployedCount * price.amount, confidence: price.confidence, source: price.source };
  }

  const priced = candidates.map((c) => {
    const count = Math.ceil(c.gpusWorkload / c.nodeSize) * c.nodeSize;
    const b = budgetFor(c.id, count);
    return { ...c, deployedCount: count, deployedCost: b ? b.amount : null, technicalUtilization: Math.min(c.gpusWorkloadExact / count, 1) };
  });
  const autoRecommended = selectDeployableRecommendation(priced);
  const selected = inputs.gpuClassOverride === "Auto-recommend"
    ? autoRecommended
    : priced.find((c) => c.id === inputs.gpuClassOverride);
  const selectedPriced = priced.find((c) => c.id === selected.id);
  const nonRecommended = priced.filter((c) => c.id !== selected.id);

  const pricedOthers = nonRecommended.filter((c) => c.deployedCost != null);
  const cheapestOther = pricedOthers.length
    ? pricedOthers.reduce((best, c) => (c.deployedCost < best.deployedCost ? c : best))
    : null;
  const lowerCost = cheapestOther && selectedPriced.deployedCost != null && cheapestOther.deployedCost < selectedPriced.deployedCost
    ? cheapestOther : null;

  const higherGrowth = selectHigherGrowthConfiguration(selectedPriced, priced, "peakTFLOPS");

  const confidence =
    model.status !== "VERIFIED"
      ? { level: "LOW", note: "Model architecture not yet verified (custom entry)" }
      : { level: "MEDIUM", note: `${trainingSemantics.basis} GPU FLOPs use NVIDIA published spec-sheet values; MFU remains an explicit user-adjustable assumption. Rubin specifications remain preliminary where NVIDIA labels them preliminary.` };

  const recommendedCount = selectedPriced.deployedCount;
  const lowerCostCount = lowerCost ? lowerCost.deployedCount : null;
  const higherGrowthCount = higherGrowth ? higherGrowth.deployedCount : null;
  const budget = {
    recommended: budgetFor(selected.id, recommendedCount),
    lowerCost: lowerCost ? budgetFor(lowerCost.id, lowerCostCount) : null,
    higherGrowth: higherGrowth ? budgetFor(higherGrowth.id, higherGrowthCount) : null,
  };

  return {
    trainingMemoryGB,
    flopsRequired,
    candidates,
    selectedClass: selected.id,
    selectedNodeSize: selected.nodeSize,
    minTechnical: selected.gpusWorkload,
    recommended: recommendedCount,
    lowerCost: lowerCost ? { class: lowerCost.id, workload: lowerCost.gpusWorkload, recommended: lowerCostCount } : { class: null, workload: null, recommended: null },
    higherGrowth: higherGrowth ? { class: higherGrowth.id, workload: higherGrowth.gpusWorkload, recommended: higherGrowthCount, growthBasis: higherGrowth.growthBasis } : { class: null, workload: null, recommended: null, growthBasis: null },
    confidence,
    budget,
    trainingSemantics,
    model, precisionBytes: memoryModel.precisionBytes, multiplier: memoryModel.multiplier, memoryModel, secondsTarget,
  };
}

const RED = "#CC0000";
const CHARCOAL = "#2D2D2D";

function Field({ label, hint, tipKey, children }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-semibold mb-1" style={{ color: CHARCOAL }}>
        {label}
        {tipKey && <TipDot tipKey={tipKey} />}
        <div className="mt-1 font-normal">{children}</div>
      </label>
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}

function Select({ value, onChange, options }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none border border-gray-300 rounded-lg px-3 py-2 pr-9 text-sm bg-white focus:outline-none focus:ring-2"
        style={{ "--tw-ring-color": RED }}
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
      <ChevronDown className="w-4 h-4 absolute right-3 top-2.5 text-gray-400 pointer-events-none" />
    </div>
  );
}

function NumberInput({ value, onChange, min = 0, step = 1, ariaLabel }) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      step={step}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
      style={{ "--tw-ring-color": RED }}
      aria-label={ariaLabel}
    />
  );
}

const SAMPLE_RESPONSE =
  "Sure, here's a quick summary. Cloud compute spend rose eight percent quarter over quarter, while storage stayed roughly flat. The biggest driver was GPU instance hours during the fine-tuning sprint in March. Moving that workload on-prem could meaningfully reduce recurring costs over the next three years, especially as usage keeps growing.";

function SampleOutputPreview({ tokPerSec }) {
  const words = useMemo(() => SAMPLE_RESPONSE.split(" "), []);
  const [count, setCount] = useState(0);
  const rate = tokPerSec > 0 ? tokPerSec : 0;

  React.useEffect(() => {
    setCount(0);
  }, [rate]);

  React.useEffect(() => {
    if (!(rate > 0)) return;
    const atEnd = count >= words.length;
    const msPerWord = Math.max(1000 / rate, 16);
    const delay = atEnd ? 1400 : msPerWord;
    const id = setTimeout(() => {
      setCount((c) => (c >= words.length ? 0 : c + 1));
    }, delay);
    return () => clearTimeout(id);
  }, [count, rate, words.length]);

  const atEnd = count >= words.length;

  return (
    <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
      <style>{`@keyframes sopBlink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }`}</style>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Desired output-rate preview</span>
        <span className="text-xs font-semibold" style={{ color: RED }}>
          {rate > 0 ? `at ${rate} tok/s` : "set a rate above"}
        </span>
      </div>
      <div className="text-sm leading-relaxed" style={{ color: CHARCOAL }}>
        {words.map((w, i) => (
          <React.Fragment key={i}>
            <span style={{ visibility: i < count ? "visible" : "hidden" }}>{w}</span>
            {i === count - 1 && rate > 0 && !atEnd && (
              <span
                className="inline-block w-[3px] h-4 ml-0.5 align-middle"
                style={{ background: RED, animation: "sopBlink 1s step-start infinite" }}
              />
            )}
            {i < words.length - 1 ? " " : null}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function ConfidenceBadge({ level }) {
  const colors = {
    HIGH: "bg-green-100 text-green-800 border-green-300",
    "MEDIUM-HIGH": "bg-green-50 text-green-700 border-green-200",
    MEDIUM: "bg-amber-100 text-amber-800 border-amber-300",
    LOW: "bg-red-100 text-red-800 border-red-300",
  };
  return (
    <span className={`inline-block text-xs font-bold px-2 py-1 rounded border ${colors[level] || colors.MEDIUM}`}>
      {level} CONFIDENCE
    </span>
  );
}

function ResultCard({ icon: Icon, title, gpuClass, gpus, subtitle, accent, emptyMessage, selectable = false, selected = false, onSelect }) {
  if (gpuClass == null) {
    return (
      <div
        className="rounded-xl p-5 flex-1 min-w-[220px]"
        style={{ background: accent ? CHARCOAL : "#F7F7F7", color: accent ? "white" : CHARCOAL }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Icon className="w-4 h-4" style={{ color: RED }} />
          <span className="text-xs font-bold uppercase tracking-wide" style={{ opacity: 0.8 }}>{title}</span>
        </div>
        <div className="text-sm" style={{ opacity: 0.7 }}>{emptyMessage || `No qualifying ${title.toLowerCase()} in the current supported catalog.`}</div>
      </div>
    );
  }
  const cardStyle = {
    background: accent ? CHARCOAL : "#F7F7F7",
    color: accent ? "white" : CHARCOAL,
    border: selectable ? `2px solid ${selected ? RED : "transparent"}` : undefined,
    boxShadow: selectable && selected ? "0 0 0 2px rgba(204,0,0,0.14)" : undefined,
    cursor: selectable ? "pointer" : undefined,
  };
  const content = (
    <>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4" style={{ color: RED }} />
        <span className="text-xs font-bold uppercase tracking-wide" style={{ opacity: 0.8 }}>{title}</span>
      </div>
      {selectable && (
        <div className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{ color: selected ? RED : (accent ? "#D1D5DB" : "#707070") }}>
          {selected ? "Selected for TCO" : "Tap to select for TCO"}
        </div>
      )}
      <div className="text-3xl font-bold mb-1">{gpus} <span className="text-base font-normal">{Number(gpus) === 1 ? "GPU" : "GPUs"}</span></div>
      <div className="text-sm font-semibold" style={{ color: accent ? "white" : CHARCOAL }}>{gpuClass}</div>
      {subtitle && <div className="text-xs mt-1" style={{ opacity: 0.7 }}>{subtitle}</div>}
    </>
  );
  if (selectable) {
    return (
      <button type="button" onClick={onSelect} aria-pressed={selected} className="rounded-xl p-5 flex-1 min-w-[220px] text-left" style={cardStyle}>
        {content}
      </button>
    );
  }
  return <div className="rounded-xl p-5 flex-1 min-w-[220px]" style={cardStyle}>{content}</div>;
}

function fmtUsd(n) {
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${Math.round(n / 1000)}K`;
}

function BudgetPanel({ budget }) {
  if (!budget?.recommended) return null;
  const legacyClass = budget.recommended.confidence === "EST";
  const onpremBudgetStaleness = stalenessOf(ONPREM_PRICING_VERIFIED_AT);
  return (
    <div className="mb-6 rounded-xl p-4 border border-gray-200 bg-gray-50">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Loaded system budget</span>
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-200 text-gray-600">{budget.recommended.confidence}</span>
      </div>
      <div className="text-2xl font-bold mb-1" style={{ color: CHARCOAL }}>
        {fmtUsd(budget.recommended.amount)}
      </div>
      <p className="text-xs text-gray-500">
        {legacyClass
          ? "Rough estimate only -- this class isn't part of CDW's current DGX purchase line, so there's no matching TCO Calculator figure to anchor to."
          : "Same pricing basis as the Cloud vs On-Prem TCO Calculator (system + software suite + fabrics + professional services)."}{" "}
        Excludes shared cluster infrastructure, workload storage, racks/facility costs, ongoing operations, and migration/transition costs -- not a quote. See the
        TCO Calculator for full lifecycle cost, or confirm with a CDW AI Factory specialist.
      </p>
      <p className="text-xs" style={{ color: onpremBudgetStaleness.level === "stale" ? "#B91C1C" : onpremBudgetStaleness.level === "review" ? "#B45309" : "#6B7280", marginTop: 4 }}>
        Pricing basis last verified {fmtVerifiedDate(ONPREM_PRICING_VERIFIED_AT)} ({onpremBudgetStaleness.days} days ago){onpremBudgetStaleness.level === "stale" ? " -- refresh before client use" : onpremBudgetStaleness.level === "review" ? " -- review due soon" : "."}
      </p>
    </div>
  );
}

function UtilizationBar({ label, gpuClass, pct }) {
  if (gpuClass == null || pct == null) return null;
  const pctDisplay = Math.round(pct * 100);
  const color = pct > 0.85 ? "#B00000" : pct > 0.5 ? RED : "#707070";
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs mb-1">
        <span className="font-semibold" style={{ color: CHARCOAL }}>{label} <span className="font-normal text-gray-500">({gpuClass})</span></span>
        <span className="font-bold" style={{ color }}>{pctDisplay}%</span>
      </div>
      <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${Math.max(pctDisplay, 2)}%`, background: color }} />
      </div>
    </div>
  );
}

function DayCurve({ workingDayHours, utilizationPct }) {
  const hours = Array.from({ length: 24 }, (_, h) => h);
  const startHour = Math.max(0, Math.round(12 - workingDayHours / 2));
  const endHour = Math.min(24, startHour + workingDayHours);
  return (
    <svg viewBox="0 0 240 60" className="w-full h-14" preserveAspectRatio="none">
      {hours.map((h) => {
        const isBusinessHour = h >= startHour && h < endHour;
        const heightPct = isBusinessHour ? Math.max(utilizationPct, 0.04) : 0.03;
        const barHeight = heightPct * 52;
        const x = h * (240 / 24);
        return (
          <rect
            key={h}
            x={x + 0.5}
            y={56 - barHeight}
            width={240 / 24 - 1}
            height={barHeight}
            fill={isBusinessHour ? RED : "#D9D9D9"}
            rx={1}
          />
        );
      })}
      <line x1="0" y1="56" x2="240" y2="56" stroke="#E5E5E5" strokeWidth="1" />
    </svg>
  );
}

function UtilizationPanel({ result, workingDayHours, onWorkingDayHoursChange }) {
  const [workingDayHoursDraft, setWorkingDayHoursDraft] = useState(String(workingDayHours));
  useEffect(() => {
    setWorkingDayHoursDraft(String(workingDayHours));
  }, [workingDayHours]);

  const handleWorkingDayHoursChange = (raw) => {
    setWorkingDayHoursDraft(raw);
    if (raw.trim() === "") return;
    const next = Number(raw);
    if (Number.isFinite(next) && next > 0 && next <= 24) {
      onWorkingDayHoursChange(next);
    }
  };

  const handleWorkingDayHoursBlur = () => {
    const next = Number(workingDayHoursDraft);
    if (workingDayHoursDraft.trim() === "" || !Number.isFinite(next) || next <= 0 || next > 24) {
      setWorkingDayHoursDraft(String(workingDayHours));
    }
  };

  const u = result.utilization;
  if (!u) return null;
  return (
    <div className="mb-6 rounded-xl p-4 border border-gray-200">
      <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-3">Utilization</div>
      <UtilizationBar label="Recommended" gpuClass={result.selectedClass} pct={u.recommended} />
      <UtilizationBar label="Lower-cost alt" gpuClass={result.lowerCost.class} pct={u.lowerCost} />
      <UtilizationBar label="Higher-growth alt" gpuClass={result.higherGrowth.class} pct={u.higherGrowth} />
      <p className="text-xs text-gray-500 mt-2 mb-4">
        Same estimated workload, different deployable configurations -- a lower utilization % in the higher-growth option isn't
        waste, it's headroom bought on purpose. Higher-growth means more node-rounded deployed capacity, not necessarily a newer or faster GPU class; it may be the next deployment quantum of the same class.
      </p>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold" style={{ color: CHARCOAL }}>Length of working day</span>
        <div className="flex items-center gap-1">
          <input
            type="number"
            inputMode="numeric"
            value={workingDayHoursDraft}
            min={1}
            max={24}
            step={1}
            onChange={(e) => handleWorkingDayHoursChange(e.target.value)}
            onBlur={handleWorkingDayHoursBlur}
            className="w-14 border border-gray-300 rounded px-1.5 py-1 text-xs text-right"
            aria-label="Length of working day, hours per day"
          />
          <span className="text-xs text-gray-500">hrs/day</span>
          <TipDot tipKey="workingDayHours" />
        </div>
      </div>
      <DayCurve workingDayHours={result.workingDayHours} utilizationPct={u.recommended} />
      <p className="text-xs text-gray-500 mt-2">
        Red = business hours at ~{Math.round(u.recommended * 100)}% utilization. Gray = after-hours, effectively
        idle. At the recommended config that's <strong>{result.idleGpuHoursAfterHours.toFixed(0)} GPU-hours/day</strong>{" "}
        of after-hours capacity, plus <strong>{result.headroomGpuHoursDuringDay.toFixed(0)} GPU-hours/day</strong> of
        within-hours headroom -- time that could run batch jobs, accelerate other workloads, or be resold.
      </p>
    </div>
  );
}

const TCO_OWN_SYS_FOR_CLASS = {
  H200: "DGX H200",
  B200: "DGX B200",
  "GB200 NVL72": "DGX GB200 NVL-72",
  B300: "DGX B300",
  "GB300 NVL72": "DGX GB300 NVL-72",
  "Rubin NVL8": "DGX Rubin NVL8",
  "Vera Rubin NVL72": "DGX Vera Rubin NVL72",
};

function TcoHandoff({ selectedClass, recommended, gpuDemandCount, sizingBasis = "recommended", mode, workingDayHours, concurrentUsers, targetTokPerUser, model, modelParamsB, quant, scaleoutClassification }) {
  const ownSys = TCO_OWN_SYS_FOR_CLASS[selectedClass];
  if (!ownSys) {
    return (
      <div className="mb-6 rounded-xl p-4 border border-amber-200 bg-amber-50">
        <div className="text-xs font-bold uppercase tracking-wide text-amber-800 mb-1">TCO modeling not yet activated</div>
        <div className="text-xs text-amber-900">
          {selectedClass} technical sizing is available, but loaded TCO economics remain gated until Rubin-specific fabric, cooling/infrastructure, and professional-services assumptions are defensible. No substitute system or estimated TCO is used.
        </div>
      </div>
    );
  }
  const params = new URLSearchParams({ ownSys, gpuCount: String(recommended), sourceClass: selectedClass, sizingBasis, gpuSizingMode: mode });
  if (Number.isFinite(Number(gpuDemandCount)) && Number(gpuDemandCount) > 0) params.set("gpuDemandCount", String(gpuDemandCount));
  if (model?.id) params.set("model", model.id);
  if (Number.isFinite(Number(modelParamsB)) && Number(modelParamsB) > 0) params.set("modelParamsB", String(modelParamsB));
  if (mode === "Inference" && quant) params.set("quant", quant);
  if (mode === "Inference" && workingDayHours) params.set("workingDayHours", String(workingDayHours));
  if (mode === "Inference" && Number.isFinite(Number(concurrentUsers)) && Number(concurrentUsers) > 0) params.set("concurrentUsers", String(concurrentUsers));
  if (mode === "Inference" && Number.isFinite(Number(targetTokPerUser)) && Number(targetTokPerUser) > 0) params.set("targetTokPerUser", String(targetTokPerUser));
  if (mode === "Inference" && scaleoutClassification?.classification) params.set("scaleoutClass", scaleoutClassification.classification);
  const href = `/tco?${params.toString()}`;
  const inferenceHandoff = mode === "Inference"
    ? buildInferenceEconomicsGpuSizingHandoff({
        hardwareClass: selectedClass,
        gpuCount: recommended,
        modelId: model?.id,
        modelParamsB,
        quant,
        workingDayHours,
        scaleoutClassification: scaleoutClassification?.classification,
      })
    : null;

  return (
    <div className="mb-6 rounded-xl p-4 border border-gray-200 bg-gray-50">
      <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">Recommended next step · Compare total cost</div>
      <div className="text-xs text-gray-500 mb-3">
        Take this {sizingBasis === "higher-growth" ? "user-selected higher-growth" : "recommended"} GPU configuration into TCO to compare ownership with cloud and add the shared infrastructure, storage, facility/operations, and transition costs needed for the full deployment lifecycle.
      </div>
      <a
        href={href}
        className="inline-flex text-xs font-semibold px-3 py-1.5 rounded-lg text-white"
        style={{ background: RED }}
      >
        Compare TCO
      </a>

      {inferenceHandoff?.eligible ? (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <div className="text-xs font-bold text-gray-700 mb-1">Already know your private AI cost?</div>
          <div className="text-xs text-gray-500 mb-2">
            Skip TCO and carry this model, hardware, precision, and serving schedule directly into Inference Economics. You will still need to enter or confirm the private cost assigned to this workload.
          </div>
          <a
            href={inferenceHandoff.href}
            className="inline-flex text-xs font-semibold px-3 py-1.5 rounded-lg border bg-white"
            style={{ borderColor: RED, color: RED }}
          >
            Compare inference economics
          </a>
        </div>
      ) : null}
    </div>
  );
}

function getIncomingParams() {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search);
}

function getInitialMode() {
  const params = getIncomingParams();
  const raw = params?.get("mode");
  return raw === "Training" || raw === "Inference" ? raw : "Inference";
}

function getInitialSourceUseCase() {
  const params = getIncomingParams();
  return params?.get("sourceUseCase") || null;
}

function getInitialWorkloadType() {
  const params = getIncomingParams();
  return params?.get("workloadType") || null;
}

function getInitialRoutingClass() {
  const raw = getIncomingParams()?.get("routingClass");
  return ["general-model-selection", "infrastructure-first", "specialized-stack", "platform-architecture"].includes(raw)
    ? raw
    : null;
}

function getInitialInfModel() {
  const params = getIncomingParams();
  const modelId = params?.get("model");
  if (!modelId) return { model: getDefaultModel(), matched: null };
  const match = getModelById(modelId);
  return match && match.id !== "custom"
    ? { model: match, matched: true }
    : { model: getDefaultModel(), matched: false };
}

function fmtUsdPrecise(n) {
  if (n == null) return "—";
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

function AuditFormula({ label, formula, substituted, result }) {
  return (
    <div className="mb-3">
      <div className="text-xs font-semibold mb-0.5" style={{ color: CHARCOAL }}>{label}</div>
      <div className="text-xs text-gray-500">{formula}</div>
      <div className="text-xs text-gray-500">{substituted}</div>
      <div className="text-sm font-bold mt-0.5" style={{ color: CHARCOAL }}>= {result}</div>
    </div>
  );
}

function ReconCheck({ label, parts, calculated, engineValue, format }) {
  if (engineValue == null || calculated == null) {
    return (
      <div className="rounded-lg border p-3 mb-2.5 bg-gray-50" style={{ borderColor: "#D1D5DB" }}>
        <div className="text-xs font-bold mb-1" style={{ color: CHARCOAL }}>{label}</div>
        <div className="text-xs text-gray-500">Not applicable in this scenario.</div>
      </div>
    );
  }
  const fmt = format === "count" ? (v) => Math.round(v).toLocaleString("en-US") : fmtUsdPrecise;
  const diff = Math.abs(calculated - engineValue);
  const pass = diff < 1;
  return (
    <div className="rounded-lg border p-3 mb-2.5" style={{ borderColor: pass ? "#1E7A3D" : RED, background: pass ? "#EAF6EE" : "#FEF2F2" }}>
      <div className="text-xs font-bold mb-1.5" style={{ color: CHARCOAL }}>{label}</div>
      {parts.map((p, i) => (
        <div key={i} className="flex justify-between text-xs text-gray-500 mb-0.5">
          <span>{p.label}</span><span>{p.value}</span>
        </div>
      ))}
      <div className="flex justify-between text-xs font-semibold mt-1 pt-1 border-t" style={{ color: CHARCOAL, borderColor: "#D1D5DB" }}>
        <span>Reconstructed from parts above</span><span>{fmt(calculated)}</span>
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span>Engine's own value (separate code path)</span><span>{fmt(engineValue)}</span>
      </div>
      <div className="flex justify-between text-xs font-bold mt-1" style={{ color: pass ? "#1E7A3D" : RED }}>
        <span>Difference: {fmt(diff)}</span><span>{pass ? "RECONCILED" : "MISMATCH — FLAG THIS"}</span>
      </div>
    </div>
  );
}

function AuditRow({ label, value, sub }) {
  return (
    <div className="grid grid-cols-2 py-1 text-xs">
      <div className="text-gray-500">{label}{sub && <div className="text-[10px] text-gray-400">{sub}</div>}</div>
      <div className="text-right font-semibold" style={{ color: CHARCOAL }}>{value}</div>
    </div>
  );
}

function GPUSizingCalculatorInner() {
  const { isLoggedIn, needsSetup, account, logDownloadEvent } = useAuth();
  const saved = loadSessionState("gpu-sizing");
  const [incomingModelId] = useState(() => getIncomingParams()?.get("model") || null);
  const [sourceUseCase] = useState(() => {
    const freshSourceUseCase = getInitialSourceUseCase();
    if (incomingModelId) return freshSourceUseCase;
    return freshSourceUseCase ?? saved?.sourceUseCase ?? null;
  });
  const [incomingWorkloadType] = useState(() => getInitialWorkloadType() ?? saved?.incomingWorkloadType ?? null);
  const [incomingRoutingClass] = useState(() => getInitialRoutingClass() ?? saved?.incomingRoutingClass ?? null);

  useEffect(() => {
    if ((sourceUseCase || incomingWorkloadType || incomingRoutingClass || incomingModelId) && typeof window !== "undefined") {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  const [hasFreshSourceUseCase] = useState(() => !!getInitialSourceUseCase());
  const [mode, setMode] = useState(() => ((hasFreshSourceUseCase || incomingWorkloadType) ? getInitialMode() : saved?.mode ?? getInitialMode()));
  const [pathLevel, setPathLevel] = useState(saved?.pathLevel ?? "simple");
  const [modelHandoff] = useState(getInitialInfModel);
  const [modelAdvisorRecommendedId] = useState(() => {
    if (incomingModelId) return modelHandoff.matched ? modelHandoff.model.id : incomingModelId;
    if (hasFreshSourceUseCase || incomingWorkloadType) return null;
    return saved?.modelAdvisorRecommendedId ?? null;
  });
  const [infModel, setInfModel] = useState(() => {
    if (incomingModelId) return modelHandoff.model;
    return getModelById(saved?.infModelId) || modelHandoff.model;
  });
  const [quant, setQuant] = useState(saved?.quant ?? "FP8");
  const [concurrentUsers, setConcurrentUsers] = useState(saved?.concurrentUsers ?? 100);
  const [targetTokPerUser, setTargetTokPerUser] = useState(saved?.targetTokPerUser ?? 30);
  const [environment, setEnvironment] = useState(saved?.environment ?? "Production");
  const [avgInputTokens, setAvgInputTokens] = useState(saved?.avgInputTokens ?? 2000);
  const [avgOutputTokens, setAvgOutputTokens] = useState(saved?.avgOutputTokens ?? 500);
  const [kvBytesPerElement, setKvBytesPerElement] = useState(saved?.kvBytesPerElement ?? 2);
  const [overheadPct, setOverheadPct] = useState(saved?.overheadPct ?? 0.15);
  const [infGpuOverride, setInfGpuOverride] = useState(saved?.infGpuOverride ?? "Auto-recommend");
  const [customParamsB, setCustomParamsB] = useState(saved?.customParamsB ?? 70);
  const [customLayers, setCustomLayers] = useState(saved?.customLayers ?? 80);
  const [customKvHeads, setCustomKvHeads] = useState(saved?.customKvHeads ?? 8);
  const [customHeadDim, setCustomHeadDim] = useState(saved?.customHeadDim ?? 128);
  const [workingDayHours, setWorkingDayHours] = useState(saved?.workingDayHours ?? 10);

  const [trainModel, setTrainModel] = useState(() => {
    if (incomingModelId) return modelHandoff.model;
    return getModelById(saved?.trainModelId) || getDefaultModel();
  });
  const [taskType, setTaskType] = useState(saved?.taskType ?? "Full fine-tune");
  const [precision, setPrecision] = useState(saved?.precision ?? "BF16");
  const [datasetTokensB, setDatasetTokensB] = useState(saved?.datasetTokensB ?? 50);
  const [targetDays, setTargetDays] = useState(saved?.targetDays ?? 14);
  const [mfu, setMfu] = useState(saved?.mfu ?? 0.4);
  const [trainGpuOverride, setTrainGpuOverride] = useState(saved?.trainGpuOverride ?? "Auto-recommend");

  const [view, setView] = useState("calc");
  const [lead, setLead] = useState({ name: "", company: "", email: "" });
  const [leadStatus, setLeadStatus] = useState("");

  useEffect(() => {
    saveSessionState("gpu-sizing", {
      mode, pathLevel,
      infModelId: infModel.id, quant, concurrentUsers, targetTokPerUser, environment,
      avgInputTokens, avgOutputTokens, kvBytesPerElement, overheadPct, infGpuOverride,
      customParamsB, customLayers, customKvHeads, customHeadDim, workingDayHours,
      trainModelId: trainModel.id, taskType, precision, datasetTokensB, targetDays, mfu, trainGpuOverride,
      sourceUseCase,
      incomingWorkloadType,
      incomingRoutingClass,
      modelAdvisorRecommendedId,
    });
  }, [mode, pathLevel, infModel, quant, concurrentUsers, targetTokPerUser, environment,
      avgInputTokens, avgOutputTokens, kvBytesPerElement, overheadPct, infGpuOverride,
      customParamsB, customLayers, customKvHeads, customHeadDim, workingDayHours,
      trainModel, taskType, precision, datasetTokensB, targetDays, mfu, trainGpuOverride,
      sourceUseCase, incomingWorkloadType, incomingRoutingClass, modelAdvisorRecommendedId]);

  const infInputs = {
    model: infModel,
    quant,
    concurrentUsers,
    targetTokPerUser,
    avgInputTokens,
    avgOutputTokens,
    kvBytesPerElement,
    overheadPct,
    gpuClassOverride: infGpuOverride,
    environment,
    customParamsB,
    customLayers,
    customKvHeads,
    customHeadDim,
    workingDayHours,
  };
  const trainInputs = {
    model: trainModel,
    taskType,
    precision,
    datasetTokensB,
    targetDays,
    mfu,
    gpuClassOverride: trainGpuOverride,
    memMultiplierOverride: null,
    customParamsB,
  };

  const infErrors = useMemo(() => validateInference(infInputs), [infModel, concurrentUsers, targetTokPerUser, avgInputTokens, avgOutputTokens, kvBytesPerElement, overheadPct, customParamsB, customLayers, customKvHeads, customHeadDim, workingDayHours]);
  const trainErrors = useMemo(() => validateTraining(trainInputs), [trainModel, datasetTokensB, targetDays, mfu, customParamsB]);

  const inferenceResult = useMemo(
    () => (infErrors.length ? null : computeInference(infInputs)),
    [infModel, quant, concurrentUsers, targetTokPerUser, avgInputTokens, avgOutputTokens, kvBytesPerElement, overheadPct, infGpuOverride, environment, customParamsB, customLayers, customKvHeads, customHeadDim, workingDayHours, infErrors]
  );

  const trainingResult = useMemo(
    () => (trainErrors.length ? null : computeTraining(trainInputs)),
    [trainModel, taskType, precision, datasetTokensB, targetDays, mfu, trainGpuOverride, customParamsB, trainErrors]
  );

  const result = mode === "Inference" ? inferenceResult : trainingResult;
  const errors = mode === "Inference" ? infErrors : trainErrors;
  const [tcoSelection, setTcoSelection] = useState("recommended");
  const sizingScenarioKey = mode === "Inference"
    ? [mode, infModel.id, quant, concurrentUsers, targetTokPerUser, avgInputTokens, avgOutputTokens, kvBytesPerElement, overheadPct, infGpuOverride, customParamsB, customLayers, customKvHeads, customHeadDim].join("|")
    : [mode, trainModel.id, taskType, precision, datasetTokensB, targetDays, mfu, trainGpuOverride, customParamsB].join("|");
  const effectiveTcoSelection = tcoSelection === "higher-growth" && result?.higherGrowth?.class ? "higher-growth" : "recommended";
  const tcoSelectedClass = effectiveTcoSelection === "higher-growth" ? result?.higherGrowth?.class : result?.selectedClass;
  const tcoSelectedCount = effectiveTcoSelection === "higher-growth" ? result?.higherGrowth?.recommended : result?.recommended;
  const selectedBudget = effectiveTcoSelection === "higher-growth" ? result?.budget?.higherGrowth : result?.budget?.recommended;
  const tcoScaleoutClassification = mode === "Inference" && result && tcoSelectedClass
    ? classifyInferenceScaleout({
        hardwareClass: tcoSelectedClass,
        weightMemoryGB: result.weightMemoryGB,
        sequenceMemoryGB: result.sequenceStateMemory?.totalGBPerSequence,
        overheadPct,
      })
    : null;
  useEffect(() => {
    setTcoSelection("recommended");
  }, [sizingScenarioKey, result?.selectedClass, result?.recommended, result?.higherGrowth?.class, result?.higherGrowth?.recommended]);
  const modelLabel = mode === "Inference" ? infModel.label : trainModel.label;

  useAutosaveSnapshot(
    "gpu-sizing",
    mode === "Inference" ? infInputs : trainInputs,
    result
      ? {
          mode,
          model: modelLabel,
          gpuClass: result.selectedClass,
          minTechnical: result.minTechnical,
          recommended: result.recommended,
          lowerCostClass: result.lowerCost.class,
          lowerCostCount: result.lowerCost.recommended,
          higherGrowthClass: result.higherGrowth.class,
          higherGrowthCount: result.higherGrowth.recommended,
          confidence: result.confidence.level,
          budget: result.budget?.recommended?.amount ?? null,
          utilizationPct: mode === "Inference" ? result.utilization?.recommended ?? null : null,
        }
      : null
  );

  function openAudit() {
    if (isLoggedIn && !needsSetup && account) {
      setLead({ name: account.name || "", company: account.company || "", email: account.email || "" });
    }
    setView("audit");
  }

  function requestReport() {
    if (isLoggedIn && !needsSetup && account) {
      setLead({ name: account.name || "", company: account.company || "", email: account.email || "" });
      logDownloadEvent("gpu-sizing", {
        mode,
        model: mode === "Inference" ? infModel.id : trainModel.id,
        gpuClass: result.selectedClass,
        recommended: result.recommended,
      });
      setView("report");
    } else {
      setView("gate");
    }
  }

  function submitLead() {
    if (!lead.name || !lead.email || !lead.company) { setLeadStatus("Please fill in all three fields."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) { setLeadStatus("Please enter a valid email address."); return; }
    setLeadStatus("");
    setView("report");
  }

  return (
    <main className="min-h-screen bg-white" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff; }
          .gpu-app-header { display: none !important; }
          .gpu-print-report { max-width: none !important; margin: 0 !important; padding: 0 !important; }
          .gpu-report-utilization { break-inside: avoid; page-break-inside: avoid; }
          .gpu-report-page2 { break-before: page; page-break-before: always; }
          .gpu-report-page2 .mb-6 { margin-bottom: 1rem !important; }
          @page { size: Letter; margin: .35in; }
        }
      `}</style>
      <div className="gpu-app-header border-b border-gray-200 px-6 py-4 flex items-center gap-3">
        <a href="/" className="flex-shrink-0" aria-label="AI Factory Tools home">
          <img src={cdwLogo} alt="CDW" className="h-9 w-auto" />
        </a>
        <div>
          <div className="text-xs font-bold tracking-wide" style={{ color: RED }}>AI FACTORY TOOLS</div>
          <h1 className="text-lg font-bold" style={{ color: CHARCOAL, margin: 0 }}>GPU Sizing Tool</h1>
        </div>
      </div>

      <div className="no-print border-b border-gray-100 px-6 py-2 flex items-center justify-between gap-3">
        {modelAdvisorRecommendedId ? (
          <a href="/model-advisor" style={{ fontSize: 12, fontWeight: 600, color: RED, textDecoration: "none" }}>&larr; Change model recommendation</a>
        ) : <span />}
        <AuthWidget />
      </div>

      {view === "gate" && (
        <div className="max-w-lg mx-auto px-6 py-10">
          <div className="rounded-xl border border-gray-200 p-6">
            <div className="text-lg font-bold mb-1" style={{ color: CHARCOAL }}>Get the full sizing report</div>
            <div className="text-xs text-gray-500 mb-4">
              The report includes the recommended configuration, every assumption behind it, lower-cost and
              higher-growth alternatives, and the caveats to bring into a real sizing conversation.
            </div>
            {["name", "company", "email"].map((f) => (
              <input
                key={f}
                placeholder={f === "name" ? "Full name" : f === "company" ? "Company" : "Work email"}
                value={lead[f]}
                type={f === "email" ? "email" : "text"}
                onChange={(e) => setLead({ ...lead, [f]: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm mb-2"
              />
            ))}
            {leadStatus && <div className="text-xs mb-2" style={{ color: RED }}>{leadStatus}</div>}
            <div className="flex gap-2 mt-2">
              <button onClick={submitLead} className="flex-1 text-sm font-bold py-2.5 rounded-lg text-white" style={{ background: RED }}>View my report</button>
              <button onClick={() => setView("calc")} className="text-sm font-semibold py-2.5 px-4 rounded-lg border border-gray-300 text-gray-600">Back</button>
            </div>
          </div>
        </div>
      )}

      {view === "report" && result && (
        <div className="gpu-print-report max-w-3xl mx-auto px-6 py-10">
          <div className="no-print flex flex-col sm:flex-row gap-2 mb-6">
            <button onClick={() => window.print()} className="w-full sm:flex-1 text-sm font-bold py-2.5 rounded-lg text-white" style={{ background: CHARCOAL }}>Print / Save as PDF</button>
            <button onClick={() => setView("audit")} className="w-full sm:w-auto text-sm font-semibold py-2.5 px-4 rounded-lg border border-gray-300" style={{ color: CHARCOAL }}>Calculation Methodology &amp; Audit Trail</button>
            <button onClick={() => setView("calc")} className="w-full sm:w-auto text-sm font-semibold py-2.5 px-4 rounded-lg border border-gray-300 text-gray-600">Back to calculator</button>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <img src={cdwLogo} alt="CDW" className="h-8 w-auto" />
            <div className="text-xs font-bold tracking-widest text-gray-500 uppercase">AI Factory &middot; GPU Sizing Report</div>
          </div>
          <div className="text-2xl font-bold mb-1" style={{ color: CHARCOAL }}>Prepared for {lead.name || "you"}{lead.company ? `, ${lead.company}` : ""}</div>
          <div className="text-xs text-gray-500 mb-6">{new Date().toLocaleDateString()} &middot; {mode} sizing &middot; {modelLabel}</div>
          <div className="mb-6"><ConfidenceBadge level={result.confidence.level} /><p className="text-xs text-gray-500 mt-2">{result.confidence.note}</p></div>
          <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">{effectiveTcoSelection === "higher-growth" ? "Selected configuration for TCO" : "Recommended configuration"}</div>
          <div className="flex flex-wrap gap-3 mb-6">
            <ResultCard icon={Cpu} title="Minimum technical" gpuClass={result.selectedClass} gpus={result.minTechnical} subtitle="Unrounded workload requirement" />
            <ResultCard
              icon={effectiveTcoSelection === "higher-growth" ? TrendingUp : Zap}
              title={effectiveTcoSelection === "higher-growth" ? "Selected for TCO · Higher-growth" : "Recommended"}
              gpuClass={tcoSelectedClass}
              gpus={tcoSelectedCount}
              subtitle={effectiveTcoSelection === "higher-growth" ? getHigherGrowthSubtitle(result.higherGrowth) : "Node-rounded for production"}
              accent
            />
          </div>
          <BudgetPanel budget={selectedBudget ? { recommended: selectedBudget } : null} />
{mode === "Inference" && result.rubinAdvisory && (
  <div className="mb-6 rounded-xl p-4 border border-amber-300 bg-amber-50 text-xs text-amber-900">
    <div className="font-bold uppercase tracking-wide mb-1">Rubin architecture evaluation recommended · PROVISIONAL</div>
    <div className="font-semibold mb-1">Verified sizing baseline: {result.recommended.toLocaleString()} × {result.selectedClass}</div>
    <div>At this rack-scale Blackwell footprint, evaluate DGX Rubin NVL8 and DGX Vera Rubin NVL72 with CDW/NVIDIA solution engineering. No exact Rubin GPU count, utilization, or cost-per-token is inferred because a qualifying absolute per-GPU inference-throughput anchor is still unavailable.</div>
  </div>
)}
{mode === "Training" && isRubinClass(result.selectedClass) && (
            <div className="mb-6 rounded-xl p-4 border border-amber-200 bg-amber-50 text-xs text-amber-900">
              {RUBIN_TRAINING_TCO_NOTICE}
            </div>
          )}
          {mode === "Inference" && <div className="gpu-report-utilization"><UtilizationPanel result={result} workingDayHours={workingDayHours} onWorkingDayHoursChange={setWorkingDayHours} /></div>}
          <div className="gpu-report-page2">
            <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2 mt-6">Assumptions used</div>
            <div className="rounded-xl border border-gray-200 p-4 mb-6 text-sm" style={{ color: CHARCOAL }}>
              <div className="grid grid-cols-2 gap-y-1.5 gap-x-4">
                <div className="text-gray-500">Model</div><div>{modelLabel}</div>
                {mode === "Inference" ? (
                  <>
                    <div className="text-gray-500">Quantization</div><div>{quant}</div>
                    <div className="text-gray-500">Peak concurrent users</div><div>{concurrentUsers.toLocaleString()}</div>
                    <div className="text-gray-500">Desired output tokens/sec per active request</div><div>{targetTokPerUser}</div>
                    <div className="text-gray-500">Environment</div><div>{environment}</div>
                    <div className="text-gray-500">Avg input / output tokens</div><div>{avgInputTokens.toLocaleString()} / {avgOutputTokens.toLocaleString()}</div>
                    <div className="text-gray-500">Attention/KV cache precision</div><div>{kvBytesPerElement} bytes/element</div>
                    <div className="text-gray-500">Runtime/activation overhead</div><div>{Math.round(overheadPct * 100)}%</div>
                    <div className="text-gray-500">GPU class</div><div>{infGpuOverride}</div>
                  </>
                ) : (
                  <>
                    <div className="text-gray-500">Task type</div><div>{taskType}</div>
                    <div className="text-gray-500">Precision</div><div>{precision}</div>
                    <div className="text-gray-500">Dataset size</div><div>{datasetTokensB}B tokens</div>
                    <div className="text-gray-500">Target time to train</div><div>{targetDays} days</div>
                    <div className="text-gray-500">MFU</div><div>{Math.round(mfu * 100)}%</div>
                    <div className="text-gray-500">GPU class</div><div>{trainGpuOverride}</div>
                  </>
                )}
              </div>
            </div>
            <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Alternatives considered</div>
            <div className="flex flex-wrap gap-3 mb-6">
              <ResultCard icon={TrendingDown} title="Lower-cost alternative" gpuClass={result.lowerCost.class} gpus={result.lowerCost.recommended} emptyMessage="No qualifying lower-cost alternative in the current supported catalog." />
              <ResultCard icon={TrendingUp} title="Higher-growth alternative" gpuClass={result.higherGrowth.class} gpus={result.higherGrowth.recommended} emptyMessage="No qualifying higher-growth capacity step in the current supported catalog."  subtitle={getHigherGrowthSubtitle(result.higherGrowth)}/>
            </div>
            {mode === "Inference" && environment === "Dev/Test/POC" && result.rtxAlt.eligible && (
              <div className="mb-6 rounded-xl p-4 bg-blue-50 border border-blue-200">
                <div className="text-xs font-bold uppercase tracking-wide text-blue-800 mb-1">Workstation alternative</div>
                <div className="text-lg font-bold text-blue-900 mb-1">{result.rtxAlt.gpus} &times; {result.rtxAlt.class} ({result.rtxAlt.vram}GB)</div>
                <p className="text-xs text-blue-800">Dev/Test/POC workload fits within {RTX_SPEC.maxWorkstationGPUs} workstation-class cards. Estimate only -- no MLPerf datacenter submission exists for this class.</p>
              </div>
            )}
            <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Caveats &amp; methodology</div>
            <div className="text-xs text-gray-500 p-4 bg-gray-50 rounded-lg mb-6 leading-relaxed">
              {mode === "Inference"
                ? `Total memory required: ${result.totalMemoryGB.toFixed(1)} GB (weights + inference sequence state + overhead). Aggregate throughput demand: ${result.totalThroughputNeeded.toLocaleString()} tok/s. This converts concurrent active requests × desired output rate into capacity demand; because the hardware anchors are MLPerf Offline throughput, it does not validate per-request TTFT/TPOT or guarantee the desired streaming rate. Hardware benchmark anchors are adjusted conservatively for active compute and, when selected precision differs from benchmark precision, by a downward NVIDIA dense Tensor Core peak-ratio guardrail; no automatic speedup is granted below the 70B reference. GPU count = max(memory-bound, performance-bound), rounded to a ${result.selectedNodeSize}-GPU node.`
                : `Resident training-state memory modeled: ${result.trainingMemoryGB.toFixed(1)} GB using resident parameters; activation and temporary-workspace memory is workload-specific and not separately modeled. Training compute uses ${result.trainingSemantics.activeComputeParamsB}B active parameters for this model. GPU count = max(GPUs to fit resident state, GPUs to hit the time target), rounded to a ${result.selectedNodeSize}-GPU node.`}
              {" "}A workload needing fewer GPUs than one node still shows a node-rounded recommendation, since systems are deployed as whole nodes. This is a directional sizing estimate, not a final bill of materials -- confirm with a CDW AI Factory specialist before purchasing.
            </div>
            <div className="border-t-2 pt-4 flex justify-between" style={{ borderColor: CHARCOAL }}>
              <div><div className="text-sm font-bold" style={{ color: CHARCOAL }}>Jay B. Carlile</div><div className="text-xs text-gray-500">AI Solutions Executive &middot; CDW AI Factory</div></div>
              <div className="text-xs text-gray-500 text-right">Next step: bring your actual<br />workload data for a validated sizing</div>
            </div>
          </div>
        </div>
      )}

      {view === "audit" && result && (
        <div className="max-w-3xl mx-auto px-6 py-10">
          <div className="no-print flex flex-col sm:flex-row gap-2 mb-6">
            <button onClick={() => window.print()} className="w-full sm:flex-1 text-sm font-bold py-2.5 rounded-lg text-white" style={{ background: CHARCOAL }}>Print / Save as PDF</button>
            <button onClick={() => setView("report")} className="w-full sm:w-auto text-sm font-semibold py-2.5 px-4 rounded-lg border border-gray-300 text-gray-600">Back to report</button>
          </div>
          <div className="flex items-center gap-3 mb-2"><img src={cdwLogo} alt="CDW" className="h-8 w-auto" /><div className="text-xs font-bold tracking-widest text-gray-500 uppercase">AI Factory &middot; Calculation Methodology &amp; Audit Trail</div></div>
          <div className="text-2xl font-bold mb-1" style={{ color: CHARCOAL }}>Prepared for {lead.name || "you"}{lead.company ? `, ${lead.company}` : ""}</div>
          <div className="text-xs text-gray-500 mb-1">{new Date().toLocaleDateString()} &middot; Reproducible derivation of the material calculations supporting the {mode} sizing result shown in the main report</div>
          <div className="text-xs text-gray-500 mb-6 italic">This document formats and explains the same calculation the main report already ran -- it does not run a separate or independent calculation. Every result below traces to the same inputs, catalog values, and engine outputs used by the main sizing calculation.</div>
          <div className="text-xs uppercase tracking-wide mb-2 pb-1 border-b-2" style={{ color: CHARCOAL, borderColor: CHARCOAL }}>1. Scenario Overview</div>
          <AuditRow label="Model" value={modelLabel} />
          <AuditRow label="Mode" value={mode} />
          {mode === "Inference" ? (
            <>
              <AuditRow label="Quantization" value={quant} />
              <AuditRow label="Peak concurrent users" value={concurrentUsers.toLocaleString()} />
              <AuditRow label="Desired output tokens/sec per active request" value={targetTokPerUser} />
              <AuditRow label="Environment" value={environment} />
              <AuditRow label="Avg input / output tokens" value={`${avgInputTokens.toLocaleString()} / ${avgOutputTokens.toLocaleString()}`} />
              <AuditRow label="Attention/KV cache precision" value={`${kvBytesPerElement} bytes/element`} />
              <AuditRow label="Runtime/activation overhead" value={`${Math.round(overheadPct * 100)}%`} />
              <AuditRow label="GPU class" value={infGpuOverride} />
            </>
          ) : (
            <>
              <AuditRow label="Task type" value={taskType} />
              <AuditRow label="Precision" value={precision} />
              <AuditRow label="Dataset size" value={`${datasetTokensB}B tokens`} />
              <AuditRow label="Target time to train" value={`${targetDays} days`} />
              <AuditRow label="MFU" value={`${Math.round(mfu * 100)}%`} />
              <AuditRow label="GPU class" value={trainGpuOverride} />
            </>
          )}
          <div className="text-xs mt-3 mb-4 rounded-lg p-3 bg-gray-50" style={{ color: CHARCOAL }}><b>Key assumptions worth stress-testing:</b> {mode === "Inference" ? "peak concurrent users, target tokens/sec per user, and average token lengths, since all three directly drive the memory and throughput requirement below" : "dataset size, target time to train, and MFU, since a small MFU change moves the achievable FLOPs/sec directly"}.</div>

          {mode === "Inference" ? (() => {
            const selected = result.candidates.find((c) => c.id === result.selectedClass);
            const boundBy = selected.gpusMem >= selected.gpusPerf ? "memory" : "throughput";
            const m = result.model;
            const state = result.sequenceStateMemory;
            const isMLA = state.stateType === "mla";
            const isStandardKv = state.stateType === "standard-kv";
            const avgTokens = avgInputTokens + avgOutputTokens;
            return (
              <>
                <div className="text-xs uppercase tracking-wide mt-5 mb-2 pb-1 border-b-2" style={{ color: CHARCOAL, borderColor: CHARCOAL }}>2. How the Technical Requirement Was Calculated</div>
                <AuditFormula label={`Model weight memory (${modelLabel}, ${m.totalParamsB}B params)`} formula="weightMemoryGB = totalParamsB × bytesPerParam(quant)" substituted={`= ${m.totalParamsB}B × ${result.quantBytes} byte/param (${quant})`} result={`${result.weightMemoryGB.toFixed(1)} GB`} />
                {isMLA ? (
                  <AuditFormula label="KV cache bytes/token (MLA attention)" formula="kvBytesPerToken = layers × (kvLoraRank + qkRopeHeadDim) × bytesPerElement" substituted={`= ${m.layers} × (${m.kvLoraRank} + ${m.qkRopeHeadDim}) × ${kvBytesPerElement}`} result={`${result.kvBytesPerToken.toLocaleString()} bytes/token`} />
                ) : isStandardKv ? (
                  <AuditFormula label="KV cache bytes/token (standard attention)" formula="kvBytesPerToken = 2 × layers × kvHeads × headDim × bytesPerElement" substituted={`= 2 × ${m.layers} × ${m.kvHeads} × ${m.headDim} × ${kvBytesPerElement}`} result={`${result.kvBytesPerToken.toLocaleString()} bytes/token`} />
                ) : (
                  <AuditFormula label={`Inference sequence state (${state.stateType})`} formula="sequenceStateGBPerSeq = sum(source-qualified persistent state components) ÷ 1e9" substituted={state.components.map((component) => `${component.name}: ${(component.bytes / 1e9).toFixed(4)} GB`).join(" + ")} result={`${state.totalGBPerSequence.toFixed(4)} GB/sequence`} />
                )}
                {(isMLA || isStandardKv) && (
                  <AuditFormula label="KV cache per sequence" formula="kvCacheGBPerSeq = (kvBytesPerToken × avgTokens) ÷ 1e9" substituted={`= (${result.kvBytesPerToken.toLocaleString()} × ${avgTokens.toLocaleString()}) ÷ 1e9`} result={`${result.kvCacheGBPerSeq.toFixed(4)} GB`} />
                )}
                <AuditFormula label={isMLA || isStandardKv ? "Total KV cache" : "Total inference sequence state"} formula="sequenceStateTotalGB = stateGBPerSeq × concurrentUsers" substituted={`= ${result.kvCacheGBPerSeq.toFixed(4)} × ${concurrentUsers.toLocaleString()}`} result={`${result.kvCacheTotalGB.toFixed(1)} GB`} />
                <AuditFormula label="Runtime/activation overhead" formula="runtimeOverheadGB = (weightMemoryGB + kvCacheTotalGB) × overhead%" substituted={`= (${result.weightMemoryGB.toFixed(1)} + ${result.kvCacheTotalGB.toFixed(1)}) × ${Math.round(overheadPct * 100)}%`} result={`${result.runtimeOverheadGB.toFixed(1)} GB`} />
                <AuditFormula label="Total memory required" formula="totalMemoryGB = weightMemoryGB + kvCacheTotalGB + runtimeOverheadGB" substituted={`= ${result.weightMemoryGB.toFixed(1)} + ${result.kvCacheTotalGB.toFixed(1)} + ${result.runtimeOverheadGB.toFixed(1)}`} result={`${result.totalMemoryGB.toFixed(1)} GB`} />
                <AuditFormula label="Aggregate throughput demand" formula="aggregateThroughputDemand = activeRequests × desiredOutputTokPerRequest" substituted={`= ${concurrentUsers.toLocaleString()} × ${targetTokPerUser}`} result={`${result.totalThroughputNeeded.toLocaleString()} tok/s`} />
                <AuditRow label="Serving benchmark semantics" value={`${INFERENCE_SERVING_ANCHOR_SEMANTICS.benchmarkScenario} — ${INFERENCE_SERVING_ANCHOR_SEMANTICS.planningPurpose}`} sub={INFERENCE_SERVING_ANCHOR_SEMANTICS.basis} />
                <AuditFormula label="Model-aware throughput scale" formula="modelScale = min(1, 70B ÷ activeComputeParamsB)" substituted={`= ${result.throughputScale.factor.toFixed(3)} (${result.throughputScale.activeParamsB ?? "unknown"}B active params)`} result={result.throughputScale.factor < 1 ? "Conservative model-size penalty applied" : "No inferred model-size speedup applied"} />
                <AuditFormula label={`Precision throughput guardrail (${quant})`} formula="precisionScale = selectedPrecisionPeak ÷ benchmarkPrecisionPeak (capped at 1.0)" substituted={`= ${selected.precisionScale.factor.toFixed(3)} vs ${selected.precisionScale.anchorPrecision} benchmark`} result={selected.precisionScale.factor < 1 ? "Downward precision guardrail applied" : "Benchmark precision matched"} />
                <AuditFormula label="Effective throughput anchor" formula="effectiveAnchor = hardwareAnchor × modelScale × precisionScale" substituted={`= ${selected.anchor.toLocaleString()} × ${result.throughputScale.factor.toFixed(3)} × ${selected.precisionScale.factor.toFixed(3)}`} result={`${Math.round(selected.effectiveAnchor).toLocaleString()} tok/s`} />
                <div className="overflow-x-auto mb-3">
                  <table className="w-full text-xs" style={{ color: CHARCOAL }}>
                    <thead><tr className="text-gray-500 border-b" style={{ borderColor: "#D1D5DB" }}><th className="text-left py-1 pr-2">GPU</th><th className="text-right py-1 pr-2">Memory-bound</th><th className="text-right py-1 pr-2">Perf-bound</th><th className="text-right py-1 pr-2">Technical GPUs</th><th className="text-right py-1">Node-rounded</th></tr></thead>
                    <tbody>{result.candidates.map((c) => (<tr key={c.id} className={c.id === result.selectedClass ? "font-bold" : ""} style={{ color: c.id === result.selectedClass ? RED : CHARCOAL }}><td className="py-1 pr-2">{c.id}{c.id === result.selectedClass ? " (selected)" : ""}</td><td className="text-right py-1 pr-2">{c.gpusMem.toLocaleString()}</td><td className="text-right py-1 pr-2">{c.gpusPerf.toLocaleString()}</td><td className="text-right py-1 pr-2">{c.gpusWorkload.toLocaleString()}</td><td className="text-right py-1">{(Math.ceil(c.gpusWorkload / c.nodeSize) * c.nodeSize).toLocaleString()}</td></tr>))}</tbody>
                  </table>
                </div>
                <div className="text-xs text-gray-500 mb-4">Minimum technical requirement = MAX(memory-bound, performance-bound) = <b style={{ color: CHARCOAL }}>{result.minTechnical} GPUs</b>, {boundBy === "memory" ? "bound by memory" : "bound by throughput"} at this scale.</div>
              </>
            );
          })() : (() => {
            const selected = result.candidates.find((c) => c.id === result.selectedClass);
            const boundBy = selected.gpusFit >= selected.gpusTime ? "fitting the model in memory" : "hitting the time target";
            const m = result.model;
            return (
              <>
                <div className="text-xs uppercase tracking-wide mt-5 mb-2 pb-1 border-b-2" style={{ color: CHARCOAL, borderColor: CHARCOAL }}>2. How the Technical Requirement Was Calculated</div>
                <AuditFormula label={`Resident training-state memory (${modelLabel}, ${m.totalParamsB}B resident params)`} formula={result.memoryModel.multiplier == null ? "trainingMemoryGB = residentParamsB × trainingStateBytesPerParam" : "trainingMemoryGB = residentParamsB × bytesPerParam(precision) × multiplier"} substituted={result.memoryModel.multiplier == null ? `= ${result.trainingSemantics.residencyParamsB}B × ${result.memoryModel.bytesPerParam} bytes/param (${taskType}; ${precision} compute)` : `= ${result.trainingSemantics.residencyParamsB}B × ${result.precisionBytes} byte/param (${precision}) × ${result.multiplier} (${taskType})`} result={`${result.trainingMemoryGB.toFixed(1)} GB`} />
                <div className="text-xs text-gray-500 mb-3">{result.memoryModel.basis}</div>
                <AuditFormula label="Total training compute required" formula="flopsRequired = 6 × activeComputeParamsB × datasetTokensB × 1e18" substituted={`= 6 × ${result.trainingSemantics.activeComputeParamsB}B active params × ${datasetTokensB}B tokens × 1e18`} result={`${result.flopsRequired.toExponential(2)} FLOPs`} />
                <AuditFormula label={`GPUs needed to fit the model (${result.selectedClass}, ${selected.vram} GB VRAM)`} formula="gpusFit = CEILING(trainingMemoryGB ÷ vramPerGPU)" substituted={`= CEILING(${result.trainingMemoryGB.toFixed(1)} ÷ ${selected.vram} GB/GPU)`} result={`${selected.gpusFit} GPUs`} />
                <AuditFormula label={`GPUs needed to hit the time target (${result.selectedClass}, ${selected.peakTFLOPS.toLocaleString()} ${precision} TFLOPS/GPU)`} formula="gpusTime = CEILING(flopsRequired ÷ (peakTFLOPS × 1e12 × MFU × targetSeconds))" substituted={`= CEILING(${result.flopsRequired.toExponential(2)} ÷ (${selected.peakTFLOPS.toLocaleString()}e12 × ${Math.round(mfu * 100)}% × ${result.secondsTarget.toLocaleString()}s))`} result={`${selected.gpusTime} GPUs`} />
                <div className="overflow-x-auto mb-3"><table className="w-full text-xs" style={{ color: CHARCOAL }}><thead><tr className="text-gray-500 border-b" style={{ borderColor: "#D1D5DB" }}><th className="text-left py-1 pr-2">GPU</th><th className="text-right py-1 pr-2">Fit-bound</th><th className="text-right py-1 pr-2">Time-bound</th><th className="text-right py-1 pr-2">Technical GPUs</th><th className="text-right py-1">Node-rounded</th></tr></thead><tbody>{result.candidates.map((c) => (<tr key={c.id} className={c.id === result.selectedClass ? "font-bold" : ""} style={{ color: c.id === result.selectedClass ? RED : CHARCOAL }}><td className="py-1 pr-2">{c.id}{c.id === result.selectedClass ? " (selected)" : ""}</td><td className="text-right py-1 pr-2">{c.gpusFit.toLocaleString()}</td><td className="text-right py-1 pr-2">{c.gpusTime.toLocaleString()}</td><td className="text-right py-1 pr-2">{c.gpusWorkload.toLocaleString()}</td><td className="text-right py-1">{(Math.ceil(c.gpusWorkload / c.nodeSize) * c.nodeSize).toLocaleString()}</td></tr>))}</tbody></table></div>
                <div className="text-xs text-gray-500 mb-4">Minimum technical requirement = MAX(fit, time) = <b style={{ color: CHARCOAL }}>{result.minTechnical} GPUs</b>, bound by {boundBy} at this scale.</div>
              </>
            );
          })()}

          <div className="text-xs uppercase tracking-wide mt-5 mb-2 pb-1 border-b-2" style={{ color: CHARCOAL, borderColor: CHARCOAL }}>3. Node Rounding, Budget &amp; Alternatives</div>
          <AuditFormula label="Recommended (node-rounded) configuration" formula="recommended = CEILING(minTechnical ÷ nodeSize) × nodeSize" substituted={`= CEILING(${result.minTechnical} ÷ ${result.selectedNodeSize}) × ${result.selectedNodeSize}`} result={`${result.recommended} × ${result.selectedClass}`} />
          <AuditRow label="TCO selection basis" value={effectiveTcoSelection === "higher-growth" ? "User-selected higher-growth alternative" : "Recommended configuration"} />
          <AuditFormula
            label="Selected configuration for TCO"
            formula={effectiveTcoSelection === "higher-growth" ? "selected = higher-growth deployment chosen by the user" : "selected = recommended node-rounded configuration"}
            substituted={effectiveTcoSelection === "higher-growth" ? getHigherGrowthAuditText(result.higherGrowth, mode) : `${result.recommended} × ${result.selectedClass}`}
            result={`${tcoSelectedCount} × ${tcoSelectedClass}`}
          />
          <AuditFormula
            label="Selected loaded system budget"
            formula="budget = selectedGpuCount × loadedCostPerGPU"
            substituted={`= ${tcoSelectedCount} × ${selectedBudget ? fmtUsdPrecise(selectedBudget.amount / tcoSelectedCount) : "—"}/GPU`}
            result={selectedBudget ? fmtUsdPrecise(selectedBudget.amount) : isRubinClass(tcoSelectedClass) ? "See Phase 1 TCO" : "—"}
          />
          <div className="text-xs text-gray-500 mb-2 mt-2"><b>Lower-cost alternative:</b> {result.lowerCost.class ? `${result.lowerCost.class}, the cheapest other class in the catalog that is genuinely cheaper as a deployed (node-rounded) solution than the recommendation.` : "none -- the recommendation is already the cheapest deployed option in the current catalog or the selected class does not yet have loaded-cost economics."}</div>
          <div className="text-xs text-gray-500 mb-4"><b>Higher-growth alternative:</b> {getHigherGrowthAuditText(result.higherGrowth, mode)}</div>

          <div className="text-xs uppercase tracking-wide mt-5 mb-2 pb-1 border-b-2" style={{ color: CHARCOAL, borderColor: CHARCOAL }}>4. Reconciliation</div>
          <div className="text-xs text-gray-500 mb-3">Each check below redoes the arithmetic from already-shown intermediate values and compares the result to the engine's own field for that formula -- not the same number read twice.</div>
          {(() => {
            const selected = result.candidates.find((c) => c.id === result.selectedClass);
            const minTechCalc = mode === "Inference" ? Math.max(selected.gpusMem, selected.gpusPerf) : Math.max(selected.gpusFit, selected.gpusTime);
            const recommendedCalc = Math.ceil(result.minTechnical / result.selectedNodeSize) * result.selectedNodeSize;
            const unitPrice = GPU_PRICE_USD[result.selectedClass]?.amount ?? null;
            const budgetCalc = unitPrice != null ? result.recommended * unitPrice : null;
            return (
              <>
                <ReconCheck label="Minimum technical requirement" parts={mode === "Inference" ? [{ label: "Memory-bound GPUs", value: selected.gpusMem.toLocaleString() }, { label: "Performance-bound GPUs", value: selected.gpusPerf.toLocaleString() }] : [{ label: "GPUs to fit the model", value: selected.gpusFit.toLocaleString() }, { label: "GPUs to hit the time target", value: selected.gpusTime.toLocaleString() }]} calculated={minTechCalc} engineValue={result.minTechnical} format="count" />
                <ReconCheck label="Recommended (node-rounded) count" parts={[{ label: "Minimum technical requirement", value: result.minTechnical.toLocaleString() }, { label: `Node size (${result.selectedClass})`, value: result.selectedNodeSize.toLocaleString() }]} calculated={recommendedCalc} engineValue={result.recommended} format="count" />
                <ReconCheck label="Loaded system budget" parts={[{ label: "Recommended GPU count", value: result.recommended.toLocaleString() }, { label: `Catalog price per GPU (${result.selectedClass})`, value: unitPrice != null ? fmtUsdPrecise(unitPrice) : isRubinClass(result.selectedClass) ? "System-level Phase 1 TCO" : "—" }]} calculated={budgetCalc} engineValue={result.budget.recommended ? result.budget.recommended.amount : null} format="currency" />
                {selectedBudget && (
                  <ReconCheck
                    label="Selected-for-TCO budget"
                    parts={[
                      { label: "Selected GPU count", value: tcoSelectedCount.toLocaleString() },
                      { label: `Catalog price per GPU (${tcoSelectedClass})`, value: fmtUsdPrecise(selectedBudget.amount / tcoSelectedCount) },
                    ]}
                    calculated={tcoSelectedCount * (selectedBudget.amount / tcoSelectedCount)}
                    engineValue={selectedBudget.amount}
                    format="currency"
                  />
                )}
              </>
            );
          })()}

          <div className="text-xs uppercase tracking-wide mt-5 mb-2 pb-1 border-b-2" style={{ color: CHARCOAL, borderColor: CHARCOAL }}>5. Sources, Confidence &amp; Technical Caveats</div>
          {(() => {
            const selected = result.candidates.find((c) => c.id === result.selectedClass);
            const m = result.model;
            const priceInfo = GPU_PRICE_USD[result.selectedClass];
            const onpremStaleness = stalenessOf(ONPREM_PRICING_VERIFIED_AT);
            return (
              <>
                <div className="text-xs font-semibold mb-1" style={{ color: CHARCOAL }}>Selected model -- {modelLabel}</div>
                <AuditRow label="Architecture status" value={m.status === "VERIFIED" ? "VERIFIED" : "CUSTOM (unverified entry)"} />
                <AuditRow label="Resident / total parameters" value={`${m.totalParamsB}B`} />
                {m.activeParamsB != null && <AuditRow label="Active compute parameters" value={`${m.activeParamsB}B`} sub="Used as a per-token compute concept for sparse models; it does not replace resident model size." />}
                {mode === "Inference" && m.sequenceStateType ? <AuditRow label="Inference state contract" value={result.sequenceStateMemory.stateType} sub={result.sequenceStateMemory.basis} /> : m.attentionType === "MLA" ? <AuditRow label="KV configuration" value={`MLA -- kvLoraRank ${m.kvLoraRank}, qkRopeHeadDim ${m.qkRopeHeadDim}, ${m.layers} layers`} /> : <AuditRow label="KV configuration" value={m.kvHeads != null ? `${m.layers} layers, ${m.kvHeads} KV heads, ${m.headDim} head dim` : "not applicable to training sizing"} />}
                <div className="text-xs font-semibold mb-1 mt-3" style={{ color: CHARCOAL }}>Selected GPU -- {result.selectedClass}</div>
                <AuditRow label="VRAM" value={`${selected.vram} GB`} />
                {mode === "Inference" ? (
                  <>
                    <AuditRow label="MLPerf Offline throughput anchor" value={`${selected.anchor.toLocaleString()} tok/s (${selected.anchorPrecision})`} sub={`Confidence: ${selected.confidence} -- ${selected.source}`} />
                    <AuditRow label={`Precision guardrail (${quant})`} value={`×${selected.precisionScale.factor.toFixed(3)}`} sub={`${selected.precisionScale.basis} ${selected.precisionScale.source || ""}`.trim()} />
                    <AuditRow label="Effective throughput anchor" value={`${Math.round(selected.effectiveAnchor).toLocaleString()} tok/s`} sub={result.throughputScale.basis} />
                  </>
                ) : <AuditRow label={`Peak TFLOPS (${precision})`} value={selected.peakTFLOPS.toLocaleString()} sub={`Confidence: ${selected.confidence || result.confidence.level} -- ${selected.source || "NVIDIA published spec-sheet values"}`} />}
                <div className="text-xs font-semibold mb-1 mt-3" style={{ color: CHARCOAL }}>Pricing</div>
                <AuditRow label={`Loaded cost per ${result.selectedClass} GPU`} value={priceInfo ? fmtUsdPrecise(priceInfo.amount) : isRubinClass(result.selectedClass) ? "Modeled in Phase 1 TCO" : "—"} sub={priceInfo ? `Confidence: ${priceInfo.confidence} -- ${priceInfo.source}` : isRubinClass(result.selectedClass) ? `GPU Sizing does not invent a per-GPU loaded price. ${RUBIN_TRAINING_TCO_NOTICE}` : undefined} />
                {!isRubinClass(result.selectedClass) && <AuditRow label="Pricing last verified" value={fmtVerifiedDate(ONPREM_PRICING_VERIFIED_AT)} sub={`${onpremStaleness.days} days ago${onpremStaleness.level === "stale" ? " -- refresh before client use" : onpremStaleness.level === "review" ? " -- review due soon" : ""}`} />}
                {mode === "Training" && <><div className="text-xs font-semibold mb-1 mt-3" style={{ color: CHARCOAL }}>Training-specific assumption</div><AuditRow label="MFU (model FLOPs utilization)" value={`${Math.round(mfu * 100)}%`} sub={mfu === 0.4 ? "default value, sourced from Meta's Llama 3 paper; not yet independently validated on Rubin silicon" : `adjusted from the 40% default to ${Math.round(mfu * 100)}%`} /></>}
              </>
            );
          })()}
          <div className="text-[11px] text-gray-500 mt-4 leading-relaxed">All figures on this page are directional planning estimates derived from the inputs shown above, using the same calculation the main report already ran. This is a directional sizing estimate, not a final bill of materials -- confirm with a CDW AI Factory specialist before purchasing.</div>
          <div className="border-t-2 pt-4 mt-4 flex justify-between" style={{ borderColor: CHARCOAL }}><div><div className="text-sm font-bold" style={{ color: CHARCOAL }}>Jay B. Carlile</div><div className="text-xs text-gray-500">AI Solutions Executive &middot; CDW AI Factory</div></div><div className="text-xs text-gray-500 text-right">Questions about this derivation?<br />Bring your actual workload data for a validated pass</div></div>
        </div>
      )}

      {view === "calc" && (
      <div className="max-w-5xl mx-auto px-6 py-8">
        {(sourceUseCase || modelAdvisorRecommendedId) && (
          <div className="mb-6 text-sm rounded-lg px-4 py-3" style={{ background: "#F5F5F5", border: "1px solid #ddd", color: "#444" }}>
            {modelAdvisorRecommendedId && !sourceUseCase && (() => {
              const recommendedModel = getModelById(modelAdvisorRecommendedId);
              const activeModel = mode === "Inference" ? infModel : trainModel;
              if (!recommendedModel) return <>Model Advisor recommended <strong>{modelAdvisorRecommendedId}</strong>, but this calculator doesn't have a sizing profile for that model yet. Showing current settings ({activeModel.label}) instead -- pick the right model below rather than relying on this pre-fill.</>;
              if (activeModel.id === recommendedModel.id) return <>Model pre-set to <strong>{recommendedModel.label}</strong>, carried over from Model Advisor. Adjust anything below to refine the estimate.</>;
              return <>Model Advisor recommended <strong>{recommendedModel.label}</strong>; you're currently sizing <strong>{activeModel.label}</strong> after an adjustment in GPU Sizing.</>;
            })()}
            {sourceUseCase && <>Arrived from Use Case Explorer ({sourceUseCase}).{" "}{incomingRoutingClass === "infrastructure-first" || incomingRoutingClass === "specialized-stack" ? <>This workload type{incomingWorkloadType ? <> (<strong>{incomingWorkloadType}</strong>)</> : null} isn't fully represented in this calculator yet -- GPU Sizing is currently calibrated for LLM inference and training. Use the numbers below as a directional compute-scale reference, and confirm the specialized architecture with a CDW AI Factory specialist.</> : <>Mode pre-set to <strong>{mode}</strong> based on that use case. Adjust anything below to refine the estimate.</>}</>}
          </div>
        )}
        <div className="flex gap-2 mb-6">{["Inference", "Training"].map((m) => (<button key={m} onClick={() => setMode(m)} className="px-5 py-2 rounded-lg text-sm font-bold transition-colors" style={mode === m ? { background: RED, color: "white" } : { background: "#F2F2F2", color: CHARCOAL }}>{m === "Inference" ? "Inference sizing" : "Training / fine-tuning sizing"}</button>))}</div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <div className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: RED }}>Workload requirements</div>
            <div className="text-xs text-gray-500 mb-4">Start with what the workload needs. Common deployment defaults and expert assumptions remain available below.</div>
            {mode === "Inference" ? (
              <>
                <Field label="Model" tipKey="infModel"><Select value={infModel.id} onChange={(id) => setInfModel(MODELS.find((m) => m.id === id))} options={MODELS.map((m) => m.id)} /><div className="text-xs text-gray-500 mt-1">{infModel.label}</div></Field>
                {infModel.id === "custom" && <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200"><Field label="Params (B)"><NumberInput value={customParamsB} onChange={setCustomParamsB} /></Field><Field label="Layers"><NumberInput value={customLayers} onChange={setCustomLayers} /></Field><Field label="KV heads"><NumberInput value={customKvHeads} onChange={setCustomKvHeads} /></Field><Field label="Head dim"><NumberInput value={customHeadDim} onChange={setCustomHeadDim} /></Field></div>}
                <Field label="Peak concurrent users" tipKey="concurrentUsers" hint="Concurrent generating sessions, not total licensed users"><NumberInput value={concurrentUsers} onChange={setConcurrentUsers} ariaLabel="Peak concurrent users" /></Field>
                <Field label="Desired output rate (tokens/sec per active request)" tipKey="targetTokPerUser"><NumberInput value={targetTokPerUser} onChange={setTargetTokPerUser} ariaLabel="Desired output tokens/sec per active request" /></Field>
                <SampleOutputPreview tokPerSec={targetTokPerUser} />
                <Field label="Environment" tipKey="environment"><Select value={environment} onChange={setEnvironment} options={["Production", "Dev/Test/POC"]} /></Field>
                <details className="rounded-xl border border-gray-200 bg-white mb-4">
                  <summary className="cursor-pointer px-4 py-3 list-none">
                    <div className="flex items-start justify-between gap-3">
                      <div><div className="text-sm font-bold" style={{ color: CHARCOAL }}>Deployment assumptions</div><div className="text-xs text-gray-500 mt-1">{quant} · {infGpuOverride}</div></div>
                      <span className="text-xs font-semibold whitespace-nowrap" style={{ color: RED }}>Adjust</span>
                    </div>
                  </summary>
                  <div className="border-t border-gray-100 px-4 pt-4 pb-1">
                    <Field label="Quantization" tipKey="quant"><Select value={quant} onChange={setQuant} options={["FP16", "FP8", "FP4"]} /></Field>
                    <Field label="GPU class" tipKey="infGpuOverride"><Select value={infGpuOverride} onChange={setInfGpuOverride} options={["Auto-recommend", ...GPU_SPECS.map((g) => g.id)]} /></Field>
                    <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                      <strong>Rubin exact sizing:</strong> {RUBIN_INFERENCE_NAMES} are not selectable for benchmark-qualified GPU counts yet because a qualifying absolute per-GPU inference-throughput anchor is still unavailable. For rack-scale Blackwell results, the tool now surfaces Rubin separately as a provisional architecture-evaluation advisory without inventing a Rubin GPU count.
                    </div>
                  </div>
                </details>
                <details open={pathLevel === "advanced"} onToggle={(e) => setPathLevel(e.currentTarget.open ? "advanced" : "simple")} className="rounded-xl border border-gray-200 bg-white">
                  <summary className="cursor-pointer px-4 py-3 list-none">
                    <div className="flex items-start justify-between gap-3">
                      <div><div className="text-sm font-bold" style={{ color: CHARCOAL }}>Advanced sizing assumptions</div><div className="text-xs text-gray-500 mt-1">{avgInputTokens.toLocaleString()} / {avgOutputTokens.toLocaleString()} tokens · {Math.round(overheadPct * 100)}% overhead</div></div>
                      <span className="text-xs font-semibold whitespace-nowrap" style={{ color: RED }}>Optional</span>
                    </div>
                  </summary>
                  <div className="border-t border-gray-100 px-4 pt-4 pb-1">
                    <Field label="Avg input tokens" tipKey="avgInputTokens"><NumberInput value={avgInputTokens} onChange={setAvgInputTokens} /></Field>
                    <Field label="Avg output tokens" tipKey="avgOutputTokens"><NumberInput value={avgOutputTokens} onChange={setAvgOutputTokens} /></Field>
                    <Field label="Attention/KV cache precision (bytes/element)" tipKey="kvBytesPerElement"><NumberInput value={kvBytesPerElement} onChange={setKvBytesPerElement} step={1} /></Field>
                    <Field label="Runtime/activation overhead %"><NumberInput value={overheadPct} onChange={setOverheadPct} step={0.01} /></Field>
                  </div>
                </details>
              </>
            ) : (
              <>
                <Field label="Model" tipKey="trainModel"><Select value={trainModel.id} onChange={(id) => setTrainModel(MODELS.find((m) => m.id === id))} options={MODELS.map((m) => m.id)} /><div className="text-xs text-gray-500 mt-1">{trainModel.label}</div></Field>
                {trainModel.id === "custom" && <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200"><Field label="Params (B)"><NumberInput value={customParamsB} onChange={setCustomParamsB} /></Field></div>}
                <Field label="Task type" tipKey="taskType"><Select value={taskType} onChange={setTaskType} options={["Pretraining", "Full fine-tune", "LoRA/PEFT"]} /></Field>
                <Field label="Dataset size (billions of tokens)" tipKey="datasetTokensB"><NumberInput value={datasetTokensB} onChange={setDatasetTokensB} /></Field>
                <Field label="Target time to train (days)" tipKey="targetDays"><NumberInput value={targetDays} onChange={setTargetDays} /></Field>
                <details className="rounded-xl border border-gray-200 bg-white mb-4">
                  <summary className="cursor-pointer px-4 py-3 list-none">
                    <div className="flex items-start justify-between gap-3">
                      <div><div className="text-sm font-bold" style={{ color: CHARCOAL }}>Deployment assumptions</div><div className="text-xs text-gray-500 mt-1">{precision} · {trainGpuOverride}</div></div>
                      <span className="text-xs font-semibold whitespace-nowrap" style={{ color: RED }}>Adjust</span>
                    </div>
                  </summary>
                  <div className="border-t border-gray-100 px-4 pt-4 pb-1">
                    <Field label="Precision" tipKey="precision"><Select value={precision} onChange={setPrecision} options={["BF16", "FP8"]} /></Field>
                    <Field label="GPU class" tipKey="infGpuOverride"><Select value={trainGpuOverride} onChange={setTrainGpuOverride} options={["Auto-recommend", ...TRAINING_GPU_SPECS.map((g) => g.id)]} /></Field>
                    <div className="mb-3 text-xs text-gray-500">Rubin training uses NVIDIA-published preliminary 288 GB HBM4, 4,000 BF16 TFLOPS, and 17,500 FP8/FP6 TFLOPS per GPU. The existing 40% MFU remains an explicit planning assumption and is not yet validated specifically on Rubin silicon.</div>
                  </div>
                </details>
                <details open={pathLevel === "advanced"} onToggle={(e) => setPathLevel(e.currentTarget.open ? "advanced" : "simple")} className="rounded-xl border border-gray-200 bg-white">
                  <summary className="cursor-pointer px-4 py-3 list-none">
                    <div className="flex items-start justify-between gap-3">
                      <div><div className="text-sm font-bold" style={{ color: CHARCOAL }}>Advanced sizing assumptions</div><div className="text-xs text-gray-500 mt-1">MFU {Math.round(mfu * 100)}%</div></div>
                      <span className="text-xs font-semibold whitespace-nowrap" style={{ color: RED }}>Optional</span>
                    </div>
                  </summary>
                  <div className="border-t border-gray-100 px-4 pt-4 pb-1">
                    <Field label="MFU (achieved % of peak FLOPs)" tipKey="mfu" hint="Sourced default: Meta's Llama 3 paper reports 38-43% BF16 MFU at 16K-GPU scale"><NumberInput value={mfu} onChange={setMfu} step={0.01} /></Field>
                  </div>
                </details>
              </>
            )}
          </div>
          <div>
            {errors.length > 0 ? (
              <div className="rounded-xl p-5 bg-red-50 border border-red-200"><div className="text-xs font-bold uppercase tracking-wide text-red-800 mb-2">Fix these before sizing</div><ul className="text-sm text-red-900 space-y-1.5 list-disc list-inside">{errors.map((e, i) => (<li key={i}>{e}</li>))}</ul></div>
            ) : (
            <>
              <div className="mb-4"><ConfidenceBadge level={result.confidence.level} /><p className="text-xs text-gray-500 mt-2 flex items-start gap-1"><Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />{result.confidence.note}</p></div>
              <div className="flex flex-wrap gap-3 mb-4"><ResultCard icon={Cpu} title="Minimum technical" gpuClass={result.selectedClass} gpus={result.minTechnical} subtitle="Unrounded workload requirement" /><ResultCard icon={Zap} title="Recommended" gpuClass={result.selectedClass} gpus={result.recommended} subtitle="Node-rounded for production" accent selectable={Boolean(TCO_OWN_SYS_FOR_CLASS[result.selectedClass])} selected={effectiveTcoSelection === "recommended"} onSelect={() => setTcoSelection("recommended")} /></div>
              <div className="flex flex-wrap gap-3 mb-6"><ResultCard icon={TrendingDown} title="Lower-cost alternative" gpuClass={result.lowerCost.class} gpus={result.lowerCost.recommended} emptyMessage="No qualifying lower-cost alternative in the current supported catalog." /><ResultCard icon={TrendingUp} title="Higher-growth alternative" gpuClass={result.higherGrowth.class} gpus={result.higherGrowth.recommended} emptyMessage="No qualifying higher-growth capacity step in the current supported catalog." subtitle={getHigherGrowthSubtitle(result.higherGrowth)} selectable={Boolean(result.higherGrowth.class && TCO_OWN_SYS_FOR_CLASS[result.higherGrowth.class])} selected={effectiveTcoSelection === "higher-growth"} onSelect={() => setTcoSelection("higher-growth")} /></div>
              <BudgetPanel budget={selectedBudget ? { recommended: selectedBudget } : null} />
    {mode === "Inference" && result.rubinAdvisory && (
      <div className="mb-4 rounded-xl p-4 border border-amber-300 bg-amber-50">
        <div className="flex items-center justify-between gap-3 mb-1">
          <div className="text-xs font-bold uppercase tracking-wide text-amber-900">Rubin architecture evaluation recommended</div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-900">PROVISIONAL</span>
        </div>
        <div className="text-sm font-semibold text-amber-950 mb-1">Verified sizing baseline: {result.recommended.toLocaleString()} × {result.selectedClass}</div>
        <p className="text-xs text-amber-900 mb-1">This benchmark-qualified Blackwell result has reached rack-scale deployment. Evaluate DGX Rubin NVL8 and DGX Vera Rubin NVL72 with CDW/NVIDIA solution engineering before committing to a large Blackwell build.</p>
        <p className="text-xs text-amber-800"><strong>No exact Rubin GPU count is shown.</strong> Rubin inference efficiency evidence is strong, but the absolute per-GPU throughput anchor required by this calculator is still unavailable; FLOPS, relative ratios, and tokens/MW are not converted into synthetic sizing.</p>
      </div>
    )}
    {mode === "Training" && isRubinClass(result.selectedClass) && (
                <div className="mb-4 rounded-xl p-4 border border-amber-200 bg-amber-50 text-xs text-amber-900">
                  {RUBIN_TRAINING_TCO_NOTICE}
                </div>
              )}
              {mode === "Inference" && <UtilizationPanel result={result} workingDayHours={workingDayHours} onWorkingDayHoursChange={setWorkingDayHours} />}
              {mode === "Inference" && environment === "Dev/Test/POC" && <div className="mb-4">{result.rtxAlt.eligible ? <div className="rounded-xl p-4 bg-blue-50 border border-blue-200"><div className="flex items-center gap-2 mb-1"><Cpu className="w-4 h-4 text-blue-700" /><span className="text-xs font-bold uppercase tracking-wide text-blue-800">Workstation alternative</span></div><div className="text-2xl font-bold text-blue-900 mb-1">{result.rtxAlt.gpus} <span className="text-sm font-normal">x {result.rtxAlt.class} ({result.rtxAlt.vram}GB)</span></div><p className="text-xs text-blue-800">Dev/Test/POC workload fits within {RTX_SPEC.maxWorkstationGPUs} workstation-class cards. Anchor is an estimate -- treat as directional.</p></div> : <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-600">Dev/Test/POC environment, but this workload would need more than {RTX_SPEC.maxWorkstationGPUs} {RTX_SPEC.id} cards ({result.rtxAlt.gpus} required).</div>}</div>}
              <div className="text-xs text-gray-500 p-3 bg-gray-50 rounded-lg mb-4"><strong>Sizing method:</strong> {mode === "Inference" ? `Meet both ${result.totalMemoryGB.toFixed(1)} GB of modeled memory and ${result.totalThroughputNeeded.toLocaleString()} tok/s of aggregate demand, then round up to a ${result.selectedNodeSize}-GPU node. MLPerf Offline throughput does not establish per-request response speed (TTFT/TPOT).` : `Fit ${result.trainingMemoryGB.toFixed(1)} GB of modeled training state and meet the training time target, then round up to a ${result.selectedNodeSize}-GPU node. Activation and temporary-workspace memory are not separately modeled.`} See the calculation audit for evidence and detailed assumptions.</div>
              <TcoHandoff selectedClass={tcoSelectedClass} recommended={tcoSelectedCount} gpuDemandCount={effectiveTcoSelection === "higher-growth" ? result?.higherGrowth?.workload : result?.minTechnical} sizingBasis={effectiveTcoSelection} mode={mode} workingDayHours={workingDayHours} concurrentUsers={mode === "Inference" ? concurrentUsers : null} targetTokPerUser={mode === "Inference" ? targetTokPerUser : null} model={mode === "Inference" ? infModel : trainModel} modelParamsB={mode === "Inference" ? getModelParamsB(infModel, customParamsB) : getModelParamsB(trainModel, customParamsB)} quant={mode === "Inference" ? quant : null} scaleoutClassification={tcoScaleoutClassification} />
              <div className="mt-3 flex flex-col sm:flex-row gap-2">
                <button onClick={requestReport} className="w-full sm:flex-1 text-sm font-bold py-2.5 rounded-lg text-white" style={{ background: RED }}>Get the full sizing report</button>
                <button onClick={openAudit} className="w-full sm:w-auto text-sm font-semibold py-2.5 px-4 rounded-lg border border-gray-300 bg-white" style={{ color: CHARCOAL }}>Calculation Methodology &amp; Audit Trail</button>
              </div>
            </>
            )}
          </div>
        </div>
      </div>
      )}
    </main>
  );
}

export default function GPUSizingCalculator() {
  return (
    <AuthProvider>
      <GPUSizingCalculatorInner />
    </AuthProvider>
  );
}
