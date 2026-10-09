import React, { useEffect, useMemo, useState } from "react";
import { buildRtxProSingleServerTcoPolicy } from "./rtxProTcoPolicy.js";
import { buildRtxProLifecycleTco } from "./rtxProLifecycleTco.js";
import { buildRtxProInferenceEconomicsHandoff } from "./rtxProInferenceEconomicsConnector.js";
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

function MoneyInput({ label, value, onChange, helper }) {
  return (
    <label className="block mb-4">
      <span className="block text-sm font-semibold mb-1" style={{ color: INK }}>{label}</span>
      <div className="relative">
        <span className="absolute left-3 top-2 text-sm text-gray-500">$</span>
        <input type="number" min="0" step="1" value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2 text-sm" placeholder="Enter confirmed amount" />
      </div>
      {helper && <span className="block text-xs text-gray-500 mt-1">{helper}</span>}
    </label>
  );
}

function NumberField({ label, value, onChange, suffix, helper, min = 0 }) {
  return (
    <label className="block mb-4">
      <span className="block text-sm font-semibold mb-1" style={{ color: INK }}>{label}</span>
      <div className="flex items-center gap-2">
        <input type="number" min={min} step="0.1" value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Enter confirmed value" />
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
      {basis === "term-total" && (
        <div className="mt-2">
          <NumberField label="Quoted term coverage" value={coverageYears} onChange={setCoverageYears} suffix="years" helper="The quoted term must cover the entire selected TCO horizon; the tool will not invent renewal pricing." min={1} />
        </div>
      )}
    </div>
  );
}

function ViewHeader({ title, subtitle, onBack, onPrint }) {
  return (
    <div className="mb-6 no-print">
      <button type="button" onClick={onBack} className="text-sm font-semibold mb-4" style={{ color: RED }}>← Back to RTX PRO TCO</button>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: RED }}>Right-Sized Private AI</div>
          <h2 className="text-2xl font-bold" style={{ color: INK }}>{title}</h2>
          <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
        </div>
        {onPrint && <button type="button" onClick={onPrint} className="px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: RED }}>Print / Save PDF</button>}
      </div>
    </div>
  );
}

export default function RtxProTcoIntake() {
  const params = useMemo(initialParams, []);
  const gpuCount = Number(params.get("gpuCount")) || 2;
  const model = params.get("model") || null;
  const precision = params.get("precision") || null;
  const benchmarkId = params.get("benchmarkId") || null;
  const scenarioKey = `${gpuCount}|${model || ""}|${precision || ""}|${benchmarkId || ""}`;
  const saved = useMemo(() => loadSessionState(SESSION_KEY), []);
  const restore = saved?.scenarioKey === scenarioKey ? saved : {};

  const [nvidiaSoftwareUSD, setNvidiaSoftwareUSD] = useState(restore.nvidiaSoftwareUSD ?? "");
  const [supportUSD, setSupportUSD] = useState(restore.supportUSD ?? "");
  const [professionalServicesUSD, setProfessionalServicesUSD] = useState(restore.professionalServicesUSD ?? "");
  const [storageUSD, setStorageUSD] = useState(restore.storageUSD ?? "");
  const [adminFteAnnualUSD, setAdminFteAnnualUSD] = useState(restore.adminFteAnnualUSD ?? "");
  const [serverPowerKW, setServerPowerKW] = useState(restore.serverPowerKW ?? "");
  const [powerBurdenPerKwMonth, setPowerBurdenPerKwMonth] = useState(restore.powerBurdenPerKwMonth ?? "");
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
    saveSessionState(SESSION_KEY, {
      scenarioKey,
      nvidiaSoftwareUSD,
      supportUSD,
      professionalServicesUSD,
      storageUSD,
      adminFteAnnualUSD,
      serverPowerKW,
      powerBurdenPerKwMonth,
      existingServerManagement,
      existingEthernet,
      existingRackCapacity,
      horizonYears,
      nvidiaSoftwareBasis,
      nvidiaSoftwareCoverageYears,
      supportBasis,
      supportCoverageYears,
    });
  }, [scenarioKey, nvidiaSoftwareUSD, supportUSD, professionalServicesUSD, storageUSD, adminFteAnnualUSD, serverPowerKW, powerBurdenPerKwMonth, existingServerManagement, existingEthernet, existingRackCapacity, horizonYears, nvidiaSoftwareBasis, nvidiaSoftwareCoverageYears, supportBasis, supportCoverageYears]);

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

  const powerRate = explicitNumber(powerBurdenPerKwMonth);
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
    powerBurdenPerKwMonth: powerRate,
    horizonYears,
  }), [policy, nvidiaSoftwareBasis, nvidiaSoftwareCoverageYears, supportBasis, supportCoverageYears, powerRate, horizonYears]);

  const lifecycleReady = policy.clientReady && lifecycle.clientReady;
  const ieHandoff = useMemo(() => buildRtxProInferenceEconomicsHandoff({
    gpuCount,
    modelId: model,
    quant: precision,
    horizonYears,
    onPremTcoUsd: lifecycleReady ? lifecycle.totalTcoUSD : null,
    benchmarkId,
  }), [gpuCount, model, precision, horizonYears, lifecycleReady, lifecycle.totalTcoUSD, benchmarkId]);

  if (policy.status === "UNSUPPORTED_CONFIGURATION") {
    return <div className="max-w-3xl mx-auto px-6 py-10"><div className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">{policy.reason}</div></div>;
  }

  if (view === "report" && lifecycleReady) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <ViewHeader title="RTX PRO TCO Report" subtitle="Directional single-server lifecycle cost summary using only explicit inputs and tested term normalization." onBack={() => setView("calc")} onPrint={() => window.print()} />
        <div className="mb-6">
          <div className="text-xs font-bold uppercase tracking-wide" style={{ color: RED }}>RTX PRO 6000 Blackwell Server Edition</div>
          <div className="text-3xl font-bold mt-1" style={{ color: INK }}>{money(lifecycle.totalTcoUSD)}</div>
          <div className="text-sm text-gray-600">{horizonYears}-year directional lifecycle TCO · {gpuCount} GPUs · {model || "model not supplied"}{precision ? ` · ${precision}` : ""}</div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          <div className="rounded-xl border p-4"><div className="text-xs text-gray-500">One-time costs</div><div className="text-xl font-bold">{money(lifecycle.oneTimeCapexUSD)}</div></div>
          <div className="rounded-xl border p-4"><div className="text-xs text-gray-500">Lifecycle recurring costs</div><div className="text-xl font-bold">{money(lifecycle.recurringLifecycleUSD)}</div></div>
        </div>
        <div className="rounded-xl border border-gray-200 p-5 mb-6 text-sm space-y-2">
          <div className="font-bold mb-3">Cost breakdown</div>
          <div>Configured hardware: <strong>{money(lifecycle.breakdown.hardwareUSD)}</strong></div>
          <div>Professional services: <strong>{money(lifecycle.breakdown.professionalServicesUSD)}</strong></div>
          <div>Workload-derived storage: <strong>{money(lifecycle.breakdown.storageUSD)}</strong></div>
          <div>NVIDIA software/support: <strong>{money(lifecycle.breakdown.nvidiaSoftwareLifecycleUSD)}</strong></div>
          <div>OEM/server support: <strong>{money(lifecycle.breakdown.supportLifecycleUSD)}</strong></div>
          <div>Admin/operations labor: <strong>{money(lifecycle.breakdown.adminLifecycleUSD)}</strong></div>
          <div>Facility/power: <strong>{money(lifecycle.breakdown.facilityPowerLifecycleUSD)}</strong></div>
        </div>
        <div className="no-print flex gap-3"><button type="button" onClick={() => setView("audit")} className="px-4 py-2 rounded-lg border text-sm font-semibold">Calculation Methodology & Audit Trail</button></div>
      </div>
    );
  }

  if (view === "audit" && lifecycleReady) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <ViewHeader title="RTX PRO TCO Audit Trail" subtitle="Evidence, assumptions, input provenance, and lifecycle normalization for this scenario." onBack={() => setView("report")} />
        <div className="rounded-xl border border-gray-200 p-5 mb-5 text-sm space-y-2">
          <div className="font-bold">Architecture evidence</div>
          <div>Deployment: <strong>{gpuCount} × RTX PRO 6000</strong></div>
          <div>Model / precision: <strong>{model || "—"}{precision ? ` · ${precision}` : ""}</strong></div>
          <div>Benchmark ID: <strong>{benchmarkId || "—"}</strong></div>
          <div>Hardware SKU: <strong>{policy.hardware.configuredSystemSku || "quote required"}</strong></div>
          <div>Hardware provenance: <strong>{policy.hardware.priceProvenance || "—"}</strong></div>
        </div>
        <div className="rounded-xl border border-gray-200 p-5 mb-5 text-sm space-y-2">
          <div className="font-bold">Incremental infrastructure assumptions</div>
          <div>Existing server management: <strong>{existingServerManagement ? "Yes · incremental CAPEX $0 EST" : "No · quote/input required"}</strong></div>
          <div>Existing Ethernet sufficient: <strong>{existingEthernet ? "Yes · dedicated AI fabric CAPEX $0 EST" : "No · quote/input required"}</strong></div>
          <div>Existing rack capacity: <strong>{existingRackCapacity ? "Yes · incremental rack CAPEX $0 EST" : "No · quote/input required"}</strong></div>
        </div>
        <div className="rounded-xl border border-gray-200 p-5 mb-5 text-sm space-y-2">
          <div className="font-bold">Commercial and operating inputs</div>
          <div>NVIDIA software/support: <strong>{money(explicitNumber(nvidiaSoftwareUSD))}</strong> · {nvidiaSoftwareBasis}{nvidiaSoftwareBasis === "term-total" ? ` · ${nvidiaSoftwareCoverageYears} years coverage` : ""}</div>
          <div>OEM/server support: <strong>{money(explicitNumber(supportUSD))}</strong> · {supportBasis}{supportBasis === "term-total" ? ` · ${supportCoverageYears} years coverage` : ""}</div>
          <div>Professional services: <strong>{money(explicitNumber(professionalServicesUSD))}</strong> · one-time</div>
          <div>Workload-derived storage: <strong>{money(explicitNumber(storageUSD))}</strong> · one-time</div>
          <div>Admin/operations labor: <strong>{money(explicitNumber(adminFteAnnualUSD))}</strong> / year</div>
          <div>Configured-server power: <strong>{serverPowerKW} kW</strong></div>
          <div>Facility power burden: <strong>${powerBurdenPerKwMonth}/kW-month</strong></div>
        </div>
        <div className="rounded-xl border border-gray-200 p-5 text-sm space-y-2">
          <div className="font-bold">Lifecycle method</div>
          <div>Horizon: <strong>{horizonYears} years</strong></div>
          <div>Facility/power formula: <strong>server kW × $/kW-month × 12 × horizon</strong></div>
          <div>Annual commercial amounts: <strong>annual amount × horizon</strong></div>
          <div>Term-total commercial amounts: <strong>counted once only when quoted coverage spans the full horizon</strong></div>
          <div>Total reconciliation: <strong>{money(lifecycle.oneTimeCapexUSD)} one-time + {money(lifecycle.recurringLifecycleUSD)} recurring = {money(lifecycle.totalTcoUSD)}</strong></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-6">
        <div className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: RED }}>Right-Sized Private AI</div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: INK }}>RTX PRO single-server TCO</h2>
        <p className="text-sm text-gray-600 max-w-3xl">This path carries the evidence-qualified RTX PRO deployment from GPU Sizing into lifecycle TCO without inheriting DGX cluster economics. Client-ready directional TCO appears only when every commercial, workload, operations, facility, and term-basis input is explicit.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-5 mb-6">
        <div className="rounded-xl border border-gray-200 p-5 bg-gray-50">
          <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">GPU Sizing handoff</div>
          <div className="text-xl font-bold mb-1" style={{ color: INK }}>{gpuCount} × RTX PRO 6000 Blackwell Server Edition</div>
          {model && <div className="text-xs text-gray-600">Model: {model}{precision ? ` · ${precision}` : ""}</div>}
          <div className="mt-3 text-sm font-semibold" style={{ color: INK }}>Hardware: {Number.isFinite(policy.hardware.configuredSystemPriceUSD) ? `${money(policy.hardware.configuredSystemPriceUSD)} · ${policy.hardware.priceProvenance}` : "Configured 8-GPU server price requires quote"}</div>
          <div className="text-xs text-gray-500 mt-1">{policy.hardware.configuredSystemSku || "OEM/CDW configured SKU required"}</div>
        </div>
        <div className={`rounded-xl border p-5 ${lifecycleReady ? "border-green-300 bg-green-50" : "border-amber-300 bg-amber-50"}`}>
          <div className="text-xs font-bold uppercase tracking-wide mb-2">TCO readiness</div>
          <div className="text-lg font-bold mb-1" style={{ color: INK }}>{lifecycleReady ? `${horizonYears}-year directional TCO ready` : "Additional inputs required"}</div>
          <div className="text-xs text-gray-700">{lifecycleReady ? "The lifecycle total uses only explicit commercial/workload values and tested term normalization; no DGX defaults or inferred renewals are included." : `${lifecycle.requiredInputs?.length || 0} lifecycle item(s) remain unresolved.`}</div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 p-5 mb-6">
        <div className="text-sm font-bold mb-1" style={{ color: INK }}>TCO horizon</div>
        <p className="text-xs text-gray-500 mb-3">Select the period over which annual costs are accumulated. Term-total quotes must cover this entire horizon.</p>
        <div className="flex gap-2">{[1, 3, 5].map((years) => <button key={years} type="button" onClick={() => setHorizonYears(years)} className="px-4 py-2 rounded-lg text-sm font-semibold border" style={{ background: horizonYears === years ? RED : "white", color: horizonYears === years ? "white" : INK, borderColor: horizonYears === years ? RED : "#D1D5DB" }}>{years} year{years === 1 ? "" : "s"}</button>)}</div>
      </div>

      <div className="rounded-xl border border-gray-200 p-5 mb-6">
        <div className="text-sm font-bold mb-1" style={{ color: INK }}>Existing infrastructure assumptions</div>
        <p className="text-xs text-gray-500 mb-4">These can legitimately be incremental $0 only when the customer already has the capability. Turning any off makes that item quote/customer-input required; it does not substitute a DGX allowance.</p>
        {[["Existing server-management tooling", existingServerManagement, setExistingServerManagement], ["Existing Ethernet is sufficient for this independent-replica server", existingEthernet, setExistingEthernet], ["Existing rack capacity is available", existingRackCapacity, setExistingRackCapacity]].map(([label, checked, setter]) => <label key={label} className="flex items-start gap-2 text-sm mb-2"><input type="checkbox" checked={checked} onChange={(e) => setter(e.target.checked)} className="mt-1" /><span>{label}</span></label>)}
      </div>

      <div className="grid md:grid-cols-2 gap-x-6 rounded-xl border border-gray-200 p-5 mb-6">
        <div><MoneyInput label="NVIDIA software / support entitlement" value={nvidiaSoftwareUSD} onChange={setNvidiaSoftwareUSD} helper="Enter the applicable quoted/planned amount; zero is allowed only when explicitly confirmed." /><CommercialBasisControl label="NVIDIA software / support" basis={nvidiaSoftwareBasis} setBasis={setNvidiaSoftwareBasis} coverageYears={nvidiaSoftwareCoverageYears} setCoverageYears={setNvidiaSoftwareCoverageYears} /></div>
        <div><MoneyInput label="OEM / server support" value={supportUSD} onChange={setSupportUSD} helper="Use the customer/OEM support basis for this configured server." /><CommercialBasisControl label="OEM / server support" basis={supportBasis} setBasis={setSupportBasis} coverageYears={supportCoverageYears} setCoverageYears={setSupportCoverageYears} /></div>
        <MoneyInput label="Professional services / implementation" value={professionalServicesUSD} onChange={setProfessionalServicesUSD} helper="Modeled as one-time implementation cost; do not inherit the DGX professional-services allowance automatically." />
        <MoneyInput label="Workload-derived storage" value={storageUSD} onChange={setStorageUSD} helper="Modeled as one-time deployment storage CAPEX in v1. Base it on the actual model/RAG/training/checkpoint/retention requirement, not GPU count." />
        <MoneyInput label="Incremental admin / operations labor (annual)" value={adminFteAnnualUSD} onChange={setAdminFteAnnualUSD} helper="Annual labor allocated to this deployment; multiplied by the selected TCO horizon." />
        <NumberField label="Full configured-server power draw" value={serverPowerKW} onChange={setServerPowerKW} suffix="kW" helper="Use an OEM/configured-system value; the 600 W GPU maximum is not a server power value." min={0.1} />
        <NumberField label="Facility power burden" value={powerBurdenPerKwMonth} onChange={setPowerBurdenPerKwMonth} suffix="$/kW-month" helper="Customer-specific fully loaded facility/power basis. Intentionally no universal RTX default." />
      </div>

      {!lifecycleReady && <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 mb-6"><div className="text-sm font-bold text-amber-900 mb-2">Still required before client-ready directional TCO</div><ul className="text-xs text-amber-900 list-disc pl-5 space-y-1">{(lifecycle.requiredInputs || policy.requiredInputs || []).map((item) => <li key={item}>{item}</li>)}</ul></div>}

      {lifecycleReady && (
        <div className="rounded-xl border border-green-300 bg-green-50 p-5 mb-6">
          <div className="flex flex-wrap items-end justify-between gap-3 mb-4"><div><div className="text-xs font-bold uppercase tracking-wide text-green-800">Directional lifecycle TCO</div><div className="text-3xl font-bold text-green-950">{money(lifecycle.totalTcoUSD)}</div><div className="text-xs text-green-900">{horizonYears}-year single-server planning basis</div></div><div className="text-xs text-green-900 text-right"><div>One-time costs: <strong>{money(lifecycle.oneTimeCapexUSD)}</strong></div><div>Lifecycle recurring costs: <strong>{money(lifecycle.recurringLifecycleUSD)}</strong></div></div></div>
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-xs text-green-950"><div>Configured hardware: <strong>{money(lifecycle.breakdown.hardwareUSD)}</strong></div><div>Professional services: <strong>{money(lifecycle.breakdown.professionalServicesUSD)}</strong></div><div>Workload-derived storage: <strong>{money(lifecycle.breakdown.storageUSD)}</strong></div><div>NVIDIA software/support: <strong>{money(lifecycle.breakdown.nvidiaSoftwareLifecycleUSD)}</strong> lifecycle</div><div>OEM/server support: <strong>{money(lifecycle.breakdown.supportLifecycleUSD)}</strong> lifecycle</div><div>Admin/operations labor: <strong>{money(lifecycle.breakdown.adminLifecycleUSD)}</strong> lifecycle</div><div>Facility/power: <strong>{money(lifecycle.breakdown.facilityPowerLifecycleUSD)}</strong> lifecycle</div><div>Annual facility/power basis: <strong>{money(lifecycle.annualFacilityPowerUSD)}</strong></div></div>
          <p className="text-xs text-green-900 mt-4">Annual commercial amounts are multiplied by the selected horizon. Term-total amounts are counted once only when their stated coverage spans the full horizon; the tool does not infer renewal pricing.</p>
          <div className="flex flex-wrap gap-2 mt-4 no-print"><button type="button" onClick={() => setView("report")} className="text-sm font-semibold px-4 py-2 rounded-lg border border-green-700 text-green-900 bg-white">View my report</button><button type="button" onClick={() => setView("audit")} className="text-sm font-semibold px-4 py-2 rounded-lg border border-green-700 text-green-900 bg-white">Calculation Methodology & Audit Trail</button></div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 no-print"><a href="/gpu-sizing" className="text-sm font-semibold px-4 py-2 rounded-lg border border-gray-300 text-gray-700 bg-white">Back to GPU Sizing</a>{lifecycleReady && ieHandoff.eligible && <a href={ieHandoff.href} className="text-sm font-semibold px-4 py-2 rounded-lg text-white" style={{ background: RED }}>Continue to Inference Economics</a>}<a href="/tco" className="text-sm font-semibold px-4 py-2 rounded-lg border border-gray-300 text-gray-700 bg-white">Open enterprise TCO calculator</a></div>
    </div>
  );
}
