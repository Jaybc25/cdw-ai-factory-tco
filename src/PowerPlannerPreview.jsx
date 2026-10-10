import React, { useEffect, useMemo, useState } from "react";
import { POWER_PLANNER_SYSTEM_PROFILES, calculatePowerPlanner } from "./powerPlannerEngine.js";
import { buildPowerPlannerWritebackBundle, validatePowerPlannerInputs } from "./powerPlannerWriteback.js";
import { PHASE2_SOURCE, PHASE2_STATE } from "./phase2Contract.js";
import { loadSessionState, saveSessionState } from "./sessionState.js";

const field = { display: "grid", gap: 6 };
const input = { padding: "10px 12px", border: "1px solid #bbb", borderRadius: 8, fontSize: 15, width: "100%", boxSizing: "border-box" };
const card = { border: "1px solid #ddd", borderRadius: 12, padding: 16, background: "#fff" };
const label = { fontSize: 12, fontWeight: 800, color: "#555", textTransform: "uppercase", letterSpacing: ".05em" };
const primaryButton = { border: 0, borderRadius: 8, padding: "11px 15px", fontWeight: 800, background: "#c8102e", color: "#fff", cursor: "pointer" };
const money = (v) => v == null ? "Unresolved" : `$${Math.round(Number(v || 0)).toLocaleString()}`;
const kw = (v) => `${Number(v || 0).toFixed(1)} kW`;

function sourceOptions() {
  return <>
    <option value={PHASE2_SOURCE.EST}>EST · planning estimate</option>
    <option value={PHASE2_SOURCE.CUSTOMER}>CUSTOMER · customer supplied</option>
    <option value={PHASE2_SOURCE.QUOTE}>QUOTE · partner/provider quote</option>
    <option value={PHASE2_SOURCE.LISTED}>LISTED · published/listed source</option>
  </>;
}

function bundleIsStale(bundle) {
  return Boolean(
    bundle?.stale ||
    bundle?.requirements?.stale ||
    (bundle?.overrides || []).some((override) => override?.state === PHASE2_STATE.STALE)
  );
}

function sameInputs(a, b) {
  return Boolean(a && b && JSON.stringify(a) === JSON.stringify(b));
}

export default function PowerPlannerPreview() {
  const acceptedStorage = useMemo(() => loadSessionState("phase2-storage-writeback"), []);
  const acceptedNetwork = useMemo(() => loadSessionState("phase2-network-writeback"), []);
  const savedInputState = useMemo(() => loadSessionState("phase2-power-inputs"), []);
  const savedValues = savedInputState?.values || {};
  const storageDependencyStale = bundleIsStale(acceptedStorage);
  const networkDependencyStale = bundleIsStale(acceptedNetwork);
  const networkEngineeringReview = Boolean(
    acceptedNetwork?.costStatus === "ENGINEERING-REVIEW" ||
    acceptedNetwork?.requirements?.topologyFeasibility?.twoTierFeasible === false
  );
  const [savedPower, setSavedPower] = useState(() => loadSessionState("phase2-power-writeback"));
  const [acceptedInputs, setAcceptedInputs] = useState(savedInputState?.acceptedInputs || null);
  const [useAcceptedStorage, setUseAcceptedStorage] = useState(savedValues.useAcceptedStorage ?? (Boolean(acceptedStorage?.requirements) && !storageDependencyStale));
  const [useAcceptedNetwork, setUseAcceptedNetwork] = useState(savedValues.useAcceptedNetwork ?? (Boolean(acceptedNetwork?.requirements) && !networkDependencyStale && !networkEngineeringReview));
  const [systemName, setSystemName] = useState(savedValues.systemName ?? "DGX B200");
  const profile = POWER_PLANNER_SYSTEM_PROFILES[systemName] || POWER_PLANNER_SYSTEM_PROFILES["DGX B200"];
  const [systemCount, setSystemCount] = useState(savedValues.systemCount ?? 8);
  const [avgKwPerSystem, setAvgKwPerSystem] = useState(savedValues.avgKwPerSystem ?? profile.avgKwPerSystem);
  const [designKwPerSystem, setDesignKwPerSystem] = useState(savedValues.designKwPerSystem ?? profile.designKwPerSystem);
  const [systemsPerRack, setSystemsPerRack] = useState(savedValues.systemsPerRack ?? profile.systemsPerRack);
  const [storagePb, setStoragePb] = useState(savedValues.storagePb ?? 1);
  const [provisionalNetworkKw, setProvisionalNetworkKw] = useState(savedValues.provisionalNetworkKw ?? 12);
  const [managementHeadNodeKw, setManagementHeadNodeKw] = useState(savedValues.managementHeadNodeKw ?? "");
  const [networkRacks, setNetworkRacks] = useState(savedValues.networkRacks ?? "");
  const [pue, setPue] = useState(savedValues.pue ?? 1.35);
  const [utilityRatePerKwh, setUtilityRatePerKwh] = useState(savedValues.utilityRatePerKwh ?? 0.11);
  const [utilityRateSource, setUtilityRateSource] = useState(savedValues.utilityRateSource ?? PHASE2_SOURCE.EST);
  const [facilityBranch, setFacilityBranch] = useState(savedValues.facilityBranch ?? "owned-dc");
  const [ownedFacilityBurdenPerKwMonth, setOwnedFacilityBurdenPerKwMonth] = useState(savedValues.ownedFacilityBurdenPerKwMonth ?? "");
  const [coloMonthlyBundle, setColoMonthlyBundle] = useState(savedValues.coloMonthlyBundle ?? "");
  const [coloBundleIncludesPower, setColoBundleIncludesPower] = useState(savedValues.coloBundleIncludesPower ?? false);
  const [facilityCostSource, setFacilityCostSource] = useState(savedValues.facilityCostSource ?? PHASE2_SOURCE.CUSTOMER);
  const [coolingType, setCoolingType] = useState(savedValues.coolingType ?? "air-containment");
  const [availableKwPerRack, setAvailableKwPerRack] = useState(savedValues.availableKwPerRack ?? "");
  const [totalFacilityKwAvailable, setTotalFacilityKwAvailable] = useState(savedValues.totalFacilityKwAvailable ?? "");
  const [rackPositionsAvailable, setRackPositionsAvailable] = useState(savedValues.rackPositionsAvailable ?? "");
  const [acceptance, setAcceptance] = useState(null);

  const persistedInputs = useMemo(() => ({
    useAcceptedStorage,
    useAcceptedNetwork,
    systemName,
    systemCount,
    avgKwPerSystem,
    designKwPerSystem,
    systemsPerRack,
    storagePb,
    provisionalNetworkKw,
    managementHeadNodeKw,
    networkRacks,
    pue,
    utilityRatePerKwh,
    utilityRateSource,
    facilityBranch,
    ownedFacilityBurdenPerKwMonth,
    coloMonthlyBundle,
    coloBundleIncludesPower,
    facilityCostSource,
    coolingType,
    availableKwPerRack,
    totalFacilityKwAvailable,
    rackPositionsAvailable,
  }), [useAcceptedStorage, useAcceptedNetwork, systemName, systemCount, avgKwPerSystem, designKwPerSystem, systemsPerRack, storagePb, provisionalNetworkKw, managementHeadNodeKw, networkRacks, pue, utilityRatePerKwh, utilityRateSource, facilityBranch, ownedFacilityBurdenPerKwMonth, coloMonthlyBundle, coloBundleIncludesPower, facilityCostSource, coolingType, availableKwPerRack, totalFacilityKwAvailable, rackPositionsAvailable]);

  useEffect(() => {
    saveSessionState("phase2-power-inputs", { values: persistedInputs, acceptedInputs });
  }, [persistedInputs, acceptedInputs]);

  const storageRequirement = useAcceptedStorage ? acceptedStorage?.requirements : null;
  const networkRequirement = useAcceptedNetwork ? acceptedNetwork?.requirements : null;
  const currentStorageFingerprint = useAcceptedStorage ? acceptedStorage?.fingerprint || null : null;
  const currentNetworkFingerprint = useAcceptedNetwork ? acceptedNetwork?.fingerprint || null : null;
  const priorStorageFingerprint = savedPower?.requirements?.upstreamStorageFingerprint || null;
  const priorNetworkFingerprint = savedPower?.requirements?.upstreamNetworkFingerprint || null;
  const powerStaleFromStorage = Boolean(savedPower && !savedPower?.requirements?.stale && currentStorageFingerprint && priorStorageFingerprint !== currentStorageFingerprint);
  const powerStaleFromNetwork = Boolean(savedPower && !savedPower?.requirements?.stale && currentNetworkFingerprint && priorNetworkFingerprint !== currentNetworkFingerprint);

  useEffect(() => {
    if ((!powerStaleFromStorage && !powerStaleFromNetwork) || !savedPower) return;
    const reasons = [];
    if (powerStaleFromStorage) reasons.push("Accepted Storage requirement changed after this Power result was staged.");
    if (powerStaleFromNetwork) reasons.push("Accepted Fabric requirement changed after this Power result was staged.");
    const staleReason = reasons.join(" ");
    const next = {
      ...savedPower,
      overrides: (savedPower.overrides || []).map((override) => override?.state === PHASE2_STATE.REVERTED
        ? override
        : { ...override, state: PHASE2_STATE.STALE, staleReason }),
      requirements: { ...savedPower.requirements, stale: true, staleReason, currentUpstreamStorageFingerprint: currentStorageFingerprint, currentUpstreamNetworkFingerprint: currentNetworkFingerprint },
    };
    saveSessionState("phase2-power-writeback", next);
    setSavedPower(next);
  }, [powerStaleFromStorage, powerStaleFromNetwork, currentStorageFingerprint, currentNetworkFingerprint]);

  function clearAcceptance() { setAcceptance(null); }
  function chooseSystem(name) {
    const next = POWER_PLANNER_SYSTEM_PROFILES[name];
    setSystemName(name); setAvgKwPerSystem(next.avgKwPerSystem); setDesignKwPerSystem(next.designKwPerSystem); setSystemsPerRack(next.systemsPerRack);
    if (next.coolingCapability === "liquid-only") setCoolingType("direct-liquid");
    clearAcceptance();
  }
  function chooseFacilityBranch(branch) {
    setFacilityBranch(branch);
    setFacilityCostSource(branch === "colocation" ? PHASE2_SOURCE.QUOTE : PHASE2_SOURCE.CUSTOMER);
    clearAcceptance();
  }

  const effectiveStoragePb = storageRequirement ? storageRequirement.totalRawTb / 1000 : storagePb;
  const effectiveStoragePowerKw = storageRequirement ? storageRequirement.storagePowerKw : null;
  const effectiveStorageRacks = storageRequirement ? storageRequirement.storageRacks : (storagePb > 0 ? Math.ceil(storagePb) : 0);
  const acceptedFabricSwitchKw = networkRequirement ? Number(networkRequirement.switchPowerKw || 0) : null;
  const result = useMemo(() => calculatePowerPlanner({
    systemCount, avgKwPerSystem, designKwPerSystem, systemsPerRack,
    storagePb: effectiveStoragePb, storagePowerKw: effectiveStoragePowerKw, storageKwPerPb: 10, storageRacks: effectiveStorageRacks,
    provisionalNetworkKw, fabricSwitchPowerKw: networkRequirement ? acceptedFabricSwitchKw : null,
    managementHeadNodeKw: networkRequirement ? managementHeadNodeKw : null, networkRacks,
    pue, utilityRatePerKwh, facilityBranch, ownedFacilityBurdenPerKwMonth, coloMonthlyBundle, coloBundleIncludesPower,
    coolingType, coolingCapability: profile.coolingCapability, availableKwPerRack, totalFacilityKwAvailable, rackPositionsAvailable,
  }), [systemCount, avgKwPerSystem, designKwPerSystem, systemsPerRack, effectiveStoragePb, effectiveStoragePowerKw, effectiveStorageRacks, provisionalNetworkKw, networkRequirement, acceptedFabricSwitchKw, managementHeadNodeKw, networkRacks, pue, utilityRatePerKwh, facilityBranch, ownedFacilityBurdenPerKwMonth, coloMonthlyBundle, coloBundleIncludesPower, coolingType, profile.coolingCapability, availableKwPerRack, totalFacilityKwAvailable, rackPositionsAvailable]);
  const validation = useMemo(() => validatePowerPlannerInputs(result), [result]);
  const acceptedMatchesDisplayed = sameInputs(persistedInputs, acceptedInputs);

  function stageForTco() {
    try {
      if (useAcceptedStorage && storageDependencyStale) throw new Error("Cannot accept Power while the upstream Storage requirement is stale. Recompute and accept Storage first.");
      if (useAcceptedNetwork && networkDependencyStale) throw new Error("Cannot accept Power while the upstream Fabric requirement is stale. Recompute and accept Fabric first.");
      if (useAcceptedNetwork && networkEngineeringReview) throw new Error("Cannot accept Power from an engineering-review Fabric result. Resolve Fabric topology first or disable the Fabric dependency and enter a provisional network allowance.");
      const upstreamStorage = useAcceptedStorage && acceptedStorage ? { fingerprint: acceptedStorage.fingerprint, acceptedAt: acceptedStorage.acceptedAt } : null;
      const upstreamNetwork = useAcceptedNetwork && acceptedNetwork ? { fingerprint: acceptedNetwork.fingerprint, acceptedAt: acceptedNetwork.acceptedAt } : null;
      const bundle = buildPowerPlannerWritebackBundle(result, { systemName, upstreamStorage, upstreamNetwork, utilityRateSource, facilityCostSource });
      saveSessionState("phase2-power-writeback", bundle);
      setSavedPower(bundle);
      setAcceptedInputs(persistedInputs);
      setAcceptance({ ok: true, costResolved: bundle.costResolved, energyIncludedInFacilityBundle: bundle.energyIncludedInFacilityBundle, utilityRateSource: bundle.utilityRateSource, facilityCostSource: bundle.facilityCostSource });
    } catch (error) { setAcceptance({ ok: false, message: error.message }); }
  }

  return <div style={{ background: "#f5f5f5", minHeight: "100vh", padding: "24px 16px 56px", fontFamily: "Arial, Helvetica, sans-serif" }}><main style={{ width: "min(1180px, 100%)", margin: "0 auto" }}>
    <div style={{ background: "#111", color: "#fff", borderLeft: "6px solid #c8102e", padding: 14, marginBottom: 20 }}><strong>Phase 2 · Storage + Fabric → Power dependency.</strong> Accepted Fabric contributes switch power only; management/control-plane/head-node power and network rack footprint remain explicit separate inputs.</div>
    <h1 style={{ margin: "0 0 8px", fontSize: "clamp(30px, 5vw, 48px)" }}>Power, cooling and rack planner</h1>
    <p style={{ margin: "0 0 10px", color: "#555", fontSize: 17, lineHeight: 1.55 }}>Design power drives capacity checks. Energy-planning power drives energy. Heat rejection tracks IT load rather than PUE-loaded facility demand.</p>
    <p style={{ margin: "0 0 24px", color: "#666", lineHeight: 1.5 }}><strong>{profile.energyBasis}.</strong> Source: {profile.evidenceSource} · reviewed {profile.reviewedAt}. {profile.notes}</p>

    {savedPower && <section style={{ ...card, marginBottom: 18, borderLeft: `6px solid ${acceptedMatchesDisplayed ? "#176b31" : "#b7791f"}`, background: acceptedMatchesDisplayed ? "#eaf7ee" : "#fff7e8" }}><strong>{acceptedMatchesDisplayed ? "Displayed inputs match the accepted Power requirement." : "Displayed inputs differ from the accepted Power requirement."}</strong><p style={{ marginBottom: 0, color: "#555" }}>{acceptedMatchesDisplayed ? "Navigation or refresh restored the accepted Power scenario inputs." : "Review the restored inputs and accept Power again before relying on the displayed scenario downstream."}</p></section>}

    {acceptedStorage?.requirements && <section style={{ ...card, marginBottom: 18, borderLeft: storageDependencyStale ? "6px solid #b7791f" : "6px solid #176b31", background: storageDependencyStale ? "#fff7e8" : "#fff" }}><h2 style={{ marginTop: 0 }}>{storageDependencyStale ? "STALE Storage dependency" : "Accepted Storage dependency"}</h2><div>{Math.round(acceptedStorage.requirements.totalRawTb).toLocaleString()} TB raw · {acceptedStorage.requirements.storageRacks} racks · {kw(acceptedStorage.requirements.storagePowerKw)} · {Number(acceptedStorage.requirements.aggregateGBps ?? acceptedStorage.requirements.aggregateGbps ?? 0).toFixed(1)} GB/s</div>{storageDependencyStale && <p style={{ color: "#7a5600", fontWeight: 700 }}>Recompute and accept Storage before using it in Power.</p>}<label><input type="checkbox" disabled={storageDependencyStale} checked={useAcceptedStorage} onChange={(e) => { setUseAcceptedStorage(e.target.checked); clearAcceptance(); }} /> Use accepted Storage requirement</label></section>}
    {acceptedNetwork?.requirements && <section style={{ ...card, marginBottom: 18, borderLeft: networkDependencyStale || networkEngineeringReview ? "6px solid #b7791f" : "6px solid #176b31", background: networkDependencyStale || networkEngineeringReview ? "#fff7e8" : "#fff" }}><h2 style={{ marginTop: 0 }}>{networkDependencyStale ? "STALE Fabric dependency" : networkEngineeringReview ? "Fabric requires engineering review" : "Accepted Fabric dependency"}</h2><div>{acceptedNetwork.requirements.technology} · {acceptedNetwork.requirements.switches?.total ?? "—"} switches · {kw(acceptedNetwork.requirements.switchPowerKw)} switch power · CAPEX {money(acceptedNetwork.requirements.capitalCostCurrentFleet)}</div>{networkDependencyStale && <p style={{ color: "#7a5600", fontWeight: 700 }}>Recompute and accept Fabric before using it in Power.</p>}{networkEngineeringReview && <p style={{ color: "#7a5600", fontWeight: 700 }}>This Fabric result is a lower-bound planning result because the modeled topology needs engineering resolution. Its switch power is not accepted into Power.</p>}<label><input type="checkbox" disabled={networkDependencyStale || networkEngineeringReview} checked={useAcceptedNetwork} onChange={(e) => { setUseAcceptedNetwork(e.target.checked); clearAcceptance(); }} /> Use accepted Fabric switch power</label></section>}
    {(powerStaleFromStorage || powerStaleFromNetwork || savedPower?.requirements?.stale) && <section style={{ ...card, marginBottom: 18, background: "#fff7e8" }}><strong>STALE · accepted Power inputs changed</strong><p>Recompute Power before client use or downstream write-back.</p></section>}

    <section style={{ ...card, marginBottom: 18 }}><h2 style={{ marginTop: 0 }}>1. Fleet and site inputs</h2><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
      <label style={field}><span style={label}>System</span><select style={input} value={systemName} onChange={(e) => chooseSystem(e.target.value)}>{Object.keys(POWER_PLANNER_SYSTEM_PROFILES).map((name) => <option key={name}>{name}</option>)}</select></label>
      <label style={field}><span style={label}>Systems</span><input style={input} type="number" min="1" value={systemCount} onChange={(e) => { setSystemCount(Number(e.target.value)); clearAcceptance(); }} /></label>
      <label style={field}><span style={label}>Energy-planning kW / system</span><input style={input} type="number" step="0.1" value={avgKwPerSystem} onChange={(e) => { setAvgKwPerSystem(Number(e.target.value)); clearAcceptance(); }} /></label>
      <label style={field}><span style={label}>Design / max kW / system</span><input style={input} type="number" step="0.1" value={designKwPerSystem} onChange={(e) => { setDesignKwPerSystem(Number(e.target.value)); clearAcceptance(); }} /></label>
      <label style={field}><span style={label}>Systems / rack</span><input style={input} type="number" min="1" value={systemsPerRack} onChange={(e) => { setSystemsPerRack(Number(e.target.value)); clearAcceptance(); }} /></label>
      {!networkRequirement && <label style={field}><span style={label}>Provisional network + head-node kW</span><input style={input} type="number" min="0" step="0.1" value={provisionalNetworkKw} onChange={(e) => { setProvisionalNetworkKw(Number(e.target.value)); clearAcceptance(); }} /></label>}
      {networkRequirement && <><label style={field}><span style={label}>Accepted Fabric switch power</span><input style={input} value={acceptedFabricSwitchKw ?? 0} disabled /></label><label style={field}><span style={label}>Management + head-node kW</span><input style={input} type="number" min="0" step="0.1" placeholder="Enter explicit allowance" value={managementHeadNodeKw} onChange={(e) => { setManagementHeadNodeKw(e.target.value === "" ? "" : Number(e.target.value)); clearAcceptance(); }} /></label></>}
      <label style={field}><span style={label}>Network / fabric rack positions</span><input style={input} type="number" min="0" step="1" placeholder="Enter planned rack footprint" value={networkRacks} onChange={(e) => { setNetworkRacks(e.target.value === "" ? "" : Number(e.target.value)); clearAcceptance(); }} /></label>
      <label style={field}><span style={label}>PUE</span><input style={input} type="number" step="0.01" value={pue} onChange={(e) => { setPue(Number(e.target.value)); clearAcceptance(); }} /></label>
      <label style={field}><span style={label}>Utility rate ($/kWh)</span><input style={input} type="number" step="0.01" value={utilityRatePerKwh} onChange={(e) => { setUtilityRatePerKwh(Number(e.target.value)); clearAcceptance(); }} /></label>
      <label style={field}><span style={label}>Utility-rate source</span><select style={input} value={utilityRateSource} onChange={(e) => { setUtilityRateSource(e.target.value); clearAcceptance(); }}>{sourceOptions()}</select></label>
      <label style={field}><span style={label}>Cooling type</span><select style={input} value={coolingType} onChange={(e) => { setCoolingType(e.target.value); clearAcceptance(); }}><option value="air-standard">Air · standard CRAC</option><option value="air-containment">Air · containment</option><option value="rear-door">Rear-door heat exchanger</option><option value="direct-liquid">Direct liquid</option><option value="immersion">Immersion</option></select></label>
      <label style={field}><span style={label}>Available kW / rack</span><input style={input} value={availableKwPerRack} placeholder="Enter if known" onChange={(e) => { setAvailableKwPerRack(e.target.value === "" ? "" : Number(e.target.value)); clearAcceptance(); }} /></label>
      <label style={field}><span style={label}>Total facility kW available</span><input style={input} value={totalFacilityKwAvailable} placeholder="Enter if known" onChange={(e) => { setTotalFacilityKwAvailable(e.target.value === "" ? "" : Number(e.target.value)); clearAcceptance(); }} /></label>
      <label style={field}><span style={label}>Rack positions available</span><input style={input} value={rackPositionsAvailable} placeholder="Enter if known" onChange={(e) => { setRackPositionsAvailable(e.target.value === "" ? "" : Number(e.target.value)); clearAcceptance(); }} /></label>
    </div>{networkRequirement && <p style={{ background: "#fff7e8", padding: 12 }}><strong>Dependency caution:</strong> Fabric supplies switch power and switch count, but not a validated rack layout. Enter the planned network/fabric rack positions explicitly; management/control-plane/head-node power also remains separate.</p>}</section>

    <section style={{ ...card, marginBottom: 18 }}><h2 style={{ marginTop: 0 }}>2. Facility economics and provenance</h2><label><input type="radio" checked={facilityBranch === "owned-dc"} onChange={() => chooseFacilityBranch("owned-dc")} /> Owned datacenter</label> <label><input type="radio" checked={facilityBranch === "colocation"} onChange={() => chooseFacilityBranch("colocation")} /> Colocation</label><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, marginTop: 12 }}>{facilityBranch === "owned-dc" ? <label style={field}><span style={label}>Facility burden ($/design kW-month)</span><input style={input} placeholder="Enter customer-supported value" value={ownedFacilityBurdenPerKwMonth} onChange={(e) => { setOwnedFacilityBurdenPerKwMonth(e.target.value === "" ? "" : Number(e.target.value)); clearAcceptance(); }} /></label> : <label style={field}><span style={label}>Colocation monthly bundle</span><input style={input} placeholder="Enter customer/partner bundle" value={coloMonthlyBundle} onChange={(e) => { setColoMonthlyBundle(e.target.value === "" ? "" : Number(e.target.value)); clearAcceptance(); }} /></label>}<label style={field}><span style={label}>Facility-cost source</span><select style={input} value={facilityCostSource} onChange={(e) => { setFacilityCostSource(e.target.value); clearAcceptance(); }}>{sourceOptions()}</select></label></div>{facilityBranch === "colocation" && <label style={{ display: "flex", gap: 8, alignItems: "flex-start", lineHeight: 1.45, marginTop: 12 }}><input type="checkbox" checked={coloBundleIncludesPower} onChange={(e) => { setColoBundleIncludesPower(e.target.checked); clearAcceptance(); }} /><span><strong>Colocation bundle includes electricity</strong><br /><span style={{ color: "#666" }}>When selected, the utility-energy estimate remains visible for consumption planning but is not written to TCO separately.</span></span></label>}<p>No default facility burden is invented; unresolved facility cost stays out of TCO. Source selections flow into writeback provenance and the dependency fingerprint, so changing provenance requires recompute/accept.</p></section>

    <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12, marginBottom: 18 }}><div style={card}><div style={label}>Verdict</div><strong>{result.verdict.toUpperCase()}</strong></div><div style={card}><div style={label}>Racks</div><strong>{result.racks.total ?? "Unresolved"}</strong><div style={{ color: "#666" }}>{result.racks.compute} compute · {result.racks.storage} storage · {result.racks.network ?? "?"} network</div></div><div style={card}><div style={label}>Network + management</div><strong>{kw(result.networkPower.totalKw)}</strong><div>{result.networkPower.basis}</div></div><div style={card}><div style={label}>Design IT</div><strong>{kw(result.power.designItKw)}</strong></div><div style={card}><div style={label}>Facility demand</div><strong>{kw(result.power.facilityDesignKw)}</strong></div><div style={card}><div style={label}>Monthly energy estimate</div><strong>{money(result.economics.monthlyEnergyCost)}</strong><div style={{ color: "#666" }}>{result.economics.energyIncludedInFacilityBundle ? "Included in colo bundle · no separate TCO write-back" : `${utilityRateSource} utility-rate source`}</div></div><div style={card}><div style={label}>Facility burden / bundle</div><strong>{money(result.economics.monthlyFacilityBurden)}</strong><div style={{ color: "#666" }}>{result.economics.facilityCostResolved ? `${facilityCostSource} facility-cost source` : "Unresolved"}</div></div><div style={card}><div style={label}>Combined monthly facility cost</div><strong>{money(result.economics.monthlyFacilityTotal)}</strong></div></section>

    <section style={{ ...card, marginBottom: 18 }}><h2 style={{ marginTop: 0 }}>3. Flags and methodology</h2>{result.flags.length ? <ul>{result.flags.map((x) => <li key={x}>{x}</li>)}</ul> : <p>No planning flags.</p>}</section>
    <section style={{ ...card, borderLeft: "6px solid #c8102e" }}><h2 style={{ marginTop: 0 }}>4. Recompute and accept Power</h2>{!validation.valid && <ul>{validation.errors.map((x) => <li key={x}>{x}</li>)}</ul>}{validation.warnings.length > 0 && <ul style={{ color: "#7a5600" }}>{validation.warnings.map((x) => <li key={x}>{x}</li>)}</ul>}<button type="button" style={{ ...primaryButton, opacity: validation.valid ? 1 : .45 }} disabled={!validation.valid} onClick={stageForTco}>Recompute, accept, and stage for TCO</button>{acceptance?.ok && <p>Power accepted. Utility provenance: <strong>{acceptance.utilityRateSource}</strong>. {acceptance.costResolved ? <>Facility provenance: <strong>{acceptance.facilityCostSource}</strong>. </> : "Facility economics remain unresolved. "}{acceptance.energyIncludedInFacilityBundle ? "Colocation electricity is included in the bundle, so no separate utility-energy TCO line was staged." : "Facility burden is included only when resolved."}</p>}{acceptance && !acceptance.ok && <p style={{ color: "#9b1c31" }}>{acceptance.message}</p>}</section>
  </main></div>;
}
