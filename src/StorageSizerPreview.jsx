import React, { useMemo, useState } from "react";
import { STORAGE_WORKLOAD_PROFILES, calculateStorageSizer, validateStorageSizerInputs } from "./storageSizerEngine.js";

const field = { display: "grid", gap: 6 };
const input = { padding: "10px 12px", border: "1px solid #bbb", borderRadius: 8, fontSize: 15, width: "100%", boxSizing: "border-box" };
const card = { border: "1px solid #ddd", borderRadius: 12, padding: 16, background: "#fff" };
const label = { fontSize: 12, fontWeight: 800, color: "#555", textTransform: "uppercase", letterSpacing: ".05em" };

function tb(v) {
  return `${Math.round(Number(v || 0)).toLocaleString()} TB`;
}

function gbps(v) {
  return `${Number(v || 0).toFixed(1)} GB/s`;
}

export default function StorageSizerPreview() {
  const [workload, setWorkload] = useState("training");
  const [baseDatasetTb, setBaseDatasetTb] = useState(500);
  const [annualGrowthPct, setAnnualGrowthPct] = useState(35);
  const [years, setYears] = useState(3);
  const [copies, setCopies] = useState(2);
  const [checkpointMultiplier, setCheckpointMultiplier] = useState(0.5);
  const [indexOverheadPct, setIndexOverheadPct] = useState(10);
  const [reservePct, setReservePct] = useState(20);
  const [usableEfficiency, setUsableEfficiency] = useState(0.75);
  const [gpuCount, setGpuCount] = useState(16);
  const [manualThroughputGbps, setManualThroughputGbps] = useState("");
  const [ingestGbps, setIngestGbps] = useState(2);
  const [fastTierTbPerRack, setFastTierTbPerRack] = useState(500);
  const [bulkTierTbPerRack, setBulkTierTbPerRack] = useState(1000);
  const [fastTierKwPerRack, setFastTierKwPerRack] = useState(6);
  const [bulkTierKwPerRack, setBulkTierKwPerRack] = useState(4);

  const inputs = useMemo(() => ({
    workload,
    baseDatasetTb,
    annualGrowthPct,
    years,
    copies,
    checkpointMultiplier,
    indexOverheadPct,
    reservePct,
    usableEfficiency,
    gpuCount,
    manualThroughputGbps,
    ingestGbps,
    fastTierTbPerRack,
    bulkTierTbPerRack,
    fastTierKwPerRack,
    bulkTierKwPerRack,
  }), [workload, baseDatasetTb, annualGrowthPct, years, copies, checkpointMultiplier, indexOverheadPct, reservePct, usableEfficiency, gpuCount, manualThroughputGbps, ingestGbps, fastTierTbPerRack, bulkTierTbPerRack, fastTierKwPerRack, bulkTierKwPerRack]);

  const result = useMemo(() => calculateStorageSizer(inputs), [inputs]);
  const validation = useMemo(() => validateStorageSizerInputs(inputs), [inputs]);

  return (
    <div style={{ background: "#f5f5f5", minHeight: "100vh", padding: "24px 16px 56px", fontFamily: "Arial, Helvetica, sans-serif" }}>
      <main style={{ width: "min(1180px, 100%)", margin: "0 auto" }}>
        <div style={{ background: "#111", color: "#fff", borderLeft: "6px solid #c8102e", padding: 14, marginBottom: 20 }}>
          <strong>Phase 2 · Wave 2A.</strong> Vendor-neutral storage reference engine. No production write-back yet.
        </div>

        <h1 style={{ margin: "0 0 8px", fontSize: "clamp(30px, 5vw, 48px)" }}>Storage sizer</h1>
        <p style={{ margin: "0 0 24px", color: "#555", fontSize: 17, lineHeight: 1.55, maxWidth: 920 }}>
          Translate the workload into fast-tier capacity, bulk capacity, raw provisioned capacity, storage bandwidth, rack footprint, and provisional power. This output will become an upstream dependency for both Fabric and Power.
        </p>

        <section style={{ ...card, marginBottom: 18 }}>
          <h2 style={{ marginTop: 0 }}>1. Workload and retention inputs</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            <label style={field}><span style={label}>Workload</span><select style={input} value={workload} onChange={(e) => setWorkload(e.target.value)}>{Object.entries(STORAGE_WORKLOAD_PROFILES).map(([key, p]) => <option key={key} value={key}>{p.label}</option>)}</select></label>
            <label style={field}><span style={label}>Base dataset (TB)</span><input style={input} type="number" min="0" value={baseDatasetTb} onChange={(e) => setBaseDatasetTb(Number(e.target.value))} /></label>
            <label style={field}><span style={label}>Annual growth (%)</span><input style={input} type="number" min="0" value={annualGrowthPct} onChange={(e) => setAnnualGrowthPct(Number(e.target.value))} /></label>
            <label style={field}><span style={label}>Planning horizon (years)</span><input style={input} type="number" min="1" max="7" value={years} onChange={(e) => setYears(Number(e.target.value))} /></label>
            <label style={field}><span style={label}>Copies / replicas</span><input style={input} type="number" min="1" max="5" value={copies} onChange={(e) => setCopies(Number(e.target.value))} /></label>
            <label style={field}><span style={label}>Checkpoint multiplier</span><input style={input} type="number" min="0" step="0.1" value={checkpointMultiplier} onChange={(e) => setCheckpointMultiplier(Number(e.target.value))} /></label>
            <label style={field}><span style={label}>Index / metadata overhead (%)</span><input style={input} type="number" min="0" value={indexOverheadPct} onChange={(e) => setIndexOverheadPct(Number(e.target.value))} /></label>
            <label style={field}><span style={label}>Operational reserve (%)</span><input style={input} type="number" min="0" value={reservePct} onChange={(e) => setReservePct(Number(e.target.value))} /></label>
            <label style={field}><span style={label}>Usable efficiency</span><input style={input} type="number" min="0.01" max="1" step="0.01" value={usableEfficiency} onChange={(e) => setUsableEfficiency(Number(e.target.value))} /></label>
          </div>
          <div style={{ marginTop: 14, padding: 12, background: "#f7f7f7", border: "1px solid #ddd", borderRadius: 8, lineHeight: 1.5 }}>
            <strong>{STORAGE_WORKLOAD_PROFILES[workload].label} profile:</strong> {STORAGE_WORKLOAD_PROFILES[workload].notes}
          </div>
        </section>

        <section style={{ ...card, marginBottom: 18 }}>
          <h2 style={{ marginTop: 0 }}>2. Throughput and planning-density inputs</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            <label style={field}><span style={label}>GPU count</span><input style={input} type="number" min="0" value={gpuCount} onChange={(e) => setGpuCount(Number(e.target.value))} /></label>
            <label style={field}><span style={label}>Manual read throughput (GB/s, optional)</span><input style={input} type="number" min="0" step="0.1" value={manualThroughputGbps} onChange={(e) => setManualThroughputGbps(e.target.value === "" ? "" : Number(e.target.value))} placeholder="Use workload/GPU estimate" /></label>
            <label style={field}><span style={label}>Ingest throughput (GB/s)</span><input style={input} type="number" min="0" step="0.1" value={ingestGbps} onChange={(e) => setIngestGbps(Number(e.target.value))} /></label>
            <label style={field}><span style={label}>Fast tier raw TB / rack</span><input style={input} type="number" min="1" value={fastTierTbPerRack} onChange={(e) => setFastTierTbPerRack(Number(e.target.value))} /></label>
            <label style={field}><span style={label}>Bulk tier raw TB / rack</span><input style={input} type="number" min="1" value={bulkTierTbPerRack} onChange={(e) => setBulkTierTbPerRack(Number(e.target.value))} /></label>
            <label style={field}><span style={label}>Fast tier kW / rack</span><input style={input} type="number" min="0" step="0.1" value={fastTierKwPerRack} onChange={(e) => setFastTierKwPerRack(Number(e.target.value))} /></label>
            <label style={field}><span style={label}>Bulk tier kW / rack</span><input style={input} type="number" min="0" step="0.1" value={bulkTierKwPerRack} onChange={(e) => setBulkTierKwPerRack(Number(e.target.value))} /></label>
          </div>
          <p style={{ color: "#666", lineHeight: 1.5, marginBottom: 0 }}>Rack density and storage power are planning assumptions in 2A. Vendor/BOM-specific values come later; they are not presented as listed product specifications here.</p>
        </section>

        <section style={{ marginBottom: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}>
            <div style={card}><div style={label}>Fast usable</div><div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>{tb(result.capacity.fastUsableTb)}</div><div style={{ color: "#666" }}>{result.tiering.fastPct.toFixed(0)}% of usable requirement</div></div>
            <div style={card}><div style={label}>Bulk usable</div><div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>{tb(result.capacity.bulkUsableTb)}</div><div style={{ color: "#666" }}>{result.tiering.bulkPct.toFixed(0)}% of usable requirement</div></div>
            <div style={card}><div style={label}>Total raw provisioned</div><div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>{tb(result.capacity.totalRawTb)}</div><div style={{ color: "#666" }}>After efficiency assumption</div></div>
            <div style={card}><div style={label}>Read throughput</div><div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>{gbps(result.throughput.requiredReadGbps)}</div><div style={{ color: "#666" }}>Storage → compute</div></div>
            <div style={card}><div style={label}>Aggregate bandwidth</div><div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>{gbps(result.throughput.aggregateGbps)}</div><div style={{ color: "#666" }}>Read + write planning target</div></div>
            <div style={card}><div style={label}>Storage racks</div><div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>{result.racks.total}</div><div style={{ color: "#666" }}>{result.racks.fast} fast · {result.racks.bulk} bulk</div></div>
            <div style={card}><div style={label}>Provisional power</div><div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>{result.estimatedPowerKw.toFixed(1)} kW</div><div style={{ color: "#666" }}>Feeds Power later</div></div>
          </div>
        </section>

        <section style={{ ...card, marginBottom: 18 }}>
          <h2 style={{ marginTop: 0 }}>3. Validation, flags and methodology</h2>
          {!validation.valid && <div style={{ background: "#fff0f3", border: "1px solid #efc9cf", borderRadius: 8, padding: 12, marginBottom: 12 }}><strong>Input errors:</strong><ul>{validation.errors.map((x) => <li key={x}>{x}</li>)}</ul></div>}
          {validation.warnings.length > 0 && <div style={{ background: "#fff7e8", border: "1px solid #edd7a7", borderRadius: 8, padding: 12, marginBottom: 12 }}><strong>Planning warnings:</strong><ul>{validation.warnings.map((x) => <li key={x}>{x}</li>)}</ul></div>}
          {result.flags.length ? <ul style={{ lineHeight: 1.6 }}>{result.flags.map((flag) => <li key={flag}>{flag}</li>)}</ul> : <p>No additional planning flags.</p>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, marginTop: 14 }}>
            {Object.entries(result.methodology).map(([k, v]) => <div key={k} style={{ ...card, background: "#fafafa" }}><strong>{k}</strong><div style={{ marginTop: 6, color: "#555", lineHeight: 1.45 }}>{v}</div></div>)}
          </div>
        </section>

        <section style={{ ...card, background: "#fff8f8", borderColor: "#efc9cf" }}>
          <h2 style={{ marginTop: 0 }}>Scope guard</h2>
          <p style={{ marginBottom: 10, lineHeight: 1.55 }}>Wave 2A is vendor-neutral requirement sizing. It does not select a storage OEM, array, controller count, protection policy, filesystem, or network topology.</p>
          <p style={{ marginBottom: 0, lineHeight: 1.55 }}><strong>Next:</strong> Wave 2B will turn this into a staged storage requirement record, feed storage power/racks back into Power, expose storage bandwidth to Fabric, and add the TCO storage-cost receiving contract.</p>
        </section>
      </main>
    </div>
  );
}
