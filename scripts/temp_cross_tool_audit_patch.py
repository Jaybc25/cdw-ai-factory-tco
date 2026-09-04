from pathlib import Path

p = Path("src/GpuSizingCalculator.jsx")
text = p.read_text()

old = '''  // Loaded early so sourceUseCase (below) can fall back to it -- see the
  // Fix comment on that line.
  const saved = loadSessionState("gpu-sizing");

  // Fix (Bug Group 1b): sourceUseCase previously read ONLY from the URL, so
  // the "Arrived from Use Case Explorer" banner vanished after Back/Forward
  // or a hard refresh even though nothing it displays affects any calculation.
  // Falling back to saved state keeps the banner alive for the rest of the
  // session, matching how every other field here behaves.
  const [sourceUseCase] = useState(() => getInitialSourceUseCase() ?? saved?.sourceUseCase ?? null);
  const [incomingWorkloadType] = useState(getInitialWorkloadType);
  const [incomingModelId] = useState(() => getIncomingParams()?.get("model") || null);
'''
new = '''  // Loaded early so handoff-derived state below can apply field-level
  // precedence over the prior session without resetting GPU-Sizing-owned
  // assumptions.
  const saved = loadSessionState("gpu-sizing");

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
  const [incomingWorkloadType] = useState(getInitialWorkloadType);
'''
if old not in text:
    raise SystemExit("state provenance anchor not found")
text = text.replace(old, new, 1)

old = '''  const [modelHandoff] = useState(getInitialInfModel); // { model, matched: true | false | null }
  const [infModel, setInfModel] = useState(() => {
    if (incomingModelId) return modelHandoff.model; // a real model= handoff always wins
    return getModelById(saved?.infModelId) || modelHandoff.model;
  });
'''
new = '''  const [modelHandoff] = useState(getInitialInfModel); // { model, matched: true | false | null }
  const [modelAdvisorRecommendedId] = useState(() => {
    if (incomingModelId) return modelHandoff.matched ? modelHandoff.model.id : incomingModelId;
    if (hasFreshSourceUseCase || incomingWorkloadType) return null;
    return saved?.modelAdvisorRecommendedId ?? null;
  });
  const [infModel, setInfModel] = useState(() => {
    if (incomingModelId && mode === "Inference") return modelHandoff.model;
    return getModelById(saved?.infModelId) || modelHandoff.model;
  });
'''
if old not in text:
    raise SystemExit("inference model anchor not found")
text = text.replace(old, new, 1)

old = '''  const [trainModel, setTrainModel] = useState(() => getModelById(saved?.trainModelId) || getDefaultModel());
'''
new = '''  const [trainModel, setTrainModel] = useState(() => {
    if (incomingModelId && mode === "Training") return modelHandoff.model;
    return getModelById(saved?.trainModelId) || getDefaultModel();
  });
'''
if old not in text:
    raise SystemExit("training model anchor not found")
text = text.replace(old, new, 1)

old = '''      // Fix (Bug Group 1b): persist the provenance banner's source too.
      sourceUseCase,
    });
  }, [mode, pathLevel, infModel, quant, concurrentUsers, targetTokPerUser, environment,
      avgInputTokens, avgOutputTokens, kvBytesPerElement, overheadPct, infGpuOverride,
      customParamsB, customLayers, customKvHeads, customHeadDim, workingDayHours,
      trainModel, taskType, precision, datasetTokensB, targetDays, mfu, trainGpuOverride,
      sourceUseCase]);
'''
new = '''      // Persist provenance independently from the editable model state so a
      // later GPU Sizing adjustment can be disclosed without replaying the
      // original Model Advisor URL handoff.
      sourceUseCase,
      modelAdvisorRecommendedId,
    });
  }, [mode, pathLevel, infModel, quant, concurrentUsers, targetTokPerUser, environment,
      avgInputTokens, avgOutputTokens, kvBytesPerElement, overheadPct, infGpuOverride,
      customParamsB, customLayers, customKvHeads, customHeadDim, workingDayHours,
      trainModel, taskType, precision, datasetTokensB, targetDays, mfu, trainGpuOverride,
      sourceUseCase, modelAdvisorRecommendedId]);
'''
if old not in text:
    raise SystemExit("session persistence anchor not found")
text = text.replace(old, new, 1)

old = '''      <div className="no-print border-b border-gray-100 px-6 py-2 flex items-center justify-between gap-3">
        {incomingModelId ? (
          <a href="/model-advisor" style={{ fontSize: 12, fontWeight: 600, color: RED, textDecoration: "none" }}>&larr; Change model recommendation</a>
        ) : <span />}
        <AuthWidget />
      </div>
'''
new = '''      <div className="no-print border-b border-gray-100 px-6 py-2 flex items-center justify-between gap-3">
        {modelAdvisorRecommendedId ? (
          <a href="/model-advisor" style={{ fontSize: 12, fontWeight: 600, color: RED, textDecoration: "none" }}>&larr; Change model recommendation</a>
        ) : <span />}
        <AuthWidget />
      </div>
'''
if old not in text:
    raise SystemExit("model advisor back-link anchor not found")
text = text.replace(old, new, 1)

old = '''        {(sourceUseCase || incomingModelId) && (
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
new = '''        {(sourceUseCase || modelAdvisorRecommendedId) && (
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
if old not in text:
    raise SystemExit("provenance banner anchor not found")
text = text.replace(old, new, 1)

p.write_text(text)
