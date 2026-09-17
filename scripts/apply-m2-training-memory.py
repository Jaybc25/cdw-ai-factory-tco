from pathlib import Path


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one match, found {count}')
    return text.replace(old, new, 1)

# 1) Methodology helper: full-model mixed-precision state is a bytes/parameter
# contract, not a precision-by-multiplier contract.
p = Path('src/modelSizingMethodology.js')
s = p.read_text()
marker = '''// Training separates resident optimizer/model-state memory from token-level\n// compute. Sparse MoE/hybrid models still need the full parameter set resident\n'''
insert = '''// Full-model training memory is modeled as an explicit state-memory baseline,\n// not as compute-precision bytes multiplied by an optimizer-state factor.\n// NVIDIA Megatron Core documents 18 bytes/parameter for the non-distributed\n// BF16-parameter + FP32-gradient optimizer case. NVIDIA Transformer Engine also\n// notes that FP8 compute does not automatically reduce stored weight/optimizer\n// memory because higher-precision/master copies commonly remain resident.\nexport const FULL_MODEL_TRAINING_STATE_BYTES_PER_PARAM = 18;\n\nexport function getTrainingMemoryModel(taskType, precision, multiplierOverride = null) {\n  const precisionBytes = precision === "FP8" ? 1 : 2;\n  const override = Number(multiplierOverride);\n  if (Number.isFinite(override) && override > 0) {\n    return {\n      bytesPerParam: precisionBytes * override,\n      precisionBytes,\n      multiplier: override,\n      basis: `Explicit memory multiplier override: ${override} × ${precisionBytes} byte/param (${precision}).`,\n      source: "User-supplied override",\n    };\n  }\n\n  if (taskType === "LoRA/PEFT") {\n    const multiplier = 2.5;\n    return {\n      bytesPerParam: precisionBytes * multiplier,\n      precisionBytes,\n      multiplier,\n      basis: `Directional PEFT allowance retained at ${multiplier} × ${precisionBytes} byte/param (${precision}); M2 does not recalibrate PEFT memory.`,\n      source: "Existing GPU Sizing PEFT planning assumption",\n    };\n  }\n\n  return {\n    bytesPerParam: FULL_MODEL_TRAINING_STATE_BYTES_PER_PARAM,\n    precisionBytes,\n    multiplier: null,\n    basis: "NVIDIA Megatron Core mixed-precision Adam baseline: 18 bytes/parameter for resident model + optimizer state. FP8 is treated as compute precision and does not automatically halve stored model/optimizer state.",\n    source: "NVIDIA Megatron Core Distributed Optimizer + NVIDIA Transformer Engine low-precision training guidance",\n  };\n}\n\n'''
s = replace_once(s, marker, insert + marker, 'methodology helper insertion')
p.write_text(s)

# 2) Wire calculator to the explicit memory model and make the audit truthful.
p = Path('src/GpuSizingCalculator.jsx')
s = p.read_text()
s = replace_once(
    s,
    'import { getInferenceSequenceStateMemory, getInferenceThroughputScale, getTrainingParameterSemantics } from "./modelSizingMethodology.js";',
    'import { getInferenceSequenceStateMemory, getInferenceThroughputScale, getTrainingMemoryModel, getTrainingParameterSemantics } from "./modelSizingMethodology.js";',
    'methodology import',
)
s = replace_once(
    s,
    '  precision: "The numeric precision used during training. BF16 is the safe, widely-supported default; FP8 roughly halves memory and speeds up training but needs a model/stack that supports it well.",',
    '  precision: "The compute precision used during training. BF16 is the safe, widely-supported default; FP8 can accelerate supported training, but it does not automatically halve resident model/optimizer-state memory because higher-precision/master state commonly remains in memory.",',
    'precision tooltip',
)
s = replace_once(
    s,
    '''  const precisionBytes = inputs.precision === "FP8" ? 1 : 2;\n  const multiplier = inputs.memMultiplierOverride || (inputs.taskType === "LoRA/PEFT" ? 2.5 : 18);\n  const trainingSemantics = getTrainingParameterSemantics(model, inputs.customParamsB);\n  const trainingMemoryGB = trainingSemantics.residencyParamsB * precisionBytes * multiplier;''',
    '''  const trainingSemantics = getTrainingParameterSemantics(model, inputs.customParamsB);\n  const memoryModel = getTrainingMemoryModel(inputs.taskType, inputs.precision, inputs.memMultiplierOverride);\n  const trainingMemoryGB = trainingSemantics.residencyParamsB * memoryModel.bytesPerParam;''',
    'training memory engine',
)
s = replace_once(
    s,
    '    model, precisionBytes, multiplier, secondsTarget,',
    '    model, precisionBytes: memoryModel.precisionBytes, multiplier: memoryModel.multiplier, memoryModel, secondsTarget,',
    'training result fields',
)
old_audit = '''                <AuditFormula label={`Training memory required (${modelLabel}, ${m.totalParamsB}B resident params)`} formula="trainingMemoryGB = residentParamsB × bytesPerParam(precision) × multiplier" substituted={`= ${result.trainingSemantics.residencyParamsB}B × ${result.precisionBytes} byte/param (${precision}) × ${result.multiplier} (${taskType})`} result={`${result.trainingMemoryGB.toFixed(1)} GB`} />'''
new_audit = '''                <AuditFormula label={`Training memory required (${modelLabel}, ${m.totalParamsB}B resident params)`} formula={result.memoryModel.multiplier == null ? "trainingMemoryGB = residentParamsB × trainingStateBytesPerParam" : "trainingMemoryGB = residentParamsB × bytesPerParam(precision) × multiplier"} substituted={result.memoryModel.multiplier == null ? `= ${result.trainingSemantics.residencyParamsB}B × ${result.memoryModel.bytesPerParam} bytes/param (${taskType}; ${precision} compute)` : `= ${result.trainingSemantics.residencyParamsB}B × ${result.precisionBytes} byte/param (${precision}) × ${result.multiplier} (${taskType})`} result={`${result.trainingMemoryGB.toFixed(1)} GB`} />\n                <div className="text-xs text-gray-500 mb-3">{result.memoryModel.basis}</div>'''
s = replace_once(s, old_audit, new_audit, 'training audit formula')
p.write_text(s)

# 3) Extend the existing methodology gate so this cannot regress silently.
p = Path('scripts/validate_model_sizing_methodology.mjs')
s = p.read_text()
s = replace_once(
    s,
    '''  INFERENCE_REFERENCE_MODEL,\n  getInferenceThroughputScale,\n  getTrainingParameterSemantics,''',
    '''  INFERENCE_REFERENCE_MODEL,\n  FULL_MODEL_TRAINING_STATE_BYTES_PER_PARAM,\n  getInferenceThroughputScale,\n  getTrainingMemoryModel,\n  getTrainingParameterSemantics,''',
    'validator imports',
)
anchor = '''const denseTraining = getTrainingParameterSemantics(dense70);\napprox(denseTraining.residencyParamsB, 70);\napprox(denseTraining.activeComputeParamsB, 70);\n'''
addition = '''const bf16FullMemory = getTrainingMemoryModel("Full fine-tune", "BF16");\nconst fp8FullMemory = getTrainingMemoryModel("Full fine-tune", "FP8");\nconst bf16PretrainMemory = getTrainingMemoryModel("Pretraining", "BF16");\napprox(FULL_MODEL_TRAINING_STATE_BYTES_PER_PARAM, 18);\napprox(bf16FullMemory.bytesPerParam, 18);\napprox(fp8FullMemory.bytesPerParam, 18);\napprox(bf16PretrainMemory.bytesPerParam, 18);\nif (fp8FullMemory.bytesPerParam !== bf16FullMemory.bytesPerParam) {\n  throw new Error("FP8 compute precision must not silently halve full-model resident optimizer/model-state memory.");\n}\n\n'''
s = replace_once(s, anchor, anchor + addition, 'validator memory tests')
s = replace_once(
    s,
    '  "trainingSemantics.residencyParamsB * precisionBytes * multiplier",',
    '  "getTrainingMemoryModel(inputs.taskType, inputs.precision, inputs.memMultiplierOverride)",\n  "trainingSemantics.residencyParamsB * memoryModel.bytesPerParam",',
    'validator wiring contract',
)
needle = '''if (gpuSizingSource.includes("const flopsRequired = 6 * model.totalParamsB * inputs.datasetTokensB * 1e18")) {'''
extra = '''if (gpuSizingSource.includes("trainingSemantics.residencyParamsB * precisionBytes * multiplier")) {\n  throw new Error("GPU Sizing still scales the entire full-model training state footprint by selected compute precision.");\n}\n'''
s = replace_once(s, needle, extra + needle, 'validator old formula guard')
s = replace_once(
    s,
    '  "one-sided inference scaling prevents unsupported speedups; training residency and active-compute semantics remain distinct; " +',
    '  "one-sided inference scaling prevents unsupported speedups; full-model training memory uses an explicit 18 B/param state baseline independent of BF16/FP8 compute precision; training residency and active-compute semantics remain distinct; " +',
    'validator pass message',
)
p.write_text(s)

# 4) Update browser expectations that were specifically pinned to the old 36 B/param BF16 error.
p = Path('tests/e2e/gpu-sizing-architecture-aware.spec.js')
s = p.read_text()
s = replace_once(
    s,
    '''  // MoE Scout: 109B resident state drives fit memory while only 17B active\n  // parameters drive token-level FLOPs. The result remains 14 technical B300s,\n  // node-rounded to 16. Rubin cannot reduce the 288GB/GPU memory floor here,\n  // and using total params for sparse FLOPs would materially inflate the time-bound requirement.\n  await chooseInferenceModel(page, "llama-4-scout");\n  await expect(resultCard(page, "Minimum technical")).toContainText("14 GPUs");\n  await expect(resultCard(page, "Minimum technical")).toContainText("B300");\n  await expect(resultCard(page, "Recommended")).toContainText("16 GPUs");''',
    '''  // MoE Scout: 109B resident state drives fit memory while only 17B active\n  // parameters drive token-level FLOPs. M2 fixes the old BF16 double-scaling\n  // error: 109B × 18 bytes/param = 1,962 GB, which needs 7 B300s and\n  // node-rounds to one 8-GPU system.\n  await chooseInferenceModel(page, "llama-4-scout");\n  await expect(resultCard(page, "Minimum technical")).toContainText("7 GPUs");\n  await expect(resultCard(page, "Minimum technical")).toContainText("B300");\n  await expect(resultCard(page, "Recommended")).toContainText("8 GPUs");''',
    'Scout browser expectation',
)
s = replace_once(
    s,
    '''  // Hybrid Maverick shares Scout's 17B active-compute concept as Scout but has 400B\n  // resident parameters. The much larger resident state therefore drives a\n  // 50-GPU technical requirement on B300, node-rounded to 56. This pair is a\n  // regression guard against collapsing residency into active parameters.\n  await chooseInferenceModel(page, "llama-4-maverick");\n  await expect(resultCard(page, "Minimum technical")).toContainText("50 GPUs");\n  await expect(resultCard(page, "Minimum technical")).toContainText("B300");\n  await expect(resultCard(page, "Recommended")).toContainText("56 GPUs");''',
    '''  // Hybrid Maverick shares Scout's 17B active-compute concept but has 400B\n  // resident parameters. At the corrected 18 bytes/param full-training baseline,\n  // resident state is 7,200 GB, driving 25 technical B300s and 32 node-rounded.\n  // This pair remains a regression guard against collapsing residency into active parameters.\n  await chooseInferenceModel(page, "llama-4-maverick");\n  await expect(resultCard(page, "Minimum technical")).toContainText("25 GPUs");\n  await expect(resultCard(page, "Minimum technical")).toContainText("B300");\n  await expect(resultCard(page, "Recommended")).toContainText("32 GPUs");''',
    'Maverick browser expectation',
)
p.write_text(s)

print('M2 training memory patch applied')
