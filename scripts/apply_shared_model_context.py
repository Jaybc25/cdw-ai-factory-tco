from pathlib import Path


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)

# ---------------------------------------------------------------------------
# GPU Sizing
# ---------------------------------------------------------------------------
p = Path("src/GpuSizingCalculator.jsx")
text = p.read_text(encoding="utf-8")

text = replace_once(
    text,
    'import { GPU_SIZING_PRICE_USD as GPU_PRICE_USD } from "./pricingRegistry.js";\n',
    'import { GPU_SIZING_PRICE_USD as GPU_PRICE_USD } from "./pricingRegistry.js";\nimport { GPU_SIZING_MODELS as MODELS, getDefaultModel, getModelById, getModelParamsB } from "./modelRegistry.js";\n',
    "GPU registry import",
)

start = text.index('const MODELS = [')
end = text.index('const GPU_SPECS = [', start)
text = text[:start] + text[end:]

mapping_start = text.index('// Model Advisor\'s canonical_model_id')
mapping_end = text.index('// Precise currency for the audit trail', mapping_start)
replacement = '''// Model Advisor and GPU Sizing now share canonical model IDs through\n// modelRegistry.js. Legacy GPU Sizing IDs remain accepted there so saved\n// sessions from before this change restore safely without a second mapping\n// table in this component.\nfunction getInitialInfModel() {\n  const params = getIncomingParams();\n  const modelId = params?.get("model");\n  if (!modelId) return { model: getDefaultModel(), matched: null };\n  const match = getModelById(modelId);\n  return match && match.id !== "custom"\n    ? { model: match, matched: true }\n    : { model: getDefaultModel(), matched: false };\n}\n\n'''
text = text[:mapping_start] + replacement + text[mapping_end:]

text = replace_once(
    text,
    '''function TcoHandoff({ selectedClass, recommended, mode, workingDayHours }) {\n  const ownSys = TCO_OWN_SYS_FOR_CLASS[selectedClass] || "DGX B200";\n  const params = new URLSearchParams({ ownSys, gpuCount: String(recommended), sourceClass: selectedClass });\n''',
    '''function TcoHandoff({ selectedClass, recommended, mode, workingDayHours, model, modelParamsB, quant }) {\n  const ownSys = TCO_OWN_SYS_FOR_CLASS[selectedClass] || "DGX B200";\n  const params = new URLSearchParams({ ownSys, gpuCount: String(recommended), sourceClass: selectedClass });\n  if (model?.id) params.set("model", model.id);\n  if (Number.isFinite(Number(modelParamsB)) && Number(modelParamsB) > 0) params.set("modelParamsB", String(modelParamsB));\n  if (mode === "Inference" && quant) params.set("quant", quant);\n''',
    "GPU TCO handoff signature",
)

text = text.replace(
    '(saved?.infModelId && MODELS.find((m) => m.id === saved.infModelId)) || modelHandoff.model',
    'getModelById(saved?.infModelId) || modelHandoff.model',
)
text = text.replace(
    '(saved?.trainModelId && MODELS.find((m) => m.id === saved.trainModelId)) || MODELS[1]',
    'getModelById(saved?.trainModelId) || getDefaultModel()',
)

text = replace_once(
    text,
    '<TcoHandoff selectedClass={result.selectedClass} recommended={result.recommended} mode={mode} workingDayHours={workingDayHours} />',
    '''<TcoHandoff\n              selectedClass={result.selectedClass}\n              recommended={result.recommended}\n              mode={mode}\n              workingDayHours={workingDayHours}\n              model={mode === "Inference" ? infModel : trainModel}\n              modelParamsB={mode === "Inference" ? getModelParamsB(infModel, customParamsB) : getModelParamsB(trainModel, customParamsB)}\n              quant={mode === "Inference" ? quant : null}\n            />''',
    "GPU TCO handoff call",
)

p.write_text(text, encoding="utf-8")

# ---------------------------------------------------------------------------
# Model Advisor: friendly names come from the same canonical registry used by
# GPU Sizing and TCO. Advisor scoring data itself remains in its own registries.
# ---------------------------------------------------------------------------
p = Path("src/ModelAdvisor.jsx")
text = p.read_text(encoding="utf-8")
text = replace_once(
    text,
    '} from "./modelAdvisorEngine.js";\n',
    '} from "./modelAdvisorEngine.js";\nimport { getModelById } from "./modelRegistry.js";\n',
    "Model Advisor registry import",
)
text = replace_once(
    text,
    '  const model = card.model;\n  const conf = CONFIDENCE_BADGE[model.confidence] || CONFIDENCE_BADGE.MEDIUM;\n',
    '  const model = card.model;\n  const sharedModel = getModelById(model.canonical_model_id);\n  const conf = CONFIDENCE_BADGE[model.confidence] || CONFIDENCE_BADGE.MEDIUM;\n',
    "Recommendation shared model",
)
text = replace_once(
    text,
    '<div className="text-lg font-bold" style={{ color: CHARCOAL }}>{model.canonical_model_id}</div>',
    '<div className="text-lg font-bold" style={{ color: CHARCOAL }}>{sharedModel?.label || model.canonical_model_id}</div>',
    "Recommendation friendly label",
)
text = replace_once(
    text,
    'function OtherEligibleCard({ model, ranking }) {\n  const conf = CONFIDENCE_BADGE[model.confidence] || CONFIDENCE_BADGE.MEDIUM;\n',
    'function OtherEligibleCard({ model, ranking }) {\n  const sharedModel = getModelById(model.canonical_model_id);\n  const conf = CONFIDENCE_BADGE[model.confidence] || CONFIDENCE_BADGE.MEDIUM;\n',
    "Other eligible shared model",
)
text = replace_once(
    text,
    '<div className="text-base font-bold" style={{ color: CHARCOAL }}>{model.canonical_model_id}</div>',
    '<div className="text-base font-bold" style={{ color: CHARCOAL }}>{sharedModel?.label || model.canonical_model_id}</div>',
    "Other eligible friendly label",
)
p.write_text(text, encoding="utf-8")

# ---------------------------------------------------------------------------
# TCO
# ---------------------------------------------------------------------------
p = Path("src/TcoCalculator.jsx")
text = p.read_text(encoding="utf-8")

text = replace_once(
    text,
    'import { CLOUD_GPU_RATES as RATES, ONPREM_SYSTEMS as SYSTEMS } from "./pricingRegistry.js";\n',
    'import { CLOUD_GPU_RATES as RATES, ONPREM_SYSTEMS as SYSTEMS } from "./pricingRegistry.js";\nimport { TCO_MODEL_OPTIONS, getDefaultModel, getModelById, formatModelContext } from "./modelRegistry.js";\n',
    "TCO registry import",
)
text = replace_once(
    text,
    'const MODELS = { "8B": 8, "70B": 70, "405B": 405, "671B": 671 };\n',
    '',
    "remove TCO model buckets",
)

insert_after = '''function getInitialWorkingDayHours() {\n  const params = getIncomingParams();\n  const raw = params?.get("workingDayHours");\n  const n = raw ? parseFloat(raw) : NaN;\n  return Number.isFinite(n) && n > 0 && n <= 24 ? n : null;\n}\n'''
addition = '''\nfunction getInitialModelContext() {\n  const params = getIncomingParams();\n  const modelId = params?.get("model");\n  const rawParams = params?.get("modelParamsB");\n  const modelParamsB = rawParams ? parseFloat(rawParams) : NaN;\n  const model = getModelById(modelId);\n  return {\n    model: model && model.id !== "custom" ? model : null,\n    modelParamsB: Number.isFinite(modelParamsB) && modelParamsB > 0 ? modelParamsB : null,\n  };\n}\n\nfunction getInitialQuantization() {\n  const q = getIncomingParams()?.get("quant");\n  return q && Object.prototype.hasOwnProperty.call(QUANT, q) ? q : null;\n}\n\nfunction migrateLegacyModelState(saved) {\n  if (!saved?.modelSize) return null;\n  const n = parseFloat(String(saved.modelSize).replace("B", ""));\n  return Number.isFinite(n) && n > 0 ? n : null;\n}\n'''
text = replace_once(text, insert_after, insert_after + addition, "TCO model context helpers")

text = replace_once(
    text,
    '  const modelB = MODELS[inp.modelSize];\n',
    '  const modelB = inp.modelParamsB;\n',
    "TCO continuous model params",
)

text = replace_once(
    text,
    '  const [workingDayHours] = useState(() => getInitialWorkingDayHours() ?? saved?.workingDayHours ?? null);\n',
    '''  const [workingDayHours] = useState(() => getInitialWorkingDayHours() ?? saved?.workingDayHours ?? null);\n  const [incomingModelContext] = useState(getInitialModelContext);\n  const [incomingQuant] = useState(getInitialQuantization);\n''',
    "TCO incoming model state",
)

text = replace_once(
    text,
    '  const [modelSize, setModelSize] = useState(saved?.modelSize ?? "70B");\n  const [quant, setQuant] = useState(saved?.quant ?? "FP8");\n',
    '''  const [modelId, setModelId] = useState(() => {\n    if (arrivedFromGpuSizing && incomingModelContext.model) return incomingModelContext.model.id;\n    if (getModelById(saved?.modelId)) return getModelById(saved.modelId).id;\n    if (saved?.modelSize) return "custom";\n    return getDefaultModel().id;\n  });\n  const [modelParamsB, setModelParamsB] = useState(() => {\n    if (arrivedFromGpuSizing && incomingModelContext.modelParamsB) return incomingModelContext.modelParamsB;\n    if (Number.isFinite(Number(saved?.modelParamsB)) && Number(saved.modelParamsB) > 0) return Number(saved.modelParamsB);\n    const migrated = migrateLegacyModelState(saved);\n    if (migrated) return migrated;\n    return getModelById(modelId)?.totalParamsB || getDefaultModel().totalParamsB;\n  });\n  const [quant, setQuant] = useState(() => (arrivedFromGpuSizing && incomingQuant) ? incomingQuant : saved?.quant ?? "FP8");\n  const selectedModel = getModelById(modelId);\n  const modelDisplay = formatModelContext(selectedModel, modelParamsB);\n  const setSelectedModelId = (nextId) => {\n    setModelId(nextId);\n    const next = getModelById(nextId);\n    if (next && next.id !== "custom" && Number.isFinite(Number(next.totalParamsB))) setModelParamsB(Number(next.totalParamsB));\n  };\n''',
    "TCO model state",
)

text = text.replace('residPct, modelSize, quant,', 'residPct, modelId, modelParamsB, quant,')
text = text.replace('residPct, modelSize, quant, gpuSizingCount', 'residPct, modelId, modelParamsB, quant, gpuSizingCount')
text = text.replace('residPct, modelSize, quant, horizon, mode,', 'residPct, modelId, modelParamsB, quant, horizon, mode,')
text = text.replace('residPct, modelSize, quant, horizon, provider,', 'residPct, modelId, modelParamsB, quant, horizon, provider,')

text = text.replace('${modelSize} @ ${quant}', '${modelDisplay} @ ${quant}')
text = text.replace('`${modelSize} / ${quant}`', '`${modelDisplay} / ${quant}`')
text = text.replace('A {modelSize} model at {quant}', 'A {modelDisplay} model at {quant}')

text = replace_once(
    text,
    '          <TipLabel text="Model size" tip={TIPS.modelSize} style={{ fontSize: 13 }} />\n          <Seg options={Object.keys(MODELS)} value={modelSize} onChange={setModelSize} />\n',
    '''          <TipLabel text="Model" tip={TIPS.modelSize} style={{ fontSize: 13 }} />\n          <select\n            value={modelId}\n            onChange={(e) => setSelectedModelId(e.target.value)}\n            aria-label="Model for capacity estimate"\n            style={{ width: "100%", padding: "9px 10px", border: `1px solid ${C.line}`, borderRadius: 8, background: "#fff", color: C.ink, margin: "4px 0 8px" }}\n          >\n            {TCO_MODEL_OPTIONS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}\n          </select>\n          {modelId === "custom" && (\n            <label style={{ display: "block", fontSize: 12, color: C.sub, marginBottom: 8 }}>\n              Model parameters (billions)\n              <input\n                type="number" min="0.1" step="0.1" value={modelParamsB}\n                onChange={(e) => { const n = parseFloat(e.target.value); if (Number.isFinite(n) && n > 0) setModelParamsB(n); }}\n                aria-label="Custom model parameters in billions"\n                style={{ width: "100%", boxSizing: "border-box", marginTop: 4, padding: "8px 10px", border: `1px solid ${C.line}`, borderRadius: 8 }}\n              />\n            </label>\n          )}\n          {gpuSizingCount && <div style={{ fontSize: 11, color: C.sub, marginBottom: 8 }}>Model context is shared with GPU Sizing when available. GPU Sizing remains authoritative for the technical GPU count; this model value only drives the directional capacity and unit-economics estimates below.</div>}\n''',
    "TCO model selector",
)

text = replace_once(
    text,
    '                Comparing <strong>{r.sysAdj} x {ownSys}</strong> ({gpuSizingCount} {sourceClass || ownSys}-class GPUs, your GPU Sizing recommendation)\n',
    '                Comparing <strong>{r.sysAdj} x {ownSys}</strong> ({gpuSizingCount} {sourceClass || ownSys}-class GPUs, your GPU Sizing recommendation)\n                for <strong>{modelDisplay}</strong>{incomingQuant ? ` at ${quant}` : ""}\n',
    "TCO planning model provenance",
)

text = replace_once(
    text,
    '            {r.isWorkloadMode && <Row label="Duty cycle" value={`${workingDayHours} hrs/day`} />}\n',
    '            {r.isWorkloadMode && <Row label="Duty cycle" value={`${workingDayHours} hrs/day`} />}\n            <Row label="Model context" value={`${modelDisplay} @ ${quant}`} sub={r.isWorkloadMode ? "carried from GPU Sizing when available; used only for directional capacity/unit economics" : "standalone TCO capacity assumption"} />\n',
    "TCO audit model row",
)

p.write_text(text, encoding="utf-8")
print("Applied shared model context integration.")
