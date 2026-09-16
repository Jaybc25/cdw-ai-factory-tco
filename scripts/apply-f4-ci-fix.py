from pathlib import Path


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"F4 CI patch target {label!r} expected once, found {count}")
    return text.replace(old, new, 1)

calc_path = Path("src/GpuSizingCalculator.jsx")
calc = calc_path.read_text()
calc = replace_once(
    calc,
    '''  const [tcoSelection, setTcoSelection] = useState("recommended");\n  const effectiveTcoSelection = tcoSelection === "higher-growth" && result?.higherGrowth?.class ? "higher-growth" : "recommended";\n''',
    '''  const [tcoSelection, setTcoSelection] = useState("recommended");\n  const sizingScenarioKey = mode === "Inference"\n    ? [mode, infModel.id, quant, concurrentUsers, targetTokPerUser, avgInputTokens, avgOutputTokens, kvBytesPerElement, overheadPct, infGpuOverride, customParamsB, customLayers, customKvHeads, customHeadDim].join("|")\n    : [mode, trainModel.id, taskType, precision, datasetTokensB, targetDays, mfu, trainGpuOverride, customParamsB].join("|");\n  const effectiveTcoSelection = tcoSelection === "higher-growth" && result?.higherGrowth?.class ? "higher-growth" : "recommended";\n''',
    "scenario key insertion",
)
calc = replace_once(
    calc,
    '''  useEffect(() => {\n    setTcoSelection("recommended");\n  }, [mode, result?.selectedClass, result?.recommended, result?.higherGrowth?.class, result?.higherGrowth?.recommended]);\n''',
    '''  useEffect(() => {\n    setTcoSelection("recommended");\n  }, [sizingScenarioKey, result?.selectedClass, result?.recommended, result?.higherGrowth?.class, result?.higherGrowth?.recommended]);\n''',
    "TCO selection reset dependency",
)
calc_path.write_text(calc)

spec_path = Path("tests/e2e/gpu-sizing-architecture-aware.spec.js")
spec = spec_path.read_text()
spec = replace_once(
    spec,
    '''  // MoE: Scout is only 17B active per token but 109B resident. The one-sided\n  // throughput rule gives it no unsupported speedup, while residency still\n  // changes the technical fit. Deployable ranking correctly prefers a 1-GPU\n  // technical B300 requirement rounded to 8 GPUs over a 1-GPU GB200 NVL72\n  // requirement that would force a 72-GPU deployment.\n  await chooseInferenceModel(page, "llama-4-scout");\n  await expect(resultCard(page, "Minimum technical")).toContainText("1 GPUs");\n  await expect(resultCard(page, "Minimum technical")).toContainText("B300");\n  await expect(resultCard(page, "Recommended")).toContainText("8 GPUs");\n''',
    '''  // MoE: Scout is only 17B active per token but 109B resident. The one-sided\n  // throughput rule gives it no unsupported speedup, while residency still\n  // changes the technical fit. F4 now compares the actual 8-GPU purchase: B200\n  // needs two technical GPUs but retains acceptable headroom and is cheaper than\n  // the one-technical-GPU B300, so the production recommendation remains one\n  // 8-GPU node without paying extra for unused technical efficiency.\n  await chooseInferenceModel(page, "llama-4-scout");\n  await expect(resultCard(page, "Minimum technical")).toContainText("2 GPUs");\n  await expect(resultCard(page, "Minimum technical")).toContainText("B200");\n  await expect(resultCard(page, "Recommended")).toContainText("8 GPUs");\n''',
    "Scout F4 expectations",
)
spec = replace_once(
    spec,
    '''test("GB300 NVL72 rack-scale recommendation preserves GPU Sizing to TCO handoff", async ({ page }) => {\n''',
    '''test("rack-scale same-footprint recommendation preserves GPU Sizing to TCO handoff", async ({ page }) => {\n''',
    "rack-scale test title",
)
spec = replace_once(
    spec,
    '''  await expect(resultCard(page, "Minimum technical")).toContainText("64 GPUs");\n  await expect(resultCard(page, "Minimum technical")).toContainText("GB300 NVL72");\n  await expect(resultCard(page, "Recommended")).toContainText("72 GPUs");\n  await expect(resultCard(page, "Recommended")).toContainText("GB300 NVL72");\n''',
    '''  // B300 and GB300 both node-round this scenario to 72 deployed GPUs and\n  // both sit in the high-utilization band. With no same-footprint candidate\n  // below the 85% headroom boundary, F4 correctly uses deployed acquisition\n  // cost before raw technical GPU count, selecting 72 B300s.\n  await expect(resultCard(page, "Minimum technical")).toContainText("71 GPUs");\n  await expect(resultCard(page, "Minimum technical")).toContainText("B300");\n  await expect(resultCard(page, "Recommended")).toContainText("72 GPUs");\n  await expect(resultCard(page, "Recommended")).toContainText("B300");\n''',
    "rack-scale F4 expectations",
)
spec = replace_once(
    spec,
    '''  expect(params.get("ownSys")).toBe("DGX GB300 NVL-72");\n  expect(params.get("gpuCount")).toBe("72");\n  expect(params.get("sourceClass")).toBe("GB300 NVL72");\n''',
    '''  expect(params.get("ownSys")).toBe("DGX B300");\n  expect(params.get("gpuCount")).toBe("72");\n  expect(params.get("sourceClass")).toBe("B300");\n''',
    "rack-scale TCO URL expectations",
)
spec = replace_once(
    spec,
    '''  const saved = await waitForTcoSession(page, {\n    ownSys: "DGX GB300 NVL-72",\n    gpuSizingCount: 72,\n    sourceClass: "GB300 NVL72",\n''',
    '''  const saved = await waitForTcoSession(page, {\n    ownSys: "DGX B300",\n    gpuSizingCount: 72,\n    sourceClass: "B300",\n''',
    "rack-scale TCO session expectations",
)
spec_path.write_text(spec)

print("F4 CI alignment patch applied")
