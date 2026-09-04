from pathlib import Path
import re

p = Path("src/GpuSizingCalculator.jsx")
text = p.read_text()


def sub_once(pattern, replacement, label, flags=0):
    global text
    next_text, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        raise SystemExit(f"{label} anchor not found")
    text = next_text

# 1) A fresh Model Advisor handoff is a new immediate provenance source. It
# must not be masked by a sourceUseCase persisted from an unrelated Explorer
# journey.
sub_once(
    r'  const saved = loadSessionState\("gpu-sizing"\);\n(?:(?:.|\n)*?)  const \[sourceUseCase\] = useState\(\(\) => getInitialSourceUseCase\(\) \?\? saved\?\.sourceUseCase \?\? null\);\n  const \[incomingWorkloadType\] = useState\(getInitialWorkloadType\);\n  const \[incomingModelId\] = useState\(\(\) => getIncomingParams\(\)\?\.get\("model"\) \|\| null\);',
    '''  const saved = loadSessionState("gpu-sizing");

  const [incomingModelId] = useState(() => getIncomingParams()?.get("model") || null);

  // A fresh Model Advisor handoff is a new immediate provenance source. An
  // unrelated Explorer source from an older GPU Sizing session must not mask
  // it. If a future Model Advisor link deliberately carries sourceUseCase,
  // preserve that explicit chain; otherwise clear the stale Explorer source.
  const [sourceUseCase] = useState(() => {
    const freshSourceUseCase = getInitialSourceUseCase();
    if (incomingModelId) return freshSourceUseCase;
    return freshSourceUseCase ?? saved?.sourceUseCase ?? null;
  });
  const [incomingWorkloadType] = useState(getInitialWorkloadType);''',
    "state provenance",
)

# 2) Persist the Advisor recommendation separately from the editable active
# model, and apply a fresh recommendation to whichever sizing mode is active.
sub_once(
    r'  const \[modelHandoff\] = useState\(getInitialInfModel\); // \{ model, matched: true \| false \| null \}\n  const \[infModel, setInfModel\] = useState\(\(\) => \{\n    if \(incomingModelId\) return modelHandoff\.model;[^\n]*\n    return getModelById\(saved\?\.infModelId\) \|\| modelHandoff\.model;\n  \}\);',
    '''  const [modelHandoff] = useState(getInitialInfModel); // { model, matched: true | false | null }
  const [modelAdvisorRecommendedId] = useState(() => {
    if (incomingModelId) return modelHandoff.matched ? modelHandoff.model.id : incomingModelId;
    if (hasFreshSourceUseCase || incomingWorkloadType) return null;
    return saved?.modelAdvisorRecommendedId ?? null;
  });
  const [infModel, setInfModel] = useState(() => {
    if (incomingModelId && mode === "Inference") return modelHandoff.model;
    return getModelById(saved?.infModelId) || modelHandoff.model;
  });''',
    "inference model",
)

sub_once(
    r'  const \[trainModel, setTrainModel\] = useState\(\(\) => getModelById\(saved\?\.trainModelId\) \|\| getDefaultModel\(\)\);',
    '''  const [trainModel, setTrainModel] = useState(() => {
    if (incomingModelId && mode === "Training") return modelHandoff.model;
    return getModelById(saved?.trainModelId) || getDefaultModel();
  });''',
    "training model",
)

# 3) Persist recommendation provenance independently from model edits.
sub_once(
    r'(      sourceUseCase,\n)(    \}\);\n  \}, \[mode, pathLevel, infModel, quant, concurrentUsers, targetTokPerUser, environment,\n      avgInputTokens, avgOutputTokens, kvBytesPerElement, overheadPct, infGpuOverride,\n      customParamsB, customLayers, customKvHeads, customHeadDim, workingDayHours,\n      trainModel, taskType, precision, datasetTokensB, targetDays, mfu, trainGpuOverride,\n      sourceUseCase\]\);)',
    r'''      sourceUseCase,
      modelAdvisorRecommendedId,
\2'''.replace('\\2', '\\2'),
    "session persistence",
)
# The replacement above leaves the dependency array unchanged; update it
# separately so React persistence follows the provenance field.
text = text.replace(
    '      sourceUseCase]);',
    '      sourceUseCase, modelAdvisorRecommendedId]);',
    1,
)

# 4) Keep the return-to-Advisor affordance after URL consumption/reload.
text = text.replace(
    '        {incomingModelId ? (\n          <a href="/model-advisor" style={{ fontSize: 12, fontWeight: 600, color: RED, textDecoration: "none" }}>&larr; Change model recommendation</a>',
    '        {modelAdvisorRecommendedId ? (\n          <a href="/model-advisor" style={{ fontSize: 12, fontWeight: 600, color: RED, textDecoration: "none" }}>&larr; Change model recommendation</a>',
    1,
)

# 5) Replace URL-only banner logic with durable three-state provenance:
# carried as recommended, adjusted in GPU Sizing, or unsupported profile.
old_start = '''        {(sourceUseCase || incomingModelId) && (
          <div className="mb-6 text-sm rounded-lg px-4 py-3" style={{ background: "#F5F5F5", border: "1px solid #ddd", color: "#444" }}>
            {incomingModelId && !sourceUseCase && (
              modelHandoff.matched === false ? (
                <>
                  Model Advisor recommended <strong>{incomingModelId}</strong>, but this calculator doesn't have a sizing
                  profile for that model yet. Showing default settings ({infModel.label}) instead -- pick the right model
                  below rather than relying on this pre-fill.
                </>
              ) : (
                <>Model pre-set to <strong>{infModel.label}</strong>, carried over from Model Advisor. Adjust anything below to refine the estimate.</>
              )
            )}
'''
new_start = '''        {(sourceUseCase || modelAdvisorRecommendedId) && (
          <div className="mb-6 text-sm rounded-lg px-4 py-3" style={{ background: "#F5F5F5", border: "1px solid #ddd", color: "#444" }}>
            {modelAdvisorRecommendedId && !sourceUseCase && (() => {
              const recommendedModel = getModelById(modelAdvisorRecommendedId);
              const activeModel = mode === "Inference" ? infModel : trainModel;
              if (!recommendedModel) {
                return <>
                  Model Advisor recommended <strong>{modelAdvisorRecommendedId}</strong>, but this calculator doesn't have a sizing
                  profile for that model yet. Showing current settings ({activeModel.label}) instead -- pick the right model
                  below rather than relying on this pre-fill.
                </>;
              }
              if (activeModel.id === recommendedModel.id) {
                return <>Model pre-set to <strong>{recommendedModel.label}</strong>, carried over from Model Advisor. Adjust anything below to refine the estimate.</>;
              }
              return <>Model Advisor recommended <strong>{recommendedModel.label}</strong>; you're currently sizing <strong>{activeModel.label}</strong> after an adjustment in GPU Sizing.</>;
            })()}
'''
if old_start not in text:
    raise SystemExit("provenance banner anchor not found")
text = text.replace(old_start, new_start, 1)

p.write_text(text)
