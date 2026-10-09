import React, { useMemo, useState } from "react";
import { buildRtxProSingleServerTcoPolicy } from "./rtxProTcoPolicy.js";
import { buildRtxProLifecycleTco } from "./rtxProLifecycleTco.js";

const RED = "#CC0000";
const INK = "#2D2D2D";

function initialParams() {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

function MoneyInput({ label, value, onChange, helper }) {
  return (
    <label className="block mb-4">
      <span className="block text-sm font-semibold mb-1" style={{ color: INK }}>{label}</span>
      <div className="relative">
        <span className="absolute left-3 top-2 text-sm text-gray-500">$</span>
        <input
          type="number"
          min="0"
          step="1"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2 text-sm"
          placeholder="Enter confirmed amount"
        />
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
        <input
          type="number"
          min={min}
          step="0.1"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          placeholder="Enter confirmed value"
        />
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
      <select
        value={basis}
        onChange={(e) => setBasis(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
      >
        <option value="annual">Annual amount</option>
        <option value="term-total">Total for quoted term</option>
      </select>
      {basis === "term-total" && (
        <div className="mt-2">
          <NumberField
            label="Quoted term coverage"
            value={coverageYears}
            onChange={setCoverageYears}
            suffix="years"
            helper="The quoted term must cover the entire selected TCO horizon; the tool will not invent renewal pricing."
            min={1}
          />
        </div>
      )}
    </div>
  );
}

function explicitNumber(raw) {
  if (raw === "" || raw === null || raw === undefined) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function money(value) {
  return `$${Math.round(Number(value) || 0).toLocaleString("en-US")}`;
}

export default function RtxProTcoIntake() {
  const params = useMemo(initialParams, []);
  const gpuCount = Number(params.get("gpuCount")) || 2;
  const model = params.get("model") || null;
  const precision = params.get("precision") || null;

  const [nvidiaSoftwareUSD, setNvidiaSoftwareUSD] = useState("");
  const [supportUSD, setSupportUSD] = useState("");
  const [professionalServicesUSD, setProfessionalServicesUSD] = useState("");
  const [storageUSD, setStorageUSD] = useState("");
  const [adminFteAnnualUSD, setAdminFteAnnualUSD] = useState("");
  const [serverPowerKW, setServerPowerKW] = useState("");
  const [powerBurdenPerKwMonth, setPowerBurdenPerKwMonth] = useState("");
  const [existingServerManagement, setExistingServerManagement] = useState(true);
  const [existingEthernet, setExistingEthernet] = useState(true);
  const [existingRackCapacity, setExistingRackCapacity] = useState(true);
  const [horizonYears, setHorizonYears] = useState(3);
  const [nvidiaSoftwareBasis, setNvidiaSoftwareBasis] = useState("annual");
  const [nvidiaSoftwareCoverageYears, setNvidiaSoftwareCoverageYears] = useState("3");
  const [supportBasis, setSupportBasis] = useState("annual");
  const [supportCoverageYears, setSupportCoverageYears] = useState("3");

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

  if (policy.status === "UNSUPPORTED_CONFIGURATION") {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">{policy.reason}</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-6">
        <div className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: RED }}>Right-Sized Private AI</div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: INK }}>RTX PRO single-server TCO</h2>
        <p className="text-sm text-gray-600 max-w-3xl">
          This path carries the evidence-qualified RTX PRO deployment from GPU Sizing into lifecycle TCO without inheriting DGX cluster economics. Client-ready directional TCO appears only when every commercial, workload, operations, facility, and term-basis input is explicit.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-5 mb-6">
        <div className="rounded-xl border border-gray-200 p-5 bg-gray-50">
          <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">GPU Sizing handoff</div>
          <div className="text-xl font-bold mb-1" style={{ color: INK }}>{gpuCount} × RTX PRO 6000 Blackwell Server Edition</div>
          {model && <div className="text-xs text-gray-600">Model: {model}{precision ? ` · ${precision}` : ""}</div>}
          <div className="mt-3 text-sm font-semibold" style={{ color: INK }}>
            Hardware: {Number.isFinite(policy.hardware.configuredSystemPriceUSD)
              ? `${money(policy.hardware.configuredSystemPriceUSD)} · ${policy.hardware.priceProvenance}`
              : "Configured 8-GPU server price requires quote"}
          </div>
          <div className="text-xs text-gray-500 mt-1">{policy.hardware.configuredSystemSku || "OEM/CDW configured SKU required"}</div>
        </div>

        <div className={`rounded-xl border p-5 ${lifecycleReady ? "border-green-300 bg-green-50" : "border-amber-300 bg-amber-50"}`}>
          <div className="text-xs font-bold uppercase tracking-wide mb-2">TCO readiness</div>
          <div className="text-lg font-bold mb-1" style={{ color: INK }}>
            {lifecycleReady ? `${horizonYears}-year directional TCO ready` : "Additional inputs required"}
          </div>
          <div className="text-xs text-gray-700">
            {lifecycleReady
              ? "The lifecycle total uses only explicit commercial/workload values and tested term normalization; no DGX defaults or inferred renewals are included."
              : `${lifecycle.requiredInputs?.length || 0} lifecycle item(s) remain unresolved.`}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 p-5 mb-6">
        <div className="text-sm font-bold mb-1" style={{ color: INK }}>TCO horizon</div>
        <p className="text-xs text-gray-500 mb-3">Select the period over which annual costs are accumulated. Term-total quotes must cover this entire horizon.</p>
        <div className="flex gap-2">
          {[1, 3, 5].map((years) => (
            <button
              key={years}
              type="button"
              onClick={() => setHorizonYears(years)}
              className="px-4 py-2 rounded-lg text-sm font-semibold border"
              style={{ background: horizonYears === years ? RED : "white", color: horizonYears === years ? "white" : INK, borderColor: horizonYears === years ? RED : "#D1D5DB" }}
            >
              {years} year{years === 1 ? "" : "s"}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 p-5 mb-6">
        <div className="text-sm font-bold mb-1" style={{ color: INK }}>Existing infrastructure assumptions</div>
        <p className="text-xs text-gray-500 mb-4">These can legitimately be incremental $0 only when the customer already has the capability. Turning any off makes that item quote/customer-input required; it does not substitute a DGX allowance.</p>
        {[
          ["Existing server-management tooling", existingServerManagement, setExistingServerManagement],
          ["Existing Ethernet is sufficient for this independent-replica server", existingEthernet, setExistingEthernet],
          ["Existing rack capacity is available", existingRackCapacity, setExistingRackCapacity],
        ].map(([label, checked, setter]) => (
          <label key={label} className="flex items-start gap-2 text-sm mb-2">
            <input type="checkbox" checked={checked} onChange={(e) => setter(e.target.checked)} className="mt-1" />
            <span>{label}</span>
          </label>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-x-6 rounded-xl border border-gray-200 p-5 mb-6">
        <div>
          <MoneyInput label="NVIDIA software / support entitlement" value={nvidiaSoftwareUSD} onChange={setNvidiaSoftwareUSD} helper="Enter the applicable quoted/planned amount; zero is allowed only when explicitly confirmed." />
          <CommercialBasisControl label="NVIDIA software / support" basis={nvidiaSoftwareBasis} setBasis={setNvidiaSoftwareBasis} coverageYears={nvidiaSoftwareCoverageYears} setCoverageYears={setNvidiaSoftwareCoverageYears} />
        </div>
        <div>
          <MoneyInput label="OEM / server support" value={supportUSD} onChange={setSupportUSD} helper="Use the customer/OEM support basis for this configured server." />
          <CommercialBasisControl label="OEM / server support" basis={supportBasis} setBasis={setSupportBasis} coverageYears={supportCoverageYears} setCoverageYears={setSupportCoverageYears} />
        </div>
        <MoneyInput label="Professional services / implementation" value={professionalServicesUSD} onChange={setProfessionalServicesUSD} helper="Modeled as one-time implementation cost; do not inherit the DGX professional-services allowance automatically." />
        <MoneyInput label="Workload-derived storage" value={storageUSD} onChange={setStorageUSD} helper="Modeled as one-time deployment storage CAPEX in v1. Base it on the actual model/RAG/training/checkpoint/retention requirement, not GPU count." />
        <MoneyInput label="Incremental admin / operations labor (annual)" value={adminFteAnnualUSD} onChange={setAdminFteAnnualUSD} helper="Annual labor allocated to this deployment; multiplied by the selected TCO horizon." />
        <NumberField label="Full configured-server power draw" value={serverPowerKW} onChange={setServerPowerKW} suffix="kW" helper="Use an OEM/configured-system value; the 600 W GPU maximum is not a server power value." min={0.1} />
        <NumberField label="Facility power burden" value={powerBurdenPerKwMonth} onChange={setPowerBurdenPerKwMonth} suffix="$/kW-month" helper="Customer-specific fully loaded facility/power basis. Intentionally no universal RTX default." />
      </div>

      {!lifecycleReady && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 mb-6">
          <div className="text-sm font-bold text-amber-900 mb-2">Still required before client-ready directional TCO</div>
          <ul className="text-xs text-amber-900 list-disc pl-5 space-y-1">
            {(lifecycle.requiredInputs || policy.requiredInputs || []).map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      )}

      {lifecycleReady && (
        <div className="rounded-xl border border-green-300 bg-green-50 p-5 mb-6">
          <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-green-800">Directional lifecycle TCO</div>
              <div className="text-3xl font-bold text-green-950">{money(lifecycle.totalTcoUSD)}</div>
              <div className="text-xs text-green-900">{horizonYears}-year single-server planning basis</div>
            </div>
            <div className="text-xs text-green-900 text-right">
              <div>One-time costs: <strong>{money(lifecycle.oneTimeCapexUSD)}</strong></div>
              <div>Lifecycle recurring costs: <strong>{money(lifecycle.recurringLifecycleUSD)}</strong></div>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-xs text-green-950">
            <div>Configured hardware: <strong>{money(lifecycle.breakdown.hardwareUSD)}</strong></div>
            <div>Professional services: <strong>{money(lifecycle.breakdown.professionalServicesUSD)}</strong></div>
            <div>Workload-derived storage: <strong>{money(lifecycle.breakdown.storageUSD)}</strong></div>
            <div>NVIDIA software/support: <strong>{money(lifecycle.breakdown.nvidiaSoftwareLifecycleUSD)}</strong> lifecycle</div>
            <div>OEM/server support: <strong>{money(lifecycle.breakdown.supportLifecycleUSD)}</strong> lifecycle</div>
            <div>Admin/operations labor: <strong>{money(lifecycle.breakdown.adminLifecycleUSD)}</strong> lifecycle</div>
            <div>Facility/power: <strong>{money(lifecycle.breakdown.facilityPowerLifecycleUSD)}</strong> lifecycle</div>
            <div>Annual facility/power basis: <strong>{money(lifecycle.annualFacilityPowerUSD)}</strong></div>
          </div>
          <p className="text-xs text-green-900 mt-4">Annual commercial amounts are multiplied by the selected horizon. Term-total amounts are counted once only when their stated coverage spans the full horizon; the tool does not infer renewal pricing.</p>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <a href="/gpu-sizing" className="text-sm font-semibold px-4 py-2 rounded-lg border border-gray-300 text-gray-700 bg-white">Back to GPU Sizing</a>
        <a href="/tco" className="text-sm font-semibold px-4 py-2 rounded-lg text-white" style={{ background: RED }}>Open enterprise TCO calculator</a>
      </div>
    </div>
  );
}
