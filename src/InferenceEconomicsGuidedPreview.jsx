import React, { useMemo, useState } from "react";
import cdwLogo from "./cdw-logo.png";
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
function compactMoney(v) {
  return Number.isFinite(v)
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        notation: "compact",
        maximumFractionDigits: 2,
      }).format(v)
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
  const [view, setView] = useState("calc");

  const model = modelOptions.find((m) => m.id === modelId) || defaultModel;
  const customParamsB = handoff?.modelId === "custom" ? handoff?.modelParamsB : null;
  const availablePrecisions = PRECISIONS_BY_HARDWARE[hardwareClass] || ["FP8"];

  const blockers = (handoff?.blockers || []).filter((code) =>
    ["UNSUPPORTED_HARDWARE", "CUSTOM_MODEL_SIZE_MISSING", "INFERENCE_SHARE_UNKNOWN", "NO_INFERENCE_SHARE", "TOPOLOGY_SCALEOUT_REQUIRED"].includes(code)
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
          errors: blockers.includes("TOPOLOGY_SCALEOUT_REQUIRED")
            ? ["GPU Sizing classified this workload as topology-dependent: one modeled serving instance does not fit inside a qualified benchmark-sized serving group. Definitive token economics are suppressed until topology-specific throughput evidence is available."]
            : ["The inherited TCO scenario has an unresolved eligibility issue."],
        }
      : calculateDemandBoundInferenceEconomics({
          attributableTcoUsd: n(attributableTcoUsd),
          horizonYears: n(horizonYears),
          demand,
          servingCapacity: capacity,
          demandGrowthRate: n(demandGrowthRate),
          evidenceStatus: throughput.evidence?.status,
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
  const coveredYearsBeforeCapacityCliff =
    e?.reason === "UNDERSIZED_FOR_DEMAND" && Array.isArray(e.demandByYear)
      ? e.demandByYear.filter((annualDemand) => annualDemand <= e.annualCapacityOutputTokens).length
      : null;
  const firstShortfallYear =
    coveredYearsBeforeCapacityCliff != null ? coveredYearsBeforeCapacityCliff + 1 : null;

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

  const comparison = apiResult?.comparison?.ok ? apiResult.comparison : null;
  const modeledDifferenceUsdPerMillion = comparison
    ? Math.abs(comparison.managedApiMinusPrivateUsdPerMillionOutputTokens)
    : null;
  const modeledDifferencePctOfApi = comparison?.managedApiUsdPerMillionOutputTokens > 0
    ? (modeledDifferenceUsdPerMillion / comparison.managedApiUsdPerMillionOutputTokens) * 100
    : null;
  const privateCostDirection = comparison
    ? comparison.managedApiMinusPrivateUsdPerMillionOutputTokens > 0
      ? "lower"
      : comparison.managedApiMinusPrivateUsdPerMillionOutputTokens < 0
        ? "higher"
        : "the same"
    : null;

  const roiHandoffReady =
    handoff?.source === "tco" &&
    Number.isFinite(Number(handoff?.roiInitialCostUsd)) &&
    Number.isFinite(Number(handoff?.roiRecurringCostUsd));
  const roiHref = roiHandoffReady
    ? `/roi?initialCost=${Math.round(Number(handoff.roiInitialCostUsd))}&recurringCost=${Math.round(Number(handoff.roiRecurringCostUsd))}&planningBasis=${handoff?.roiPlanningBasis || "spend"}`
    : "/roi";

  if (view === "report") {
    return (
      <InferenceEconomicsReportView
        onBack={() => setView("calc")}
        onAudit={() => setView("audit")}
        model={model}
        hardwareClass={hardwareClass}
        deployedGpuCount={n(deployedGpuCount)}
        quant={quant}
        horizonYears={n(horizonYears)}
        attributableTcoUsd={n(attributableTcoUsd)}
        economics={e}
        managed={apiResult?.managed}
        comparison={comparison}
        apiModelLabel={apiModelLabel}
        apiBasis={apiResult?.basis}
      />
    );
  }

  if (view === "audit") {
    return (
      <InferenceEconomicsAuditView
        onBack={() => setView("report")}
        model={model}
        hardwareClass={hardwareClass}
        deployedGpuCount={n(deployedGpuCount)}
        quant={quant}
        horizonYears={n(horizonYears)}
        attributableTcoUsd={n(attributableTcoUsd)}
        demandGrowthRate={n(demandGrowthRate)}
        activeHoursPerDay={n(activeHoursPerDay)}
        activeDaysPerYear={n(activeDaysPerYear)}
        productionServingFactor={n(productionServingFactor)}
        demand={result.demand}
        throughput={t}
        economics={e}
        managed={apiResult?.managed}
        comparison={comparison}
        apiModelLabel={apiModelLabel}
        apiBasis={apiResult?.basis}
      />
    );
  }

  return (
    <main style={page}>
      <div style={previewBanner}>
        <div style={{ fontSize: 18, fontWeight: 850 }}>Guided Inference Economics</div>
        <div style={muted}>Estimate effective private-AI inference cost and compare it with managed-API token pricing.</div>
      </div>

      <Step number="1" title="Your private AI scenario" subtitle="Start with the environment and cost you want to evaluate.">
        {inherited ? (
          <div style={summaryGrid}>
            <Summary label="Hardware" value={hardwareClass} />
            <Summary label="Deployed GPUs evaluated" value={deployedGpuCount} />
            <Summary label="Model" value={model?.label || "—"} />
            <Summary label="Precision" value={quant} />
            <Summary label="Private AI cost assigned to this workload" value={attributableTcoUsd ? compactMoney(n(attributableTcoUsd)) : "Not available"} />
            <Summary label="Analysis period" value={horizonYears + " years"} />
            {handoff?.inferenceShare != null ? (
              <Summary
                label="Inference cost allocation"
                value={Math.round(n(handoff.inferenceShare) * 100) + "% of TCO"}
                help={
                  handoff?.allocationMethod === "DIRECT_INFERENCE_WORKLOAD"
                    ? "This came from a GPU Sizing → TCO workload identified as inference, so the inherited TCO is treated as 100% inference-attributable."
                    : "This comes from TCO's workload mix: inference share = 1 − training share. It is a modeled allocation basis, not a measured accounting split."
                }
              />
            ) : null}
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

        {inherited && handoff?.allocationMethod === "WORKLOAD_SHARE_MODELED" ? (
          <div style={{ ...sourceLine, marginTop: 16 }}>
            <span><b>TCO attribution basis:</b> {Math.round(n(handoff.inferenceShare) * 100)}% of total TCO is assigned to inference from the TCO workload mix.</span>
            <InlineHelp text="This proportional split is a planning assumption. Shared and fixed infrastructure costs may not fall in direct proportion to workload share, so treat the attributed TCO as a modeled allocation rather than a measured marginal cost." />
          </div>
        ) : null}

        <div style={{ ...sourceLine, marginTop: 16 }}>
          <span>
            <b>Capacity check:</b> {productionServingFactor ? `${Math.round(n(productionServingFactor) * 100)}% production-throughput assumption set` : "production-throughput assumption required"}
          </span>
          <InlineHelp text="This assumption is used to confirm the private configuration can meet expected demand. It does not continuously change the $/1M result. If the resulting production capacity falls below demand, the economics result is suppressed instead of quoting an undersized design." />
        </div>

        <details style={details} open={!productionServingFactor}>
          <summary style={summaryLink}>Technical assumptions</summary>
          <div style={{ ...twoCol, marginTop: 14 }}>
            <Field label="Deployed GPUs evaluated" help="Exact benchmark counts use direct evidence. Whole multiples of a benchmark-sized group may be modeled as independent serving replicas when one group can host the selected model.">
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
                <div><b>Deployment evidence basis:</b> {t?.deploymentEvidenceBasis === "REPLICA_SCALED" ? `Replica-scaled · ${t.replicaGroupCount} × ${t.benchmarkGpuCount}-GPU serving groups` : "Exact benchmark configuration"}</div>
                <div><b>Evidence source:</b> {t?.evidence?.sourceLabel || "—"}</div>
                <div><b>Evidence status:</b> {e.evidenceStatus || "—"}</div>
              </div>
            </details>
          </>
        ) : (
          <div style={emptyState}>
            <b>{e?.reason === "UNDERSIZED_FOR_DEMAND" ? "This configuration does not meet the stated demand." : "Complete the inputs above to calculate private-AI economics."}</b>
            <div style={{ marginTop: 6 }}>
              {!productionServingFactor
                ? "Set the production throughput assumption under Technical assumptions to complete the capacity check."
                : e?.reason === "UNDERSIZED_FOR_DEMAND"
                  ? (
                    <>
                      <div>
                        {coveredYearsBeforeCapacityCliff > 0
                          ? `Capacity covers through Year ${coveredYearsBeforeCapacityCliff}. `
                          : "Capacity is below stated demand in Year 1. "}
                        {firstShortfallYear && firstShortfallYear <= n(horizonYears)
                          ? `Year ${firstShortfallYear} is the first year above modeled capacity. `
                          : ""}
                        Peak annual shortfall: {compact(e.annualShortfallTokens)} output tokens.
                      </div>
                      <div style={{ marginTop: 5 }}>{e.errors?.join(" ")}</div>
                    </>
                  )
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
          <>
            <div style={sourceLine}>
              <span><b>Pricing source:</b> {selectedRegistryRate.provider} · verified {pricingFreshness.verifiedAt || "—"}{pricingFreshness.status === "STALE" ? " · STALE" : ""}</span>
              <InlineHelp text="The guided comparison uses the last-known-good first-party pricing snapshot. The default comparison assumes a 70/30 input/output token mix and no cache discount. Model capability equivalence is not asserted." />
            </div>
            {pricingFreshness.status === "STALE" ? (
              <div style={capacityWarning}>
                <b>Pricing refresh recommended:</b> this managed-API snapshot is {pricingFreshness.ageDays} days old, beyond the {pricingFreshness.staleAfterDays}-day freshness window. Re-verify first-party pricing before treating the comparison as client-ready.
              </div>
            ) : null}
          </>
        )}

        {apiResult?.managed?.ok && e?.ok ? (
          <>
            {comparison ? (
              <div style={takeawayBox}>
                <div style={{ fontSize: 12, fontWeight: 900, color: "#666", textTransform: "uppercase", letterSpacing: ".04em" }}>What this means</div>
                <div style={{ fontSize: 18, fontWeight: 850, lineHeight: 1.45, marginTop: 6 }}>
                  Under these assumptions, private AI is modeled at {money(comparison.privateUsdPerMillionOutputTokens)} per 1M output tokens versus {money(comparison.managedApiUsdPerMillionOutputTokens)} for {apiModelLabel || "the selected managed API"}.
                </div>
                <div style={{ ...muted, fontSize: 13, marginTop: 7 }}>
                  {privateCostDirection === "the same"
                    ? "Both options are modeled at the same effective cost per 1M output tokens."
                    : `Private AI is modeled ${money(modeledDifferenceUsdPerMillion)} per 1M output tokens ${privateCostDirection}, a ${modeledDifferencePctOfApi.toFixed(1)}% difference relative to the managed API cost.`}
                  {" "}This is a cost comparison only and does not assert equivalent model capability.
                </div>
              </div>
            ) : null}

            <div style={compareGrid}>
              <CompareCard
                title={"Private AI · " + (model?.label || "Selected model")}
                value={money(e.costPerMillionOutputTokens)}
                subtitle="cost per 1M output tokens"
                secondary={horizonYears + "-year assigned private cost: " + compactMoney(n(attributableTcoUsd))}
              />
              <CompareCard
                title={apiModelLabel || "Managed API"}
                value={money(apiResult.managed.effectiveUsdPerMillionOutputTokens)}
                subtitle="cost per 1M output tokens"
                secondary={horizonYears + "-year modeled API cost: " + compactMoney(apiResult.managed.horizonApiCostUsd)}
              />
            </div>

            {comparison ? (
              <div style={differenceBox}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#666" }}>Modeled cost difference</div>
                <div style={{ fontSize: 24, fontWeight: 900, marginTop: 3 }}>
                  {money(modeledDifferenceUsdPerMillion)} / 1M output · {modeledDifferencePctOfApi.toFixed(1)}%
                </div>
                <div style={muted}>
                  Private AI is modeled {privateCostDirection} than the selected managed API on this normalized output-token cost basis.
                </div>
              </div>
            ) : null}

            {apiResult.basis === "REFERENCE" ? (
              <div style={sourceLine}>
                <span><b>Comparison basis:</b> 70% input / 30% output token mix · no cache discount</span>
                <InlineHelp text="This default mix is used only to normalize managed-API pricing to the same output-token denominator. You can change the assumptions below. Model capability equivalence is not asserted." />
              </div>
            ) : null}
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

      <div className="no-print" style={{ marginTop: 18, marginBottom: 14, border: "1px solid #D9DDE2", borderRadius: 12, background: "#F7F7F8", padding: "14px 16px" }}>
        <div style={{ fontSize: 11, fontWeight: 850, letterSpacing: ".04em", textTransform: "uppercase", color: "#666", marginBottom: 4 }}>
          Next · Build the business case
        </div>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#222", marginBottom: 4 }}>
          Translate these inference economics into ROI and business value.
        </div>
        <div style={{ ...muted, marginBottom: 10 }}>
          {roiHandoffReady
            ? "Your original TCO upfront and annual recurring investment will carry forward exactly into ROI."
            : "Inference Economics knows the assigned workload cost, but not a defensible upfront-versus-recurring investment split. Open ROI and enter or confirm those investment inputs there."}
        </div>
        <a
          href={roiHref}
          style={{ ...actionButton, ...primaryActionButton, display: "inline-flex", textDecoration: "none", width: "auto" }}
        >
          {roiHandoffReady ? "Continue to ROI" : "Open ROI Calculator"}
        </a>
      </div>

      <div className="no-print" style={actionRow}>
        <button
          type="button"
          style={{ ...actionButton, ...primaryActionButton, ...(e?.ok ? {} : disabledActionButton) }}
          disabled={!e?.ok}
          onClick={() => setView("report")}
          title={e?.ok ? "Open the Inference Economics report" : "Complete the private-AI economics inputs first"}
        >
          Get the full report (PDF)
        </button>
        <button
          type="button"
          style={actionButton}
          onClick={() => setView("audit")}
        >
          Calculation Methodology & Audit Trail
        </button>
      </div>
    </main>
  );
}


function InferenceEconomicsReportView({
  onBack,
  onAudit,
  model,
  hardwareClass,
  deployedGpuCount,
  quant,
  horizonYears,
  attributableTcoUsd,
  economics,
  managed,
  comparison,
  apiModelLabel,
  apiBasis,
}) {
  const difference = comparison?.ok
    ? Math.abs(comparison.managedApiMinusPrivateUsdPerMillionOutputTokens)
    : null;
  const differencePct = comparison?.ok && comparison.managedApiUsdPerMillionOutputTokens > 0
    ? (difference / comparison.managedApiUsdPerMillionOutputTokens) * 100
    : null;
  const direction = comparison?.ok
    ? comparison.managedApiMinusPrivateUsdPerMillionOutputTokens > 0
      ? "lower"
      : comparison.managedApiMinusPrivateUsdPerMillionOutputTokens < 0
        ? "higher"
        : "the same"
    : null;

  return (
    <main style={page}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .ie-report-sheet { border: 0 !important; box-shadow: none !important; padding: 0 !important; }
          @page { size: Letter; margin: .4in; }
        }
      `}</style>

      <section className="ie-report-sheet" style={reportSheet}>
        <div className="no-print" style={reportUtilityRow}>
          <button type="button" style={{ ...actionButton, ...primaryActionButton, flex: 1 }} onClick={() => window.print()}>
            Print / Save as PDF
          </button>
          <button type="button" style={actionButton} onClick={onAudit}>
            Calculation Methodology & Audit Trail
          </button>
          <button type="button" style={actionButton} onClick={onBack}>Back to calculator</button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}><img src={cdwLogo} alt="CDW" style={{ height: 32, width: "auto" }} /><div style={reportEyebrow}>AI FACTORY · INFERENCE ECONOMICS REPORT</div></div>
        <h1 style={reportTitle}>Inference Economics Summary</h1>
        <div style={muted}>Effective private-AI inference cost compared with managed-API token pricing.</div>

        <div style={{ ...summaryGrid, marginTop: 20 }}>
          <Summary label="Private model" value={model?.label || "—"} />
          <Summary label="Infrastructure" value={hardwareClass + " · " + deployedGpuCount + " GPUs"} />
          <Summary label="Precision" value={quant || "—"} />
          <Summary label="Analysis period" value={horizonYears + " years"} />
        </div>

        {economics?.ok ? (
          <>
            <div style={{ ...compareGrid, marginTop: 20 }}>
              <CompareCard
                title="Private AI"
                value={money(economics.costPerMillionOutputTokens)}
                subtitle="cost per 1M output tokens"
                secondary={horizonYears + "-year assigned private cost: " + compactMoney(attributableTcoUsd)}
              />
              {managed?.ok ? (
                <CompareCard
                  title={apiModelLabel || "Managed API"}
                  value={money(managed.effectiveUsdPerMillionOutputTokens)}
                  subtitle="cost per 1M output tokens"
                  secondary={horizonYears + "-year modeled API cost: " + compactMoney(managed.horizonApiCostUsd)}
                />
              ) : null}
            </div>

            {comparison?.ok ? (
              <div style={takeawayBox}>
                <div style={{ fontSize: 12, fontWeight: 900, color: "#666", textTransform: "uppercase", letterSpacing: ".04em" }}>What this means</div>
                <div style={{ fontSize: 18, fontWeight: 850, lineHeight: 1.45, marginTop: 6 }}>
                  {direction === "the same"
                    ? "Private AI and the selected managed API are modeled at the same effective cost per 1M output tokens."
                    : "Private AI is modeled " + money(difference) + " per 1M output tokens " + direction + " than " + (apiModelLabel || "the selected managed API") + (differencePct != null ? ", a " + differencePct.toFixed(1) + "% difference relative to the managed API cost." : ".")}
                </div>
                <div style={{ ...muted, marginTop: 7 }}>Cost comparison only; equivalent model capability is not asserted.</div>
              </div>
            ) : null}

            <div style={{ ...summaryGrid, marginTop: 18 }}>
              <Summary label="Year 1 AI usage" value={compact(economics.annualDemandOutputTokens)} />
              <Summary label="Horizon AI usage" value={compact(economics.horizonUsefulOutputTokens)} />
              <Summary label="Modeled annual capacity" value={compact(economics.annualCapacityOutputTokens)} />
              <Summary label="Peak capacity used" value={(economics.peakDemandUtilizationOfCapacity * 100).toFixed(1) + "%"} />
            </div>

            {apiBasis === "REFERENCE" ? (
              <div style={sourceLine}><b>Managed-API comparison basis:</b> 70% input / 30% output token mix · no cache discount.</div>
            ) : null}
          </>
        ) : (
          <div style={emptyState}>Complete the private-AI economics inputs before creating a report.</div>
        )}

        <div style={{ ...methodText, borderTop: "1px solid #eee", paddingTop: 14, marginTop: 22 }}>
          <b>Interpretation:</b> Private AI is an effective allocated cost based on the TCO assigned to this workload and expected output-token demand. It is not a marginal metered token price.
        </div>
      </section>
    </main>
  );
}

function InferenceEconomicsAuditView({
  onBack,
  model,
  hardwareClass,
  deployedGpuCount,
  quant,
  horizonYears,
  attributableTcoUsd,
  demandGrowthRate,
  activeHoursPerDay,
  activeDaysPerYear,
  productionServingFactor,
  demand,
  throughput,
  economics,
  managed,
  comparison,
  apiModelLabel,
  apiBasis,
}) {
  const demandYears = economics?.demandByYear || [];
  const capacity = economics?.annualCapacityOutputTokens || 0;
  const horizonDemand = economics?.horizonUsefulOutputTokens || 0;
  const apiRatio = managed?.assumptions?.inputTokensPerOutputToken ?? null;
  const cacheShare = managed?.assumptions?.cachedInputShare ?? null;
  const apiRate = managed?.rate || null;
  const year1Api = managed?.annualRows?.[0] || null;

  return (
    <main style={page}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .ie-audit-sheet { border: 0 !important; box-shadow: none !important; padding: 0 !important; }
          @page { size: Letter; margin: .4in; }
        }
      `}</style>

      <section className="ie-audit-sheet" style={reportSheet}>
        <div className="no-print" style={reportUtilityRow}>
          <button type="button" style={{ ...actionButton, ...primaryActionButton, flex: 1 }} onClick={() => window.print()}>
            Print / Save as PDF
          </button>
          <button type="button" style={actionButton} onClick={onBack}>Back to report</button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}><img src={cdwLogo} alt="CDW" style={{ height: 32, width: "auto" }} /><div style={reportEyebrow}>AI FACTORY · CALCULATION METHODOLOGY & AUDIT TRAIL</div></div>
        <h1 style={reportTitle}>Inference Economics Audit Trail</h1>
        <div style={muted}>Reproducible derivation of the material calculations supporting the report result.</div>
        <div style={{ ...muted, marginTop: 5, fontStyle: "italic" }}>
          This page formats the same calculation already run by the tool. It does not run a separate calculation.
        </div>

        <AuditSection title="1. Scenario overview">
          <AuditRow label="Private model" value={model?.label || "—"} />
          <AuditRow label="Hardware" value={hardwareClass + " · " + deployedGpuCount + " GPUs"} />
          <AuditRow label="Precision" value={quant} />
          <AuditRow label="Assigned private TCO" value={compactMoney(attributableTcoUsd)} />
          <AuditRow label="Analysis period" value={horizonYears + " years"} />
          <AuditRow label="Demand growth" value={(demandGrowthRate * 100).toFixed(1) + "% / yr"} />
        </AuditSection>

        <AuditSection title="2. Output-token demand">
          <FormulaLine formula="Year 1 output demand" expression={demand?.ok ? compact(demand.annualOutputTokens) + " tokens" : "Incomplete"} />
          {demandYears.map((value, index) => (
            <FormulaLine
              key={index}
              formula={"Year " + (index + 1) + " demand"}
              expression={index === 0
                ? compact(value) + " tokens"
                : compact(demandYears[0]) + " × (1 + " + (demandGrowthRate * 100).toFixed(1) + "%)^" + index + " = " + compact(value) + " tokens"}
            />
          ))}
          <FormulaLine
            formula="Horizon output demand"
            expression={demandYears.length ? demandYears.map((value) => compact(value)).join(" + ") + " = " + compact(horizonDemand) + " tokens" : "Incomplete"}
          />
        </AuditSection>

        <AuditSection title="3. Production serving capacity">
          <FormulaLine
            formula="Production output throughput"
            expression={throughput?.ok
              ? compact(throughput.effectiveThroughputTokPerSec) + " tok/s × " + (productionServingFactor * 100).toFixed(1) + "% = " + compact(throughput.effectiveThroughputTokPerSec * productionServingFactor) + " tok/s"
              : "Incomplete"}
          />
          <FormulaLine
            formula="Annual serving capacity"
            expression={throughput?.ok
              ? compact(throughput.effectiveThroughputTokPerSec * productionServingFactor) + " × 3,600 × " + activeHoursPerDay + " hr/day × " + activeDaysPerYear + " days/yr = " + compact(capacity) + " output tokens"
              : "Incomplete"}
          />
          <AuditRow label="Evidence source" value={throughput?.evidence?.sourceLabel || "—"} />
          <AuditRow label="Evidence status" value={economics?.evidenceStatus || throughput?.evidence?.status || "—"} />
          <AuditRow label="Peak demand / annual capacity" value={economics?.ok ? compact(economics.peakAnnualDemandOutputTokens) + " ÷ " + compact(capacity) + " = " + (economics.peakDemandUtilizationOfCapacity * 100).toFixed(1) + "%" : "Incomplete"} />
        </AuditSection>

        <AuditSection title="4. Private AI unit economics">
          <FormulaLine
            formula="Private cost per 1M output tokens"
            expression={economics?.ok
              ? compactMoney(attributableTcoUsd) + " ÷ " + compact(horizonDemand) + " × 1,000,000 = " + money(economics.costPerMillionOutputTokens) + " / 1M output"
              : "Incomplete"}
          />
          <div style={auditNote}>Unused modeled capacity does not enter the denominator. The denominator is expected useful output-token demand actually served.</div>
        </AuditSection>

        <AuditSection title="5. Managed API normalization">
          <AuditRow label="Managed API" value={apiModelLabel || "Not selected"} />
          <AuditRow label="Comparison basis" value={apiBasis === "REFERENCE" ? "70% input / 30% output · no cache discount" : "Customized workload assumptions"} />
          <FormulaLine
            formula="Input tokens per output token"
            expression={apiRatio == null ? "Incomplete" : apiRatio.toFixed(4)}
          />
          {apiRate ? (
            <>
              <AuditRow label="Input rate" value={money(apiRate.inputUsdPerMillion) + " / 1M input"} />
              <AuditRow label="Cached input rate" value={apiRate.cachedInputUsdPerMillion == null ? "Not used" : money(apiRate.cachedInputUsdPerMillion) + " / 1M cached input"} />
              <AuditRow label="Output rate" value={money(apiRate.outputUsdPerMillion) + " / 1M output"} />
            </>
          ) : null}
          {year1Api ? (
            <>
              <FormulaLine
                formula="Year 1 input tokens"
                expression={compact(year1Api.annualOutputTokens) + " output × " + apiRatio.toFixed(4) + " = " + compact(year1Api.annualInputTokens) + " input"}
              />
              <FormulaLine
                formula="Year 1 API cost"
                expression={compactMoney(year1Api.uncachedInputCostUsd) + " uncached input + " + compactMoney(year1Api.cachedInputCostUsd) + " cached input + " + compactMoney(year1Api.outputCostUsd) + " output = " + compactMoney(year1Api.totalApiCostUsd)}
              />
            </>
          ) : null}
          <FormulaLine
            formula="Effective managed API cost per 1M output"
            expression={managed?.ok
              ? compactMoney(managed.horizonApiCostUsd) + " ÷ " + compact(managed.horizonOutputTokens) + " × 1,000,000 = " + money(managed.effectiveUsdPerMillionOutputTokens) + " / 1M output"
              : "Incomplete"}
          />
          <AuditRow label="Cached input share" value={cacheShare == null ? "Incomplete" : (cacheShare * 100).toFixed(1) + "%"} />
        </AuditSection>

        <AuditSection title="6. Private vs managed API comparison">
          <FormulaLine
            formula="Dollar difference"
            expression={comparison?.ok
              ? money(comparison.managedApiUsdPerMillionOutputTokens) + " − " + money(comparison.privateUsdPerMillionOutputTokens) + " = " + money(comparison.managedApiMinusPrivateUsdPerMillionOutputTokens) + " / 1M output"
              : "Incomplete"}
          />
          <FormulaLine
            formula="Managed API / private cost ratio"
            expression={comparison?.ok
              ? money(comparison.managedApiUsdPerMillionOutputTokens) + " ÷ " + money(comparison.privateUsdPerMillionOutputTokens) + " = " + comparison.managedApiToPrivateCostRatio.toFixed(2) + "×"
              : "Incomplete"}
          />
          <div style={auditNote}>This is a cost comparison only. Equivalent model capability is not asserted.</div>
        </AuditSection>
      </section>
    </main>
  );
}

function AuditSection({ title, children }) {
  return (
    <section style={auditBlock}>
      <h2 style={{ fontSize: 16, margin: "0 0 10px", fontWeight: 900 }}>{title}</h2>
      {children}
    </section>
  );
}

function AuditRow({ label, value }) {
  return (
    <div style={auditRow}>
      <span style={{ color: "#666" }}>{label}</span>
      <strong style={{ textAlign: "right" }}>{value}</strong>
    </div>
  );
}

function FormulaLine({ formula, expression }) {
  return (
    <div style={formulaBlock}>
      <div style={{ fontSize: 11, fontWeight: 900, color: "#666", textTransform: "uppercase", letterSpacing: ".04em" }}>{formula}</div>
      <div style={{ marginTop: 5 }}>{expression}</div>
    </div>
  );
}

function Step({ number, title, subtitle, children }) {
  return (
    <section style={card} className="no-print">
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
const takeawayBox = { border: "1px solid #ddd", borderRadius: 12, padding: 16, background: "#fafafa", marginTop: 18 };
const compareGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 14, marginTop: 14 };
const compareCard = { border: "1px solid #ddd", borderRadius: 12, padding: 16, background: "#fff" };
const differenceBox = { marginTop: 14, borderTop: "1px solid #eee", paddingTop: 14 };
const actionRow = { display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end", marginTop: 4 };
const actionButton = { border: "1px solid #CC0000", background: "#fff", color: "#CC0000", borderRadius: 8, padding: "11px 15px", fontSize: 13, fontWeight: 850, cursor: "pointer" };
const primaryActionButton = { background: "#CC0000", color: "#fff" };
const disabledActionButton = { opacity: .45, cursor: "not-allowed" };
const reportUtilityRow = { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 };
const reportSheet = { border: "1px solid #ddd", borderRadius: 14, padding: 24, background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.04)" };
const auditBlock = { borderTop: "2px solid #232323", paddingTop: 14, marginTop: 22 };
const formulaBlock = { background: "#f7f7f7", borderLeft: "3px solid #CC0000", padding: "10px 12px", fontSize: 12, lineHeight: 1.55, margin: "9px 0 10px", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" };
const auditNote = { fontSize: 12, lineHeight: 1.55, color: "#555", background: "#fafafa", borderRadius: 8, padding: "9px 11px", marginTop: 10 };
const auditPanel = { border: "1px solid #ddd", borderRadius: 14, padding: 20, background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.04)", marginTop: 16 };
const auditRow = { display: "flex", justifyContent: "space-between", gap: 20, padding: "6px 0", fontSize: 13, lineHeight: 1.45 };
const formulaBox = { background: "#f7f7f7", borderLeft: "3px solid #CC0000", padding: "9px 11px", fontSize: 12, lineHeight: 1.55, margin: "8px 0 10px", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" };
const reportEyebrow = { fontSize: 11, fontWeight: 900, color: "#CC0000", letterSpacing: ".12em" };
const reportTitle = { fontSize: 28, lineHeight: 1.2, margin: "5px 0 6px", fontWeight: 950 };
const textButton = { marginTop: 16, border: 0, background: "transparent", color: "#B21F16", padding: 0, fontSize: 13, fontWeight: 850, cursor: "pointer", textDecoration: "underline" };
