import React, { useEffect, useMemo, useState } from "react";
import { buildRtxProSingleServerTcoPolicy } from "./rtxProTcoPolicy.js";
import { buildRtxProLifecycleTco } from "./rtxProLifecycleTco.js";
import { buildRtxProInferenceEconomicsHandoff } from "./rtxProInferenceEconomicsConnector.js";
import { RTX_PRO_CLOUD_COMPARATOR } from "./rtxProServerRegistry.js";
import { buildRtxProTcoPlanningDefaults, effectiveFacilityRatePerKwMonth } from "./rtxProTcoPlanningDefaults.js";
import { loadSessionState, saveSessionState } from "./sessionState.js";

const RED = "#CC0000";
const INK = "#2D2D2D";
const SESSION_KEY = "rtx-pro-tco";

function initialParams() {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

function explicitNumber(raw) {
  if (raw === "" || raw === null || raw === undefined) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function money(value) {
  return `$${Math.round(Number(value) || 0).toLocaleString("en-US")}`;
}

function sameNumber(a, b) {
  return Number.isFinite(Number(a)) && Number.isFinite(Number(b)) && Math.abs(Number(a) - Number(b)) < 0.000001;
}

function ProvenanceBadge({ source, label }) {
  return <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold bg-gray-100 text-gray-600">{source}{label ? ` · ${label}` : ""}</span>;
}

function FieldHeader({ label, provenance }) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-1">
      <span className="text-sm font-semibold" style={{ color: INK }}>{label}</span>
      {provenance && <ProvenanceBadge source={provenance.source} label={provenance.label} />}
    </div>
  );
}

function MoneyInput({ label, value, onChange, helper, provenance }) {
  return (
    <label className="block mb-4">
      <FieldHeader label={label} provenance={provenance} />
      <div className="relative">
        <span className="absolute left-3 top-2 text-sm text-gray-500">$</span>
        <input type="number" min="0" step="1" value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2 text-sm" />
      </div>
      {helper && <span className="block text-xs text-gray-500 mt-1">{helper}</span>}
    </label>
  );
}

function NumberField({ label, value, onChange, suffix, helper, min = 0, step = 0.1, provenance }) {
  return (
    <label className="block mb-4">
      <FieldHeader label={label} provenance={provenance} />
      <div className="flex items-center gap-2">
        <input type="number" min={min} step={step} value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        {suffix && <span className="text-xs text-gray-500 whitespace-nowrap">{suffix}</span>}
      </div>
      {helper && <span className="block text-xs text-gray-500 mt-1">{helper}</span>}
    </label>
  );
}

function CommercialBasisControl({ label, basis, setBasis, coverageYears, setCoverageYears }) {
  return (
    <div className="mb-4">
      <span className="block text-sm font-semibold mb-1" style={{ color: INK }}>{label} commercial basis</span>
      <select value={basis} onChange={(e) => setBasis(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
        <option value="annual">Annual amount</option>
        <option value="term-total">Total for quoted term</option>
      </select>
      {basis === "term-total" && <div className="mt-2"><NumberField label="Quoted term coverage" value={coverageYears} onChange={setCoverageYears} suffix="years" helper="The quoted term must cover the entire selected TCO horizon; the tool will not invent renewal pricing." min={1} step={1} /></div>}
    </div>
  );
}

function ViewHeader({ title, subtitle, onBack, onPrint }) {
  return (
    <div className="mb-6 no-print">
      <button type="button" onClick={onBack} className="text-sm font-semibold mb-4" style={{ color: RED }}>← Back to RTX PRO TCO</button>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: RED }}>AI Factory · Total Cost of Ownership</div>
          <h2 className="text-2xl font-bold" style={{ color: INK }}>{title}</h2>
          <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
        </div>
        {onPrint && <button type="button" onClick={onPrint} className="px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: RED }}>Print / Save PDF</button>}
      </div>
    </div>
  );
}

function GoogleCloudReference() {
  const row = RTX_PRO_CLOUD_COMPARATOR;
  return (
    <section role="region" aria-label="Google Cloud RTX PRO reference" className="rounded-xl border border-gray-200 bg-gray-50 p-5 mb-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold" style={{ color: INK }}>Google Cloud Run · RTX PRO 6000 Blackwell</h3>
          <div className="text-xs text-gray-500 mt-1">Public cloud reference only — not yet a direct cloud TCO or savings comparison.</div>
        </div>
        <ProvenanceBadge source={row.priceProvenance} label={row.priceDerivation} />
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 text-xs">
        <div><div className="text-gray-500">Minimum deployable instance floor</div><div className="font-bold">${row.minimumInstanceRatePerHourUSD}/hr</div></div>
        <div><div className="text-gray-500">GPU component</div><div className="font-bold">${row.gpuRatePerHourUSD}/hr</div></div>
        <div><div className="text-gray-500">Required 20 vCPU</div><div className="font-bold">Included in floor</div></div>
        <div><div className="text-gray-500">Required 80 GiB memory</div><div className="font-bold">Included in floor</div></div>
      </div>
    </section>
  );
}

export default function RtxProTcoIntake() {
  const params = useMemo(initialParams, []);
  const gpuCount = Number(params.get("gpuCount")) || 2;
  const model = params.get("model") || null;
  const precision = params.get("precision") || null;
  const benchmarkId = params.get("benchmarkId") || null;
  const scenarioKey = `${gpuCount}|${model || ""}|${precision || ""}|${benchmarkId || ""}`;
  const defaults = useMemo(() => buildRtxProTcoPlanningDefaults(gpuCount), [gpuCount]);
  const saved = useMemo(() => loadSessionState(SESSION_KEY), []);
  const restore = saved?.scenarioKey === scenarioKey ? saved : {};
  const initial = (key) => restore[key] ?? defaults[key] ?? "";

  const [nvidiaSoftwareUSD, setNvidiaSoftwareUSD] = useState(() => initial("nvidiaSoftwareUSD"));
  const [supportUSD, setSupportUSD] = useState(() => initial("supportUSD"));
  const [professionalServicesUSD, setProfessionalServicesUSD] = useState(() => initial("professionalServicesUSD"));
  const [storageUSD, setStorageUSD] = useState(() => initial("storageUSD"));
  const [adminFteAnnualUSD, setAdminFteAnnualUSD] = useState(() => initial("adminFteAnnualUSD"));
  const [serverPowerKW, setServerPowerKW] = useState(() => initial("serverPowerKW"));
  const [facilityMode, setFacilityMode] = useState(() => restore.facilityMode ?? defaults.facilityMode);
  const [electricityRatePerKwh, setElectricityRatePerKwh] = useState(() => initial("electricityRatePerKwh"));
  const [pue, setPue] = useState(() => initial("pue"));
  const [coloRatePerKwMonth, setColoRatePerKwMonth] = useState(() => initial("coloRatePerKwMonth"));
  const [existingServerManagement, setExistingServerManagement] = useState(restore.existingServerManagement ?? true);
  const [existingEthernet, setExistingEthernet] = useState(restore.existingEthernet ?? true);
  const [existingRackCapacity, setExistingRackCapacity] = useState(restore.existingRackCapacity ?? true);
  const [horizonYears, setHorizonYears] = useState(restore.horizonYears ?? 3);
  const [nvidiaSoftwareBasis, setNvidiaSoftwareBasis] = useState(restore.nvidiaSoftwareBasis ?? "annual");
  const [nvidiaSoftwareCoverageYears, setNvidiaSoftwareCoverageYears] = useState(restore.nvidiaSoftwareCoverageYears ?? "3");
  const [supportBasis, setSupportBasis] = useState(restore.supportBasis ?? "annual");
  const [supportCoverageYears, setSupportCoverageYears] = useState(restore.supportCoverageYears ?? "3");
  const [view, setView] = useState("calc");

  useEffect(() => {
    saveSessionState(SESSION_KEY, { scenarioKey, nvidiaSoftwareUSD, supportUSD, professionalServicesUSD, storageUSD, adminFteAnnualUSD, serverPowerKW, facilityMode, electricityRatePerKwh, pue, coloRatePerKwMonth, existingServerManagement, existingEthernet, existingRackCapacity, horizonYears, nvidiaSoftwareBasis, nvidiaSoftwareCoverageYears, supportBasis, supportCoverageYears });
  }, [scenarioKey, nvidiaSoftwareUSD, supportUSD, professionalServicesUSD, storageUSD, adminFteAnnualUSD, serverPowerKW, facilityMode, electricityRatePerKwh, pue, coloRatePerKwMonth, existingServerManagement, existingEthernet, existingRackCapacity, horizonYears, nvidiaSoftwareBasis, nvidiaSoftwareCoverageYears, supportBasis, supportCoverageYears]);

  const provenanceFor = (key, value) => sameNumber(value, defaults[key]) ? defaults.provenance[key] : { source: "CUSTOMER", label: "edited" };
  const facilityRate = effectiveFacilityRatePerKwMonth({ facilityMode, electricityRatePerKwh: explicitNumber(electricityRatePerKwh), pue: explicitNumber(pue), coloRatePerKwMonth: explicitNumber(coloRatePerKwMonth) });

  const policy = useMemo(() => buildRtxProSingleServerTcoPolicy({
    gpuCount,
    existingServerManagement,
    existingEthernet,
    existingRackCapacity,
    nvidiaSoftwareUSD: explicitNumber(nvidiaSoftwareUSD),
    supportUSD: explicitNumber(supportUSD),
    professionalServicesUSD: explicitNumber(professionalServicesUSD),
    storageUSD: explicitNumber(storageUSD),
    adminFteAnnualUSD: explicitNumber(adminFteAnnualUSD),
    serverPowerKW: explicitNumber(serverPowerKW),
  }), [gpuCount, existingServerManagement, existingEthernet, existingRackCapacity, nvidiaSoftwareUSD, supportUSD, professionalServicesUSD, storageUSD, adminFteAnnualUSD, serverPowerKW]);

  const lifecycle = useMemo(() => buildRtxProLifecycleTco({
    hardwareUSD: policy.hardware?.configuredSystemPriceUSD,
    managementControlPlaneCapexUSD: policy.assumptions?.managementControlPlaneCapexUSD,
    fabricCapexUSD: policy.assumptions?.fabricCapexUSD,
    rackCapexUSD: policy.assumptions?.rackCapexUSD,
    nvidiaSoftwareUSD: policy.userInputs?.nvidiaSoftwareUSD,
    nvidiaSoftwareBasis,
    nvidiaSoftwareCoverageYears: explicitNumber(nvidiaSoftwareCoverageYears),
    supportUSD: policy.userInputs?.supportUSD,
    supportBasis,
    supportCoverageYears: explicitNumber(supportCoverageYears),
    professionalServicesUSD: policy.userInputs?.professionalServicesUSD,
    storageUSD: policy.userInputs?.storageUSD,
    adminFteAnnualUSD: policy.userInputs?.adminFteAnnualUSD,
    serverPowerKW: policy.userInputs?.serverPowerKW,
    powerBurdenPerKwMonth: Number.isFinite(facilityRate) ? facilityRate : null,
    horizonYears,
  }), [policy, nvidiaSoftwareBasis, nvidiaSoftwareCoverageYears, supportBasis, supportCoverageYears, facilityRate, horizonYears]);

  const lifecycleReady = policy.clientReady && lifecycle.clientReady;
  const unresolved = [...new Set([...(policy.requiredInputs || []), ...(lifecycle.requiredInputs || [])])];
  const ieHandoff = useMemo(() => buildRtxProInferenceEconomicsHandoff({ gpuCount, modelId: model, quant: precision, horizonYears, onPremTcoUsd: lifecycleReady ? lifecycle.totalTcoUSD : null, benchmarkId }), [gpuCount, model, precision, horizonYears, lifecycleReady, lifecycle.totalTcoUSD, benchmarkId]);

  if (policy.status === "UNSUPPORTED_CONFIGURATION") return <div className="max-w-3xl mx-auto px-6 py-10"><div className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">{policy.reason}</div></div>;

  if (view === "report" && lifecycleReady) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <ViewHeader title="RTX PRO TCO Report" subtitle="Directional single-server lifecycle cost summary with source-labeled planning assumptions." onBack={() => setView("calc")} onPrint={() => window.print()} />
        <div className="mb-6"><div className="text-xs font-bold uppercase tracking-wide" style={{ color: RED }}>RTX PRO 6000 Blackwell Server Edition</div><div className="text-3xl font-bold mt-1" style={{ color: INK }}>{money(lifecycle.totalTcoUSD)}</div><div className="text-sm text-gray-600">{horizonYears}-year directional lifecycle TCO · {gpuCount} GPUs · {model || "model not supplied"}{precision ? ` · ${precision}` : ""}</div></div>
        <div className="grid sm:grid-cols-2 gap-4 mb-6"><div className="rounded-xl border p-4"><div className="text-xs text-gray-500">One-time costs</div><div className="text-xl font-bold">{money(lifecycle.oneTimeCapexUSD)}</div></div><div className="rounded-xl border p-4"><div className="text-xs text-gray-500">Lifecycle recurring costs</div><div className="text-xl font-bold">{money(lifecycle.recurringLifecycleUSD)}</div></div></div>
        <div className="rounded-xl border border-gray-200 p-5 mb-6 text-sm space-y-2"><div className="font-bold mb-3">Cost breakdown</div><div>Configured hardware: <strong>{money(lifecycle.breakdown.hardwareUSD)}</strong></div><div>Professional services: <strong>{money(lifecycle.breakdown.professionalServicesUSD)}</strong></div><div>Workload-derived storage: <strong>{money(lifecycle.breakdown.storageUSD)}</strong></div><div>NVIDIA software/support: <strong>{money(lifecycle.breakdown.nvidiaSoftwareLifecycleUSD)}</strong></div><div>OEM/server support: <strong>{money(lifecycle.breakdown.supportLifecycleUSD)}</strong></div><div>Admin/operations labor: <strong>{money(lifecycle.breakdown.adminLifecycleUSD)}</strong></div><div>Facility/power: <strong>{money(lifecycle.breakdown.facilityPowerLifecycleUSD)}</strong></div></div>
        <div className="no-print flex gap-3"><button type="button" onClick={() => setView("audit")} className="px-4 py-2 rounded-lg border text-sm font-semibold">Calculation Methodology & Audit Trail</button></div>
      </div>
    );
  }

  if (view === "audit" && lifecycleReady) {
    const facilityText = facilityMode === "owned-dc" ? `Owned DC · $${Number(electricityRatePerKwh).toFixed(4)}/kWh × PUE ${pue} = $${facilityRate.toFixed(2)}/kW-month effective energy/cooling basis` : `Colocation · $${Number(coloRatePerKwMonth).toFixed(2)}/kW-month`;
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <ViewHeader title="RTX PRO TCO Audit Trail" subtitle="Evidence, assumptions, input provenance, and lifecycle normalization for this scenario." onBack={() => setView("report")} />
        <div className="rounded-xl border border-gray-200 p-5 mb-5 text-sm space-y-2"><div className="font-bold">Architecture evidence</div><div>Deployment: <strong>{gpuCount} × RTX PRO 6000</strong></div><div>Model / precision: <strong>{model || "—"}{precision ? ` · ${precision}` : ""}</strong></div><div>Benchmark ID: <strong>{benchmarkId || "—"}</strong></div><div>Hardware SKU: <strong>{policy.hardware.configuredSystemSku || "quote required"}</strong></div><div>Hardware provenance: <strong>{policy.hardware.priceProvenance || "—"}</strong></div></div>
        <div className="rounded-xl border border-gray-200 p-5 mb-5 text-sm space-y-2"><div className="font-bold">Incremental infrastructure assumptions</div><div>Existing server management: <strong>{existingServerManagement ? "Yes · incremental CAPEX $0 EST" : "No · quote/input required"}</strong></div><div>Existing Ethernet sufficient: <strong>{existingEthernet ? "Yes · dedicated AI fabric CAPEX $0 EST" : "No · quote/input required"}</strong></div><div>Existing rack capacity: <strong>{existingRackCapacity ? "Yes · incremental rack CAPEX $0 EST" : "No · quote/input required"}</strong></div></div>
        <div className="rounded-xl border border-gray-200 p-5 mb-5 text-sm space-y-2"><div className="font-bold">Commercial and operating inputs</div><div>NVIDIA software/support: <strong>{money(explicitNumber(nvidiaSoftwareUSD))}</strong> · {provenanceFor("nvidiaSoftwareUSD", nvidiaSoftwareUSD).source}</div><div>OEM/server support: <strong>{money(explicitNumber(supportUSD))}</strong> · {provenanceFor("supportUSD", supportUSD).source}</div><div>Professional services: <strong>{money(explicitNumber(professionalServicesUSD))}</strong> · {provenanceFor("professionalServicesUSD", professionalServicesUSD).source}</div><div>Workload-derived storage: <strong>{money(explicitNumber(storageUSD))}</strong> · {provenanceFor("storageUSD", storageUSD).source}</div><div>Admin/operations labor: <strong>{money(explicitNumber(adminFteAnnualUSD))}</strong> / year · {provenanceFor("adminFteAnnualUSD", adminFteAnnualUSD).source}</div><div>Configured-server power: <strong>{serverPowerKW} kW</strong> · {provenanceFor("serverPowerKW", serverPowerKW).source}</div><div>Facility mode: <strong>{facilityText}</strong></div></div>
        <div className="rounded-xl border border-gray-200 p-5 text-sm space-y-2"><div className="font-bold">Lifecycle method</div><div>Horizon: <strong>{horizonYears} years</strong></div><div>Facility/power formula: <strong>server kW × effective $/kW-month × 12 × horizon</strong></div><div>Annual commercial amounts: <strong>annual amount × horizon</strong></div><div>Term-total commercial amounts: <strong>counted once only when quoted coverage spans the full horizon</strong></div><div>Total reconciliation: <strong>{money(lifecycle.oneTimeCapexUSD)} one-time + {money(lifecycle.recurringLifecycleUSD)} recurring = {money(lifecycle.totalTcoUSD)}</strong></div></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-6 border-b border-gray-200 pb-5"><div className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: RED }}>AI Factory · Total Cost of Ownership</div><div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-2xl font-bold mb-1" style={{ color: INK }}>RTX PRO TCO</h2><p className="text-sm text-gray-600 max-w-3xl">Start with transparent planning assumptions, then replace them with customer or quoted values as they become known.</p></div><a href="/tco" className="text-xs font-semibold px-3 py-2 rounded-lg border border-gray-300 text-gray-700 bg-white">Switch to enterprise TCO</a></div></div>

      <div className="grid lg:grid-cols-3 gap-4 mb-5"><div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-5"><div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Selected on-prem configuration</div><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="text-2xl font-bold" style={{ color: INK }}>{gpuCount} × RTX PRO 6000</div><div className="text-sm text-gray-600">Blackwell Server Edition{model ? ` · ${model}` : ""}{precision ? ` · ${precision}` : ""}</div><div className="text-xs text-gray-500 mt-2">{policy.hardware.configuredSystemSku || "OEM/CDW configured SKU required"}</div></div><div className="text-right"><div className="text-xs text-gray-500">Configured server hardware</div><div className="text-xl font-bold" style={{ color: INK }}>{Number.isFinite(policy.hardware.configuredSystemPriceUSD) ? money(policy.hardware.configuredSystemPriceUSD) : "Quote required"}</div><div className="text-[11px] font-semibold text-gray-500">{policy.hardware.priceProvenance || "QUOTE"}</div></div></div></div><div className={`rounded-xl border p-5 ${lifecycleReady ? "border-green-300 bg-green-50" : "border-amber-300 bg-amber-50"}`}><div className="text-xs font-bold uppercase tracking-wide mb-2">TCO readiness</div><div className="text-lg font-bold" style={{ color: INK }}>{lifecycleReady ? "Directional TCO ready" : `${unresolved.length} input${unresolved.length === 1 ? "" : "s"} remaining`}</div><div className="text-xs text-gray-700 mt-1">{lifecycleReady ? "Planning defaults are active. Review EST values before client-ready use." : "Quote-only or missing assumptions still require attention."}</div></div></div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 mb-5"><div className="text-sm font-bold text-blue-950">Planning defaults are pre-populated — not hidden assumptions.</div><div className="text-xs text-blue-900 mt-1">LISTED values come from public evidence. EST values are editable planning allowances. Any value you change is labeled CUSTOMER in the audit trail.</div></div>

      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 mb-5 flex flex-wrap items-center justify-between gap-4"><div><div className="text-sm font-bold" style={{ color: INK }}>TCO horizon</div><div className="text-xs text-gray-500">Same 1 / 3 / 5-year planning convention used across the TCO tools.</div></div><div className="flex gap-2">{[1, 3, 5].map((years) => <button key={years} type="button" onClick={() => setHorizonYears(years)} className="px-4 py-2 rounded-lg text-sm font-semibold border" style={{ background: horizonYears === years ? RED : "white", color: horizonYears === years ? "white" : INK, borderColor: horizonYears === years ? RED : "#D1D5DB" }}>{years} year{years === 1 ? "" : "s"}</button>)}</div></div>

      <div className="rounded-xl border border-gray-200 p-5 mb-5"><div className="mb-4"><div className="text-xs font-bold uppercase tracking-wide" style={{ color: RED }}>On-prem cost inputs</div><div className="text-lg font-bold" style={{ color: INK }}>Commercial and workload assumptions</div><p className="text-xs text-gray-500 mt-1">Planning defaults make the initial case usable. Replace any estimate with the customer or quote value when known.</p></div><div className="grid md:grid-cols-2 gap-x-6"><MoneyInput label="NVIDIA software / support entitlement" value={nvidiaSoftwareUSD} onChange={setNvidiaSoftwareUSD} provenance={provenanceFor("nvidiaSoftwareUSD", nvidiaSoftwareUSD)} helper={defaults.provenance.nvidiaSoftwareUSD.basis} /><MoneyInput label="OEM / server support" value={supportUSD} onChange={setSupportUSD} provenance={provenanceFor("supportUSD", supportUSD)} helper={defaults.provenance.supportUSD.basis} /><MoneyInput label="Professional services / implementation" value={professionalServicesUSD} onChange={setProfessionalServicesUSD} provenance={provenanceFor("professionalServicesUSD", professionalServicesUSD)} helper={defaults.provenance.professionalServicesUSD.basis} /><MoneyInput label="Workload-derived storage" value={storageUSD} onChange={setStorageUSD} provenance={provenanceFor("storageUSD", storageUSD)} helper={defaults.provenance.storageUSD.basis} /></div></div>

      <details className="rounded-xl border border-gray-200 bg-white mb-5 group" data-testid="rtx-tco-advanced-assumptions"><summary className="cursor-pointer list-none p-5 flex items-center justify-between gap-4"><div><div className="text-sm font-bold" style={{ color: INK }}>Advanced TCO assumptions</div><div className="text-xs text-gray-500 mt-1">Infrastructure availability, commercial term basis, operations labor, server power, and facility model.</div></div><span className="text-xs font-semibold" style={{ color: RED }}>Review / edit</span></summary><div className="border-t border-gray-200 p-5">
        <div className="grid lg:grid-cols-2 gap-6"><div><div className="text-sm font-bold mb-1" style={{ color: INK }}>Existing infrastructure</div><p className="text-xs text-gray-500 mb-4">Incremental $0 applies only when the customer already has the capability.</p>{[["Existing server-management tooling", existingServerManagement, setExistingServerManagement], ["Existing Ethernet is sufficient for this independent-replica server", existingEthernet, setExistingEthernet], ["Existing rack capacity is available", existingRackCapacity, setExistingRackCapacity]].map(([label, checked, setter]) => <label key={label} className="flex items-start gap-2 text-sm mb-3"><input type="checkbox" checked={checked} onChange={(e) => setter(e.target.checked)} className="mt-1" /><span>{label}</span></label>)}</div><div><CommercialBasisControl label="NVIDIA software / support" basis={nvidiaSoftwareBasis} setBasis={setNvidiaSoftwareBasis} coverageYears={nvidiaSoftwareCoverageYears} setCoverageYears={setNvidiaSoftwareCoverageYears} /><CommercialBasisControl label="OEM / server support" basis={supportBasis} setBasis={setSupportBasis} coverageYears={supportCoverageYears} setCoverageYears={setSupportCoverageYears} /></div></div>
        <div className="grid md:grid-cols-2 gap-x-5 mt-2"><MoneyInput label="Incremental admin / operations labor (annual)" value={adminFteAnnualUSD} onChange={setAdminFteAnnualUSD} provenance={provenanceFor("adminFteAnnualUSD", adminFteAnnualUSD)} helper={defaults.provenance.adminFteAnnualUSD.basis} /><NumberField label="Full configured-server power draw" value={serverPowerKW} onChange={setServerPowerKW} suffix="kW" provenance={provenanceFor("serverPowerKW", serverPowerKW)} helper={defaults.provenance.serverPowerKW.basis} min={0.1} /></div>
        <div className="mt-2 border-t border-gray-200 pt-5"><div className="text-sm font-bold mb-1" style={{ color: INK }}>Facility model</div><p className="text-xs text-gray-500 mb-3">Owned DC models utility energy and cooling efficiency separately. Colocation uses an all-in planning rate. They are intentionally not interchangeable.</p><div className="flex flex-wrap gap-2 mb-4"><button type="button" onClick={() => setFacilityMode("owned-dc")} className="px-3 py-2 rounded-lg border text-sm font-semibold" style={{ background: facilityMode === "owned-dc" ? RED : "white", color: facilityMode === "owned-dc" ? "white" : INK }}>Owned data center</button><button type="button" onClick={() => setFacilityMode("colocation")} className="px-3 py-2 rounded-lg border text-sm font-semibold" style={{ background: facilityMode === "colocation" ? RED : "white", color: facilityMode === "colocation" ? "white" : INK }}>Colocation</button></div>{facilityMode === "owned-dc" ? <div className="grid md:grid-cols-2 gap-x-5"><NumberField label="Electricity rate" value={electricityRatePerKwh} onChange={setElectricityRatePerKwh} suffix="$/kWh" step={0.0001} provenance={provenanceFor("electricityRatePerKwh", electricityRatePerKwh)} helper={defaults.provenance.electricityRatePerKwh.basis} /><NumberField label="PUE" value={pue} onChange={setPue} step={0.01} min={1} provenance={provenanceFor("pue", pue)} helper={defaults.provenance.pue.basis} /></div> : <NumberField label="Colocation facility rate" value={coloRatePerKwMonth} onChange={setColoRatePerKwMonth} suffix="$/kW-month" provenance={provenanceFor("coloRatePerKwMonth", coloRatePerKwMonth)} helper={defaults.provenance.coloRatePerKwMonth.basis} />}</div>
      </div></details>

      {!lifecycleReady && <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 mb-5"><div className="flex flex-wrap items-center justify-between gap-2"><div className="text-sm font-bold text-amber-900">Still required before directional TCO</div><div className="text-xs font-semibold text-amber-900">{unresolved.length} remaining</div></div><div className="text-xs text-amber-900 mt-2">{unresolved.join(" · ")}</div></div>}

      {lifecycleReady && <div className="rounded-xl border border-green-300 bg-green-50 p-5 mb-5"><div className="flex flex-wrap items-end justify-between gap-3 mb-4"><div><div className="text-xs font-bold uppercase tracking-wide text-green-800">Directional lifecycle TCO</div><div className="text-3xl font-bold text-green-950">{money(lifecycle.totalTcoUSD)}</div><div className="text-xs text-green-900">{horizonYears}-year single-server planning basis</div></div><div className="text-xs text-green-900 text-right"><div>One-time costs: <strong>{money(lifecycle.oneTimeCapexUSD)}</strong></div><div>Lifecycle recurring costs: <strong>{money(lifecycle.recurringLifecycleUSD)}</strong></div></div></div><div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-xs text-green-950"><div>Configured hardware: <strong>{money(lifecycle.breakdown.hardwareUSD)}</strong></div><div>Professional services: <strong>{money(lifecycle.breakdown.professionalServicesUSD)}</strong></div><div>Workload-derived storage: <strong>{money(lifecycle.breakdown.storageUSD)}</strong></div><div>NVIDIA software/support: <strong>{money(lifecycle.breakdown.nvidiaSoftwareLifecycleUSD)}</strong> lifecycle</div><div>OEM/server support: <strong>{money(lifecycle.breakdown.supportLifecycleUSD)}</strong> lifecycle</div><div>Admin/operations labor: <strong>{money(lifecycle.breakdown.adminLifecycleUSD)}</strong> lifecycle</div><div>Facility/power: <strong>{money(lifecycle.breakdown.facilityPowerLifecycleUSD)}</strong> lifecycle</div><div>Annual facility/power basis: <strong>{money(lifecycle.annualFacilityPowerUSD)}</strong></div></div><p className="text-xs text-green-900 mt-4">Planning estimates remain visible in the audit trail. Replace EST values with customer/quote inputs before treating the result as client-ready.</p><div className="flex flex-wrap gap-2 mt-4 no-print"><button type="button" onClick={() => setView("report")} className="text-sm font-semibold px-4 py-2 rounded-lg border border-green-700 text-green-900 bg-white">View my report</button><button type="button" onClick={() => setView("audit")} className="text-sm font-semibold px-4 py-2 rounded-lg border border-green-700 text-green-900 bg-white">Calculation Methodology & Audit Trail</button></div></div>}

      <GoogleCloudReference />
      <div className="flex flex-wrap gap-3 no-print"><a href="/gpu-sizing" className="text-sm font-semibold px-4 py-2 rounded-lg border border-gray-300 text-gray-700 bg-white">Back to GPU Sizing</a>{lifecycleReady && ieHandoff.eligible && <a href={ieHandoff.href} className="text-sm font-semibold px-4 py-2 rounded-lg text-white" style={{ background: RED }}>Continue to Inference Economics</a>}</div>
    </div>
  );
}
