import React, { useEffect, useMemo, useState } from "react";
import {
  FABRIC_LINK_MEDIA,
  FABRIC_PORT_SOURCE,
  FABRIC_PRICE_SOURCE,
  FABRIC_SPEED,
  FABRIC_TECHNOLOGY,
  STORAGE_FABRIC_MODE,
  calculateNetworkFabric,
  validateNetworkFabricInputs,
} from "./networkFabricEngine.js";
import { buildNetworkFabricWritebackBundle } from "./networkFabricWriteback.js";
import { loadSessionState, saveSessionState } from "./sessionState.js";

const card = { border: "1px solid #ddd", borderRadius: 12, padding: 16, background: "#fff" };
const field = { display: "grid", gap: 6 };
const input = { padding: "10px 12px", border: "1px solid #bbb", borderRadius: 8, fontSize: 15, width: "100%", boxSizing: "border-box" };
const label = { fontSize: 12, fontWeight: 800, color: "#555", textTransform: "uppercase", letterSpacing: ".05em" };
const primaryButton = { border: 0, borderRadius: 8, padding: "11px 15px", fontWeight: 800, background: "#c8102e", color: "#fff", cursor: "pointer" };

function money(v) { return `$${Math.round(Number(v || 0)).toLocaleString()}`; }
function gbps(v) { return `${Math.round(Number(v || 0)).toLocaleString()} Gbps`; }
function storageAggregateGBps(requirements) { return Number(requirements?.aggregateGBps ?? requirements?.aggregateGbps ?? 0); }
function storageBandwidthGbps(requirements) { return storageAggregateGBps(requirements) * 8; }
function numericInputValue(raw) { return raw === "" ? "" : Number(raw); }
function sameInputs(a, b) { return Boolean(a && b && JSON.stringify(a) === JSON.stringify(b)); }

export default function NetworkFabricPreview() {
  const acceptedStorage = useMemo(() => loadSessionState("phase2-storage-writeback"), []);
  const savedInputState = useMemo(() => loadSessionState("phase2-network-inputs"), []);
  const savedValues = savedInputState?.values || {};
  const [acceptedBundle, setAcceptedBundle] = useState(() => loadSessionState("phase2-network-writeback"));
  const [acceptedInputs, setAcceptedInputs] = useState(savedInputState?.acceptedInputs || null);
  const storageReq = acceptedStorage?.requirements || null;
  const storageStale = Boolean(
    acceptedStorage?.stale ||
    acceptedStorage?.requirements?.stale ||
    (acceptedStorage?.overrides || []).some((override) => override?.state === "STALE")
  );
  const [acceptance, setAcceptance] = useState(null);

  const defaultStorageBandwidth = storageReq ? storageBandwidthGbps(storageReq) : 400;
  const defaultStoragePorts = storageReq ? Math.max(2, Math.ceil(defaultStorageBandwidth / FABRIC_SPEED.G400)) : 2;
  const [technology, setTechnology] = useState(savedValues.technology ?? FABRIC_TECHNOLOGY.INFINIBAND);
  const [linkGbps, setLinkGbps] = useState(savedValues.linkGbps ?? FABRIC_SPEED.G400);
  const [linkMedia, setLinkMedia] = useState(savedValues.linkMedia ?? FABRIC_LINK_MEDIA.OPTICAL);
  const [priceSource, setPriceSource] = useState(savedValues.priceSource ?? FABRIC_PRICE_SOURCE.EST);
  const [storageFabricMode, setStorageFabricMode] = useState(savedValues.storageFabricMode ?? STORAGE_FABRIC_MODE.SEPARATE);
  const [gpuSystems, setGpuSystems] = useState(savedValues.gpuSystems ?? 8);
  const [fabricPortsPerSystem, setFabricPortsPerSystem] = useState(savedValues.fabricPortsPerSystem ?? 8);
  const [fabricPortsPerSystemSource, setFabricPortsPerSystemSource] = useState(savedValues.fabricPortsPerSystemSource ?? FABRIC_PORT_SOURCE.EST);
  const [fabricPortsPerSystemNote, setFabricPortsPerSystemNote] = useState(savedValues.fabricPortsPerSystemNote ?? "");
  const [storageAggregateGbps, setStorageAggregateGbps] = useState(savedValues.storageAggregateGbps ?? defaultStorageBandwidth);
  const [storagePorts, setStoragePorts] = useState(savedValues.storagePorts ?? defaultStoragePorts);
  const [managementPorts, setManagementPorts] = useState(savedValues.managementPorts ?? 8);
  const [uplinkPorts, setUplinkPorts] = useState(savedValues.uplinkPorts ?? 2);
  const [switchRadix, setSwitchRadix] = useState(savedValues.switchRadix ?? 64);
  const [targetOversubscription, setTargetOversubscription] = useState(savedValues.targetOversubscription ?? 1);
  const [switchPowerKw, setSwitchPowerKw] = useState(savedValues.switchPowerKw ?? 1.5);
  const [switchCost, setSwitchCost] = useState(savedValues.switchCost ?? 0);
  const [cableCost, setCableCost] = useState(savedValues.cableCost ?? 0);
  const [transceiverCost, setTransceiverCost] = useState(savedValues.transceiverCost ?? 0);

  function clearAcceptance() { setAcceptance(null); }

  const inputs = useMemo(() => ({
    technology,
    linkGbps,
    linkMedia,
    priceSource,
    storageFabricMode,
    gpuSystems,
    fabricPortsPerSystem,
    fabricPortsPerSystemSource,
    fabricPortsPerSystemNote,
    storageAggregateGbps,
    storagePorts,
    managementPorts,
    uplinkPorts,
    switchRadix,
    targetOversubscription,
    switchPowerKw,
    switchCost,
    cableCost,
    transceiverCost,
  }), [technology, linkGbps, linkMedia, priceSource, storageFabricMode, gpuSystems, fabricPortsPerSystem, fabricPortsPerSystemSource, fabricPortsPerSystemNote, storageAggregateGbps, storagePorts, managementPorts, uplinkPorts, switchRadix, targetOversubscription, switchPowerKw, switchCost, cableCost, transceiverCost]);

  useEffect(() => {
    saveSessionState("phase2-network-inputs", { values: inputs, acceptedInputs });
  }, [inputs, acceptedInputs]);

  const result = useMemo(() => calculateNetworkFabric(inputs), [inputs]);
  const validation = useMemo(() => validateNetworkFabricInputs(inputs), [inputs]);
  const acceptedMatchesDisplayed = sameInputs(inputs, acceptedInputs);

  function pullStorage() {
    if (!storageReq || storageStale) return;
    const requiredGbps = storageBandwidthGbps(storageReq);
    setStorageAggregateGbps(requiredGbps);
    setStoragePorts(Math.max(1, Math.ceil(requiredGbps / Number(linkGbps || FABRIC_SPEED.G400))));
    clearAcceptance();
  }

  function stageFabric() {
    try {
      if (storageStale) throw new Error("Cannot accept Fabric while the upstream Storage requirement is stale. Recompute and accept Storage first.");
      const bundle = buildNetworkFabricWritebackBundle(result, inputs, {
        upstreamStorageFingerprint: acceptedStorage?.fingerprint || null,
      });
      saveSessionState("phase2-network-writeback", bundle);
      setAcceptedBundle(bundle);
      setAcceptedInputs(inputs);
      setAcceptance({
        ok: true,
        fingerprint: bundle.fingerprint,
        acceptedAt: bundle.acceptedAt,
        costResolved: bundle.costResolved,
        costStatus: bundle.costStatus,
        priceSource: bundle.priceSource,
      });
    } catch (error) {
      setAcceptance({ ok: false, message: error.message });
    }
  }

  return (
    <div style={{ background: "#f5f5f5", minHeight: "100vh", padding: "24px 16px 56px", fontFamily: "Arial, Helvetica, sans-serif" }}>
      <main style={{ width: "min(1180px, 100%)", margin: "0 auto" }}>
        <div style={{ background: "#111", color: "#fff", borderLeft: "6px solid #c8102e", padding: 14, marginBottom: 20 }}>
          <strong>Phase 2 · Wave 4B.</strong> Fabric requirements can now be explicitly staged for Power and TCO. No routing, QoS, congestion-control or implementation design is produced.
        </div>

        <h1 style={{ margin: "0 0 8px", fontSize: "clamp(30px, 5vw, 48px)" }}>Network fabric planner</h1>
        <p style={{ margin: "0 0 24px", color: "#555", fontSize: 17, lineHeight: 1.55, maxWidth: 920 }}>
          Size endpoint ports, switch count, leaf/spine topology, storage-facing bandwidth, inter-switch links, media, switch power, and a fleet-size-dependent capital-cost schedule without turning the planning tool into a deployable network design.
        </p>

        {acceptedBundle && <section style={{ ...card, marginBottom: 18, borderLeft: `6px solid ${acceptedMatchesDisplayed ? "#176b31" : "#b7791f"}`, background: acceptedMatchesDisplayed ? "#eaf7ee" : "#fff7e8" }}>
          <strong>{acceptedMatchesDisplayed ? "Displayed inputs match the accepted Fabric requirement." : "Displayed inputs differ from the accepted Fabric requirement."}</strong>
          <p style={{ marginBottom: 0, color: "#555" }}>{acceptedMatchesDisplayed ? "Navigation or refresh restored the accepted Fabric scenario inputs." : "Review the restored inputs and accept Fabric again before relying on the displayed scenario downstream."}</p>
        </section>}

        {storageReq && (
          <section style={{ ...card, marginBottom: 18, borderLeft: storageStale ? "6px solid #b7791f" : "6px solid #176b31", background: storageStale ? "#fff7e8" : "#fff" }}>
            <h2 style={{ margin: "0 0 8px" }}>{storageStale ? "STALE Storage dependency" : "Accepted Storage dependency available"}</h2>
            <p style={{ margin: "0 0 12px", color: "#555", lineHeight: 1.5 }}>Storage requires {storageAggregateGBps(storageReq).toFixed(1)} GB/s aggregate bandwidth ({gbps(storageBandwidthGbps(storageReq))}). Importing that requirement does not assume storage shares the compute fabric; choose that relationship explicitly below.</p>
            {storageStale && <p style={{ margin: "0 0 12px", color: "#7a5600", fontWeight: 700 }}>Recompute and accept Storage before using this dependency or accepting Fabric.</p>}
            <button type="button" disabled={storageStale} onClick={pullStorage} style={{ border: 0, borderRadius: 8, padding: "10px 14px", background: "#176b31", color: "#fff", fontWeight: 800, cursor: storageStale ? "not-allowed" : "pointer", opacity: storageStale ? .45 : 1 }}>Use accepted Storage bandwidth</button>
            <div style={{ marginTop: 8, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12 }}>Storage fingerprint: {acceptedStorage.fingerprint || "—"}</div>
          </section>
        )}

        <section style={{ ...card, marginBottom: 18 }}>
          <h2 style={{ marginTop: 0 }}>1. Fabric inputs</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14 }}>
            <label style={field}><span style={label}>Technology</span><select style={input} value={technology} onChange={(e) => { setTechnology(e.target.value); clearAcceptance(); }}><option value={FABRIC_TECHNOLOGY.INFINIBAND}>InfiniBand</option><option value={FABRIC_TECHNOLOGY.SPECTRUM_X}>Spectrum-X Ethernet</option><option value={FABRIC_TECHNOLOGY.ETHERNET}>Generic Ethernet</option></select></label>
            <label style={field}><span style={label}>Link speed</span><select style={input} value={linkGbps} onChange={(e) => { setLinkGbps(Number(e.target.value)); clearAcceptance(); }}><option value={200}>200 Gbps</option><option value={400}>400 Gbps</option><option value={800}>800 Gbps</option></select></label>
            <label style={field}><span style={label}>Link media</span><select style={input} value={linkMedia} onChange={(e) => { setLinkMedia(e.target.value); clearAcceptance(); }}><option value={FABRIC_LINK_MEDIA.OPTICAL}>Optical</option><option value={FABRIC_LINK_MEDIA.DAC}>Direct-attach cable (DAC)</option></select></label>
            <label style={field}><span style={label}>Storage network relationship</span><select style={input} value={storageFabricMode} onChange={(e) => { setStorageFabricMode(e.target.value); clearAcceptance(); }}><option value={STORAGE_FABRIC_MODE.SEPARATE}>Separate storage network</option><option value={STORAGE_FABRIC_MODE.CONVERGED}>Converged on this high-speed fabric</option></select></label>
            <label style={field}><span style={label}>GPU systems</span><input style={input} type="number" min="1" value={gpuSystems} onChange={(e) => { setGpuSystems(numericInputValue(e.target.value)); clearAcceptance(); }} /></label>
            <label style={field}><span style={label}>High-speed fabric ports / GPU system</span><input style={input} type="number" min="1" value={fabricPortsPerSystem} onChange={(e) => { setFabricPortsPerSystem(numericInputValue(e.target.value)); clearAcceptance(); }} /></label>
            <label style={field}><span style={label}>Port-count source</span><select style={input} value={fabricPortsPerSystemSource} onChange={(e) => { setFabricPortsPerSystemSource(e.target.value); clearAcceptance(); }}><option value={FABRIC_PORT_SOURCE.EST}>EST · planning assumption</option><option value={FABRIC_PORT_SOURCE.LISTED}>LISTED · system/OEM documentation</option><option value={FABRIC_PORT_SOURCE.CUSTOMER}>CUSTOMER · customer standard</option><option value={FABRIC_PORT_SOURCE.QUOTE}>QUOTE · partner/OEM quote</option></select></label>
            <label style={field}><span style={label}>Storage aggregate bandwidth (Gbps)</span><input style={input} type="number" min="0" value={storageAggregateGbps} onChange={(e) => { setStorageAggregateGbps(numericInputValue(e.target.value)); clearAcceptance(); }} /></label>
            <label style={field}><span style={label}>{storageFabricMode === STORAGE_FABRIC_MODE.CONVERGED ? "Storage-facing high-speed ports" : "Storage ports (reference only)"}</span><input style={input} type="number" min="0" value={storagePorts} onChange={(e) => { setStoragePorts(numericInputValue(e.target.value)); clearAcceptance(); }} /></label>
            <label style={field}><span style={label}>Management ports (separate scope)</span><input style={input} type="number" min="0" value={managementPorts} onChange={(e) => { setManagementPorts(numericInputValue(e.target.value)); clearAcceptance(); }} /></label>
            <label style={field}><span style={label}>Campus / external uplink ports</span><input style={input} type="number" min="0" value={uplinkPorts} onChange={(e) => { setUplinkPorts(numericInputValue(e.target.value)); clearAcceptance(); }} /></label>
            <label style={field}><span style={label}>Switch radix</span><input style={input} type="number" min="8" value={switchRadix} onChange={(e) => { setSwitchRadix(numericInputValue(e.target.value)); clearAcceptance(); }} /></label>
            <label style={field}><span style={label}>Target oversubscription</span><input style={input} type="number" min="1" step="0.5" value={targetOversubscription} onChange={(e) => { setTargetOversubscription(numericInputValue(e.target.value)); clearAcceptance(); }} /></label>
            <label style={field}><span style={label}>Switch power (kW)</span><input style={input} type="number" min="0" step="0.1" value={switchPowerKw} onChange={(e) => { setSwitchPowerKw(numericInputValue(e.target.value)); clearAcceptance(); }} /></label>
          </div>
          <label style={{ ...field, marginTop: 12 }}><span style={label}>Port-count basis / reference</span><input style={input} value={fabricPortsPerSystemNote} onChange={(e) => { setFabricPortsPerSystemNote(e.target.value); clearAcceptance(); }} placeholder="e.g., system/OEM port map, customer standard, quote line, planning rationale" /></label>
          <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: result.fabricPortBasis.authoritative ? "#eaf7ee" : "#fff7e8", border: result.fabricPortBasis.authoritative ? "1px solid #b8dec3" : "1px solid #edd7a7", lineHeight: 1.5 }}><strong>Fabric port basis:</strong> {result.fabricPortBasis.portsPerGpuSystem} ports/system · {result.fabricPortBasis.source} · {result.fabricPortBasis.status}. {result.fabricPortBasis.authoritative ? "A supporting basis is recorded." : "Treat downstream switch/media/power/CAPEX quantities as planning-level until this assumption is supported."}</div>
          <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: storageFabricMode === STORAGE_FABRIC_MODE.CONVERGED ? "#fff7e8" : "#eef5ff", border: storageFabricMode === STORAGE_FABRIC_MODE.CONVERGED ? "1px solid #edd7a7" : "1px solid #c9daf5", lineHeight: 1.5 }}><strong>Storage fabric scope:</strong> {storageFabricMode === STORAGE_FABRIC_MODE.CONVERGED ? "Storage-facing ports, bandwidth, links, media, switch power, and CAPEX are included in this high-speed fabric plan." : "Storage bandwidth remains a dependency/reference only. Storage ports, links, media, power, and CAPEX are excluded from this compute-fabric BOM."}</div>
          {linkMedia === FABRIC_LINK_MEDIA.DAC && <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: "#fff7e8", border: "1px solid #edd7a7", lineHeight: 1.5 }}><strong>DAC scope:</strong> separate optical transceivers are not counted. Engineering must confirm reach, switch/NIC compatibility, breakout requirements, and whether every modeled link can actually use direct attach.</div>}
        </section>

        <section style={{ ...card, marginBottom: 18 }}>
          <h2 style={{ marginTop: 0 }}>2. Optional planning economics</h2>
          <p style={{ color: "#666", lineHeight: 1.5 }}>Choose the source of the entered unit costs. EST is a planning assumption, CUSTOMER is customer-supplied, and QUOTE is partner/OEM quote-based. Unresolved prices never create a zero-dollar TCO override.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14 }}>
            <label style={field}><span style={label}>Pricing source</span><select style={input} value={priceSource} onChange={(e) => { setPriceSource(e.target.value); clearAcceptance(); }}><option value={FABRIC_PRICE_SOURCE.EST}>EST · planning estimate</option><option value={FABRIC_PRICE_SOURCE.CUSTOMER}>CUSTOMER · customer supplied</option><option value={FABRIC_PRICE_SOURCE.QUOTE}>QUOTE · partner/OEM quote</option></select></label>
            <label style={field}><span style={label}>Switch cost</span><input style={input} type="number" min="0" value={switchCost} onChange={(e) => { setSwitchCost(numericInputValue(e.target.value)); clearAcceptance(); }} /></label>
            <label style={field}><span style={label}>{linkMedia === FABRIC_LINK_MEDIA.DAC ? "DAC cost / link" : "Cable cost / link"}</span><input style={input} type="number" min="0" value={cableCost} onChange={(e) => { setCableCost(numericInputValue(e.target.value)); clearAcceptance(); }} /></label>
            <label style={field}><span style={label}>Transceiver cost / optic</span><input style={input} type="number" min="0" disabled={linkMedia === FABRIC_LINK_MEDIA.DAC} value={linkMedia === FABRIC_LINK_MEDIA.DAC ? 0 : transceiverCost} onChange={(e) => { setTransceiverCost(numericInputValue(e.target.value)); clearAcceptance(); }} /></label>
          </div>
        </section>

        <section style={{ marginBottom: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}>
            <div style={card}><div style={label}>Topology</div><div style={{ fontSize: 27, fontWeight: 900, marginTop: 6 }}>{result.topology.toUpperCase()}</div><div style={{ color: result.topologyFeasibility.twoTierFeasible ? "#176b31" : "#9b1c31", marginTop: 4 }}>{result.topologyFeasibility.status}</div></div>
            <div style={card}><div style={label}>Port-count basis</div><div style={{ fontSize: 24, fontWeight: 900, marginTop: 6 }}>{result.fabricPortBasis.source}</div><div style={{ color: "#666" }}>{result.fabricPortBasis.portsPerGpuSystem} ports/system · {result.fabricPortBasis.status}</div></div>
            <div style={card}><div style={label}>Storage relationship</div><div style={{ fontSize: 26, fontWeight: 900, marginTop: 6 }}>{result.storageFabric.status}</div><div style={{ color: "#666" }}>{result.storageFabric.note}</div></div>
            <div style={card}><div style={label}>Switches</div><div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>{result.switches.total}</div><div style={{ color: "#666" }}>{result.switches.leaf} leaf · {result.switches.spine} spine</div></div>
            <div style={card}><div style={label}>Data-plane endpoint ports</div><div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>{result.ports.endpointPorts}</div><div style={{ color: "#666" }}>{result.ports.computeEndpointPorts} compute · {result.ports.storagePorts} storage included · management separate</div></div>
            <div style={card}><div style={label}>Inter-switch links</div><div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>{result.ports.interSwitchLinks}</div></div>
            <div style={card}><div style={label}>{linkMedia === FABRIC_LINK_MEDIA.DAC ? "Optical transceivers" : "Transceivers"}</div><div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>{result.ports.totalTransceivers}</div><div style={{ color: "#666" }}>{linkMedia === FABRIC_LINK_MEDIA.DAC ? "0 by design in DAC mode" : "2 per high-speed link"}</div></div>
            <div style={card}><div style={label}>Switch power</div><div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>{result.estimatedSwitchPowerKw.toFixed(1)} kW</div><div style={{ color: "#666" }}>Feeds Power when accepted</div></div>
            <div style={card}><div style={label}>Storage bandwidth fit</div><div style={{ fontSize: 26, fontWeight: 900, marginTop: 6 }}>{result.bandwidth.storageCheckApplicable ? (result.bandwidth.storageBandwidthFit ? "PASS" : "FAIL") : "N/A"}</div><div style={{ color: "#666" }}>{result.bandwidth.storageCheckApplicable ? `${gbps(result.bandwidth.storageTheoreticalGbps)} theoretical` : "Separate storage network"}</div></div>
            <div style={card}><div style={label}>Capital-cost envelope</div><div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>{money(result.estimatedCapitalCost)}</div><div style={{ color: "#666" }}>{priceSource} · current fleet planning value</div></div>
          </div>
        </section>

        <section style={{ ...card, marginBottom: 18 }}>
          <h2 style={{ marginTop: 0 }}>3. Validation, flags and methodology</h2>
          {!validation.valid && <div style={{ background: "#fff0f3", border: "1px solid #efc9cf", borderRadius: 8, padding: 12, marginBottom: 12 }}><strong>Input errors:</strong><ul>{validation.errors.map((x) => <li key={x}>{x}</li>)}</ul></div>}
          {validation.warnings.length > 0 && <div style={{ background: "#fff7e8", border: "1px solid #edd7a7", borderRadius: 8, padding: 12, marginBottom: 12 }}><strong>Planning warnings:</strong><ul>{validation.warnings.map((x) => <li key={x}>{x}</li>)}</ul></div>}
          {result.flags.length > 0 && <div style={{ background: "#fff7e8", border: "1px solid #edd7a7", borderRadius: 8, padding: 12, marginBottom: 12 }}><strong>Fabric flags:</strong><ul>{result.flags.map((x) => <li key={x}>{x}</li>)}</ul></div>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
            {Object.entries(result.methodology).map(([key, value]) => <div key={key} style={{ ...card, background: "#fafafa" }}><strong>{key}</strong><div style={{ marginTop: 6, color: "#555", lineHeight: 1.45 }}>{value}</div></div>)}
          </div>
        </section>

        <section style={{ ...card, marginBottom: 18, borderLeft: "6px solid #c8102e" }}>
          <h2 style={{ marginTop: 0 }}>4. Explicit downstream handoff</h2>
          <p style={{ color: "#555", lineHeight: 1.55 }}>Accepting stages topology/port/media requirements, the explicit GPU-system port-count basis, the explicit storage-network relationship, the fleet-size step schedule, switch power, and CAPEX only when both topology and pricing are resolved. Power consumes accepted switch power while management/head-node power remains a separate allowance.</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <button type="button" style={{ ...primaryButton, opacity: validation.valid && !storageStale ? 1 : .45, cursor: validation.valid && !storageStale ? "pointer" : "not-allowed" }} disabled={!validation.valid || storageStale} onClick={stageFabric}>Accept and stage Fabric</button>
            <a href="/__phase2/power" style={{ fontWeight: 800, color: "#c8102e" }}>Open Power preview</a>
            <a href="/__phase2/tco" style={{ fontWeight: 800, color: "#c8102e" }}>Open TCO receiving preview</a>
          </div>
          {acceptance?.ok && <div style={{ marginTop: 14, padding: 12, borderRadius: 8, background: acceptance.costResolved ? "#eaf7ee" : "#fff7e8", border: acceptance.costResolved ? "1px solid #b8dec3" : "1px solid #e4c679" }}><strong>Staged.</strong> Fabric fingerprint: <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{acceptance.fingerprint}</span>. {acceptance.costResolved ? `${acceptance.priceSource} network economics are staged as a Phase 1 replacement candidate; production TCO application remains blocked until the exact Phase 1 network/fabric replacement line is mapped.` : `Network economics remain ${acceptance.costStatus}; no Fabric CAPEX override is staged.`}</div>}
          {acceptance && !acceptance.ok && <div style={{ marginTop: 14, padding: 12, borderRadius: 8, background: "#fff0f3", border: "1px solid #efc9cf", color: "#9b1c31" }}>{acceptance.message}</div>}
        </section>

        <section style={{ ...card, background: "#fff8f8", borderColor: "#efc9cf" }}>
          <h2 style={{ marginTop: 0 }}>Scope guard</h2>
          <p style={{ marginBottom: 0, lineHeight: 1.55 }}>Planning-level sizing only. CDW/network engineering still owns topology validation, switch selection, endpoint-port validation, port mapping, storage-network architecture, media/reach validation, routing, QoS, congestion control, redundancy, failure domains, implementation, and final bill of materials.</p>
        </section>
      </main>
    </div>
  );
}
