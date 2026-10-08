import React, { useMemo, useState } from "react";
import { FABRIC_SPEED, FABRIC_TECHNOLOGY, calculateNetworkFabric, validateNetworkFabricInputs } from "./networkFabricEngine.js";
import { loadSessionState } from "./sessionState.js";

const card = { border: "1px solid #ddd", borderRadius: 12, padding: 16, background: "#fff" };
const field = { display: "grid", gap: 6 };
const input = { padding: "10px 12px", border: "1px solid #bbb", borderRadius: 8, fontSize: 15, width: "100%", boxSizing: "border-box" };
const label = { fontSize: 12, fontWeight: 800, color: "#555", textTransform: "uppercase", letterSpacing: ".05em" };

function money(v) { return `$${Math.round(Number(v || 0)).toLocaleString()}`; }
function gbps(v) { return `${Math.round(Number(v || 0)).toLocaleString()} Gbps`; }

export default function NetworkFabricPreview() {
  const acceptedStorage = useMemo(() => loadSessionState("phase2-storage-requirement"), []);
  const storageReq = acceptedStorage?.requirements || null;

  const [technology, setTechnology] = useState(FABRIC_TECHNOLOGY.INFINIBAND);
  const [linkGbps, setLinkGbps] = useState(FABRIC_SPEED.G400);
  const [gpuSystems, setGpuSystems] = useState(8);
  const [fabricPortsPerSystem, setFabricPortsPerSystem] = useState(8);
  const [storageAggregateGbps, setStorageAggregateGbps] = useState(storageReq?.aggregateGbps ? storageReq.aggregateGbps * 8 : 400);
  const [storagePorts, setStoragePorts] = useState(storageReq?.aggregateGbps ? Math.max(2, Math.ceil((storageReq.aggregateGbps * 8) / FABRIC_SPEED.G400)) : 2);
  const [managementPorts, setManagementPorts] = useState(8);
  const [uplinkPorts, setUplinkPorts] = useState(2);
  const [switchRadix, setSwitchRadix] = useState(64);
  const [targetOversubscription, setTargetOversubscription] = useState(1);
  const [switchPowerKw, setSwitchPowerKw] = useState(1.5);
  const [switchCost, setSwitchCost] = useState(0);
  const [cableCost, setCableCost] = useState(0);
  const [transceiverCost, setTransceiverCost] = useState(0);

  const inputs = useMemo(() => ({
    technology,
    linkGbps,
    gpuSystems,
    fabricPortsPerSystem,
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
  }), [technology, linkGbps, gpuSystems, fabricPortsPerSystem, storageAggregateGbps, storagePorts, managementPorts, uplinkPorts, switchRadix, targetOversubscription, switchPowerKw, switchCost, cableCost, transceiverCost]);

  const result = useMemo(() => calculateNetworkFabric(inputs), [inputs]);
  const validation = useMemo(() => validateNetworkFabricInputs(inputs), [inputs]);

  function pullStorage() {
    if (!storageReq) return;
    const requiredGbps = Number(storageReq.aggregateGbps || 0) * 8;
    setStorageAggregateGbps(requiredGbps);
    setStoragePorts(Math.max(1, Math.ceil(requiredGbps / linkGbps)));
  }

  return (
    <div style={{ background: "#f5f5f5", minHeight: "100vh", padding: "24px 16px 56px", fontFamily: "Arial, Helvetica, sans-serif" }}>
      <main style={{ width: "min(1180px, 100%)", margin: "0 auto" }}>
        <div style={{ background: "#111", color: "#fff", borderLeft: "6px solid #c8102e", padding: 14, marginBottom: 20 }}>
          <strong>Phase 2 · Wave 4A.</strong> Planning-level network fabric sizing. No routing, QoS, congestion-control or implementation design is produced.
        </div>

        <h1 style={{ margin: "0 0 8px", fontSize: "clamp(30px, 5vw, 48px)" }}>Network fabric planner</h1>
        <p style={{ margin: "0 0 24px", color: "#555", fontSize: 17, lineHeight: 1.55, maxWidth: 920 }}>
          Size endpoint ports, switch count, leaf/spine topology, storage-facing bandwidth, inter-switch links, transceivers, provisional switch power, and a cost envelope without pretending to be a detailed network design.
        </p>

        {storageReq && (
          <section style={{ ...card, marginBottom: 18, borderLeft: "6px solid #176b31" }}>
            <h2 style={{ margin: "0 0 8px" }}>Accepted Storage dependency available</h2>
            <p style={{ margin: "0 0 12px", color: "#555", lineHeight: 1.5 }}>Storage requires {Number(storageReq.aggregateGbps || 0).toFixed(1)} GB/s aggregate bandwidth. Fabric consumes that as {gbps(Number(storageReq.aggregateGbps || 0) * 8)}.</p>
            <button type="button" onClick={pullStorage} style={{ border: 0, borderRadius: 8, padding: "10px 14px", background: "#176b31", color: "#fff", fontWeight: 800, cursor: "pointer" }}>Use accepted Storage bandwidth</button>
          </section>
        )}

        <section style={{ ...card, marginBottom: 18 }}>
          <h2 style={{ marginTop: 0 }}>1. Fabric inputs</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14 }}>
            <label style={field}><span style={label}>Technology</span><select style={input} value={technology} onChange={(e) => setTechnology(e.target.value)}><option value={FABRIC_TECHNOLOGY.INFINIBAND}>InfiniBand</option><option value={FABRIC_TECHNOLOGY.SPECTRUM_X}>Spectrum-X Ethernet</option><option value={FABRIC_TECHNOLOGY.ETHERNET}>Generic Ethernet</option></select></label>
            <label style={field}><span style={label}>Link speed</span><select style={input} value={linkGbps} onChange={(e) => setLinkGbps(Number(e.target.value))}><option value={200}>200 Gbps</option><option value={400}>400 Gbps</option><option value={800}>800 Gbps</option></select></label>
            <label style={field}><span style={label}>GPU systems</span><input style={input} type="number" min="1" value={gpuSystems} onChange={(e) => setGpuSystems(Number(e.target.value))} /></label>
            <label style={field}><span style={label}>Fabric ports / GPU system</span><input style={input} type="number" min="1" value={fabricPortsPerSystem} onChange={(e) => setFabricPortsPerSystem(Number(e.target.value))} /></label>
            <label style={field}><span style={label}>Storage aggregate bandwidth (Gbps)</span><input style={input} type="number" min="0" value={storageAggregateGbps} onChange={(e) => setStorageAggregateGbps(Number(e.target.value))} /></label>
            <label style={field}><span style={label}>Storage-facing ports</span><input style={input} type="number" min="0" value={storagePorts} onChange={(e) => setStoragePorts(Number(e.target.value))} /></label>
            <label style={field}><span style={label}>Management ports</span><input style={input} type="number" min="0" value={managementPorts} onChange={(e) => setManagementPorts(Number(e.target.value))} /></label>
            <label style={field}><span style={label}>Campus / external uplink ports</span><input style={input} type="number" min="0" value={uplinkPorts} onChange={(e) => setUplinkPorts(Number(e.target.value))} /></label>
            <label style={field}><span style={label}>Switch radix</span><input style={input} type="number" min="8" value={switchRadix} onChange={(e) => setSwitchRadix(Number(e.target.value))} /></label>
            <label style={field}><span style={label}>Target oversubscription</span><input style={input} type="number" min="1" step="0.5" value={targetOversubscription} onChange={(e) => setTargetOversubscription(Number(e.target.value))} /></label>
            <label style={field}><span style={label}>Switch power (kW)</span><input style={input} type="number" min="0" step="0.1" value={switchPowerKw} onChange={(e) => setSwitchPowerKw(Number(e.target.value))} /></label>
          </div>
        </section>

        <section style={{ ...card, marginBottom: 18 }}>
          <h2 style={{ marginTop: 0 }}>2. Optional planning economics</h2>
          <p style={{ color: "#666", lineHeight: 1.5 }}>These remain EST/QUOTE placeholders until validated partner or OEM data exists. Leaving them at $0 is allowed and explicitly flagged as unresolved.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14 }}>
            <label style={field}><span style={label}>Switch cost</span><input style={input} type="number" min="0" value={switchCost} onChange={(e) => setSwitchCost(Number(e.target.value))} /></label>
            <label style={field}><span style={label}>Cable cost / link</span><input style={input} type="number" min="0" value={cableCost} onChange={(e) => setCableCost(Number(e.target.value))} /></label>
            <label style={field}><span style={label}>Transceiver cost / optic</span><input style={input} type="number" min="0" value={transceiverCost} onChange={(e) => setTransceiverCost(Number(e.target.value))} /></label>
          </div>
        </section>

        <section style={{ marginBottom: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}>
            <div style={card}><div style={label}>Topology</div><div style={{ fontSize: 27, fontWeight: 900, marginTop: 6 }}>{result.topology.toUpperCase()}</div></div>
            <div style={card}><div style={label}>Switches</div><div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>{result.switches.total}</div><div style={{ color: "#666" }}>{result.switches.leaf} leaf · {result.switches.spine} spine</div></div>
            <div style={card}><div style={label}>Endpoint ports</div><div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>{result.ports.endpointPorts}</div><div style={{ color: "#666" }}>{result.ports.computeEndpointPorts} compute · {result.ports.storagePorts} storage · {result.ports.managementPorts} mgmt</div></div>
            <div style={card}><div style={label}>Inter-switch links</div><div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>{result.ports.interSwitchLinks}</div></div>
            <div style={card}><div style={label}>Transceivers</div><div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>{result.ports.totalTransceivers}</div></div>
            <div style={card}><div style={label}>Switch power</div><div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>{result.estimatedSwitchPowerKw.toFixed(1)} kW</div><div style={{ color: "#666" }}>Feeds Power in 4B</div></div>
            <div style={card}><div style={label}>Storage bandwidth fit</div><div style={{ fontSize: 26, fontWeight: 900, marginTop: 6 }}>{result.bandwidth.storageBandwidthFit ? "PASS" : "FAIL"}</div><div style={{ color: "#666" }}>{gbps(result.bandwidth.storageTheoreticalGbps)} theoretical</div></div>
            <div style={card}><div style={label}>Capital-cost envelope</div><div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>{money(result.estimatedCapitalCost)}</div><div style={{ color: "#666" }}>Incomplete until unit costs supplied</div></div>
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

        <section style={{ ...card, background: "#fff8f8", borderColor: "#efc9cf" }}>
          <h2 style={{ marginTop: 0 }}>Scope guard</h2>
          <p style={{ marginBottom: 10, lineHeight: 1.55 }}>Wave 4A produces a planning-level fabric requirement only. It does not produce routing, subnetting, VLANs, QoS, congestion-control settings, cabling maps, port-by-port assignments, or a deployable network design.</p>
          <p style={{ marginBottom: 0, lineHeight: 1.55 }}><strong>Next:</strong> Wave 4B will stage the fabric requirement, feed switch power back into Power, and write the network capital-cost envelope to TCO as a fleet-size-dependent step schedule rather than a per-system scalar.</p>
        </section>
      </main>
    </div>
  );
}
