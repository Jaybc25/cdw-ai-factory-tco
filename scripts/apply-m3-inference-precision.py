from pathlib import Path


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one match, found {count}")
    return text.replace(old, new, 1)


def replace_all_exact(text, old, new, expected, label):
    count = text.count(old)
    if count != expected:
        raise SystemExit(f"{label}: expected {expected} matches, found {count}")
    return text.replace(old, new)

# 1) Add an explicit precision methodology next to the existing model-aware
# throughput methodology. The ratios are first-party NVIDIA dense Tensor Core
# capacity ratios and are deliberately only downward guardrails from the loaded
# benchmark precision; they are not presented as precision-matched benchmarks.
p = Path("src/modelSizingMethodology.js")
s = p.read_text()
anchor = '''export const INFERENCE_REFERENCE_MODEL = Object.freeze({
  label: "Llama 2 70B",
  activeParamsB: 70,
  source: "https://developer.nvidia.com/blog/nvidia-blackwell-delivers-massive-performance-leaps-in-mlperf-inference-v5-0/",
});
'''
addition = anchor + '''
// M3 precision guardrail for inference throughput anchors.
//
// Current Blackwell throughput anchors are empirical FP4/NVFP4 MLPerf results.
// Reusing those token-throughput numbers unchanged for FP8 or FP16 would imply
// precision-invariant performance that the evidence does not support. Until a
// precision-matched LLM benchmark is loaded, scale only downward using NVIDIA's
// published *dense* Tensor Core peak ratios for the corresponding platform.
// This is intentionally a conservative planning guardrail, not a claim that
// application token throughput scales linearly with peak FLOPS.
export const INFERENCE_PRECISION_PROFILES = Object.freeze({
  B200: Object.freeze({
    anchorPrecision: "FP4",
    scales: Object.freeze({ FP4: 1, FP8: 0.5, FP16: 0.25 }),
    source: "NVIDIA HGX B200 specifications: dense FP4 72 PFLOPS/system; dense FP8 36 PFLOPS/system; dense FP16/BF16 18 PFLOPS/system.",
  }),
  "GB200 NVL72": Object.freeze({
    anchorPrecision: "FP4",
    scales: Object.freeze({ FP4: 1, FP8: 0.5, FP16: 0.25 }),
    source: "NVIDIA GB200 NVL72 specifications: dense NVFP4 720 PFLOPS/rack; dense FP8 360 PFLOPS/rack; dense FP16/BF16 180 PFLOPS/rack.",
  }),
  B300: Object.freeze({
    anchorPrecision: "FP4",
    scales: Object.freeze({ FP4: 1, FP8: 1 / 3, FP16: 1 / 6 }),
    source: "NVIDIA HGX/DGX B300 specifications: dense FP4 108 PFLOPS/system; dense FP8 36 PFLOPS/system; dense FP16/BF16 18 PFLOPS/system.",
  }),
  "GB300 NVL72": Object.freeze({
    anchorPrecision: "FP4",
    scales: Object.freeze({ FP4: 1, FP8: 1 / 3, FP16: 1 / 6 }),
    source: "NVIDIA GB300 NVL72 specifications: dense FP4 1,080 PFLOPS/rack; dense FP8 360 PFLOPS/rack; dense FP16/BF16 180 PFLOPS/rack.",
  }),
});

export function getInferencePrecisionScale(gpuId, quant) {
  const profile = INFERENCE_PRECISION_PROFILES[gpuId];
  if (!profile) {
    return {
      factor: 1,
      anchorPrecision: null,
      selectedPrecision: quant,
      confidence: "LOW",
      basis: `No precision profile is loaded for ${gpuId}; no precision-specific throughput adjustment is applied.`,
      source: null,
    };
  }

  const factor = profile.scales[quant];
  if (!Number.isFinite(factor) || factor <= 0 || factor > 1) {
    throw new Error(`${gpuId} has no valid inference precision scale for ${quant}.`);
  }

  const matched = quant === profile.anchorPrecision;
  return {
    factor,
    anchorPrecision: profile.anchorPrecision,
    selectedPrecision: quant,
    confidence: matched ? "BENCHMARK-MATCHED" : "DERIVED",
    basis: matched
      ? `${quant} matches the loaded ${profile.anchorPrecision} benchmark precision; no precision penalty is applied.`
      : `${quant} differs from the loaded ${profile.anchorPrecision} benchmark precision; throughput is conservatively capped at ${(factor * 100).toFixed(1)}% of the benchmark anchor using NVIDIA published dense Tensor Core peak ratios. This is a guardrail, not a precision-matched token benchmark.`,
    source: profile.source,
  };
}
'''
s = replace_once(s, anchor, addition, "precision methodology insertion")
p.write_text(s)

# 2) Wire precision scale into production inference sizing and audit/report text.
p = Path("src/GpuSizingCalculator.jsx")
s = p.read_text()
s = replace_once(
    s,
    'import { getInferenceSequenceStateMemory, getInferenceThroughputScale, getTrainingMemoryModel, getTrainingParameterSemantics } from "./modelSizingMethodology.js";',
    'import { getInferencePrecisionScale, getInferenceSequenceStateMemory, getInferenceThroughputScale, getTrainingMemoryModel, getTrainingParameterSemantics } from "./modelSizingMethodology.js";',
    "calculator methodology import",
)
s = replace_once(
    s,
    '''  const candidates = GPU_SPECS.map((gpu) => {
    const effectiveAnchor = gpu.anchor * throughputScale.factor;
    const gpusMemExact = totalMemoryGB / gpu.vram;
    const gpusPerfExact = totalThroughputNeeded / effectiveAnchor;
    const gpusMem = Math.ceil(gpusMemExact);
    const gpusPerf = Math.ceil(gpusPerfExact);
    return { ...gpu, effectiveAnchor, gpusMem, gpusPerf, gpusWorkloadExact: Math.max(gpusMemExact, gpusPerfExact), gpusWorkload: Math.max(gpusMem, gpusPerf) };
  });''',
    '''  const candidates = GPU_SPECS.map((gpu) => {
    const precisionScale = getInferencePrecisionScale(gpu.id, inputs.quant);
    const effectiveAnchor = gpu.anchor * throughputScale.factor * precisionScale.factor;
    const gpusMemExact = totalMemoryGB / gpu.vram;
    const gpusPerfExact = totalThroughputNeeded / effectiveAnchor;
    const gpusMem = Math.ceil(gpusMemExact);
    const gpusPerf = Math.ceil(gpusPerfExact);
    return { ...gpu, precisionScale, effectiveAnchor, gpusMem, gpusPerf, gpusWorkloadExact: Math.max(gpusMemExact, gpusPerfExact), gpusWorkload: Math.max(gpusMem, gpusPerf) };
  });''',
    "precision scale wiring",
)
s = replace_once(
    s,
    '''  const confidence =
    model.status !== "VERIFIED"
      ? { level: "LOW", note: "Model architecture not yet verified (custom entry); hardware reference anchors are not treated as model-specific throughput." }
      : { level: "MEDIUM", note: `${throughputScale.basis} GPU anchors remain hardware benchmark references rather than universal model-specific throughput.` };''',
    '''  const confidence =
    model.status !== "VERIFIED"
      ? { level: "LOW", note: "Model architecture not yet verified (custom entry); hardware reference anchors are not treated as model-specific throughput." }
      : { level: "MEDIUM", note: `${throughputScale.basis} ${selected.precisionScale.basis} GPU anchors remain hardware benchmark references rather than universal model-specific throughput.` };''',
    "inference confidence note",
)
old_methodology = 'Hardware benchmark anchors are model-adjusted conservatively for active compute; no automatic speedup is granted below the 70B reference.'
new_methodology = 'Hardware benchmark anchors are adjusted conservatively for active compute and, when selected precision differs from benchmark precision, by a downward NVIDIA dense Tensor Core peak-ratio guardrail; no automatic speedup is granted below the 70B reference.'
s = replace_all_exact(s, old_methodology, new_methodology, 2, "inference methodology copy")
s = replace_once(
    s,
    '<AuditFormula label="Model-aware throughput adjustment" formula="effectiveAnchor = hardwareAnchor × min(1, 70B ÷ activeComputeParamsB)" substituted={`= hardware anchor × ${result.throughputScale.factor.toFixed(3)} (${result.throughputScale.activeParamsB ?? "unknown"}B active params)`} result={result.throughputScale.factor < 1 ? "Conservative throughput penalty applied" : "No inferred speedup applied"} />',
    '<AuditFormula label="Model-aware throughput scale" formula="modelScale = min(1, 70B ÷ activeComputeParamsB)" substituted={`= ${result.throughputScale.factor.toFixed(3)} (${result.throughputScale.activeParamsB ?? "unknown"}B active params)`} result={result.throughputScale.factor < 1 ? "Conservative model-size penalty applied" : "No inferred model-size speedup applied"} />\n                <AuditFormula label={`Precision throughput guardrail (${quant})`} formula="precisionScale = selectedPrecisionPeak ÷ benchmarkPrecisionPeak (capped at 1.0)" substituted={`= ${selected.precisionScale.factor.toFixed(3)} vs ${selected.precisionScale.anchorPrecision} benchmark`} result={selected.precisionScale.factor < 1 ? "Downward precision guardrail applied" : "Benchmark precision matched"} />\n                <AuditFormula label="Effective throughput anchor" formula="effectiveAnchor = hardwareAnchor × modelScale × precisionScale" substituted={`= ${selected.anchor.toLocaleString()} × ${result.throughputScale.factor.toFixed(3)} × ${selected.precisionScale.factor.toFixed(3)}`} result={`${Math.round(selected.effectiveAnchor).toLocaleString()} tok/s`} />',
    "audit precision formula",
)
s = replace_once(
    s,
    '<AuditRow label="Hardware throughput anchor" value={`${selected.anchor.toLocaleString()} tok/s (${selected.anchorPrecision})`} sub={`Confidence: ${selected.confidence} -- ${selected.source}`} />\n                    <AuditRow label="Model-adjusted effective anchor" value={`${Math.round(selected.effectiveAnchor).toLocaleString()} tok/s`} sub={result.throughputScale.basis} />',
    '<AuditRow label="Hardware throughput anchor" value={`${selected.anchor.toLocaleString()} tok/s (${selected.anchorPrecision})`} sub={`Confidence: ${selected.confidence} -- ${selected.source}`} />\n                    <AuditRow label={`Precision guardrail (${quant})`} value={`×${selected.precisionScale.factor.toFixed(3)}`} sub={`${selected.precisionScale.basis} ${selected.precisionScale.source || ""}`.trim()} />\n                    <AuditRow label="Effective throughput anchor" value={`${Math.round(selected.effectiveAnchor).toLocaleString()} tok/s`} sub={result.throughputScale.basis} />',
    "audit source precision row",
)
p.write_text(s)

# 3) Extend the existing quality-gated methodology validator so precision
# mismatch cannot silently return to factor=1.
p = Path("scripts/validate_model_sizing_methodology.mjs")
s = p.read_text()
s = replace_once(
    s,
    '  FULL_MODEL_TRAINING_STATE_BYTES_PER_PARAM,\n  getInferenceThroughputScale,',
    '  FULL_MODEL_TRAINING_STATE_BYTES_PER_PARAM,\n  getInferencePrecisionScale,\n  getInferenceThroughputScale,',
    "validator import",
)
s = replace_once(
    s,
    '''if (getInferenceThroughputScale(sparse120a12).factor > 1) {
  throw new Error("Sparse/small-active models must not receive an unsupported inferred throughput uplift.");
}
''',
    '''if (getInferenceThroughputScale(sparse120a12).factor > 1) {
  throw new Error("Sparse/small-active models must not receive an unsupported inferred throughput uplift.");
}

approx(getInferencePrecisionScale("B200", "FP4").factor, 1);
approx(getInferencePrecisionScale("B200", "FP8").factor, 0.5);
approx(getInferencePrecisionScale("B200", "FP16").factor, 0.25);
approx(getInferencePrecisionScale("GB200 NVL72", "FP8").factor, 0.5);
approx(getInferencePrecisionScale("B300", "FP8").factor, 1 / 3);
approx(getInferencePrecisionScale("B300", "FP16").factor, 1 / 6);
approx(getInferencePrecisionScale("GB300 NVL72", "FP8").factor, 1 / 3);
if (getInferencePrecisionScale("B200", "FP8").factor >= getInferencePrecisionScale("B200", "FP4").factor) {
  throw new Error("FP8 must not reuse the B200 FP4 benchmark anchor unchanged.");
}
''',
    "validator precision assertions",
)
s = replace_once(
    s,
    '  "gpu.anchor * throughputScale.factor",',
    '  "getInferencePrecisionScale(gpu.id, inputs.quant)",\n  "gpu.anchor * throughputScale.factor * precisionScale.factor",',
    "validator production wiring contract",
)
s = replace_once(
    s,
    '''if (gpuSizingSource.includes("trainingSemantics.residencyParamsB * precisionBytes * multiplier")) {
  throw new Error("GPU Sizing still scales the entire full-model training state footprint by selected compute precision.");
}''',
    '''if (gpuSizingSource.includes("const effectiveAnchor = gpu.anchor * throughputScale.factor;")) {
  throw new Error("GPU Sizing still reuses the benchmark throughput anchor without a precision guardrail.");
}
if (gpuSizingSource.includes("trainingSemantics.residencyParamsB * precisionBytes * multiplier")) {
  throw new Error("GPU Sizing still scales the entire full-model training state footprint by selected compute precision.");
}''',
    "validator anti-regression",
)
s = replace_once(
    s,
    '  "one-sided inference scaling prevents unsupported speedups; full-model training memory uses an explicit 18 B/param state baseline independent of BF16/FP8 compute precision; training residency and active-compute semantics remain distinct; " +',
    '  "one-sided inference scaling prevents unsupported model speedups; FP4 inference anchors receive explicit NVIDIA-spec precision guardrails for FP8/FP16; full-model training memory uses an explicit 18 B/param state baseline independent of BF16/FP8 compute precision; training residency and active-compute semantics remain distinct; " +',
    "validator summary",
)
p.write_text(s)

# 4) Add browser regression for quantization sensitivity and update the existing
# rack-scale expectation that is intentionally affected by the corrected FP8
# performance anchor.
p = Path("tests/e2e/gpu-sizing-architecture-aware.spec.js")
s = p.read_text()
insert_before = 'test("training sizing uses total parameters for resident state and active parameters for sparse FLOPs", async ({ page }) => {'
precision_test = '''test("inference throughput anchor is precision-aware instead of reusing FP4 unchanged", async ({ page }) => {
  await page.goto("/gpu-sizing", { waitUntil: "domcontentloaded" });
  await chooseInferenceModel(page, "muse-glimmer-30b");
  await page.getByLabel("Peak concurrent users").fill("10000");

  const deploymentAssumptions = page.locator("details").filter({ hasText: "Deployment assumptions" });
  await deploymentAssumptions.locator("summary").click();
  const gpuSelect = gpuSelectFor(page, "B200");
  await gpuSelect.selectOption("B200");

  const quantSelect = page.locator("select").filter({ has: page.locator('option[value="FP4"]') }).first();
  await quantSelect.selectOption("FP4");
  await expect(resultCard(page, "Minimum technical")).toContainText("23 GPUs");
  await expect(resultCard(page, "Recommended")).toContainText("24 GPUs");

  await quantSelect.selectOption("FP8");
  await expect(resultCard(page, "Minimum technical")).toContainText("46 GPUs");
  await expect(resultCard(page, "Recommended")).toContainText("48 GPUs");

  await quantSelect.selectOption("FP16");
  await expect(resultCard(page, "Minimum technical")).toContainText("92 GPUs");
  await expect(resultCard(page, "Recommended")).toContainText("96 GPUs");

  await page.getByRole("button", { name: "Calculation Methodology & Audit Trail" }).click();
  await expect(page.getByText("Precision guardrail (FP16)", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/Downward precision guardrail applied/)).toBeVisible();
});

'''
if insert_before not in s:
    raise SystemExit("browser precision insertion point not found")
s = s.replace(insert_before, precision_test + insert_before, 1)
s = replace_once(
    s,
    '''  // B300 and GB300 both node-round this scenario to 72 deployed GPUs and
  // both sit in the high-utilization band. With no same-footprint candidate
  // below the 85% headroom boundary, F4 correctly uses deployed acquisition
  // cost before raw technical GPU count, selecting 72 B300s.
  await expect(resultCard(page, "Minimum technical")).toContainText("71 GPUs");
  await expect(resultCard(page, "Minimum technical")).toContainText("B300");
  await expect(resultCard(page, "Recommended")).toContainText("72 GPUs");
  await expect(resultCard(page, "Recommended")).toContainText("B300");''',
    '''  // M3 no longer reuses FP4 Blackwell benchmark throughput unchanged for
  // this FP8 workload. B200's FP8 guardrail halves its loaded FP4 anchor, so
  // the workload needs 153 technical GPUs and node-rounds to 160 B200s. The
  // other current Blackwell classes require at least 216 deployed GPUs here,
  // so deployable footprint remains the first recommendation criterion.
  await expect(resultCard(page, "Minimum technical")).toContainText("153 GPUs");
  await expect(resultCard(page, "Minimum technical")).toContainText("B200");
  await expect(resultCard(page, "Recommended")).toContainText("160 GPUs");
  await expect(resultCard(page, "Recommended")).toContainText("B200");''',
    "rack-scale card expectations",
)
s = replace_once(s, 'expect(params.get("ownSys")).toBe("DGX B300");', 'expect(params.get("ownSys")).toBe("DGX B200");', "rack TCO ownSys")
s = replace_once(s, 'expect(params.get("gpuCount")).toBe("72");', 'expect(params.get("gpuCount")).toBe("160");', "rack TCO gpuCount")
s = replace_once(s, 'expect(params.get("sourceClass")).toBe("B300");', 'expect(params.get("sourceClass")).toBe("B200");', "rack TCO sourceClass")
s = replace_once(s, '    ownSys: "DGX B300",\n    gpuSizingCount: 72,\n    sourceClass: "B300",', '    ownSys: "DGX B200",\n    gpuSizingCount: 160,\n    sourceClass: "B200",', "rack TCO saved session")
p.write_text(s)

print("M3 inference precision patch applied")
