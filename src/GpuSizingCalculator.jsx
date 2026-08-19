import React, { useState, useMemo } from "react";
import { Cpu, Zap, TrendingDown, TrendingUp, Info, ChevronDown, X } from "lucide-react";
import cdwLogo from "./cdw-logo.png";
import { AuthProvider, useAuth } from "./AuthContext";
import AuthWidget from "./AuthWidget";

// ---------------------------------------------------------------------------
// Tooltip copy -- same rubric as the TCO tool: <=2 sentences core (3 with a
// default), what-it-is -> why/if-unsure, always resolves to an action.
// ---------------------------------------------------------------------------
const TIPS = {
  infModel: "The model you plan to run. If you're not sure yet, Llama 3.1 70B is a reasonable default for a general-purpose assistant -- pick 8B for lightweight/cheap, or 405B if you need frontier-level quality.",
  quant: "How compressed the model's weights are in memory. FP8 is the safe default for H100/H200-class hardware; FP4 only applies to Blackwell-class GPUs (B200/GB200/B300) and roughly halves memory again.",
  concurrentUsers: "How many people will be generating a response at the same moment, not your total user count. A team of 500 might only have 20-50 concurrent at peak -- when unsure, estimate 5-10% of total users at peak hours.",
  targetTokPerUser: "How fast each user's response should stream in. 20-30 tokens/sec feels roughly like natural reading speed for a chat experience; lower it for batch/offline jobs where speed matters less.",
  environment: "Whether this is a real production deployment or something lighter-weight. Dev/Test/POC unlocks a note about cheaper workstation-class GPUs, since production reliability requirements don't apply yet.",
  infGpuOverride: "Leave this on Auto-recommend to let the tool pick the most efficient class for your workload. Only override it if you already own a specific GPU class and want to see how it performs.",
  avgInputTokens: "The typical length of what a user sends in, in tokens (~4 characters per token). 2,000 is a reasonable default for a chat-style prompt with some context; raise it for document-heavy use cases.",
  avgOutputTokens: "The typical length of the model's response, in tokens. 500 covers a solid paragraph-to-page answer; lower it for short-form chat, raise it for long-form generation.",
  kvBytesPerElement: "Precision used for the KV cache specifically (separate from the model weights). 2 bytes (FP16) is the safe default; dropping to 1 (FP8) saves memory but needs backend support to be accurate.",
  overheadPct: "A safety margin added on top of weights and KV cache for runtime/activation memory. 15% is a conservative default -- lower it only if you know your serving stack is unusually memory-efficient.",
  trainModel: "The model you're training or fine-tuning. If you're not sure yet, Llama 3.1 70B is a reasonable default for a mid-size production fine-tune.",
  taskType: "Full fine-tune updates every weight and needs the most memory; LoRA/PEFT trains a small adapter and needs far less. If you're unsure which you need, LoRA is the cheaper starting point for most use cases.",
  precision: "The numeric precision used during training. BF16 is the safe, widely-supported default; FP8 roughly halves memory and speeds up training but needs a model/stack that supports it well.",
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
    // capture phase + native listener: closes reliably regardless of any
    // stopPropagation elsewhere in the tree, and doesn't depend on a
    // backdrop element's own click handler or exact screen coverage
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


// exactly. If you change a number here, change it there too (and re-run the
// Validation tab) or the web tool and the reference workbook will disagree.
// ---------------------------------------------------------------------------

const MODELS = [
  { id: "llama31-8b", label: "Llama 3.1 8B Instruct", totalParamsB: 8.03, layers: 32, kvHeads: 8, headDim: 128, status: "VERIFIED" },
  { id: "llama31-70b", label: "Llama 3.1 70B Instruct", totalParamsB: 70.6, layers: 80, kvHeads: 8, headDim: 128, status: "VERIFIED" },
  { id: "llama31-405b", label: "Llama 3.1 405B Instruct", totalParamsB: 405, layers: 126, kvHeads: 8, headDim: 128, status: "VERIFIED" },
  { id: "llama33-70b", label: "Llama 3.3 70B Instruct", totalParamsB: 70.6, layers: 80, kvHeads: 8, headDim: 128, status: "VERIFIED" },
  { id: "mixtral-8x7b", label: "Mixtral 8x7B Instruct", totalParamsB: 46.7, layers: 32, kvHeads: 8, headDim: 128, status: "VERIFIED" },
  { id: "muse-glimmer-30b", label: "Meta Muse Glimmer 30B", totalParamsB: 29.6, layers: 52, kvHeads: 2, headDim: 128, status: "VERIFIED" },
  { id: "llama4-scout", label: "Llama 4 Scout 17B-16E", totalParamsB: 109, layers: 48, kvHeads: 8, headDim: 128, status: "VERIFIED" },
  { id: "llama4-maverick", label: "Llama 4 Maverick 17B-128E", totalParamsB: 402, layers: 48, kvHeads: 8, headDim: 128, status: "VERIFIED" },
  { id: "gemma3-27b", label: "Gemma 3 27B", totalParamsB: 27, layers: 62, kvHeads: 16, headDim: 128, status: "VERIFIED" },
  { id: "deepseek-v3", label: "DeepSeek V3", totalParamsB: 671, layers: 61, attentionType: "MLA", kvLoraRank: 512, qkRopeHeadDim: 64, status: "VERIFIED" },
  { id: "deepseek-r1", label: "DeepSeek R1", totalParamsB: 671, layers: 61, attentionType: "MLA", kvLoraRank: 512, qkRopeHeadDim: 64, status: "VERIFIED" },
  { id: "custom", label: "Custom model...", totalParamsB: null, layers: null, kvHeads: null, headDim: null, status: "CUSTOM" },
];

const GPU_SPECS = [
  { id: "A100", vram: 80, bf16: 312, fp8: null, anchor: 615, anchorPrecision: "BF16", confidence: "EST", source: "Derived from peak-FLOPS ratio vs H100; no official MLPerf Llama-2-70B submission exists for A100", nodeSize: 8 },
  { id: "H100", vram: 80, bf16: 989, fp8: 1979, anchor: 3902, anchorPrecision: "FP8", confidence: "LISTED", source: "MLCommons Inference v5.0, Dell PowerEdge XE9680 8xH100 (entry 5.0-0020): 31,216.8 tok/s offline / 8", nodeSize: 8 },
  { id: "H200", vram: 141, bf16: 989, fp8: 1979, anchor: 4373, anchorPrecision: "FP8", confidence: "LISTED", source: "MLCommons Inference v5.0, multiple official 8xH200 submissions cluster at ~34,700-34,988 tok/s / 8", nodeSize: 8 },
  { id: "B200", vram: 180, bf16: 2250, fp8: 4500, anchor: 12357, anchorPrecision: "FP4 (NVFP4)", confidence: "LISTED", source: "NVIDIA MLPerf v5.0 blog: 98,858 tok/s offline / 8 (entries 5.0-0056, 5.0-0060)", nodeSize: 8 },
  { id: "GB200 NVL72", vram: 186, bf16: 2250, fp8: 4500, anchor: 12022, anchorPrecision: "FP4 (NVFP4)", confidence: "LISTED-derived", source: "Microsoft Azure blog citing Signal65: 865,000 tok/s on one GB200 NVL72 rack (72 GPUs) / 72, MLPerf v5.1, unverified", nodeSize: 72 },
  { id: "B300", vram: 288, bf16: 2250, fp8: 5500, anchor: 15200, anchorPrecision: "FP4 (NVFP4)", confidence: "LISTED-derived", source: "Microsoft Azure blog citing Signal65: 1,100,000 tok/s on one GB300 NVL72 rack (72 GPUs) / 72, MLPerf v5.1, unverified, +/-5%", nodeSize: 8 },
];

const GPU_PRICE_USD = {
  A100: { amount: 18000, confidence: "EST", source: "Legacy generation -- not part of CDW's current DGX purchase line (starts at H200); rough estimate only, relevant mainly for GPUaaS/rental comparisons" },
  H100: { amount: 40000, confidence: "EST", source: "Legacy-adjacent -- not in the TCO Calculator's SYSTEMS registry; rough estimate only, relevant mainly for GPUaaS/rental comparisons" },
  H200: { amount: 68721, confidence: "LISTED", source: "TCO Calculator SYSTEMS registry: DGX H200 $549,764 / 8 GPUs (NVIDIA DGX TCO tool capture)" },
  B200: { amount: 93099, confidence: "LISTED", source: "TCO Calculator SYSTEMS registry: DGX B200 $744,793 / 8 GPUs (NVIDIA DGX TCO tool capture)" },
  "GB200 NVL72": { amount: 108909, confidence: "LISTED", source: "TCO Calculator SYSTEMS registry: DGX GB200 NVL-72 $7,841,432 / 72 GPUs (NVIDIA DGX TCO tool capture)" },
  B300: { amount: 105861, confidence: "LISTED", source: "TCO Calculator SYSTEMS registry: DGX B300 $846,885 / 8 GPUs (NVIDIA DGX TCO tool capture)" },
};

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
  if (!(inputs.targetTokPerUser > 0)) errors.push("Target tokens/sec per user must be greater than 0.");
  if (!(inputs.avgInputTokens >= 0)) errors.push("Avg input tokens can't be negative.");
  if (!(inputs.avgOutputTokens >= 0)) errors.push("Avg output tokens can't be negative.");
  if (inputs.avgInputTokens + inputs.avgOutputTokens <= 0) errors.push("Avg input + output tokens must add up to more than 0.");
  if (!(inputs.kvBytesPerElement > 0)) errors.push("KV cache precision (bytes/element) must be greater than 0.");
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
    ? { totalParamsB: inputs.customParamsB, layers: inputs.customLayers, kvHeads: inputs.customKvHeads, headDim: inputs.customHeadDim, status: "CUSTOM" }
    : inputs.model;

  const quantBytes = QUANT_BYTES[inputs.quant];
  const weightMemoryGB = model.totalParamsB * quantBytes;
  const avgTokens = inputs.avgInputTokens + inputs.avgOutputTokens;
  const kvBytesPerToken = model.attentionType === "MLA"
    ? model.layers * (model.kvLoraRank + model.qkRopeHeadDim) * inputs.kvBytesPerElement
    : 2 * model.layers * model.kvHeads * model.headDim * inputs.kvBytesPerElement;
  const kvCacheGBPerSeq = (kvBytesPerToken * avgTokens) / 1e9;
  const kvCacheTotalGB = kvCacheGBPerSeq * inputs.concurrentUsers;
  const runtimeOverheadGB = (weightMemoryGB + kvCacheTotalGB) * inputs.overheadPct;
  const totalMemoryGB = weightMemoryGB + kvCacheTotalGB + runtimeOverheadGB;
  const totalThroughputNeeded = inputs.concurrentUsers * inputs.targetTokPerUser;

  const candidates = GPU_SPECS.map((gpu) => {
    const gpusMem = ceilDiv(totalMemoryGB, gpu.vram);
    const gpusPerf = ceilDiv(totalThroughputNeeded, gpu.anchor);
    return { ...gpu, gpusMem, gpusPerf, gpusWorkload: Math.max(gpusMem, gpusPerf) };
  });

  const autoRecommended = candidates.reduce((best, c) => (c.gpusWorkload < best.gpusWorkload ? c : best), candidates[0]);
  const selected = inputs.gpuClassOverride === "Auto-recommend"
    ? autoRecommended
    : candidates.find((c) => c.id === inputs.gpuClassOverride);

  const lowerCost = candidates[0];
  const higherGrowth = candidates[candidates.length - 1];

  const confidence =
    model.status !== "VERIFIED"
      ? { level: "LOW", note: "Model architecture not yet verified (custom entry)" }
      : selected.id === "A100"
      ? { level: "MEDIUM", note: "Architecture verified; throughput anchor is an extrapolated estimate (no MLPerf submission exists)" }
      : { level: "HIGH", note: "Architecture verified; throughput anchor sourced from an official or independently-observed MLPerf submission" };

  const rtxGpusMem = ceilDiv(totalMemoryGB, RTX_SPEC.vram);
  const rtxGpusPerf = ceilDiv(totalThroughputNeeded, RTX_SPEC.anchor);
  const rtxWorkload = Math.max(rtxGpusMem, rtxGpusPerf);
  const rtxEligible = inputs.environment === "Dev/Test/POC" && rtxWorkload <= RTX_SPEC.maxWorkstationGPUs;
  const rtxAlt = {
    eligible: rtxEligible,
    class: RTX_SPEC.id,
    gpus: rtxWorkload,
    vram: RTX_SPEC.vram,
    overCap: rtxWorkload > RTX_SPEC.maxWorkstationGPUs,
  };

  function budgetFor(gpuId, deployedCount) {
    const price = GPU_PRICE_USD[gpuId];
    if (!price) return null;
    return { amount: deployedCount * price.amount, confidence: price.confidence, source: price.source };
  }
  const recommendedCount = Math.ceil(selected.gpusWorkload / selected.nodeSize) * selected.nodeSize;
  const lowerCostCount = Math.ceil(lowerCost.gpusWorkload / lowerCost.nodeSize) * lowerCost.nodeSize;
  const higherGrowthCount = Math.ceil(higherGrowth.gpusWorkload / higherGrowth.nodeSize) * higherGrowth.nodeSize;
  const budget = {
    recommended: budgetFor(selected.id, recommendedCount),
    lowerCost: budgetFor(lowerCost.id, lowerCostCount),
    higherGrowth: budgetFor(higherGrowth.id, higherGrowthCount),
  };

  function utilizationFor(gpuAnchor, deployedCount) {
    const capacity = deployedCount * gpuAnchor;
    return capacity > 0 ? Math.min(totalThroughputNeeded / capacity, 1) : 0;
  }
  const utilization = {
    recommended: utilizationFor(selected.anchor, recommendedCount),
    lowerCost: utilizationFor(lowerCost.anchor, lowerCostCount),
    higherGrowth: utilizationFor(higherGrowth.anchor, higherGrowthCount),
  };
  const workingDayHours = inputs.workingDayHours;
  const afterHours = 24 - workingDayHours;
  const idleGpuHoursAfterHours = recommendedCount * afterHours;
  const headroomGpuHoursDuringDay = recommendedCount * (1 - utilization.recommended) * workingDayHours;

  return {
    totalMemoryGB,
    totalThroughputNeeded,
    candidates,
    selectedClass: selected.id,
    selectedNodeSize: selected.nodeSize,
    minTechnical: selected.gpusWorkload,
    recommended: recommendedCount,
    lowerCost: { class: lowerCost.id, workload: lowerCost.gpusWorkload, recommended: lowerCostCount },
    higherGrowth: { class: higherGrowth.id, workload: higherGrowth.gpusWorkload, recommended: higherGrowthCount },
    confidence,
    rtxAlt,
    budget,
    utilization,
    workingDayHours,
    afterHours,
    idleGpuHoursAfterHours,
    headroomGpuHoursDuringDay,
  };
}

function computeTraining(inputs) {
  const model = inputs.model.id === "custom"
    ? { totalParamsB: inputs.customParamsB, status: "CUSTOM" }
    : inputs.model;

  const precisionBytes = inputs.precision === "FP8" ? 1 : 2;
  const multiplier = inputs.memMultiplierOverride || (inputs.taskType === "LoRA/PEFT" ? 2.5 : 18);
  const trainingMemoryGB = model.totalParamsB * precisionBytes * multiplier;
  const flopsRequired = 6 * model.totalParamsB * inputs.datasetTokensB * 1e18;
  const secondsTarget = inputs.targetDays * 86400;

  const candidates = GPU_SPECS.map((gpu) => {
    const peakTFLOPS = inputs.precision === "FP8" ? (gpu.fp8 ?? gpu.bf16) : gpu.bf16;
    const gpusFit = ceilDiv(trainingMemoryGB, gpu.vram);
    const achievableFlopsPerSec = peakTFLOPS * 1e12 * inputs.mfu;
    const gpusTime = ceilDiv(flopsRequired, achievableFlopsPerSec * secondsTarget);
    return { ...gpu, gpusFit, gpusTime, gpusWorkload: Math.max(gpusFit, gpusTime) };
  });

  const autoRecommended = candidates.reduce((best, c) => (c.gpusWorkload < best.gpusWorkload ? c : best), candidates[0]);
  const selected = inputs.gpuClassOverride === "Auto-recommend"
    ? autoRecommended
    : candidates.find((c) => c.id === inputs.gpuClassOverride);

  const lowerCost = candidates[0];
  const higherGrowth = candidates[candidates.length - 1];

  const confidence =
    model.status !== "VERIFIED"
      ? { level: "LOW", note: "Model architecture not yet verified (custom entry)" }
      : { level: "MEDIUM-HIGH", note: "Architecture verified; FLOPs are NVIDIA published spec-sheet values, MFU default sourced from Meta's Llama 3 paper" };

  const recommendedCount = Math.ceil(selected.gpusWorkload / selected.nodeSize) * selected.nodeSize;
  const lowerCostCount = Math.ceil(lowerCost.gpusWorkload / lowerCost.nodeSize) * lowerCost.nodeSize;
  const higherGrowthCount = Math.ceil(higherGrowth.gpusWorkload / higherGrowth.nodeSize) * higherGrowth.nodeSize;
  function budgetFor(gpuId, deployedCount) {
    const price = GPU_PRICE_USD[gpuId];
    if (!price) return null;
    return { amount: deployedCount * price.amount, confidence: price.confidence, source: price.source };
  }
  const budget = {
    recommended: budgetFor(selected.id, recommendedCount),
    lowerCost: budgetFor(lowerCost.id, lowerCostCount),
    higherGrowth: budgetFor(higherGrowth.id, higherGrowthCount),
  };

  return {
    trainingMemoryGB,
    flopsRequired,
    candidates,
    selectedClass: selected.id,
    selectedNodeSize: selected.nodeSize,
    minTechnical: selected.gpusWorkload,
    recommended: recommendedCount,
    lowerCost: { class: lowerCost.id, workload: lowerCost.gpusWorkload, recommended: lowerCostCount },
    higherGrowth: { class: higherGrowth.id, workload: higherGrowth.gpusWorkload, recommended: higherGrowthCount },
    confidence,
    budget,
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
      </label>
      {children}
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

function NumberInput({ value, onChange, min = 0, step = 1 }) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      step={step}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
      style={{ "--tw-ring-color": RED }}
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

  const visibleText = words.slice(0, count).join(" ");
  const atEnd = count >= words.length;

  return (
    <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
      <style>{`@keyframes sopBlink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }`}</style>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Sample output preview</span>
        <span className="text-xs font-semibold" style={{ color: RED }}>
          {rate > 0 ? `at ${rate} tok/s` : "set a rate above"}
        </span>
      </div>
      <div className="text-sm leading-relaxed min-h-[4.5rem]" style={{ color: CHARCOAL }}>
        {visibleText}
        {rate > 0 && !atEnd && (
          <span
            className="inline-block w-[3px] h-4 ml-0.5 align-middle"
            style={{ background: RED, animation: "sopBlink 1s step-start infinite" }}
          />
        )}
      </div>
    </div>
  );
}

function CopySummaryButton({ mode, result, modelLabel }) {
  const [copied, setCopied] = useState(false);

  function buildSummary() {
    const lines = [
      `CDW AI Factory -- GPU Sizing Summary (${mode})`,
      `Model: ${modelLabel}`,
      "",
      `Minimum technical: ${result.minTechnical} x ${result.selectedClass}`,
      `Recommended (production): ${result.recommended} x ${result.selectedClass}`,
      `Lower-cost alternative: ${result.lowerCost.recommended} x ${result.lowerCost.class}`,
      `Higher-growth alternative: ${result.higherGrowth.recommended} x ${result.higherGrowth.class}`,
      `Confidence: ${result.confidence.level} -- ${result.confidence.note}`,
    ];
    if (result.budget?.recommended) {
      lines.push(`Estimated hardware budget: ${fmtUsdPlain(result.budget.recommended.amount)} (same pricing basis as the TCO Calculator, not a quote)`);
    }
    if (mode === "Inference" && result.rtxAlt?.eligible) {
      lines.push(`Workstation alternative: ${result.rtxAlt.gpus} x ${result.rtxAlt.class}`);
    }
    if (mode === "Inference" && result.utilization) {
      lines.push(`Estimated utilization at recommended config: ${Math.round(result.utilization.recommended * 100)}%`);
      lines.push(`Idle GPU-hours/day after ${result.workingDayHours}h working day: ${result.idleGpuHoursAfterHours.toFixed(0)}`);
    }
    lines.push("", "Directional sizing estimate -- not a final BOM. Confirm with a CDW AI Factory specialist.");
    return lines.join("\n");
  }

  async function handleCopy() {
    const text = buildSummary();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        /* no-op */
      }
      document.body.removeChild(ta);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="mt-3 w-full text-sm font-semibold py-2.5 rounded-lg border transition-colors"
      style={{ borderColor: RED, color: copied ? "white" : RED, background: copied ? RED : "white" }}
    >
      {copied ? "Copied" : "Copy summary"}
    </button>
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

function ResultCard({ icon: Icon, title, gpuClass, gpus, subtitle, accent }) {
  return (
    <div
      className="rounded-xl p-5 flex-1 min-w-[220px]"
      style={{ background: accent ? CHARCOAL : "#F7F7F7", color: accent ? "white" : CHARCOAL }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4" style={{ color: accent ? RED : RED }} />
        <span className="text-xs font-bold uppercase tracking-wide" style={{ opacity: 0.8 }}>{title}</span>
      </div>
      <div className="text-3xl font-bold mb-1">{gpus} <span className="text-base font-normal">GPUs</span></div>
      <div className="text-sm font-semibold" style={{ color: accent ? "white" : CHARCOAL }}>{gpuClass}</div>
      {subtitle && <div className="text-xs mt-1" style={{ opacity: 0.7 }}>{subtitle}</div>}
    </div>
  );
}

function fmtUsd(n) {
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${Math.round(n / 1000)}K`;
}
function fmtUsdPlain(n) {
  return `$${Math.round(n).toLocaleString()}`;
}

function BudgetPanel({ budget }) {
  if (!budget?.recommended) return null;
  const legacyClass = budget.recommended.confidence === "EST";
  return (
    <div className="mb-6 rounded-xl p-4 border border-gray-200 bg-gray-50">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Estimated budget</span>
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-200 text-gray-600">{budget.recommended.confidence}</span>
      </div>
      <div className="text-2xl font-bold mb-1" style={{ color: CHARCOAL }}>
        {fmtUsd(budget.recommended.amount)}
      </div>
      <p className="text-xs text-gray-500">
        {legacyClass
          ? "Rough estimate only -- this class isn't part of CDW's current DGX purchase line, so there's no matching TCO Calculator figure to anchor to."
          : "Same pricing basis as the Cloud vs On-Prem TCO Calculator (system + software suite + fabrics + professional services)."}{" "}
        Excludes cluster management nodes, racks, power/cooling, and ongoing operations -- not a quote. See the
        TCO Calculator for full lifecycle cost, or confirm with a CDW AI Factory specialist.
      </p>
    </div>
  );
}

function UtilizationBar({ label, gpuClass, pct }) {
  const pctDisplay = Math.round(pct * 100);
  const color = pct > 0.85 ? "#B00000" : pct > 0.5 ? RED : "#999";
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
  const u = result.utilization;
  if (!u) return null;
  return (
    <div className="mb-6 rounded-xl p-4 border border-gray-200">
      <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-3">Utilization</div>

      <UtilizationBar label="Recommended" gpuClass={result.selectedClass} pct={u.recommended} />
      <UtilizationBar label="Lower-cost alt" gpuClass={result.lowerCost.class} pct={u.lowerCost} />
      <UtilizationBar label="Higher-growth alt" gpuClass={result.higherGrowth.class} pct={u.higherGrowth} />
      <p className="text-xs text-gray-500 mt-2 mb-4">
        Same estimated workload, different classes -- a lower utilization % at a higher-growth class isn't
        waste, it's headroom bought on purpose. A right-sized class runs closer to full.
      </p>

      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold" style={{ color: CHARCOAL }}>Length of working day</span>
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={workingDayHours}
            min={0}
            max={24}
            step={1}
            onChange={(e) => onWorkingDayHoursChange(parseFloat(e.target.value) || 0)}
            className="w-14 border border-gray-300 rounded px-1.5 py-1 text-xs text-right"
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

function PodSizingHandoff() {
  return (
    <div className="mb-6 rounded-xl p-4 border border-dashed border-gray-300 bg-gray-50 flex items-center justify-between gap-3">
      <div>
        <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-0.5">Next: Pod Sizing</div>
        <div className="text-xs text-gray-500">Full deployment build-out -- networking, storage, power. Coming soon.</div>
      </div>
      <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-200 text-gray-500 flex-shrink-0">Coming soon</span>
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

function getInitialInfModel() {
  const params = getIncomingParams();
  const modelId = params?.get("model");
  if (!modelId) return MODELS[1];
  const match = MODELS.find((m) => m.id === modelId);
  return match || MODELS[1];
}

function GPUSizingCalculatorInner() {
  const { isLoggedIn, needsSetup, account, logDownloadEvent } = useAuth();

  const [mode, setMode] = useState(getInitialMode);
  const [pathLevel, setPathLevel] = useState("simple");
  const [sourceUseCase] = useState(getInitialSourceUseCase);
  const [incomingWorkloadType] = useState(getInitialWorkloadType);
  const [incomingModelId] = useState(() => getIncomingParams()?.get("model") || null);

  const [infModel, setInfModel] = useState(getInitialInfModel);
  const [quant, setQuant] = useState("FP8");
  const [concurrentUsers, setConcurrentUsers] = useState(100);
  const [targetTokPerUser, setTargetTokPerUser] = useState(30);
  const [environment, setEnvironment] = useState("Production");
  const [avgInputTokens, setAvgInputTokens] = useState(2000);
  const [avgOutputTokens, setAvgOutputTokens] = useState(500);
  const [kvBytesPerElement, setKvBytesPerElement] = useState(2);
  const [overheadPct, setOverheadPct] = useState(0.15);
  const [infGpuOverride, setInfGpuOverride] = useState("Auto-recommend");
  const [customParamsB, setCustomParamsB] = useState(70);
  const [customLayers, setCustomLayers] = useState(80);
  const [customKvHeads, setCustomKvHeads] = useState(8);
  const [customHeadDim, setCustomHeadDim] = useState(128);
  const [workingDayHours, setWorkingDayHours] = useState(10);

  const [trainModel, setTrainModel] = useState(MODELS[1]);
  const [taskType, setTaskType] = useState("Full fine-tune");
  const [precision, setPrecision] = useState("BF16");
  const [datasetTokensB, setDatasetTokensB] = useState(50);
  const [targetDays, setTargetDays] = useState(14);
  const [mfu, setMfu] = useState(0.4);
  const [trainGpuOverride, setTrainGpuOverride] = useState("Auto-recommend");

  const [view, setView] = useState("calc");
  const [lead, setLead] = useState({ name: "", company: "", email: "" });
  const [leadStatus, setLeadStatus] = useState("");

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
  const modelLabel = mode === "Inference" ? infModel.label : trainModel.label;

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
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`@media print { .no-print { display: none !important; } body { background: #fff; } }`}</style>
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4 flex items-center gap-3">
        <a href="/" className="flex-shrink-0" aria-label="AI Factory Tools home">
          <img src={cdwLogo} alt="CDW" className="h-9 w-auto" />
        </a>
        <div>
          <div className="text-xs font-bold tracking-wide" style={{ color: RED }}>AI FACTORY TOOLS</div>
          <div className="text-lg font-bold" style={{ color: CHARCOAL }}>GPU Sizing Tool</div>
        </div>
        <span className="ml-auto text-xs font-bold px-2 py-1 rounded" style={{ background: RED, color: "white" }}>PROTOTYPE v1.15</span>
      </div>

      <div className="no-print border-b border-gray-100 px-6 py-2 flex items-center justify-end">
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
              <button
                onClick={submitLead}
                className="flex-1 text-sm font-bold py-2.5 rounded-lg text-white"
                style={{ background: RED }}
              >
                View my report
              </button>
              <button
                onClick={() => setView("calc")}
                className="text-sm font-semibold py-2.5 px-4 rounded-lg border border-gray-300 text-gray-600"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      )}

      {view === "report" && result && (
        <div className="max-w-3xl mx-auto px-6 py-10">
          <div className="no-print flex gap-2 mb-6">
            <button
              onClick={() => window.print()}
              className="flex-1 text-sm font-bold py-2.5 rounded-lg text-white"
              style={{ background: CHARCOAL }}
            >
              Print / Save as PDF
            </button>
            <button
              onClick={() => setView("calc")}
              className="text-sm font-semibold py-2.5 px-4 rounded-lg border border-gray-300 text-gray-600"
            >
              Back to calculator
            </button>
          </div>

          <div className="flex items-center gap-3 mb-2">
            <img src={cdwLogo} alt="CDW" className="h-8 w-auto" />
            <div className="text-xs font-bold tracking-widest text-gray-500 uppercase">AI Factory &middot; GPU Sizing Report</div>
          </div>
          <div className="text-2xl font-bold mb-1" style={{ color: CHARCOAL }}>
            Prepared for {lead.name || "you"}{lead.company ? `, ${lead.company}` : ""}
          </div>
          <div className="text-xs text-gray-500 mb-6">
            {new Date().toLocaleDateString()} &middot; {mode} sizing &middot; {modelLabel}
          </div>

          <div className="mb-6">
            <ConfidenceBadge level={result.confidence.level} />
            <p className="text-xs text-gray-500 mt-2">{result.confidence.note}</p>
          </div>

          <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Recommended configuration</div>
          <div className="flex flex-wrap gap-3 mb-6">
            <ResultCard icon={Cpu} title="Minimum technical" gpuClass={result.selectedClass} gpus={result.minTechnical} subtitle="Unrounded workload requirement" />
            <ResultCard icon={Zap} title="Recommended" gpuClass={result.selectedClass} gpus={result.recommended} subtitle="Node-rounded for production" accent />
          </div>

          <BudgetPanel budget={result.budget} />

          {mode === "Inference" && (
            <UtilizationPanel result={result} workingDayHours={workingDayHours} onWorkingDayHoursChange={setWorkingDayHours} />
          )}

          <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2 mt-6">Assumptions used</div>
          <div className="rounded-xl border border-gray-200 p-4 mb-6 text-sm" style={{ color: CHARCOAL }}>
            <div className="grid grid-cols-2 gap-y-1.5 gap-x-4">
              <div className="text-gray-500">Model</div><div>{modelLabel}</div>
              {mode === "Inference" ? (
                <>
                  <div className="text-gray-500">Quantization</div><div>{quant}</div>
                  <div className="text-gray-500">Peak concurrent users</div><div>{concurrentUsers.toLocaleString()}</div>
                  <div className="text-gray-500">Target tokens/sec per user</div><div>{targetTokPerUser}</div>
                  <div className="text-gray-500">Environment</div><div>{environment}</div>
                  <div className="text-gray-500">Avg input / output tokens</div><div>{avgInputTokens.toLocaleString()} / {avgOutputTokens.toLocaleString()}</div>
                  <div className="text-gray-500">KV cache precision</div><div>{kvBytesPerElement} bytes/element</div>
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
            <ResultCard icon={TrendingDown} title="Lower-cost alternative" gpuClass={result.lowerCost.class} gpus={result.lowerCost.recommended} />
            <ResultCard icon={TrendingUp} title="Higher-growth alternative" gpuClass={result.higherGrowth.class} gpus={result.higherGrowth.recommended} />
          </div>

          {mode === "Inference" && environment === "Dev/Test/POC" && result.rtxAlt.eligible && (
            <div className="mb-6 rounded-xl p-4 bg-blue-50 border border-blue-200">
              <div className="text-xs font-bold uppercase tracking-wide text-blue-800 mb-1">Workstation alternative</div>
              <div className="text-lg font-bold text-blue-900 mb-1">
                {result.rtxAlt.gpus} &times; {result.rtxAlt.class} ({result.rtxAlt.vram}GB)
              </div>
              <p className="text-xs text-blue-800">
                Dev/Test/POC workload fits within {RTX_SPEC.maxWorkstationGPUs} workstation-class cards. Estimate only --
                no MLPerf datacenter submission exists for this class.
              </p>
            </div>
          )}

          <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Caveats &amp; methodology</div>
          <div className="text-xs text-gray-500 p-4 bg-gray-50 rounded-lg mb-6 leading-relaxed">
            {mode === "Inference"
              ? `Total memory required: ${result.totalMemoryGB.toFixed(1)} GB (weights + KV cache + overhead). Total throughput needed: ${result.totalThroughputNeeded.toLocaleString()} tok/s. GPU count = max(memory-bound, performance-bound), rounded to a ${result.selectedNodeSize}-GPU node.`
              : `Training memory required: ${result.trainingMemoryGB.toFixed(1)} GB. GPU count = max(GPUs to fit the model, GPUs to hit the time target), rounded to a ${result.selectedNodeSize}-GPU node.`}
            {" "}A workload needing fewer GPUs than one node still shows a node-rounded recommendation, since systems
            are deployed as whole nodes. This is a directional sizing estimate, not a final bill of materials --
            confirm with a CDW AI Factory specialist before purchasing.
          </div>

          <div className="border-t-2 pt-4 flex justify-between" style={{ borderColor: CHARCOAL }}>
            <div>
              <div className="text-sm font-bold" style={{ color: CHARCOAL }}>Jay B. Carlile</div>
              <div className="text-xs text-gray-500">AI Solutions Executive &middot; CDW AI Factory</div>
            </div>
            <div className="text-xs text-gray-500 text-right">Next step: bring your actual<br />workload data for a validated sizing</div>
          </div>
        </div>
      )}

      {view === "calc" && (
      <div className="max-w-5xl mx-auto px-6 py-8">
        {(sourceUseCase || incomingModelId) && (
          <div className="mb-6 text-sm rounded-lg px-4 py-3" style={{ background: "#F5F5F5", border: "1px solid #ddd", color: "#444" }}>
            {incomingModelId && !sourceUseCase && (
              <>Model pre-set to <strong>{incomingModelId}</strong>, carried over from Model Advisor. Adjust anything below to refine the estimate.</>
            )}
            {sourceUseCase && (
              <>
                Arrived from Use Case Explorer ({sourceUseCase}).{" "}
                {incomingWorkloadType && /simulation|molecular|genomics|geospatial|vision|avatar|analytics-acceleration|scanning|pipeline|optimization|mlops|serving|governance|rendering/.test(incomingWorkloadType) ? (
                  <>This workload type ({incomingWorkloadType}) isn't fully represented in this calculator yet -- it's scoped for LLM inference and training today. Use the numbers below as a rough compute-scale reference, and confirm with a CDW AI Factory specialist for this workload.</>
                ) : (
                  <>Mode pre-set to <strong>{mode}</strong> based on that use case. Adjust anything below to refine the estimate.</>
                )}
              </>
            )}
          </div>
        )}
        {/* Mode toggle */}
        <div className="flex gap-2 mb-6">
          {["Inference", "Training"].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="px-5 py-2 rounded-lg text-sm font-bold transition-colors"
              style={
                mode === m
                  ? { background: RED, color: "white" }
                  : { background: "#F2F2F2", color: CHARCOAL }
              }
            >
              {m === "Inference" ? "Inference sizing" : "Training / fine-tuning sizing"}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Inputs */}
          <div>
            <div className="flex gap-4 mb-4 border-b border-gray-200">
              {["simple", "advanced"].map((p) => (
                <button
                  key={p}
                  onClick={() => setPathLevel(p)}
                  className="pb-2 text-sm font-semibold capitalize"
                  style={
                    pathLevel === p
                      ? { color: RED, borderBottom: `2px solid ${RED}` }
                      : { color: "#999" }
                  }
                >
                  {p} path
                </button>
              ))}
            </div>

            {mode === "Inference" ? (
              <>
                <Field label="Model" tipKey="infModel">
                  <Select
                    value={infModel.id}
                    onChange={(id) => setInfModel(MODELS.find((m) => m.id === id))}
                    options={MODELS.map((m) => m.id)}
                  />
                  <div className="text-xs text-gray-500 mt-1">{infModel.label}</div>
                </Field>

                {infModel.id === "custom" && (
                  <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <Field label="Params (B)"><NumberInput value={customParamsB} onChange={setCustomParamsB} /></Field>
                    <Field label="Layers"><NumberInput value={customLayers} onChange={setCustomLayers} /></Field>
                    <Field label="KV heads"><NumberInput value={customKvHeads} onChange={setCustomKvHeads} /></Field>
                    <Field label="Head dim"><NumberInput value={customHeadDim} onChange={setCustomHeadDim} /></Field>
                  </div>
                )}

                <Field label="Quantization" tipKey="quant"><Select value={quant} onChange={setQuant} options={["FP16", "FP8", "FP4"]} /></Field>
                <Field label="Peak concurrent users" tipKey="concurrentUsers" hint="Concurrent generating sessions, not total licensed users">
                  <NumberInput value={concurrentUsers} onChange={setConcurrentUsers} />
                </Field>
                <Field label="Target tokens/sec per user" tipKey="targetTokPerUser"><NumberInput value={targetTokPerUser} onChange={setTargetTokPerUser} /></Field>
                <SampleOutputPreview tokPerSec={targetTokPerUser} />
                <Field label="Environment" tipKey="environment"><Select value={environment} onChange={setEnvironment} options={["Production", "Dev/Test/POC"]} /></Field>
                <Field label="GPU class" tipKey="infGpuOverride"><Select value={infGpuOverride} onChange={setInfGpuOverride} options={["Auto-recommend", ...GPU_SPECS.map((g) => g.id)]} /></Field>

                {pathLevel === "advanced" && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <Field label="Avg input tokens" tipKey="avgInputTokens"><NumberInput value={avgInputTokens} onChange={setAvgInputTokens} /></Field>
                    <Field label="Avg output tokens" tipKey="avgOutputTokens"><NumberInput value={avgOutputTokens} onChange={setAvgOutputTokens} /></Field>
                    <Field label="KV cache precision (bytes/element)" tipKey="kvBytesPerElement"><NumberInput value={kvBytesPerElement} onChange={setKvBytesPerElement} step={1} /></Field>
                    <Field label="Runtime/activation overhead %"><NumberInput value={overheadPct} onChange={setOverheadPct} step={0.01} /></Field>
                  </div>
                )}
              </>
            ) : (
              <>
                <Field label="Model" tipKey="trainModel">
                  <Select
                    value={trainModel.id}
                    onChange={(id) => setTrainModel(MODELS.find((m) => m.id === id))}
                    options={MODELS.map((m) => m.id)}
                  />
                  <div className="text-xs text-gray-500 mt-1">{trainModel.label}</div>
                </Field>

                {trainModel.id === "custom" && (
                  <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <Field label="Params (B)"><NumberInput value={customParamsB} onChange={setCustomParamsB} /></Field>
                  </div>
                )}

                <Field label="Task type" tipKey="taskType"><Select value={taskType} onChange={setTaskType} options={["Pretraining", "Full fine-tune", "LoRA/PEFT"]} /></Field>
                <Field label="Precision" tipKey="precision"><Select value={precision} onChange={setPrecision} options={["BF16", "FP8"]} /></Field>
                <Field label="Dataset size (billions of tokens)" tipKey="datasetTokensB"><NumberInput value={datasetTokensB} onChange={setDatasetTokensB} /></Field>
                <Field label="Target time to train (days)" tipKey="targetDays"><NumberInput value={targetDays} onChange={setTargetDays} /></Field>
                <Field label="GPU class" tipKey="infGpuOverride"><Select value={trainGpuOverride} onChange={setTrainGpuOverride} options={["Auto-recommend", ...GPU_SPECS.map((g) => g.id)]} /></Field>

                {pathLevel === "advanced" && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <Field label="MFU (achieved % of peak FLOPs)" tipKey="mfu" hint="Sourced default: Meta's Llama 3 paper reports 38-43% BF16 MFU at 16K-GPU scale">
                      <NumberInput value={mfu} onChange={setMfu} step={0.01} />
                    </Field>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Results */}
          <div>
            {errors.length > 0 ? (
              <div className="rounded-xl p-5 bg-red-50 border border-red-200">
                <div className="text-xs font-bold uppercase tracking-wide text-red-800 mb-2">Fix these before sizing</div>
                <ul className="text-sm text-red-900 space-y-1.5 list-disc list-inside">
                  {errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            ) : (
            <>
            <div className="mb-4">
              <ConfidenceBadge level={result.confidence.level} />
              <p className="text-xs text-gray-500 mt-2 flex items-start gap-1">
                <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                {result.confidence.note}
              </p>
            </div>

            <div className="flex flex-wrap gap-3 mb-4">
              <ResultCard icon={Cpu} title="Minimum technical" gpuClass={result.selectedClass} gpus={result.minTechnical} subtitle="Unrounded workload requirement" />
              <ResultCard icon={Zap} title="Recommended" gpuClass={result.selectedClass} gpus={result.recommended} subtitle="Node-rounded for production" accent />
            </div>

            <div className="flex flex-wrap gap-3 mb-6">
              <ResultCard icon={TrendingDown} title="Lower-cost alternative" gpuClass={result.lowerCost.class} gpus={result.lowerCost.recommended} />
              <ResultCard icon={TrendingUp} title="Higher-growth alternative" gpuClass={result.higherGrowth.class} gpus={result.higherGrowth.recommended} />
            </div>

            <BudgetPanel budget={result.budget} />

            {mode === "Inference" && (
              <UtilizationPanel result={result} workingDayHours={workingDayHours} onWorkingDayHoursChange={setWorkingDayHours} />
            )}

            {mode === "Inference" && environment === "Dev/Test/POC" && (
              <div className="mb-4">
                {result.rtxAlt.eligible ? (
                  <div className="rounded-xl p-4 bg-blue-50 border border-blue-200">
                    <div className="flex items-center gap-2 mb-1">
                      <Cpu className="w-4 h-4 text-blue-700" />
                      <span className="text-xs font-bold uppercase tracking-wide text-blue-800">Workstation alternative</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-900 mb-1">
                      {result.rtxAlt.gpus} <span className="text-sm font-normal">x {result.rtxAlt.class} ({result.rtxAlt.vram}GB)</span>
                    </div>
                    <p className="text-xs text-blue-800">
                      Dev/Test/POC workload fits within {RTX_SPEC.maxWorkstationGPUs} workstation-class cards. Anchor is an
                      estimate (no MLPerf datacenter submission exists for this class) -- treat as directional, and note
                      PCIe-only scaling means this doesn't hold up as a substitute past a small card count.
                    </p>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-600">
                    Dev/Test/POC environment, but this workload would need more than {RTX_SPEC.maxWorkstationGPUs}{" "}
                    {RTX_SPEC.id} cards ({result.rtxAlt.gpus} required) -- past that point data-center class is the
                    more sensible recommendation even for non-production use.
                  </div>
                )}
              </div>
            )}

            <div className="text-xs text-gray-500 p-3 bg-gray-50 rounded-lg mb-4">
              <strong>Methodology:</strong> {mode === "Inference"
                ? `Total memory required: ${result.totalMemoryGB.toFixed(1)} GB (weights + KV cache + overhead). Total throughput needed: ${result.totalThroughputNeeded.toLocaleString()} tok/s. GPU count = max(memory-bound, performance-bound), rounded to a ${result.selectedNodeSize}-GPU node.`
                : `Training memory required: ${result.trainingMemoryGB.toFixed(1)} GB. GPU count = max(GPUs to fit the model, GPUs to hit the time target), rounded to a ${result.selectedNodeSize}-GPU node.`}
              {" "}A workload needing fewer GPUs than one node still shows a node-rounded recommendation, since systems are deployed as whole nodes ({result.selectedNodeSize === 72 ? "GB200 NVL72 ships as one 72-GPU rack, not divisible smaller" : "8-GPU DGX nodes for this class"}).
            </div>

            <PodSizingHandoff />

            <button
              onClick={requestReport}
              className="mt-3 w-full text-sm font-bold py-2.5 rounded-lg text-white"
              style={{ background: RED }}
            >
              Get the full sizing report
            </button>

            <CopySummaryButton mode={mode} result={result} modelLabel={modelLabel} />
            </>
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

export default function GPUSizingCalculator() {
  return (
    <AuthProvider>
      <GPUSizingCalculatorInner />
    </AuthProvider>
  );
}
