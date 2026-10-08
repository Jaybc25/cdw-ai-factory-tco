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

function money(v) {
  return `$${Math.round(Number(v || 0)).toLocaleString()}`;
}

function kw(v) {
  return `${Number(v || 0).toFixed(1)} kW`;
}

export default function PowerPlannerPreview() {
  const acceptedStorage = useMemo(() => loadSessionState("phase2-storage-requirement"), []);
  const [savedPower, setSavedPower] = useState(() => loadSessionState("phase2-power-writeback"));
  const [useAcceptedStorage, setUseAcceptedStorage] = useState(Boolean(acceptedStorage?.requirements));

  const [systemName, setSystemName] = useState("DGX B200");
  const profile = POWER_PLANNER_SYSTEM_PROFILES[systemName];
  const [systemCount, setSystemCount] = useState(8);
  const [avgKwPerSystem, setAvgKwPerSystem] = useState(profile.avgKwPerSystem);
  const [designKwPerSystem, setDesignKwPerSystem] = useState(profile.designKwPerSystem);
  const [systemsPerRack, setSystemsPerRack] = useState(profile.systemsPerRack);
  const [storagePb, setStoragePb] = useState(1);
  const [provisionalNetworkKw, setProvisionalNetworkKw] = useState(12);
  const [pue, setPue] = useState(1.35);
  const [utilityRatePerKwh, setUtilityRatePerKwh] = useState(0.11);
  const [facilityBranch, setFacilityBranch] = useState("owned-dc");
  const [ownedFacilityBurdenPerKwMonth, setOwnedFacilityBurdenPerKwMonth] = useState(200);
  const [coloMonthlyBundle, setColoMonthlyBundle] = useState(0);
  const [coolingType, setCoolingType] = useState("air-containment");
  const [availableKwPerRack, setAvailableKwPerRack] = useState(40);
  const [totalFacilityKwAvailable, setTotalFacilityKwAvailable] = useState(400);
  const [rackPositionsAvailable, setRackPositionsAvailable] = useState(20);
  const [acceptance, setAcceptance] = useState(null);

  const storageRequirement = useAcceptedStorage ? acceptedStorage?.requirements : null;
  const currentStorageFingerprint = useAcceptedStorage ? acceptedStorage?.fingerprint || null : null;
  const priorStorageFingerprint = savedPower?.requirements?.upstreamStorageFingerprint || null;
  const powerStaleFromStorage = Boolean(
    savedPower && currentStorageFingerprint && priorStorageFingerprint !== currentStorageFingerprint,
  );

  useEffect(() => {
    if (!powerStaleFromStorage || !savedPower) return;
    const staleReason = "Accepted Storage requirement changed after this Power result was staged.";
    const next = {
      ...savedPower,
      overrides: (savedPower.overrides || []).map((override) => ({
        ...override,
        state: PHASE2_STATE.STALE,
        staleReason,
      })),
      requirements: {
        ...savedPower.requirements,
        stale: true,
        staleReason,
        currentUpstreamStorageFingerprint: currentStorageFingerprint,
      },
    };
    saveSessionState("phase2-power-writeback", next);
    setSavedPower(next);
  }, [powerStaleFromStorage, currentStorageFingerprint]);

  function clearAcceptance() {
    setAcceptance(null);
  }

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
    networkRacks: provisionalNetworkKw > 0 ? 1 : 0,
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
  }), [systemCount, avgKwPerSystem, designKwPerSystem, systemsPerRack, effectiveStoragePb, effectiveStoragePowerKw, effectiveStorageRacks, provisionalNetworkKw, pue, utilityRatePerKwh, facilityBranch, ownedFacilityBurdenPerKwMonth, coloMonthlyBundle, coolingType, profile.coolingCapability, availableKwPerRack, totalFacilityKwAvailable, rackPositionsAvailable]);

  const validation = useMemo(() => validatePowerPlannerInputs(result), [result]);

  function stageForTco() {
    try {
      const upstreamStorage = useAcceptedStorage && acceptedStorage
        ? { fingerprint: acceptedStorage.fingerprint, acceptedAt: acceptedStorage.acceptedAt }
        : null;
      const bundle = buildPowerPlannerWritebackBundle(result, { systemName, upstreamStorage });
      saveSessionState("phase2-power-writeback", bundle);
      saveSessionState("phase2-preview-override", { override: bundle.overrides[0], source: "power-planner" });
      setSavedPower(bundle);
      setAcceptance({ ok: true, warnings: bundle.validation.warnings, stagedAt: new Date().toISOString() });
    } catch (error) {
      setAcceptance({ ok: false, message: error.message });
    }
  }

  return (
    <div style={{ background: "#f5f5f5", minHeight: "100vh", padding: "24px 16px 56px", fontFamily: "Arial, Helvetica, sans-serif" }}>
      <main style={{ width: "min(1180px, 100%)", margin: "0 auto" }}>
        <div style={{ background: "#111", color: "#fff", borderLeft: "6px solid #c8102e", padding: 14, marginBottom: 20 }}>
          <strong>Phase 2 · Storage → Power dependency.</strong> Accepted Storage requirements can now replace Power's provisional storage inputs. Existing Power results become STALE when Storage changes.
        </div>

        <h1 style={{ margin: "0 0 8px", fontSize: "clamp(30px, 5vw, 48px)" }}>Power, cooling and rack planner</h1>
        <p style={{ margin: "0 0 24px", color: "#555", fontSize: 17, lineHeight: 1.55, maxWidth: 900 }}>
          Separate facility feasibility from energy economics. Design power drives capacity checks. Average power drives monthly energy. Heat rejection tracks IT load, not IT load multiplied by PUE.
        </p>

        {acceptedStorage?.requirements && (
          <section style={{ ...card, marginBottom: 18, borderLeft: "6px solid #176b31" }}>
            <div style={{ ...label, color: "#176b31" }}>Accepted upstream dependency</div>
            <h2 style={{ margin: "6px 0 10px" }}>Storage Sizer requirement available</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              <div><strong>Raw capacity</strong><br />{Math.round(acceptedStorage.requirements.totalRawTb).toLocaleString()} TB</div>
              <div><strong>Storage racks</strong><br />{acceptedStorage.requirements.storageRacks}</div>
              <div><strong>Storage power</strong><br />{acceptedStorage.requirements.storagePowerKw.toFixed(1)} kW</div>
              <div><strong>Fabric bandwidth</strong><br />{acceptedStorage.requirements.aggregateGbps.toFixed(1)} GB/s</div>
            </div>
            <label style={{ display: "block", marginTop: 12 }}>
              <input type="checkbox" checked={useAcceptedStorage} onChange={(e) => { setUseAcceptedStorage(e.target.checked); clearAcceptance(); }} /> Use this accepted Storage requirement in Power
            </label>
            <div style={{ marginTop: 8, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12 }}>Storage fingerprint: {acceptedStorage.fingerprint}</div>
          </section>
        )}

        {powerStaleFromStorage && (
          <section style={{ ...card, marginBottom: 18, background: "#fff7e8", borderColor: "#e4c679" }}>
            <div style={{ fontWeight: 900, color: "#7a5600" }}>STALE · upstream Storage changed</div>
            <p style={{ marginBottom: 0, lineHeight: 1.5 }}>The previously staged Power result was calculated from a different accepted Storage requirement. It remains visible for auditability but is no longer write-back eligible until you explicitly recompute and accept Power again.</p>
          </section>
        )}

        <section style={{ ...card, marginBottom: 18 }}>
          <h2 style={{ marginTop: 0 }}>1. Fleet and site inputs</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            <label style={field}><span style={label}>System</span><select style={input} value={systemName} onChange={(e) => chooseSystem(e.target.value)}>{Object.keys(POWER_PLANNER_SYSTEM_PROFILES).map((name) => <option key={name}>{name}</option>)}</select></label>
            <label style={field}><span style={label}>Systems</span><input style={input} type="number" min="1" value={systemCount} onChange={(e) => { setSystemCount(Number(e.target.value)); clearAcceptance(); }} /></label>
            <label style={field}><span style={label}>Average kW / system</span><input style={input} type="number" step="0.1" min="0" value={avgKwPerSystem} onChange={(e) => { setAvgKwPerSystem(Number(e.target.value)); clearAcceptance(); }} /></label>
            <label style={field}><span style={label}>Design / max kW / system</span><input style={input} type="number" step="0.1" min="0" value={designKwPerSystem} onChange={(e) => { setDesignKwPerSystem(Number(e.target.value)); clearAcceptance(); }} /></label>
            <label style={field}><span style={label}>Systems / rack</span><input style={input} type="number" step="1" min="1" value={systemsPerRack} onChange={(e) => { setSystemsPerRack(Number(e.target.value)); clearAcceptance(); }} /></label>
            <label style={field}><span style={label}>{storageRequirement ? "Storage PB (from accepted Storage)" : "Storage PB"}</span><input style={input} type="number" step="0.1" min="0" value={Number(effectiveStoragePb.toFixed(3))} disabled={Boolean(storageRequirement)} onChange={(e) => { setStoragePb(Number(e.target.value)); clearAcceptance(); }} /></label>
            <label style={field}><span style={label}>Provisional network + head-node kW</span><input style={input} type="number" step="1" min="0" value={provisionalNetworkKw} onChange={(e) => { setProvisionalNetworkKw(Number(e.target.value)); clearAcceptance(); }} /></label>
            <label style={field}><span style={label}>PUE</span><input style={input} type="number" step="0.01" min="1" value={pue} onChange={(e) => { setPue(Number(e.target.value)); clearAcceptance(); }} /></label>
            <label style={field}><span style={label}>Utility rate ($/kWh)</span><input style={input} type="number" step="0.01" min="0" value={utilityRatePerKwh} onChange={(e) => { setUtilityRatePerKwh(Number(e.target.value)); clearAcceptance(); }} /></label>
            <label style={field}><span style={label}>Cooling type</span><select style={input} value={coolingType} onChange={(e) => { setCoolingType(e.target.value); clearAcceptance(); }}><option value="air-standard">Air · standard CRAC</option><option value="air-containment">Air · containment</option><option value="rear-door">Rear-door heat exchanger</option><option value="direct-liquid">Direct liquid</option><option value="immersion">Immersion</option></select></label>
            <label style={field}><span style={label}>Available kW / rack</span><input style={input} type="number" min="0" value={availableKwPerRack} onChange={(e) => { setAvailableKwPerRack(e.target.value === "" ? "" : Number(e.target.value)); clearAcceptance(); }} /></label>
            <label style={field}><span style={label}>Total facility kW available</span><input style={input} type="number" min="0" value={totalFacilityKwAvailable} onChange={(e) => { setTotalFacilityKwAvailable(e.target.value === "" ? "" : Number(e.target.value)); clearAcceptance(); }} /></label>
            <label style={field}><span style={label}>Rack positions available</span><input style={input} type="number" min="0" value={rackPositionsAvailable} onChange={(e) => { setRackPositionsAvailable(e.target.value === "" ? "" : Number(e.target.value)); clearAcceptance(); }} /></label>
          </div>
          <div style={{ marginTop: 14, padding: 12, borderRadius: 8, background: "#fff7e8", border: "1px solid #edd7a7", lineHeight: 1.5 }}>
            <strong>Design-power caution:</strong> {profile.notes}
          </div>
        </section>

        <section style={{ ...card, marginBottom: 18 }}>
          <h2 style={{ marginTop: 0 }}>2. Facility economics branch</h2>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
            <label><input type="radio" checked={facilityBranch === "owned-dc"} onChange={() => { setFacilityBranch("owned-dc"); clearAcceptance(); }} /> Owned datacenter</label>
            <label><input type="radio" checked={facilityBranch === "colocation"} onChange={() => { setFacilityBranch("colocation"); clearAcceptance(); }} /> Colocation</label>
          </div>
          {facilityBranch === "owned-dc" ? (
            <label style={{ ...field, maxWidth: 340 }}><span style={label}>Facility burden ($/design kW-month)</span><input style={input} type="number" min="0" value={ownedFacilityBurdenPerKwMonth} onChange={(e) => { setOwnedFacilityBurdenPerKwMonth(Number(e.target.value)); clearAcceptance(); }} /></label>
          ) : (
            <label style={{ ...field, maxWidth: 340 }}><span style={label}>Colocation monthly bundle</span><input style={input} type="number" min="0" value={coloMonthlyBundle} onChange={(e) => { setColoMonthlyBundle(Number(e.target.value)); clearAcceptance(); }} /></label>
          )}
          <p style={{ color: "#666", lineHeight: 1.5, marginBottom: 0 }}>Energy expense is always shown separately from facility burden. A utility bill never replaces a fully loaded facility-cost assumption.</p>
        </section>

        <section style={{ marginBottom: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}>
            <div style={card}><div style={label}>Verdict</div><div style={{ fontSize: 26, fontWeight: 900, marginTop: 6 }}>{result.verdict.replaceAll("-", " ").toUpperCase()}</div></div>
            <div style={card}><div style={label}>Racks required</div><div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>{result.racks.total}</div><div style={{ color: "#666" }}>{result.racks.compute} compute · {result.racks.storage} storage · {result.racks.network} network</div></div>
            <div style={card}><div style={label}>Storage power in model</div><div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>{kw(result.power.storageKw)}</div><div style={{ color: "#666" }}>{storageRequirement ? "From accepted Storage" : "Provisional PB assumption"}</div></div>
            <div style={card}><div style={label}>Design IT load</div><div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>{kw(result.power.designItKw)}</div><div style={{ color: "#666" }}>{kw(result.power.computeRackDesignKw)} / compute rack</div></div>
            <div style={card}><div style={label}>Facility design demand</div><div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>{kw(result.power.facilityDesignKw)}</div><div style={{ color: "#666" }}>Includes PUE for electrical capacity</div></div>
            <div style={card}><div style={label}>Heat rejection</div><div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>{Math.round(result.cooling.heatBtuPerHour).toLocaleString()}</div><div style={{ color: "#666" }}>BTU/hr · {result.cooling.coolingTons.toFixed(1)} tons</div></div>
            <div style={card}><div style={label}>Monthly energy</div><div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>{money(result.economics.monthlyEnergyCost)}</div><div style={{ color: "#666" }}>{Math.round(result.economics.monthlyKwh).toLocaleString()} kWh</div></div>
            <div style={card}><div style={label}>Monthly facility burden</div><div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>{money(result.economics.monthlyFacilityBurden)}</div><div style={{ color: "#666" }}>{facilityBranch === "owned-dc" ? "Separate from energy" : "Colocation bundle"}</div></div>
          </div>
        </section>

        <section style={{ ...card, marginBottom: 18 }}>
          <h2 style={{ marginTop: 0 }}>3. Flags and methodology</h2>
          {result.flags.length ? <ul style={{ lineHeight: 1.6 }}>{result.flags.map((flag) => <li key={flag}>{flag}</li>)}</ul> : <p>No facility-fit flags for the stated inputs.</p>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, marginTop: 14 }}>
            {Object.entries(result.methodology).map(([k, v]) => <div key={k} style={{ ...card, background: "#fafafa" }}><strong>{k}</strong><div style={{ marginTop: 6, color: "#555", lineHeight: 1.45 }}>{v}</div></div>)}
          </div>
        </section>

        <section style={{ ...card, marginBottom: 18, borderLeft: "6px solid #c8102e" }}>
          <h2 style={{ marginTop: 0 }}>4. Recompute and accept Power</h2>
          <p style={{ color: "#555", lineHeight: 1.55 }}>This stages monthly energy and facility-burden overrides plus the physical facility requirements. If Storage changed, this explicit action is what clears the stale condition.</p>
          {!validation.valid && <ul style={{ color: "#9b1c31", lineHeight: 1.6 }}>{validation.errors.map((error) => <li key={error}>{error}</li>)}</ul>}
          {validation.warnings.length > 0 && <ul style={{ color: "#7a5600", lineHeight: 1.6 }}>{validation.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <button type="button" style={{ ...primaryButton, opacity: validation.valid ? 1 : .45 }} disabled={!validation.valid} onClick={stageForTco}>Recompute, accept, and stage for TCO</button>
            <a href="/__phase2/storage" style={{ fontWeight: 800, color: "#c8102e" }}>Adjust Storage</a>
            <a href="/__phase2/tco" style={{ fontWeight: 800, color: "#c8102e" }}>Open TCO receiving preview</a>
          </div>
          {acceptance?.ok && <div style={{ marginTop: 14, padding: 12, borderRadius: 8, background: "#eaf7ee", border: "1px solid #b8dec3" }}><strong>Current.</strong> Power has been re-accepted against the current Storage fingerprint and is eligible for the Phase 2 TCO preview.</div>}
          {acceptance && !acceptance.ok && <div style={{ marginTop: 14, padding: 12, borderRadius: 8, background: "#fff0f3", border: "1px solid #efc9cf", color: "#9b1c31" }}>{acceptance.message}</div>}
        </section>

        <section style={{ ...card, background: "#fff8f8", borderColor: "#efc9cf" }}>
          <h2 style={{ marginTop: 0 }}>Scope guard</h2>
          <p style={{ marginBottom: 0, lineHeight: 1.55 }}>Directional facility planning only. This is not an electrical design, one-line diagram, structural or floor-loading analysis, chilled-water design, or site assessment. The intended output is a defensible requirement and a trigger for CDW engineering engagement.</p>
        </section>
      </main>
    </div>
  );
}
