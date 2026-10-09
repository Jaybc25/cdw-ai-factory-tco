import React, { useMemo, useState } from "react";
import { buildRtxProSingleServerTcoPolicy } from "./rtxProTcoPolicy.js";

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

function explicitNumber(raw) {
  if (raw === "" || raw === null || raw === undefined) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
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
  const fullLifecycleInputsReady = policy.clientReady && powerRate !== null;
  const annualFacilityPower = fullLifecycleInputsReady
    ? policy.userInputs.serverPowerKW * powerRate * 12
    : null;

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
        <h2 className="text-2xl font-bold mb-2" style={{ color: INK }}>RTX PRO single-server TCO intake</h2>
        <p className="text-sm text-gray-600 max-w-3xl">
          This path carries the evidence-qualified RTX PRO deployment from GPU Sizing into TCO without inheriting DGX cluster economics. It becomes client-ready only after the unresolved commercial, workload, operations, and facility inputs are explicitly confirmed.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-5 mb-6">
        <div className="rounded-xl border border-gray-200 p-5 bg-gray-50">
          <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">GPU Sizing handoff</div>
          <div className="text-xl font-bold mb-1" style={{ color: INK }}>{gpuCount} × RTX PRO 6000 Blackwell Server Edition</div>
          {model && <div className="text-xs text-gray-600">Model: {model}{precision ? ` · ${precision}` : ""}</div>}
          <div className="mt-3 text-sm font-semibold" style={{ color: INK }}>
            Hardware: {Number.isFinite(policy.hardware.configuredSystemPriceUSD)
              ? `$${Math.round(policy.hardware.configuredSystemPriceUSD).toLocaleString("en-US")} · ${policy.hardware.priceProvenance}`
              : "Configured 8-GPU server price requires quote"}
          </div>
          <div className="text-xs text-gray-500 mt-1">{policy.hardware.configuredSystemSku || "OEM/CDW configured SKU required"}</div>
        </div>

        <div className={`rounded-xl border p-5 ${fullLifecycleInputsReady ? "border-green-300 bg-green-50" : "border-amber-300 bg-amber-50"}`}>
          <div className="text-xs font-bold uppercase tracking-wide mb-2">TCO readiness</div>
          <div className="text-lg font-bold mb-1" style={{ color: INK }}>
            {fullLifecycleInputsReady ? "Inputs complete for directional TCO" : "Additional inputs required"}
          </div>
          <div className="text-xs text-gray-700">
            {fullLifecycleInputsReady
              ? "All required v1 single-server inputs are explicit. The next engine step can normalize these values into lifecycle terms without using DGX defaults."
              : `${policy.requiredInputs.length + (powerRate === null ? 1 : 0)} required item(s) remain unresolved.`}
          </div>
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
        <MoneyInput label="NVIDIA software / support entitlement" value={nvidiaSoftwareUSD} onChange={setNvidiaSoftwareUSD} helper="Enter the applicable quoted/planned amount; zero is allowed only when explicitly confirmed." />
        <MoneyInput label="OEM / server support" value={supportUSD} onChange={setSupportUSD} helper="Use the customer/OEM support basis for this configured server." />
        <MoneyInput label="Professional services / implementation" value={professionalServicesUSD} onChange={setProfessionalServicesUSD} helper="Do not inherit the DGX professional-services allowance automatically." />
        <MoneyInput label="Workload-derived storage" value={storageUSD} onChange={setStorageUSD} helper="Base this on the actual model/RAG/training/checkpoint/retention requirement, not GPU count." />
        <MoneyInput label="Incremental admin / operations labor (annual)" value={adminFteAnnualUSD} onChange={setAdminFteAnnualUSD} helper="Incremental annual labor allocated to this deployment." />
        <NumberField label="Full configured-server power draw" value={serverPowerKW} onChange={setServerPowerKW} suffix="kW" helper="Use an OEM/configured-system value; the 600 W GPU maximum is not a server power value." min={0.1} />
        <NumberField label="Facility power burden" value={powerBurdenPerKwMonth} onChange={setPowerBurdenPerKwMonth} suffix="$/kW-month" helper="Customer-specific fully loaded facility/power basis. Intentionally no universal RTX default." />
      </div>

      {!fullLifecycleInputsReady && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 mb-6">
          <div className="text-sm font-bold text-amber-900 mb-2">Still required before client-ready TCO</div>
          <ul className="text-xs text-amber-900 list-disc pl-5 space-y-1">
            {policy.requiredInputs.map((item) => <li key={item}>{item}</li>)}
            {powerRate === null && <li>customer-specific facility power burden ($/kW-month)</li>}
          </ul>
        </div>
      )}

      {fullLifecycleInputsReady && (
        <div className="rounded-xl border border-green-300 bg-green-50 p-5 mb-6">
          <div className="text-sm font-bold text-green-900 mb-2">Directional input package complete</div>
          <div className="grid sm:grid-cols-2 gap-2 text-xs text-green-950">
            <div>Configured hardware: <strong>${Math.round(policy.hardware.configuredSystemPriceUSD).toLocaleString("en-US")}</strong></div>
            <div>Annual facility/power burden: <strong>${Math.round(annualFacilityPower).toLocaleString("en-US")}</strong></div>
            <div>Management/control-plane CAPEX: <strong>${policy.assumptions.managementControlPlaneCapexUSD.toLocaleString("en-US")} incremental EST</strong></div>
            <div>Dedicated AI fabric CAPEX: <strong>${policy.assumptions.fabricCapexUSD.toLocaleString("en-US")} incremental EST</strong></div>
          </div>
          <p className="text-xs text-green-900 mt-3">This screen intentionally does not sum software/support/services into lifecycle TCO until their commercial term (one-time vs annual/multi-year) is normalized. That prevents a superficially precise but methodologically wrong total.</p>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <a href="/gpu-sizing" className="text-sm font-semibold px-4 py-2 rounded-lg border border-gray-300 text-gray-700 bg-white">Back to GPU Sizing</a>
        <a href="/tco" className="text-sm font-semibold px-4 py-2 rounded-lg text-white" style={{ background: RED }}>Open enterprise TCO calculator</a>
      </div>
    </div>
  );
}
