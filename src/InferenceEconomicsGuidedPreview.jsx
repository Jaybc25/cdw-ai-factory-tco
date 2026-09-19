import React, { useMemo, useState } from "react";
import { getDefaultModel, getModelById, RECOMMENDED_MODELS } from "./modelRegistry.js";
import { parseInferenceEconomicsPreviewHandoff } from "./inferenceEconomicsConnector.js";
import { deriveInferenceEconomicsThroughput } from "./inferenceEconomicsThroughput.js";
import {
  OUTPUT_TOKEN_DEMAND_BASIS,
  calculateAnnualOutputTokenDemand,
  calculateAnnualServingCapacity,
  calculateDemandBoundInferenceEconomics,
} from "./inferenceEconomicsWorkload.js";
import {
  calculateManagedApiWorkloadEconomics,
  comparePrivateAndManagedApi,
} from "./managedApiComparison.js";
import {
  COMMERCIAL_USE_STATUS,
  MANAGED_API_SOURCE_TYPE,
  createManagedApiRateRecord,
} from "./managedApiPricingSource.js";
import {
  MANAGED_API_CUSTOM_PROVIDER,
  getManagedApiPricingFreshness,
  getManagedApiRate,
  listManagedApiModels,
  listManagedApiProviders,
} from "./managedApiPricingRegistry.js";

const HARDWARE = ["H200", "B200", "GB200 NVL72", "B300", "GB300 NVL72"];
const PRECISIONS_BY_HARDWARE = {
  H200: ["FP8"],
  B200: ["FP4", "FP8", "FP16"],
  "GB200 NVL72": ["FP4", "FP8", "FP16"],
  B300: ["FP4", "FP8", "FP16"],
  "GB300 NVL72": ["FP4", "FP8", "FP16"],
};

function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}
function money(v, digits = 2) {
  return Number.isFinite(v)
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: digits }).format(v)
    : "—";
}
function compact(v) {
  return Number.isFinite(v)
    ? new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(v)
    : "—";
}

export default function InferenceEconomicsGuidedPreview() {
  const defaultModel = getDefaultModel();
  const handoff = useMemo(
    () => (typeof window !== "undefined" ? parseInferenceEconomicsPreviewHandoff(window.location.search) : null),
    []
  );
  const inherited = handoff?.source === "tco";
  const initialModel = handoff?.modelId ? getModelById(handoff.modelId) : null;
  const modelOptions = useMemo(() => {
    const options = [...RECOMMENDED_MODELS];
    if (initialModel && !options.some((m) => m.id === initialModel.id)) options.push(initialModel);
    return options;
  }, [initialModel]);

  const [hardwareClass, setHardwareClass] = useState(handoff?.hardwareClass || "B200");
  const [deployedGpuCount, setDeployedGpuCount] = useState(handoff?.gpuCount || 8);
  const [quant, setQuant] = useState(handoff?.quant || "FP8");
  const [modelId, setModelId] = useState(handoff?.modelId || defaultModel?.id || RECOMMENDED_MODELS[0]?.id);
  const [attributableTcoUsd, setAttributableTcoUsd] = useState(handoff?.attributableTcoUsd || "");
  const [horizonYears, setHorizonYears] = useState(handoff?.horizonYears || 3);
  const [activeHoursPerDay, setActiveHoursPerDay] = useState(handoff?.activeHoursPerDay || 8);
  const [activeDaysPerYear, setActiveDaysPerYear] = useState(250);
  const [productionServingFactor, setProductionServingFactor] = useState("");
  const [demandGrowthRate, setDemandGrowthRate] = useState(handoff?.demandGrowthRate ?? 0);

  const [demandBasis, setDemandBasis] = useState(OUTPUT_TOKEN_DEMAND_BASIS.MEASURED_MONTHLY);
  const [monthlyOutputTokens, setMonthlyOutputTokens] = useState("");
  const [annualOutputTokens, setAnnualOutputTokens] = useState("");
  const [requestsPerDay, setRequestsPerDay] = useState("");
  const [avgOutputTokens, setAvgOutputTokens] = useState("");

  const [apiProvider, setApiProvider] = useState("");
  const [apiModelId, setApiModelId] = useState("");
  const [apiModelLabel, setApiModelLabel] = useState("");
  const [apiCustomProvider, setApiCustomProvider] = useState("");
  const [apiInputUsdPerMillion, setApiInputUsdPerMillion] = useState("");
  const [apiOutputUsdPerMillion, setApiOutputUsdPerMillion] = useState("");
  const [apiCachedInputUsdPerMillion, setApiCachedInputUsdPerMillion] = useState("");
  const [apiInputTokensPerOutputToken, setApiInputTokensPerOutputToken] = useState("");
  const [apiCachedInputShare, setApiCachedInputShare] = useState(0);
  const [customizeApi, setCustomizeApi] = useState(false);

  const model = modelOptions.find((m) => m.id === modelId) || defaultModel;
  const customParamsB = handoff?.modelId === "custom" ? handoff?.modelParamsB : null;
  const availablePrecisions = PRECISIONS_BY_HARDWARE[hardwareClass] || ["FP8"];

  const blockers = (handoff?.blockers || []).filter((code) =>
    ["UNSUPPORTED_HARDWARE", "CUSTOM_MODEL_SIZE_MISSING", "INFERENCE_SHARE_UNKNOWN", "NO_INFERENCE_SHARE"].includes(code)
  );
  const inheritedScenarioBlocked = inherited && blockers.length > 0;

  function handleHardwareChange(nextHardware) {
    setHardwareClass(nextHardware);
    const nextPrecisions = PRECISIONS_BY_HARDWARE[nextHardware] || ["FP8"];
    if (!nextPrecisions.includes(quant)) setQuant(nextPrecisions[0]);
    setDeployedGpuCount(nextHardware.includes("NVL72") ? 72 : 8);
  }

  const result = useMemo(() => {
    const throughput = deriveInferenceEconomicsThroughput({
      hardwareClass,
      deployedGpuCount: n(deployedGpuCount),
      quant,
      model,
      customParamsB,
    });
    if (!throughput.ok) return { throughput };

    const demand = calculateAnnualOutputTokenDemand({
      basis: demandBasis,
      measuredMonthlyOutputTokens: n(monthlyOutputTokens),
      annualOutputTokens: n(annualOutputTokens),
      requestsPerDay: n(requestsPerDay),
      averageOutputTokensPerRequest: n(avgOutputTokens),
      activeDaysPerYear: n(activeDaysPerYear),
    });

    const capacity = calculateAnnualServingCapacity({
      effectiveOutputThroughputTokPerSec: throughput.effectiveThroughputTokPerSec,
      productionServingFactor: n(productionServingFactor),
      activeHoursPerDay: n(activeHoursPerDay),
      activeDaysPerYear: n(activeDaysPerYear),
    });

    const economics = inheritedScenarioBlocked
      ? {
          ok: false,
          reason: "INHERITED_SCENARIO_UNSUPPORTED",
          errors: ["The inherited TCO scenario has an unresolved eligibility issue."],
        }
      : calculateDemandBoundInferenceEconomics({
          attributableTcoUsd: n(attributableTcoUsd),
          horizonYears: n(horizonYears),
          demand,
          servingCapacity: capacity,
          demandGrowthRate: n(demandGrowthRate),
          evidenceStatus: "MODELED",
        });

    return { throughput, demand, capacity, economics };
  }, [
    hardwareClass, deployedGpuCount, quant, model, customParamsB,
    demandBasis, monthlyOutputTokens, annualOutputTokens, requestsPerDay, avgOutputTokens,
    activeDaysPerYear, productionServingFactor, activeHoursPerDay,
    attributableTcoUsd, horizonYears, demandGrowthRate, inheritedScenarioBlocked,
  ]);

  const e = result.economics;
  const t = result.throughput;

  const apiProviders = useMemo(() => listManagedApiProviders(), []);
  const apiModelOptions = useMemo(
    () => apiProvider && apiProvider !== MANAGED_API_CUSTOM_PROVIDER ? listManagedApiModels(apiProvider) : [],
    [apiProvider]
  );
  const selectedRegistryRate = useMemo(
    () => apiProvider && apiModelId ? getManagedApiRate(apiProvider, apiModelId) : null,
    [apiProvider, apiModelId]
  );
  const pricingFreshness = useMemo(() => getManagedApiPricingFreshness(), []);

  function applyRegistryRate(rate) {
    if (!rate) return;
    setApiModelId(rate.modelId);
    setApiModelLabel(rate.modelLabel);
    setApiInputUsdPerMillion(String(rate.inputUsdPerMillion));
    setApiOutputUsdPerMillion(String(rate.outputUsdPerMillion));
    setApiCachedInputUsdPerMillion(rate.cachedInputUsdPerMillion == null ? "" : String(rate.cachedInputUsdPerMillion));
  }

  function handleApiProviderChange(nextProvider) {
    setApiProvider(nextProvider);
    if (!nextProvider) {
      setApiModelId("");
      return;
    }
    if (nextProvider === MANAGED_API_CUSTOM_PROVIDER) {
      setApiModelId("");
      setApiModelLabel("");
      setApiInputUsdPerMillion("");
      setApiOutputUsdPerMillion("");
      setApiCachedInputUsdPerMillion("");
      return;
    }
    applyRegistryRate(listManagedApiModels(nextProvider)[0] || null);
  }

  const apiResult = useMemo(() => {
    if (!result.demand?.ok) return null;

    if (!customizeApi) {
      if (!selectedRegistryRate) return null;
      const managed = calculateManagedApiWorkloadEconomics({
        annualOutputTokens: result.demand.annualOutputTokens,
        horizonYears: n(horizonYears),
        demandGrowthRate: n(demandGrowthRate),
        inputTokensPerOutputToken: 0.70 / 0.30,
        cachedInputShare: 0,
        rate: selectedRegistryRate,
      });
      if (!managed.ok) return { managed, comparison: null, basis: "REFERENCE" };
      return {
        managed,
        comparison: e?.ok
          ? comparePrivateAndManagedApi({
              privateCostPerMillionOutputTokens: e.costPerMillionOutputTokens,
              managedApiEconomics: managed,
            })
          : null,
        basis: "REFERENCE",
      };
    }

    const inputPrice = n(apiInputUsdPerMillion);
    const outputPrice = n(apiOutputUsdPerMillion);
    const cachedPrice = apiCachedInputUsdPerMillion === "" ? null : n(apiCachedInputUsdPerMillion);
    const selectedCached = selectedRegistryRate?.cachedInputUsdPerMillion ?? null;
    const registryRateUnchanged =
      selectedRegistryRate &&
      inputPrice === selectedRegistryRate.inputUsdPerMillion &&
      outputPrice === selectedRegistryRate.outputUsdPerMillion &&
      cachedPrice === selectedCached;

    const rateRecord = registryRateUnchanged
      ? { ok: true, rate: selectedRegistryRate }
      : createManagedApiRateRecord({
          sourceId: selectedRegistryRate ? "registry-user-override" : "guided-manual-preview",
          sourceType: MANAGED_API_SOURCE_TYPE.USER_OVERRIDE,
          provider: apiProvider === MANAGED_API_CUSTOM_PROVIDER
            ? (apiCustomProvider || "Custom / negotiated")
            : (apiProvider || "Manual comparison"),
          modelId: (apiModelId || apiModelLabel || "manual-api-rate").toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          modelLabel: apiModelLabel || "Manual API rate",
          inputUsdPerMillion: inputPrice,
          outputUsdPerMillion: outputPrice,
          cachedInputUsdPerMillion: cachedPrice,
          commercialUseStatus: COMMERCIAL_USE_STATUS.NOT_APPLICABLE,
          provenanceNote: "Guided Preview user override.",
        });
    if (!rateRecord.ok) return { managed: null, comparison: null, errors: rateRecord.errors, basis: "CUSTOM" };

    const managed = calculateManagedApiWorkloadEconomics({
      annualOutputTokens: result.demand.annualOutputTokens,
      horizonYears: n(horizonYears),
      demandGrowthRate: n(demandGrowthRate),
      inputTokensPerOutputToken: apiInputTokensPerOutputToken === "" ? null : n(apiInputTokensPerOutputToken),
      cachedInputShare: n(apiCachedInputShare),
      rate: rateRecord.rate,
    });

    return {
      managed,
      comparison: e?.ok && managed.ok
        ? comparePrivateAndManagedApi({
            privateCostPerMillionOutputTokens: e.costPerMillionOutputTokens,
            managedApiEconomics: managed,
          })
        : null,
      basis: "CUSTOM",
      errors: managed?.errors || [],
    };
  }, [
    customizeApi, selectedRegistryRate, result.demand, horizonYears, demandGrowthRate, e,
    apiProvider, apiModelId, apiModelLabel, apiCustomProvider,
    apiInputUsdPerMillion, apiOutputUsdPerMillion, apiCachedInputUsdPerMillion,
    apiInputTokensPerOutputToken, apiCachedInputShare,
  ]);

  return (
    <main style={page}>
      <div style={previewBanner}>
        <div style={eyebrow}>ALTERNATIVE PREVIEW</div>
        <div style={{ fontSize: 18, fontWeight: 850, marginTop: 4 }}>Guided Inference Economics</div>
        <div style={muted}>A simpler presales flow using the same economics and pricing engines as the existing technical Preview.</div>
      </div>

      <Step number="1" title="Your private AI scenario" subtitle="Start with the environment and cost you want to evaluate.">
        {inherited ? (
          <div style={summaryGrid}>
            <Summary label="Hardware" value={hardwareClass} />
            <Summary label="GPUs used for this estimate" value={deployedGpuCount} />
            <Summary label="Model" value={model?.label || "—"} />
            <Summary label="Precision" value={quant} />
            <Summary label="Private AI cost assigned to this workload" value={attributableTcoUsd ? money(n(attributableTcoUsd), 0) : "Not available"} />
            <Summary label="Analysis period" value={horizonYears + " years"} />
          </div>
        ) : (
          <div style={twoCol}>
            <Field label="Hardware" help="GPU system used for this private-AI scenario.">
              <select style={input} value={hardwareClass} onChange={(ev) => handleHardwareChange(ev.target.value)}>
                {HARDWARE.map((x) => <option key={x}>{x}</option>)}
              </select>
            </Field>
            <Field label="Model" help="Open model being served on the private environment.">
              <select style={input} value={modelId} onChange={(ev) => setModelId(ev.target.value)}>
                {modelOptions.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </Field>
            <Field label="Private AI cost assigned to this workload" help="The portion of TCO that should be assigned to this inference workload.">
              <input style={input} type="number" min="1" value={attributableTcoUsd} onChange={(ev) => setAttributableTcoUsd(ev.target.value)} placeholder="e.g. 1200000" />
            </Field>
            <Field label="Analysis period" help="Use the same period as the TCO scenario when possible.">
              <input style={input} type="number" min="1" step="1" value={horizonYears} onChange={(ev) => setHorizonYears(ev.target.value)} />
            </Field>
          </div>
        )}

        <div style={{ ...sourceLine, marginTop: 16 }}>
          <span>
            <b>Capacity check:</b> {productionServingFactor ? `${Math.round(n(productionServingFactor) * 100)}% production-throughput assumption set` : "production-throughput assumption required"}
          </span>
          <InlineHelp text="This assumption is used to confirm the private configuration can meet expected demand. It does not continuously change the $/1M result. If the resulting production capacity falls below demand, the economics result is suppressed instead of quoting an undersized design." />
        </div>

        <details style={details}>
          <summary style={summaryLink}>Technical assumptions</summary>
          <div style={{ ...twoCol, marginTop: 14 }}>
            <Field label="GPUs used for this estimate" help="Throughput is only credited when the GPU count matches the supported benchmark configuration.">
              <input style={input} type="number" min="1" value={deployedGpuCount} onChange={(ev) => setDeployedGpuCount(ev.target.value)} disabled={inherited} />
            </Field>
            <Field label="Precision" help="Inference precision used for the throughput estimate.">
              <select style={input} value={quant} onChange={(ev) => setQuant(ev.target.value)} disabled={inherited}>
                {availablePrecisions.map((x) => <option key={x}>{x}</option>)}
              </select>
            </Field>
            <Field label="Production throughput assumption" help="Share of benchmark-adjusted throughput you expect to sustain in production. Example: 0.5 means 50% of the modeled ceiling. This validates capacity; it is not the same as GPU utilization and does not continuously change cost per token.">
              <input style={input} type="number" min="0.01" max="1" step=".05" value={productionServingFactor} onChange={(ev) => setProductionServingFactor(ev.target.value)} placeholder="Required for capacity check, e.g. 0.5" />
            </Field>
            <Field label="Serving hours per day" help="Hours per day this workload is expected to accept production demand.">
              <input style={input} type="number" min="1" max="24" value={activeHoursPerDay} onChange={(ev) => setActiveHoursPerDay(ev.target.value)} disabled={Boolean(handoff?.activeHoursPerDay)} />
            </Field>
            <Field label="Serving days per year" help="Days per year the service is expected to operate.">
              <input style={input} type="number" min="1" max="366" value={activeDaysPerYear} onChange={(ev) => setActiveDaysPerYear(ev.target.value)} />
            </Field>
          </div>
        </details>
      </Step>

      <Step number="2" title="Expected AI usage" subtitle="Tell us how much useful model output you expect to consume.">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          {[
            [OUTPUT_TOKEN_DEMAND_BASIS.MEASURED_MONTHLY, "Measured monthly"],
            [OUTPUT_TOKEN_DEMAND_BASIS.REQUEST_FORECAST, "Request forecast"],
            [OUTPUT_TOKEN_DEMAND_BASIS.ANNUAL_FORECAST, "Annual forecast"],
          ].map(([value, label]) => (
            <button key={value} type="button" onClick={() => setDemandBasis(value)} style={{ ...chip, ...(demandBasis === value ? activeChip : {}) }}>{label}</button>
          ))}
        </div>

        <div style={twoCol}>
          {demandBasis === OUTPUT_TOKEN_DEMAND_BASIS.MEASURED_MONTHLY && (
            <Field label="Output tokens per month" help="Best when you have actual gateway, API, or serving-log measurements.">
              <input style={input} type="number" min="1" value={monthlyOutputTokens} onChange={(ev) => setMonthlyOutputTokens(ev.target.value)} placeholder="e.g. 2000000000" />
            </Field>
          )}
          {demandBasis === OUTPUT_TOKEN_DEMAND_BASIS.ANNUAL_FORECAST && (
            <Field label="Output tokens per year" help="Use when you already have a defensible annual token forecast.">
              <input style={input} type="number" min="1" value={annualOutputTokens} onChange={(ev) => setAnnualOutputTokens(ev.target.value)} placeholder="Enter annual output-token forecast" />
            </Field>
          )}
          {demandBasis === OUTPUT_TOKEN_DEMAND_BASIS.REQUEST_FORECAST && (
            <>
              <Field label="Requests per day" help="Include people, apps, copilots, agents, and automations.">
                <input style={input} type="number" min="1" value={requestsPerDay} onChange={(ev) => setRequestsPerDay(ev.target.value)} placeholder="e.g. 50000" />
              </Field>
              <Field label="Average response size" help="Average generated output tokens per request.">
                <input style={input} type="number" min="1" value={avgOutputTokens} onChange={(ev) => setAvgOutputTokens(ev.target.value)} placeholder="e.g. 600" />
              </Field>
            </>
          )}
          <Field label="Expected annual growth" help="Year-over-year growth in useful output-token demand.">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input style={input} type="number" min="0" max="5" step=".05" value={demandGrowthRate} onChange={(ev) => setDemandGrowthRate(ev.target.value)} disabled={inherited} />
              <strong style={{ whiteSpace: "nowrap" }}>{Math.round(n(demandGrowthRate) * 100)}% / yr</strong>
            </div>
          </Field>
        </div>
      </Step>

      <Step number="3" title="Your private AI economics" subtitle="The result uses expected demand actually served—not every token the hardware could theoretically produce.">
        {e?.ok ? (
          <>
            <div style={heroValue}>{money(e.costPerMillionOutputTokens)} <span style={heroUnit}>/ 1M output tokens</span></div>
            <div style={summaryGrid}>
              <Summary label="Year 1 AI usage" value={compact(e.annualDemandOutputTokens)} help="Useful output-token demand in Year 1." />
              <Summary label="Modeled annual capacity" value={compact(e.annualCapacityOutputTokens)} help="Modeled annual output capacity after the serving-efficiency assumption." />
              <Summary label="Capacity used in Year 1" value={(e.demandUtilizationOfCapacity * 100).toFixed(1) + "%"} help="Expected Year 1 demand divided by modeled annual serving capacity." />
              <Summary label="Peak capacity used" value={(e.peakDemandUtilizationOfCapacity * 100).toFixed(1) + "%"} help="Highest modeled annual demand divided by annual serving capacity across the selected analysis period. This is the binding capacity check used to decide whether the configuration can meet demand." />
            </div>
            {e.peakDemandUtilizationOfCapacity >= 0.85 ? (
              <div style={capacityWarning}>
                <b>Limited production headroom:</b> peak modeled demand uses {(e.peakDemandUtilizationOfCapacity * 100).toFixed(1)}% of annual serving capacity over the analysis period. Small demand or throughput changes could make this configuration undersized.
              </div>
            ) : null}
            <details style={details}>
              <summary style={summaryLink}>Evidence & methodology</summary>
              <div style={methodText}>
                <div><b>Benchmark-adjusted output ceiling:</b> {compact(t?.effectiveThroughputTokPerSec)} tok/s</div>
                <div><b>Evidence source:</b> {t?.evidence?.sourceLabel || "—"}</div>
                <div><b>Evidence status:</b> MODELED</div>
              </div>
            </details>
          </>
        ) : (
          <div style={emptyState}>
            <b>{e?.reason === "UNDERSIZED_FOR_DEMAND" ? "This configuration does not meet the stated demand." : "Complete the inputs above to calculate private-AI economics."}</b>
            <div style={{ marginTop: 6 }}>
              {!productionServingFactor
                ? "Set the production throughput assumption under Technical assumptions to complete the capacity check."
                : e?.errors?.join(" ") || result.demand?.errors?.join(" ") || result.capacity?.errors?.join(" ") || result.throughput?.errors?.join(" ")}
            </div>
          </div>
        )}
      </Step>

      <Step number="4" title="Compare with a managed API" subtitle="Choose a provider and model. We’ll normalize public API pricing to the same output-token basis as the private-AI result.">
        <div style={twoCol}>
          <Field label="Provider" help="Public pricing comes from the current first-party pricing snapshot.">
            <select style={input} value={apiProvider} onChange={(ev) => handleApiProviderChange(ev.target.value)}>
              <option value="">Select provider</option>
              {apiProviders.map((provider) => <option key={provider} value={provider}>{provider}</option>)}
              {customizeApi ? <option value={MANAGED_API_CUSTOM_PROVIDER}>Custom / negotiated</option> : null}
            </select>
          </Field>

          {apiProvider === MANAGED_API_CUSTOM_PROVIDER && customizeApi ? (
            <Field label="Custom provider / contract" help="Label the negotiated pricing source.">
              <input style={input} value={apiCustomProvider} onChange={(ev) => setApiCustomProvider(ev.target.value)} />
            </Field>
          ) : (
            <Field label="Model" help="Selecting a model loads the current first-party pricing snapshot.">
              <select style={input} value={apiModelId} onChange={(ev) => applyRegistryRate(getManagedApiRate(apiProvider, ev.target.value))} disabled={!apiProvider}>
                <option value="">{apiProvider ? "Select model" : "Select provider first"}</option>
                {apiModelOptions.map((rate) => <option key={rate.modelId} value={rate.modelId}>{rate.modelLabel}</option>)}
              </select>
            </Field>
          )}
        </div>

        {selectedRegistryRate && (
          <div style={sourceLine}>
            <span><b>Pricing source:</b> {selectedRegistryRate.provider} · verified {pricingFreshness.verifiedAt || "—"}{pricingFreshness.status === "STALE" ? " · STALE" : ""}</span>
            <InlineHelp text="The guided comparison uses the last-known-good first-party pricing snapshot. The default comparison assumes a 70/30 input/output token mix and no cache discount. Model capability equivalence is not asserted." />
          </div>
        )}

        {apiResult?.managed?.ok && e?.ok ? (
          <>
            <div style={compareGrid}>
              <CompareCard title="Private AI" value={money(e.costPerMillionOutputTokens)} subtitle="/ 1M output tokens" secondary={"Assigned " + horizonYears + "-year private cost: " + money(n(attributableTcoUsd), 0)} />
              <CompareCard title={apiModelLabel || "Managed API"} value={money(apiResult.managed.effectiveUsdPerMillionOutputTokens)} subtitle="/ 1M output tokens" secondary={horizonYears + "-year modeled API cost: " + money(apiResult.managed.horizonApiCostUsd, 0)} />
            </div>
            <div style={differenceBox}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#666" }}>API minus private</div>
              <div style={{ fontSize: 24, fontWeight: 900, marginTop: 3 }}>{apiResult.comparison?.ok ? money(apiResult.comparison.managedApiMinusPrivateUsdPerMillionOutputTokens) + " / 1M output" : "—"}</div>
              <div style={muted}>Arithmetic difference only. This is not a recommendation and does not assert equivalent model capability.</div>
            </div>
          </>
        ) : (
          <div style={emptyState}>
            {apiProvider ? "Choose a model to calculate the comparison." : "Choose a provider and model to compare managed-API economics."}
          </div>
        )}

        <button type="button" onClick={() => setCustomizeApi((v) => !v)} style={textButton}>
          {customizeApi ? "Hide custom API assumptions" : "Customize API assumptions"}
        </button>

        {customizeApi && (
          <div style={{ ...twoCol, marginTop: 16 }}>
            {apiProvider === MANAGED_API_CUSTOM_PROVIDER && (
              <Field label="Model / rate label" help="Optional model or contract-rate label.">
                <input style={input} value={apiModelLabel} onChange={(ev) => setApiModelLabel(ev.target.value)} />
              </Field>
            )}
            <Field label="Input $ / 1M tokens" help="Public or negotiated uncached input-token rate.">
              <input style={input} type="number" min="0" step=".01" value={apiInputUsdPerMillion} onChange={(ev) => setApiInputUsdPerMillion(ev.target.value)} />
            </Field>
            <Field label="Output $ / 1M tokens" help="Public or negotiated generated-output-token rate.">
              <input style={input} type="number" min="0" step=".01" value={apiOutputUsdPerMillion} onChange={(ev) => setApiOutputUsdPerMillion(ev.target.value)} />
            </Field>
            <Field label="Cached input $ / 1M tokens" help="Optional cached-input rate.">
              <input style={input} type="number" min="0" step=".01" value={apiCachedInputUsdPerMillion} onChange={(ev) => setApiCachedInputUsdPerMillion(ev.target.value)} />
            </Field>
            <Field label="Input tokens per output token" help="Example: 3 means three input tokens for every generated output token. Required when customizing the workload-specific comparison.">
              <input style={input} type="number" min="0" step=".1" value={apiInputTokensPerOutputToken} onChange={(ev) => setApiInputTokensPerOutputToken(ev.target.value)} placeholder="Required for customized comparison" />
            </Field>
            <Field label="Cached share of input" help="Share of input tokens expected to receive the cached-input rate. Use 0 if unknown.">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input style={input} type="number" min="0" max="1" step=".05" value={apiCachedInputShare} onChange={(ev) => setApiCachedInputShare(ev.target.value)} />
                <strong style={{ whiteSpace: "nowrap" }}>{Math.round(n(apiCachedInputShare) * 100)}%</strong>
              </div>
            </Field>
            {apiResult?.errors?.length ? <div style={{ ...muted, gridColumn: "1 / -1" }}>Complete the customized assumptions to recalculate the API comparison.</div> : null}
          </div>
        )}
      </Step>
    </main>
  );
}

function Step({ number, title, subtitle, children }) {
  return (
    <section style={card}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 18 }}>
        <div style={stepNumber}>{number}</div>
        <div>
          <h2 style={{ fontSize: 22, margin: 0, fontWeight: 900 }}>{title}</h2>
          <div style={{ ...muted, marginTop: 4 }}>{subtitle}</div>
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({ label, help, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 850, marginBottom: 6 }}>
        <span>{label}</span>
        {help ? <HelpDot open={open} onClick={() => setOpen(!open)} /> : null}
      </div>
      {open && help ? <TipBox text={help} /> : null}
      {children}
    </div>
  );
}

function Summary({ label, value, help }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={summaryBox}>
      <div style={{ display: "flex", gap: 5, alignItems: "center", fontSize: 11, fontWeight: 800, color: "#666" }}>
        {label}{help ? <HelpDot open={open} onClick={() => setOpen(!open)} /> : null}
      </div>
      {open && help ? <TipBox text={help} /> : null}
      <div style={{ fontSize: 18, fontWeight: 900, marginTop: 5 }}>{value}</div>
    </div>
  );
}

function CompareCard({ title, value, subtitle, secondary }) {
  return (
    <div style={compareCard}>
      <div style={{ fontSize: 12, fontWeight: 900, color: "#666" }}>{title}</div>
      <div style={{ fontSize: 30, fontWeight: 950, marginTop: 8 }}>{value}</div>
      <div style={{ fontSize: 13, fontWeight: 800 }}>{subtitle}</div>
      <div style={{ ...muted, marginTop: 12 }}>{secondary}</div>
    </div>
  );
}

function HelpDot({ open, onClick }) {
  return (
    <button type="button" onClick={onClick} aria-label="What is this?" aria-expanded={open}
      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, border: "1.5px solid #CC0000", borderRadius: "50%", color: open ? "#fff" : "#CC0000", background: open ? "#CC0000" : "#fff", fontWeight: 900, cursor: "pointer", padding: 0 }}>?</button>
  );
}
function TipBox({ text }) {
  return <div style={{ fontSize: 12, lineHeight: 1.5, borderLeft: "3px solid #CC0000", background: "#f8f8f8", padding: "8px 10px", marginBottom: 8 }}>{text}</div>;
}
function InlineHelp({ text }) {
  const [open, setOpen] = useState(false);
  return (
    <span>
      <HelpDot open={open} onClick={() => setOpen(!open)} />
      {open ? <span style={{ display: "block", marginTop: 8 }}><TipBox text={text} /></span> : null}
    </span>
  );
}

const page = { maxWidth: 980, margin: "0 auto", padding: "28px 20px 64px", fontFamily: "Inter,system-ui,sans-serif", color: "#232323" };
const previewBanner = { border: "1px solid #efc2c2", background: "#fff8f8", borderRadius: 12, padding: "16px 18px", marginBottom: 18 };
const eyebrow = { fontSize: 11, fontWeight: 900, color: "#CC0000", letterSpacing: ".12em" };
const muted = { fontSize: 12, lineHeight: 1.55, color: "#666" };
const card = { border: "1px solid #e1e1e1", borderRadius: 14, padding: 20, background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.04)", marginBottom: 18 };
const stepNumber = { width: 32, height: 32, borderRadius: "50%", background: "#232323", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, flex: "0 0 auto" };
const twoCol = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 14 };
const summaryGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 };
const summaryBox = { border: "1px solid #e8e8e8", borderRadius: 10, padding: 12, background: "#fafafa" };
const input = { width: "100%", boxSizing: "border-box", border: "1px solid #cfcfcf", borderRadius: 8, padding: "10px 11px", fontSize: 14, background: "#fff" };
const details = { marginTop: 16, borderTop: "1px solid #eee", paddingTop: 14 };
const summaryLink = { cursor: "pointer", fontSize: 13, fontWeight: 850 };
const methodText = { fontSize: 12, lineHeight: 1.65, color: "#555", marginTop: 10 };
const chip = { border: "1px solid #bbb", borderRadius: 999, padding: "8px 12px", fontSize: 12, fontWeight: 800, cursor: "pointer", background: "#fff", color: "#232323" };
const activeChip = { background: "#232323", color: "#fff" };
const heroValue = { fontSize: 44, fontWeight: 950, margin: "6px 0 18px", letterSpacing: "-.03em" };
const heroUnit = { fontSize: 16, fontWeight: 800, letterSpacing: 0 };
const emptyState = { border: "1px dashed #ccc", borderRadius: 10, padding: 14, fontSize: 12, lineHeight: 1.5, color: "#666", background: "#fafafa" };
const capacityWarning = { border: "1px solid #d7a83a", borderRadius: 10, padding: "11px 12px", marginTop: 12, fontSize: 12, lineHeight: 1.5, background: "#fffaf0", color: "#5f4a16" };
const sourceLine = { display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap", fontSize: 12, color: "#666", background: "#f7f7f7", borderRadius: 8, padding: "10px 12px", marginTop: 14 };
const compareGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 14, marginTop: 18 };
const compareCard = { border: "1px solid #ddd", borderRadius: 12, padding: 16, background: "#fff" };
const differenceBox = { marginTop: 14, borderTop: "1px solid #eee", paddingTop: 14 };
const textButton = { marginTop: 16, border: 0, background: "transparent", color: "#B21F16", padding: 0, fontSize: 13, fontWeight: 850, cursor: "pointer", textDecoration: "underline" };
