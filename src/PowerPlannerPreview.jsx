import React, { useEffect, useMemo, useState } from "react";
import { POWER_PLANNER_SYSTEM_PROFILES, calculatePowerPlanner } from "./powerPlannerEngine.js";
import { buildPowerPlannerWritebackBundle, validatePowerPlannerInputs } from "./powerPlannerWriteback.js";
import { PHASE2_STATE } from "./phase2Contract.js";
import { loadSessionState, saveSessionState } from "./sessionState.js";

const field = { display: "grid", gap: 6 };
const input = { padding: "10px 12px", border: "1px solid #bbb", borderRadius: 8, fontSize: 15, width: "100%", boxSizing: "border-box" };
const card = { border: "1px solid #ddd", borderRadius: 12, padding: 16, background: "#fff" };
const label = { fontSize: 12, fontWeight: 800, color: "#555", textTransform: "uppercase", letterSpacing: ".05em" };
const primaryButton = { border: 0, borderRadius: 8, padding: "11px 15px", fontWeight: 800, background: "#c8102e", color: "#fff", cursor: "pointer" };

function money(v) { return v == null ? "Unresolved" : `$${Math.round(Number(v || 0)).toLocaleString()}`; }
function kw(v) { return `${Number(v || 0).toFixed(1)} kW`; }

export default function PowerPlannerPreview() {
  const acceptedStorage = useMemo(() => loadSessionState("phase2-storage-writeback"), []);
  const acceptedNetwork = useMemo(() => loadSessionState("phase2-network-writeback"), []);
  const [savedPower, setSavedPower] = useState(() => loadSessionState("phase2-power-writeback"));
  const [useAcceptedStorage, setUseAcceptedStorage] = useState(Boolean(acceptedStorage?.requirements));
  const [useAcceptedNetwork, setUseAcceptedNetwork] = useState(Boolean(acceptedNetwork?.requirements));

  const [systemName, setSystemName] = useState("DGX B200");
  const profile = POWER_PLANNER_SYSTEM_PROFILES[systemName];
  const [systemCount, setSystemCount] = useState(8);
  const [avgKwPerSystem, setAvgKwPerSystem] = useState(profile.avgKwPerSystem);
  const [designKwPerSystem, setDesignKwPerSystem] = useState(profile.designKwPerSystem);
  const [systemsPerRack, setSystemsPerRack] = useState(profile.systemsPerRack);
  const [storagePb, setStoragePb] = useState(1);
  const [provisionalNetworkKw, setProvisionalNetworkKw] = useState(12);
  const [managementHeadNodeKw, setManagementHeadNodeKw] = useState("");
  const [pue, setPue] = useState(1.35);
  const [utilityRatePerKwh, setUtilityRatePerKwh] = useState(0.11);
  const [facilityBranch, setFacilityBranch] = useState("owned-dc");
  const [ownedFacilityBurdenPerKwMonth, setOwnedFacilityBurdenPerKwMonth] = useState("");
  const [coloMonthlyBundle, setColoMonthlyBundle] = useState("");
  const [coolingType, setCoolingType] = useState("air-containment");
  const [availableKwPerRack, setAvailableKwPerRack] = useState("");
  const [totalFacilityKwAvailable, setTotalFacilityKwAvailable] = useState("");
  const [rackPositionsAvailable, setRackPositionsAvailable] = useState("");
  const [acceptance, setAcceptance] = useState(null);

  const storageRequirement = useAcceptedStorage ? acceptedStorage?.requirements : null;
  const networkRequirement = useAcceptedNetwork ? acceptedNetwork?.requirements : null;
  const currentStorageFingerprint = useAcceptedStorage ? acceptedStorage?.fingerprint || null : null;
  const currentNetworkFingerprint = useAcceptedNetwork ? acceptedNetwork?.fingerprint || null : null;
  const priorStorageFingerprint = savedPower?.requirements?.upstreamStorageFingerprint || null;
  const priorNetworkFingerprint = savedPower?.requirements?.upstreamNetworkFingerprint || null;
  const powerStaleFromStorage = Boolean(savedPower && currentStorageFingerprint && priorStorageFingerprint !== currentStorageFingerprint);
  const powerStaleFromNetwork = Boolean(savedPower && currentNetworkFingerprint && priorNetworkFingerprint !== currentNetworkFingerprint);

  useEffect(() => {
    if ((!powerStaleFromStorage && !powerStaleFromNetwork) || !savedPower) return;
    const reasons = [];
    if (powerStaleFromStorage) reasons.push("Accepted Storage requirement changed after this Power result was staged.");
    if (powerStaleFromNetwork) reasons.push("Accepted Fabric requirement changed after this Power result was staged.");
    const staleReason = reasons.join(" ");
    const next = {
      ...savedPower,
      overrides: (savedPower.overrides || []).map((override) => ({ ...override, state: PHASE2_STATE.STALE, staleReason })),
      requirements: { ...savedPower.requirements, stale: true, staleReason, currentUpstreamStorageFingerprint: currentStorageFingerprint, currentUpstreamNetworkFingerprint: currentNetworkFingerprint },
    };
    saveSessionState("phase2-power-writeback", next);
    setSavedPower(next);
  }, [powerStaleFromStorage, powerStaleFromNetwork, currentStorageFingerprint, currentNetworkFingerprint, savedPower]);

  function clearAcceptance() { setAcceptance(null); }
  function chooseSystem(name) {
    const next = POWER_PLANNER_SYSTEM_PROFILES[name];
    setSystemName(name);
    setAvgKwPerSystem(next.avgKwPerSystem);
    setDesignKwPerSystem(next.designKwPerSystem);
    setSystemsPerRack(next.systemsPerRack);
    if (next.coolingCapability === "liquid-only") setCoolingType("direct-liquid");
    clearAcceptance();
  }

  const effectiveStoragePb = storageRequirement ? storageRequirement.totalRawTb / 1000 : storagePb;
  const effectiveStoragePowerKw = storageRequirement ? storageRequirement.storagePowerKw : null;
  const effectiveStorageRacks = storageRequirement ? storageRequirement.storageRacks : (storagePb > 0 ? Math.ceil(storagePb) : 0);
  const acceptedFabricSwitchKw = networkRequirement ? Number(networkRequirement.switchPowerKw || 0) : null;
  const effectiveNetworkRacks = (acceptedFabricSwitchKw || provisionalNetworkKw) > 0 ? 1 : 0;

  const result = useMemo(() => calculatePowerPlanner({
    systemCount,
    avgKwPerSystem,
    designKwPerSystem,
    systemsPerRack,
    storagePb: effectiveStoragePb,
    storagePowerKw: effectiveStoragePowerKw,
    storageKwPerPb: 10,
    storageRacks: effectiveStorageRacks,
    provisionalNetworkKw,
    fabricSwitchPowerKw: networkRequirement ? acceptedFabricSwitchKw : null,
    managementHeadNodeKw: networkRequirement ? managementHeadNodeKw : null,
    networkRacks: effectiveNetworkRacks,
    pue,
    utilityRatePerKwh,
    facilityBranch,
    ownedFacilityBurdenPerKwMonth,
    coloMonthlyBundle,
    coolingType,
    coolingCapability: profile.coolingCapability,
    availableKwPerRack,
    totalFacilityKwAvailable,
    rackPositionsAvailable,
  }), [systemCount, avgKwPerSystem, designKwPerSystem, systemsPerRack, effectiveStoragePb, effectiveStoragePowerKw, effectiveStorageRacks, provisionalNetworkKw, networkRequirement, acceptedFabricSwitchKw, managementHeadNodeKw, effectiveNetworkRacks, pue, utilityRatePerKwh, facilityBranch, ownedFacilityBurdenPerKwMonth, coloMonthlyBundle, coolingType, profile.coolingCapability, availableKwPerRack, totalFacilityKwAvailable, rackPositionsAvailable]);

  const validation = useMemo(() => validatePowerPlannerInputs(result), [result]);

  function stageForTco() {
    try {
      const upstreamStorage = useAcceptedStorage && acceptedStorage ? { fingerprint: acceptedStorage.fingerprint, acceptedAt: acceptedStorage.acceptedAt } : null;
      const upstreamNetwork = useAcceptedNetwork && acceptedNetwork ? { fingerprint: acceptedNetwork.fingerprint, acceptedAt: acceptedNetwork.acceptedAt } : null;
      const bundle = buildPowerPlannerWritebackBundle(result, { systemName, upstreamStorage, upstreamNetwork });
      saveSessionState("phase2-power-writeback", bundle);
      saveSessionState("phase2-preview-override", { override: bundle.overrides[0], source: "power-planner" });
      setSavedPower(bundle);
      setAcceptance({ ok: true, warnings: bundle.validation.warnings, costResolved: bundle.costResolved });
    } catch (error) {
      setAcceptance({ ok: false, message: error.message });
    }
  }

  return (
    <div style={{ background: "#f5f5f5", minHeight: "100vh", padding: "24px 16px 56px", fontFamily: "Arial, Helvetica, sans-serif" }}>
      <main style={{ width: "min(1180px, 100%)", margin: "0 auto" }}>
        <div style={{ background: "#111", color: "#fff", borderLeft: "6px solid #c8102e", padding: 14, marginBottom: 20 }}><strong>Phase 2 · Storage + Fabric → Power dependency.</strong> Accepted Fabric contributes switch power only; management/control-plane/head-node power remains an explicit separate allowance.</div>
        <h1 style={{ margin: "0 0 8px", fontSize: "clamp(30px, 5vw, 48px)" }}>Power, cooling and rack planner</h1>
        <p style={{ margin: "0 0 24px", color: "#555", fontSize: 17, lineHeight: 1.55, maxWidth: 900 }}>Separate facility feasibility from energy economics. Design power drives capacity checks. Average power drives monthly energy. Heat rejection tracks IT load, not IT load multiplied by PUE.</p>

        {acceptedStorage?.requirements && <section style={{ ...card, marginBottom: 18, borderLeft: "6px solid #176b31" }}><div style={{ ...label, color: "#176b31" }}>Accepted upstream dependency</div><h2 style={{ margin: "6px 0 10px" }}>Storage Sizer requirement available</h2><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}><div><strong>Raw capacity</strong><br />{Math.round(acceptedStorage.requirements.totalRawTb).toLocaleString()} TB</div><div><strong>Storage racks</strong><br />{acceptedStorage.requirements.storageRacks}</div><div><strong>Storage power</strong><br />{acceptedStorage.requirements.storagePowerKw.toFixed(1)} kW</div><div><strong>Fabric bandwidth</strong><br />{Number(acceptedStorage.requirements.aggregateGBps ?? acceptedStorage.requirements.aggregateGbps ?? 0).toFixed(1)} GB/s</div></div><label style={{ display: "block", marginTop: 12 }}><input type="checkbox" checked={useAcceptedStorage} onChange={(e) => { setUseAcceptedStorage(e.target.checked); clearAcceptance(); }} /> Use this accepted Storage requirement in Power</label></section>}

        {acceptedNetwork?.requirements && <section style={{ ...card, marginBottom: 18, borderLeft: "6px solid #176b31" }}><div style={{ ...label, color: "#176b31" }}>Accepted upstream dependency</div><h2 style={{ margin: "6px 0 10px" }}>Network Fabric requirement available</h2><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}><div><strong>Technology</strong><br />{acceptedNetwork.requirements.technology}</div><div><strong>Switches</strong><br />{acceptedNetwork.requirements.switches?.total ?? "—"}</div><div><strong>Switch power</strong><br />{kw(acceptedNetwork.requirements.switchPowerKw)}</div><div><strong>Current fabric CAPEX</strong><br />{money(acceptedNetwork.requirements.capitalCostCurrentFleet)}</div></div><label style={{ display: "block", marginTop: 12 }}><input type="checkbox" checked={useAcceptedNetwork} onChange={(e) => { setUseAcceptedNetwork(e.target.checked); clearAcceptance(); }} /> Use accepted Fabric switch power in Power</label></section>}

        {(powerStaleFromStorage || powerStaleFromNetwork) && <section style={{ ...card, marginBottom: 18, background: "#fff7e8", borderColor: "#e4c679" }}><div style={{ fontWeight: 900, color: "#7a5600" }}>STALE · upstream dependency changed</div><p style={{ marginBottom: 0, lineHeight: 1.5 }}>The previously staged Power result was calculated from an older accepted Storage and/or Fabric requirement. Recompute before client use.</p></section>}

        <section style={{ ...card, marginBottom: 18 }}>
          <h2 style={{ marginTop: 0 }}>1. Fleet and site inputs</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            <label style={field}><span style={label}>System</span><select style={input} value={systemName} onChange={(e) => chooseSystem(e.target.value)}>{Object.keys(POWER_PLANNER_SYSTEM_PROFILES).map((name) => <option key={name}>{name}</option>)}</select></label>
            <label style={field}><span style={label}>Systems</span><input style={input} type="number" min="1" value={systemCount} onChange={(e) => { setSystemCount(Number(e.target.value)); clearAcceptance(); }} /></label>
            <label style={field}><span style={label}>Average kW / system</span><input style={input} type="number" step="0.1" min="0" value={avgKwPerSystem} onChange={(e) => { setAvgKwPerSystem(Number(e.target.value)); clearAcceptance(); }} /></label>
            <label style={field}><span style={label}>Design / max kW / system</span><input style={input} type="number" step="0.1" min="0" value={designKwPerSystem} onChange={(e) => { setDesignKwPerSystem(Number(e.target.value)); clearAcceptance(); }} /></label>
            <label style={field}><span style={label}>Systems / rack</span><input style={input} type="number" min="1" value={systemsPerRack} onChange={(e) => { setSystemsPerRack(Number(e.target.value)); clearAcceptance(); }} /></label>
            <label style={field}><span style={label}>{storageRequirement ? "Storage PB (accepted Storage)" : "Storage PB"}</span><input style={input} type="number" min="0" step="0.1" value={Number(effectiveStoragePb.toFixed(3))} disabled={Boolean(storageRequirement)} onChange={(e) => { setStoragePb(Number(e.target.value)); clearAcceptance(); }} /></label>
            {!networkRequirement && <label style={field}><span style={label}>Provisional network + head-node kW</span><input style={input} type="number" min="0" step="0.1" value={provisionalNetworkKw} onChange={(e) => { setProvisionalNetworkKw(Number(e.target.value)); clearAcceptance(); }} /></label>}
            {networkRequirement && <><label style={field}><span style={label}>Accepted Fabric switch power</span><input style={input} type="number" value={acceptedFabricSwitchKw ?? 0} disabled /></label><label style={field}><span style={label}>Management + head-node kW</span><input style={input} type="number" min="0" step="0.1" placeholder="Enter explicit allowance" value={managementHeadNodeKw} onChange={(e) => { setManagementHeadNodeKw(e.target.value === "" ? "" : Number(e.target.value)); clearAcceptance(); }} /></label></>}
            <label style={field}><span style={label}>PUE</span><input style={input} type="number" step="0.01" min="1" value={pue} onChange={(e) => { setPue(Number(e.target.value)); clearAcceptance(); }} /></label>
            <label style={field}><span style={label}>Utility rate ($/kWh)</span><input style={input} type="number" step="0.01" min="0" value={utilityRatePerKwh} onChange={(e) => { setUtilityRatePerKwh(Number(e.target.value)); clearAcceptance(); }} /></label>
            <label style={field}><span style={label}>Cooling type</span><select style={input} value={coolingType} onChange={(e) => { setCoolingType(e.target.value); clearAcceptance(); }}><option value="air-standard">Air · standard CRAC</option><option value="air-containment">Air · containment</option><option value="rear-door">Rear-door heat exchanger</option><option value="direct-liquid">Direct liquid</option><option value="immersion">Immersion</option></select></label>
            <label style={field}><span style={label}>Available kW / rack (customer site)</span><input style={input} type="number" min="0" placeholder="Enter if known" value={availableKwPerRack} onChange={(e) => { setAvailableKwPerRack(e.target.value === "" ? "" : Number(e.target.value)); clearAcceptance(); }} /></label>
            <label style={field}><span style={label}>Total facility kW available</span><input style={input} type="number" min="0" placeholder="Enter if known" value={totalFacilityKwAvailable} onChange={(e) => { setTotalFacilityKwAvailable(e.target.value === "" ? "" : Number(e.target.value)); clearAcceptance(); }} /></label>
            <label style={field}><span style={label}>Rack positions available</span><input style={input} type="number" min="0" placeholder="Enter if known" value={rackPositionsAvailable} onChange={(e) => { setRackPositionsAvailable(e.target.value === "" ? "" : Number(e.target.value)); clearAcceptance(); }} /></label>
          </div>
          {networkRequirement && <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: "#fff7e8", border: "1px solid #edd7a7", lineHeight: 1.5 }}><strong>Power dependency caution:</strong> accepted Fabric supplies switch power only. Management, control-plane and head-node power is separate and is never silently replaced by the Fabric handoff.</div>}
        </section>

        <section style={{ ...card, marginBottom: 18 }}><h2 style={{ marginTop: 0 }}>2. Facility economics branch</h2><div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}><label><input type="radio" checked={facilityBranch === "owned-dc"} onChange={() => { setFacilityBranch("owned-dc"); clearAcceptance(); }} /> Owned datacenter</label><label><input type="radio" checked={facilityBranch === "colocation"} onChange={() => { setFacilityBranch("colocation"); clearAcceptance(); }} /> Colocation</label></div>{facilityBranch === "owned-dc" ? <label style={{ ...field, maxWidth: 360 }}><span style={label}>Facility burden ($/design kW-month)</span><input style={input} type="number" min="0" placeholder="Enter customer-supported value" value={ownedFacilityBurdenPerKwMonth} onChange={(e) => { setOwnedFacilityBurdenPerKwMonth(e.target.value === "" ? "" : Number(e.target.value)); clearAcceptance(); }} /></label> : <label style={{ ...field, maxWidth: 360 }}><span style={label}>Colocation monthly bundle</span><input style={input} type="number" min="0" placeholder="Enter customer/partner bundle" value={coloMonthlyBundle} onChange={(e) => { setColoMonthlyBundle(e.target.value === "" ? "" : Number(e.target.value)); clearAcceptance(); }} /></label>}<p style={{ color: "#666", lineHeight: 1.5 }}>No default facility burden is invented; unresolved facility cost stays out of TCO.</p></section>

        <section style={{ marginBottom: 18 }}><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}><div style={card}><div style={label}>Verdict</div><div style={{ fontSize: 26, fontWeight: 900, marginTop: 6 }}>{result.verdict.replaceAll("-", " ").toUpperCase()}</div></div><div style={card}><div style={label}>Racks required</div><div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>{result.racks.total}</div></div><div style={card}><div style={label}>Storage power</div><div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>{kw(result.power.storageKw)}</div></div><div style={card}><div style={label}>Network + management power</div><div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>{kw(result.networkPower.totalKw)}</div><div style={{ color: "#666" }}>{result.networkPower.acceptedFabricPower ? `${kw(result.networkPower.switchKw)} switches + ${kw(result.networkPower.managementHeadNodeKw)} management/head-node` : "Provisional combined allowance"}</div></div><div style={card}><div style={label}>Design IT load</div><div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>{kw(result.power.designItKw)}</div></div><div style={card}><div style={label}>Facility design demand</div><div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>{kw(result.power.facilityDesignKw)}</div></div><div style={card}><div style={label}>Monthly energy</div><div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>{money(result.economics.monthlyEnergyCost)}</div></div><div style={card}><div style={label}>Monthly facility burden</div><div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>{money(result.economics.monthlyFacilityBurden)}</div></div></div></section>

        <section style={{ ...card, marginBottom: 18 }}><h2 style={{ marginTop: 0 }}>3. Flags and methodology</h2>{result.flags.length ? <ul style={{ lineHeight: 1.6 }}>{result.flags.map((flag) => <li key={flag}>{flag}</li>)}</ul> : <p>No planning flags for the stated inputs.</p>}<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, marginTop: 14 }}>{Object.entries(result.methodology).map(([k, v]) => <div key={k} style={{ ...card, background: "#fafafa" }}><strong>{k}</strong><div style={{ marginTop: 6, color: "#555", lineHeight: 1.45 }}>{v}</div></div>)}</div></section>

        <section style={{ ...card, marginBottom: 18, borderLeft: "6px solid #c8102e" }}><h2 style={{ marginTop: 0 }}>4. Recompute and accept Power</h2>{!validation.valid && <ul style={{ color: "#9b1c31" }}>{validation.errors.map((error) => <li key={error}>{error}</li>)}</ul>}{validation.warnings.length > 0 && <ul style={{ color: "#7a5600" }}>{validation.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}<div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}><button type="button" style={{ ...primaryButton, opacity: validation.valid ? 1 : .45 }} disabled={!validation.valid} onClick={stageForTco}>Recompute, accept, and stage for TCO</button><a href="/__phase2/storage" style={{ fontWeight: 800, color: "#c8102e" }}>Adjust Storage</a><a href="/__phase2/network" style={{ fontWeight: 800, color: "#c8102e" }}>Adjust Fabric</a><a href="/__phase2/tco" style={{ fontWeight: 800, color: "#c8102e" }}>Open TCO receiving preview</a></div>{acceptance?.ok && <div style={{ marginTop: 14, padding: 12, borderRadius: 8, background: acceptance.costResolved ? "#eaf7ee" : "#fff7e8", border: acceptance.costResolved ? "1px solid #b8dec3" : "1px solid #e4c679" }}>Power has been accepted against the current dependencies. Facility burden is included only when resolved.</div>}{acceptance && !acceptance.ok && <div style={{ marginTop: 14, color: "#9b1c31" }}>{acceptance.message}</div>}</section>

        <section style={{ ...card, background: "#fff8f8", borderColor: "#efc9cf" }}><h2 style={{ marginTop: 0 }}>Scope guard</h2><p style={{ marginBottom: 0, lineHeight: 1.55 }}>Directional facility planning only. This is not an electrical design, one-line diagram, structural or floor-loading analysis, chilled-water design, or site assessment. The tools size and cost; CDW engineers design.</p></section>
      </main>
    </div>
  );
}