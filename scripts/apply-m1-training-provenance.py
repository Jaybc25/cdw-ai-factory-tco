from pathlib import Path


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"M1 patch target {label!r} expected once, found {count}")
    return text.replace(old, new, 1)

calc_path = Path("src/GpuSizingCalculator.jsx")
calc = calc_path.read_text()

calc = replace_once(
    calc,
    '''const TRAINING_GPU_SPECS = [\n  ...GPU_SPECS,\n  ...RUBIN_TRAINING_CANDIDATES.map((gpu) => ({\n    id: gpu.id,\n    vram: gpu.vramGB,\n    bf16: gpu.bf16Tflops,\n    fp8: gpu.fp8Tflops,\n    nodeSize: gpu.nodeSize,\n    confidence: gpu.technicalConfidence,\n    source: gpu.technicalSource,\n    rubin: true,\n  })),\n];\n''',
    '''// Training uses the same hardware capacity fields as inference for the\n// pre-Rubin classes, but it must not inherit inference benchmark provenance.\n// These labels describe the evidence basis for the BF16/FP8 peak-compute fields\n// only; M1 intentionally does not change or re-calibrate any numeric TFLOPS value.\nconst TRAINING_GPU_SOURCE = Object.freeze({\n  H200: "NVIDIA H200 Tensor Core GPU published specifications; peak BF16/FP8 Tensor Core throughput used for training sizing.",\n  B200: "NVIDIA Blackwell / DGX B200 published specifications; peak BF16/FP8 Tensor Core throughput used for training sizing.",\n  "GB200 NVL72": "NVIDIA GB200 NVL72 published specifications; peak BF16/FP8 Tensor Core throughput used for training sizing.",\n  B300: "NVIDIA Blackwell Ultra / DGX B300 published specifications; peak BF16/FP8 Tensor Core throughput used for training sizing.",\n  "GB300 NVL72": "NVIDIA GB300 NVL72 published specifications; peak BF16/FP8 Tensor Core throughput used for training sizing.",\n});\n\nconst TRAINING_GPU_SPECS = [\n  ...GPU_SPECS.map((gpu) => ({\n    id: gpu.id,\n    vram: gpu.vram,\n    bf16: gpu.bf16,\n    fp8: gpu.fp8,\n    nodeSize: gpu.nodeSize,\n    confidence: gpu.confidence,\n    source: TRAINING_GPU_SOURCE[gpu.id],\n  })),\n  ...RUBIN_TRAINING_CANDIDATES.map((gpu) => ({\n    id: gpu.id,\n    vram: gpu.vramGB,\n    bf16: gpu.bf16Tflops,\n    fp8: gpu.fp8Tflops,\n    nodeSize: gpu.nodeSize,\n    confidence: gpu.technicalConfidence,\n    source: gpu.technicalSource,\n    rubin: true,\n  })),\n];\n''',
    "training GPU provenance separation",
)
calc_path.write_text(calc)

spec_path = Path("tests/e2e/gpu-sizing-architecture-aware.spec.js")
spec = spec_path.read_text()

spec = replace_once(
    spec,
    '''function resultCard(page, title) {\n  return page.getByText(title, { exact: true }).first().locator("..").locator("..");\n}\n\nasync function chooseInferenceModel(page, modelId) {\n''',
    '''function resultCard(page, title) {\n  return page.getByText(title, { exact: true }).first().locator("..").locator("..");\n}\n\nfunction gpuSelectFor(page, gpuId) {\n  return page.locator("select").filter({ has: page.locator(`option[value="${gpuId}"]`) }).first();\n}\n\nasync function chooseInferenceModel(page, modelId) {\n''',
    "GPU select helper",
)

spec = replace_once(
    spec,
    '''test("higher-growth production design is opt-in for TCO and resets after re-sizing", async ({ page }) => {\n''',
    '''test("training audit uses training TFLOPS provenance rather than inference benchmark provenance", async ({ page }) => {\n  await page.goto("/gpu-sizing", { waitUntil: "domcontentloaded" });\n  await switchToTraining(page);\n\n  const gpuSelect = gpuSelectFor(page, "B300");\n  await expect(gpuSelect).toBeVisible();\n  await gpuSelect.selectOption("B300");\n  await expect(gpuSelect).toHaveValue("B300");\n\n  await page.getByRole("button", { name: "Calculation Methodology & Audit Trail" }).click();\n  await expect(page.getByText("Selected GPU -- B300", { exact: true })).toBeVisible();\n  await expect(page.getByText("Peak TFLOPS (BF16)", { exact: true })).toBeVisible();\n  await expect(page.getByText(/NVIDIA Blackwell Ultra \/ DGX B300 published specifications; peak BF16\/FP8 Tensor Core throughput used for training sizing\./)).toBeVisible();\n  await expect(page.getByText(/MLPerf Inference/i)).toHaveCount(0);\n});\n\n// The production cards themselves are the TCO-selection controls; there is no\n// duplicate selector lower on the page.\ntest("higher-growth production design is opt-in for TCO and resets after re-sizing", async ({ page }) => {\n''',
    "training provenance browser regression",
)

# Remove the now-duplicated comment immediately above the insertion point.
spec = spec.replace(
    '''// The production cards themselves are the TCO-selection controls; there is no\n// duplicate selector lower on the page.\n// The production cards themselves are the TCO-selection controls; there is no\n// duplicate selector lower on the page.\n''',
    '''// The production cards themselves are the TCO-selection controls; there is no\n// duplicate selector lower on the page.\n''',
    1,
)

spec_path.write_text(spec)
print("M1 training provenance patch applied")
