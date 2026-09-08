from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    s = p.read_text()
    if old not in s:
        raise SystemExit(f"Expected text not found in {path}: {old[:120]!r}")
    p.write_text(s.replace(old, new, 1))


# GPU Sizing: carry explicit selected production design into TCO.
replace_once(
    "src/GpuSizingCalculator.jsx",
    '''function TcoHandoff({ selectedClass, recommended, mode, workingDayHours, model, modelParamsB, quant }) {\n  const ownSys = TCO_OWN_SYS_FOR_CLASS[selectedClass] || "DGX B200";\n  const params = new URLSearchParams({ ownSys, gpuCount: String(recommended), sourceClass: selectedClass });''',
    '''function TcoHandoff({ selectedClass, recommended, sizingBasis = "recommended", mode, workingDayHours, model, modelParamsB, quant }) {\n  const ownSys = TCO_OWN_SYS_FOR_CLASS[selectedClass] || "DGX B200";\n  const params = new URLSearchParams({ ownSys, gpuCount: String(recommended), sourceClass: selectedClass, sizingBasis });''',
)
replace_once(
    "src/GpuSizingCalculator.jsx",
    '''          Compare the cost of owning this recommended GPU capacity with renting equivalent capability in the cloud, in the TCO Calculator.''',
    '''          Compare the cost of owning this {sizingBasis === "higher-growth" ? "user-selected higher-growth" : "recommended"} GPU capacity with renting equivalent capability in the cloud, in the TCO Calculator.''',
)
replace_once(
    "src/GpuSizingCalculator.jsx",
    '''function getIncomingParams() {''',
    '''function TcoConfigurationSelector({ result, selection, onSelectionChange }) {\n  const hasHigherGrowth = !!result?.higherGrowth?.class && !!result?.higherGrowth?.recommended;\n  const choices = [\n    { key: "recommended", label: "Recommended", detail: `${result.recommended} GPUs · ${result.selectedClass}` },\n    ...(hasHigherGrowth ? [{ key: "higher-growth", label: "Higher-growth", detail: `${result.higherGrowth.recommended} GPUs · ${result.higherGrowth.class}` }] : []),\n  ];\n  return (\n    <div className="mb-6 rounded-xl p-4 border border-gray-200 bg-white">\n      <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">Configuration to carry into TCO</div>\n      <p className="text-xs text-gray-500 mb-3">Recommended is the default. Choose Higher-growth only when you intentionally want more capacity/headroom for future demand.</p>\n      <div className="flex flex-wrap gap-2">\n        {choices.map((choice) => {\n          const selected = selection === choice.key;\n          return (\n            <button key={choice.key} type="button" onClick={() => onSelectionChange(choice.key)} aria-pressed={selected}\n              className="text-left rounded-lg px-3 py-2 border min-w-[180px]"\n              style={{ borderColor: selected ? RED : "#D1D5DB", background: selected ? "#FFF5F5" : "#F9FAFB" }}>\n              <div className="text-xs font-bold" style={{ color: selected ? RED : CHARCOAL }}>{choice.label}{selected ? " · Selected for TCO" : ""}</div>\n              <div className="text-xs text-gray-500 mt-0.5">{choice.detail}</div>\n            </button>\n          );\n        })}\n      </div>\n    </div>\n  );\n}\n\nfunction getIncomingParams() {''',
)
replace_once(
    "src/GpuSizingCalculator.jsx",
    '''  const result = mode === "Inference" ? inferenceResult : trainingResult;\n  const errors = mode === "Inference" ? infErrors : trainErrors;\n  const modelLabel = mode === "Inference" ? infModel.label : trainModel.label;''',
    '''  const result = mode === "Inference" ? inferenceResult : trainingResult;\n  const errors = mode === "Inference" ? infErrors : trainErrors;\n  const [tcoSelection, setTcoSelection] = useState("recommended");\n  const effectiveTcoSelection = tcoSelection === "higher-growth" && result?.higherGrowth?.class ? "higher-growth" : "recommended";\n  const tcoSelectedClass = effectiveTcoSelection === "higher-growth" ? result?.higherGrowth?.class : result?.selectedClass;\n  const tcoSelectedCount = effectiveTcoSelection === "higher-growth" ? result?.higherGrowth?.recommended : result?.recommended;\n  const modelLabel = mode === "Inference" ? infModel.label : trainModel.label;''',
)
replace_once(
    "src/GpuSizingCalculator.jsx",
    '''              <TcoHandoff selectedClass={result.selectedClass} recommended={result.recommended} mode={mode} workingDayHours={workingDayHours} model={mode === "Inference" ? infModel : trainModel} modelParamsB={mode === "Inference" ? getModelParamsB(infModel, customParamsB) : getModelParamsB(trainModel, customParamsB)} quant={mode === "Inference" ? quant : null} />''',
    '''              <TcoConfigurationSelector result={result} selection={effectiveTcoSelection} onSelectionChange={setTcoSelection} />\n              <TcoHandoff selectedClass={tcoSelectedClass} recommended={tcoSelectedCount} sizingBasis={effectiveTcoSelection} mode={mode} workingDayHours={workingDayHours} model={mode === "Inference" ? infModel : trainModel} modelParamsB={mode === "Inference" ? getModelParamsB(infModel, customParamsB) : getModelParamsB(trainModel, customParamsB)} quant={mode === "Inference" ? quant : null} />''',
)

# TCO: persist and disclose whether the upstream design was the default recommendation or a user-selected growth alternative.
replace_once(
    "src/TcoCalculator.jsx",
    '''function getInitialGpuCount() {\n  const params = getIncomingParams();\n  const raw = params?.get("gpuCount");\n  const n = raw ? parseInt(raw, 10) : NaN;\n  return Number.isFinite(n) && n > 0 ? n : null;\n}''',
    '''function getInitialGpuCount() {\n  const params = getIncomingParams();\n  const raw = params?.get("gpuCount");\n  const n = raw ? parseInt(raw, 10) : NaN;\n  return Number.isFinite(n) && n > 0 ? n : null;\n}\n\nfunction getInitialSizingBasis() {\n  const raw = getIncomingParams()?.get("sizingBasis");\n  return raw === "higher-growth" ? "higher-growth" : "recommended";\n}''',
)
replace_once(
    "src/TcoCalculator.jsx",
    '''  const [gpuSizingCount] = useState(() => getInitialGpuCount() ?? saved?.gpuSizingCount ?? null);\n  const [sourceClass] = useState(() => getInitialSourceClass() ?? saved?.sourceClass ?? null);''',
    '''  const [gpuSizingCount] = useState(() => getInitialGpuCount() ?? saved?.gpuSizingCount ?? null);\n  const [sourceClass] = useState(() => getInitialSourceClass() ?? saved?.sourceClass ?? null);\n  const [gpuSizingBasis] = useState(() => arrivedFromGpuSizing ? getInitialSizingBasis() : saved?.gpuSizingBasis ?? "recommended");''',
)
replace_once(
    "src/TcoCalculator.jsx",
    '''      gpuSizingCount, sourceClass, workingDayHours,\n    });''',
    '''      gpuSizingCount, sourceClass, workingDayHours, gpuSizingBasis,\n    });''',
)
replace_once(
    "src/TcoCalculator.jsx",
    '''      residPct, modelId, modelParamsB, quant, gpuSizingCount, sourceClass, workingDayHours]);''',
    '''      residPct, modelId, modelParamsB, quant, gpuSizingCount, sourceClass, workingDayHours, gpuSizingBasis]);''',
)
replace_once(
    "src/TcoCalculator.jsx",
    '''                <Row label="Technical workload requirement" value={`${r.sysAdj} × ${ownSys}`} sub={`${gpuSizingCount} GPUs${r.sourceConversion ? ` at ${sourceClass} (normalized ${r.sourceConversion.toFixed(2)}x)` : ` at ${ownSys}`} -- fleet size is duty-cycle-independent`} />''',
    '''                <Row label="Technical workload requirement" value={`${r.sysAdj} × ${ownSys}`} sub={`${gpuSizingCount} GPUs${r.sourceConversion ? ` at ${sourceClass} (normalized ${r.sourceConversion.toFixed(2)}x)` : ` at ${ownSys}`} -- ${gpuSizingBasis === "higher-growth" ? "user-selected higher-growth alternative" : "GPU Sizing recommended configuration"}; fleet size is duty-cycle-independent`} />''',
)

# Regression: assert both the default and explicit higher-growth ownership paths.
test_path = Path("tests/e2e/tco-handoff-ownership.spec.js")
t = test_path.read_text()
anchor = '''test("fresh GPU Sizing handoff replaces upstream technical facts but preserves TCO-owned assumptions", async ({ page }) => {'''
addition = '''test("GPU Sizing handoff preserves explicit higher-growth selection provenance", async ({ page }) => {\n  await seedTcoSession(page, { mode: "spend" });\n  await page.goto(\n    "/tco?ownSys=DGX%20B300&gpuCount=16&sourceClass=B300&sizingBasis=higher-growth&workingDayHours=10&model=muse-glimmer-30b&modelParamsB=29.6&quant=FP8",\n    { waitUntil: "domcontentloaded" },\n  );\n  const saved = await waitForTcoSession(page, {\n    ownSys: "DGX B300", gpuSizingCount: 16, sourceClass: "B300", gpuSizingBasis: "higher-growth",\n  });\n  expect(saved.gpuSizingBasis).toBe("higher-growth");\n  await expect(page.getByText(/user-selected higher-growth alternative/)).toBeVisible();\n});\n\ntest("GPU Sizing handoff defaults sizing provenance to recommended", async ({ page }) => {\n  await seedTcoSession(page, { mode: "spend" });\n  await page.goto(\n    "/tco?ownSys=DGX%20B200&gpuCount=8&sourceClass=B200&workingDayHours=10&model=muse-glimmer-30b&modelParamsB=29.6&quant=FP8",\n    { waitUntil: "domcontentloaded" },\n  );\n  const saved = await waitForTcoSession(page, { gpuSizingBasis: "recommended" });\n  expect(saved.gpuSizingBasis).toBe("recommended");\n});\n\n'''
if addition not in t:
    if anchor not in t:
        raise SystemExit("Test anchor not found")
    test_path.write_text(t.replace(anchor, addition + anchor, 1))

# Durable documentation.
doc_path = Path("docs/MODEL_MODERNIZATION_CURRENT_STATE.md")
doc = doc_path.read_text()
section = '''\n## GPU Sizing production-design selection\n\nGPU Sizing keeps its node-rounded **Recommended** configuration as the default technical design. When the engine produces a qualifying **Higher-growth alternative**, the user may explicitly select that production design for downstream TCO analysis. The choice changes only which already-calculated technical class/count is carried forward; it does not change the sizing formulas.\n\nTCO receives the exact selected class/count and a `sizingBasis` provenance value (`recommended` or `higher-growth`). TCO remains the economic/planning layer and must not independently choose between those technical designs or re-size them from model parameters. Dev/Test/POC workstation alternatives remain separate from this production-design choice.\n'''
if "## GPU Sizing production-design selection" not in doc:
    doc_path.write_text(doc.rstrip() + "\n" + section)

changelog_path = Path("CHANGELOG.md")
ch = changelog_path.read_text()
marker = "## Unreleased\n"
entry = '''\n### September 7, 2026 - GPU Sizing higher-growth TCO selection\n- Kept the node-rounded GPU Sizing recommendation as the default production design while allowing an explicit Higher-growth alternative to be selected for TCO analysis.\n- The selected class/count is passed unchanged to TCO with sizing-basis provenance; TCO remains the economic layer and does not re-size the technical design.\n- No GPU sizing formulas, hardware performance anchors, or TCO economics changed.\n'''
if entry not in ch:
    if marker not in ch:
        raise SystemExit("Changelog marker not found")
    changelog_path.write_text(ch.replace(marker, marker + entry, 1))
