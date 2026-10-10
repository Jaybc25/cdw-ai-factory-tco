import React, { useEffect, useMemo, useState } from "react";
import { STORAGE_WORKLOAD_PROFILES, calculateStorageSizer, validateStorageSizerInputs } from "./storageSizerEngine.js";
import { buildStorageDependencyBundle } from "./storageSizerWriteback.js";
import { loadSessionState, saveSessionState } from "./sessionState.js";

const field = { display: "grid", gap: 6 };
const input = { padding: "10px 12px", border: "1px solid #bbb", borderRadius: 8, fontSize: 15, width: "100%", boxSizing: "border-box" };
const card = { border: "1px solid #ddd", borderRadius: 12, padding: 16, background: "#fff" };
const label = { fontSize: 12, fontWeight: 800, color: "#555", textTransform: "uppercase", letterSpacing: ".05em" };
const primaryButton = { border: 0, borderRadius: 8, padding: "11px 15px", fontWeight: 800, background: "#c8102e", color: "#fff", cursor: "pointer" };

function tb(v) {
  return `${Math.round(Number(v || 0)).toLocaleString()} TB`;
}

function gbps(v) {
  return `${Number(v || 0).toFixed(1)} GB/s`;
}

function sameInputs(a, b) {
  return Boolean(a && b && JSON.stringify(a) === JSON.stringify(b));
}

export default function StorageSizerPreview() {
  const savedInputState = useMemo(() => loadSessionState("phase2-storage-inputs"), []);
  const savedValues = savedInputState?.values || {};
  const [acceptedBundle, setAcceptedBundle] = useState(() => loadSessionState("phase2-storage-writeback"));
  const [acceptedInputs, setAcceptedInputs] = useState(savedInputState?.acceptedInputs || null);
  const [workload, setWorkload] = useState(savedValues.workload ?? "training");
  const [baseDatasetTb, setBaseDatasetTb] = useState(savedValues.baseDatasetTb ?? 500);
  const [annualGrowthPct, setAnnualGrowthPct] = useState(savedValues.annualGrowthPct ?? 35);
  const [years, setYears] = useState(savedValues.years ?? 3);
  const [copies, setCopies] = useState(savedValues.copies ?? 2);
  const [modelParamsBillions, setModelParamsBillions] = useState(savedValues.modelParamsBillions ?? 70);
  const [checkpointBytesPerParam, setCheckpointBytesPerParam] = useState(savedValues.checkpointBytesPerParam ?? 16);
  const [checkpointsRetained, setCheckpointsRetained] = useState(savedValues.checkpointsRetained ?? 5);
  const [activeWorkingSetPct, setActiveWorkingSetPct] = useState(savedValues.activeWorkingSetPct ?? STORAGE_WORKLOAD_PROFILES[savedValues.workload || "training"].suggestedActiveWorkingSetPct);
  const [activeWorkingSetTb, setActiveWorkingSetTb] = useState(savedValues.activeWorkingSetTb ?? "");
  const [indexOverheadPct, setIndexOverheadPct] = useState(savedValues.indexOverheadPct ?? 10);
  const [reservePct, setReservePct] = useState(savedValues.reservePct ?? 20);
  const [usableEfficiency, setUsableEfficiency] = useState(savedValues.usableEfficiency ?? 0.75);
  const [gpuCount, setGpuCount] = useState(savedValues.gpuCount ?? 16);
  const [manualThroughputGbps, setManualThroughputGbps] = useState(savedValues.manualThroughputGbps ?? "");
  const [ingestGbps, setIngestGbps] = useState(savedValues.ingestGbps ?? 2);
  const [fastTierTbPerRack, setFastTierTbPerRack] = useState(savedValues.fastTierTbPerRack ?? 500);
  const [bulkTierTbPerRack, setBulkTierTbPerRack] = useState(savedValues.bulkTierTbPerRack ?? 1000);
  const [fastTierKwPerRack, setFastTierKwPerRack] = useState(savedValues.fastTierKwPerRack ?? 6);
  const [bulkTierKwPerRack, setBulkTierKwPerRack] = useState(savedValues.bulkTierKwPerRack ?? 4);
  const [acceptance, setAcceptance] = useState(null);

  const inputs = useMemo(() => ({
    workload,
    baseDatasetTb,
    annualGrowthPct,
    years,
    copies,
    modelParamsBillions,
    checkpointBytesPerParam,
    checkpointsRetained,
    activeWorkingSetPct,
    activeWorkingSetTb,
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
  }), [workload, baseDatasetTb, annualGrowthPct, years, copies, modelParamsBillions, checkpointBytesPerParam, checkpointsRetained, activeWorkingSetPct, activeWorkingSetTb, indexOverheadPct, reservePct, usableEfficiency, gpuCount, manualThroughputGbps, ingestGbps, fastTierTbPerRack, bulkTierTbPerRack, fastTierKwPerRack, bulkTierKwPerRack]);

  useEffect(() => {
    saveSessionState("phase2-storage-inputs", { values: inputs, acceptedInputs });
  }, [inputs, acceptedInputs]);

  const result = useMemo(() => calculateStorageSizer(inputs), [inputs]);
  const validation = useMemo(() => validateStorageSizerInputs(inputs), [inputs]);
  const acceptedMatchesDisplayed = sameInputs(inputs, acceptedInputs);

  function changeWorkload(next) {
    setWorkload(next);
    setActiveWorkingSetPct(STORAGE_WORKLOAD_PROFILES[next].suggestedActiveWorkingSetPct);
    setAcceptance(null);
  }

  function stageDependencies() {
    if (!validation.valid) {
      setAcceptance({ ok: false, message: validation.errors.join(" ") });
      return;
    }
    const bundle = buildStorageDependencyBundle(result, { workload });
    saveSessionState("phase2-storage-writeback", bundle);
    setAcceptedBundle(bundle);
    setAcceptedInputs(inputs);
    setAcceptance({ ok: true, acceptedAt: bundle.acceptedAt });
  }

  return (
    <div style={{ background: "#f5f5f5", minHeight: "100vh", padding: "24px 16px 56px", fontFamily: "Arial, Helvetica, sans-serif" }}>
      <main style={{ width: "min(1180px, 100%)", margin: "0 auto" }}>
        <div style={{ background: "#111", color: "#fff", borderLeft: "6px solid #c8102e", padding: 14, marginBottom: 20 }}>
          <strong>Phase 2 · Storage hardening.</strong> Vendor-neutral sizing now separates the active data working set from model-based checkpoint retention. No OEM selection or production write-back.
        </div>

        <h1 style={{ margin: "0 0 8px", fontSize: "clamp(30px, 5vw, 48px)" }}>Storage sizer</h1>
        <p style={{ margin: "0 0 24px", color: "#555", fontSize: 17, lineHeight: 1.55, maxWidth: 920 }}>
          Translate the workload into fast-tier capacity, bulk capacity, raw provisioned capacity, storage bandwidth, rack footprint, and provisional power. Accepted requirements become explicit dependencies for Power, Fabric, and the TCO preview.
        </p>

        {acceptedBundle && <section style={{ ...card, marginBottom: 18, borderLeft: `6px solid ${acceptedMatchesDisplayed ? "#176b31" : "#b7791f"}`, background: acceptedMatchesDisplayed ? "#eaf7ee" : "#fff7e8" }}>
          <strong>{acceptedMatchesDisplayed ? "Displayed inputs match the accepted Storage requirement." : "Displayed inputs differ from the accepted Storage requirement."}</strong>
          <p style={{ marginBottom: 0, color: "#555" }}>{acceptedMatchesDisplayed ? "Navigation or refresh restored the accepted scenario inputs." : "Review the restored inputs and accept Storage again before relying on the displayed scenario downstream."}</p>
        </section>}

        <section style={{ ...card, marginBottom: 18 }}>
          <h2 style={{ marginTop: 0 }}>1. Workload, working set and checkpoint inputs</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            <label style={field}><span style={label}>Workload</span><select style={input} value={workload} onChange={(e) => changeWorkload(e.target.value)}>{Object.entries(STORAGE_WORKLOAD_PROFILES).map(([key, p]) => <option key={key} value={key}>{p.label}</option>)}</select></label>
            <label style={field}><span style={label}>Base dataset (TB)</span><input style={input} type="number" min="0" value={baseDatasetTb} onChange={(e) => { setBaseDatasetTb(e.target.value === "" ? "" : Number(e.target.value)); setAcceptance(null); }} /></label>
            <label style={field}><span style={label}>Annual growth (%)</span><input style={input} type="number" min="0" value={annualGrowthPct} onChange={(e) => { setAnnualGrowthPct(e.target.value === "" ? "" : Number(e.target.value)); setAcceptance(null); }} /></label>
            <label style={field}><span style={label}>Planning horizon (years)</span><input style={input} type="number" min="1" max="7" value={years} onChange={(e) => { setYears(e.target.value === "" ? "" : Number(e.target.value)); setAcceptance(null); }} /></label>
            <label style={field}><span style={label}>Copies / replicas</span><input style={input} type="number" min="1" max="5" value={copies} onChange={(e) => { setCopies(e.target.value === "" ? "" : Number(e.target.value)); setAcceptance(null); }} /></label>
            <label style={field}><span style={label}>Active working set (%)</span><input style={input} type="number" min="0" max="100" value={activeWorkingSetPct} onChange={(e) => { setActiveWorkingSetPct(e.target.value === "" ? "" : Number(e.target.value)); setAcceptance(null); }} /></label>
            <label style={field}><span style={label}>Active working set (TB, optional override)</span><input style={input} type="number" min="0" value={activeWorkingSetTb} onChange={(e) => { setActiveWorkingSetTb(e.target.value === "" ? "" : Number(e.target.value)); setAcceptance(null); }} placeholder="Use workload %" /></label>
            <label style={field}><span style={label}>Model parameters (billions)</span><input style={input} type="number" min="0" step="1" value={modelParamsBillions} onChange={(e) => { setModelParamsBillions(e.target.value === "" ? "" : Number(e.target.value)); setAcceptance(null); }} /></label>
            <label style={field}><span style={label}>Checkpoint bytes / parameter</span><input style={input} type="number" min="0" max="64" step="1" value={checkpointBytesPerParam} onChange={(e) => { setCheckpointBytesPerParam(e.target.value === "" ? "" : Number(e.target.value)); setAcceptance(null); }} /></label>
            <label style={field}><span style={label}>Checkpoints retained</span><input style={input} type="number" min="0" max="100" step="1" value={checkpointsRetained} onChange={(e) => { setCheckpointsRetained(e.target.value === "" ? "" : Number(e.target.value)); setAcceptance(null); }} /></label>
            <label style={field}><span style={label}>Index / metadata overhead (%)</span><input style={input} type="number" min="0" value={indexOverheadPct} onChange={(e) => { setIndexOverheadPct(e.target.value === "" ? "" : Number(e.target.value)); setAcceptance(null); }} /></label>
            <label style={field}><span style={label}>Operational reserve (%)</span><input style={input} type="number" min="0" value={reservePct} onChange={(e) => { setReservePct(e.target.value === "" ? "" : Number(e.target.value)); setAcceptance(null); }} /></label>
            <label style={field}><span style={label}>Usable efficiency</span><input style={input} type="number" min="0.01" max="1" step="0.01" value={usableEfficiency} onChange={(e) => { setUsableEfficiency(e.target.value === "" ? "" : Number(e.target.value)); setAcceptance(null); }} /></label>
          </div>
          <div style={{ marginTop: 14, padding: 12, background: "#f7f7f7", border: "1px solid #ddd", borderRadius: 8, lineHeight: 1.5 }}>
            <strong>{STORAGE_WORKLOAD_PROFILES[workload].label} starting suggestion:</strong> {STORAGE_WORKLOAD_PROFILES[workload].suggestedActiveWorkingSetPct}% active working set. {STORAGE_WORKLOAD_PROFILES[workload].notes}
          </div>
          <p style={{ color: "#666", lineHeight: 1.5, marginBottom: 0 }}>Checkpoint capacity is no longer derived from dataset size. It is calculated from model parameters, checkpoint bytes per parameter, and retained checkpoint count. The 16-byte default is a planning assumption and should be replaced with workload-specific evidence when known.</p>
        </section>

        <section style={{ ...card, marginBottom: 18 }}>
          <h2 style={{ marginTop: 0 }}>2. Throughput and planning-density inputs</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            <label style={field}><span style={label}>GPU count</span><input style={input} type="number" min="0" value={gpuCount} onChange={(e) => { setGpuCount(e.target.value === "" ? "" : Number(e.target.value)); setAcceptance(null); }} /></label>
            <label style={field}><span style={label}>Manual read throughput (GB/s, optional)</span><input style={input} type="number" min="0" step="0.1" value={manualThroughputGbps} onChange={(e) => { setManualThroughputGbps(e.target.value === "" ? "" : Number(e.target.value)); setAcceptance(null); }} placeholder="Use workload/GPU estimate" /></label>
            <label style={field}><span style={label}>Ingest throughput (GB/s)</span><input style={input} type="number" min="0" step="0.1" value={ingestGbps} onChange={(e) => { setIngestGbps(e.target.value === "" ? "" : Number(e.target.value)); setAcceptance(null); }} /></label>
            <label style={field}><span style={label}>Fast tier raw TB / rack</span><input style={input} type="number" min="1" value={fastTierTbPerRack} onChange={(e) => { setFastTierTbPerRack(e.target.value === "" ? "" : Number(e.target.value)); setAcceptance(null); }} /></label>
            <label style={field}><span style={label}>Bulk tier raw TB / rack</span><input style={input} type="number" min="1" value={bulkTierTbPerRack} onChange={(e) => { setBulkTierTbPerRack(e.target.value === "" ? "" : Number(e.target.value)); setAcceptance(null); }} /></label>
            <label style={field}><span style={label}>Fast tier kW / rack</span><input style={input} type="number" min="0" step="0.1" value={fastTierKwPerRack} onChange={(e) => { setFastTierKwPerRack(e.target.value === "" ? "" : Number(e.target.value)); setAcceptance(null); }} /></label>
            <label style={field}><span style={label}>Bulk tier kW / rack</span><input style={input} type="number" min="0" step="0.1" value={bulkTierKwPerRack} onChange={(e) => { setBulkTierKwPerRack(e.target.value === "" ? "" : Number(e.target.value)); setAcceptance(null); }} /></label>
          </div>
          <p style={{ color: "#666", lineHeight: 1.5, marginBottom: 0 }}>Rack density, storage power, and per-GPU throughput remain planning assumptions. OEM/BOM-specific values can replace them later when validated partner data is available.</p>
        </section>

        <section style={{ marginBottom: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}>
            <div style={card}><div style={label}>Fast usable</div><div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>{tb(result.capacity.fastUsableTb)}</div><div style={{ color: "#666" }}>{result.tiering.fastPct.toFixed(0)}% of usable requirement</div></div>
            <div style={card}><div style={label}>Bulk usable</div><div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>{tb(result.capacity.bulkUsableTb)}</div><div style={{ color: "#666" }}>{result.tiering.bulkPct.toFixed(0)}% of usable requirement</div></div>
            <div style={card}><div style={label}>Active working set</div><div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>{tb(result.capacity.activeWorkingSetTb)}</div><div style={{ color: "#666" }}>Fast-tier dataset basis</div></div>
            <div style={card}><div style={label}>Checkpoint retention</div><div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>{tb(result.capacity.checkpointTb)}</div><div style={{ color: "#666" }}>{checkpointsRetained} retained checkpoint{checkpointsRetained === 1 ? "" : "s"}</div></div>
            <div style={card}><div style={label}>Total raw provisioned</div><div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>{tb(result.capacity.totalRawTb)}</div><div style={{ color: "#666" }}>After efficiency assumption</div></div>
            <div style={card}><div style={label}>Read throughput</div><div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>{gbps(result.throughput.requiredReadGbps)}</div><div style={{ color: "#666" }}>Storage → compute</div></div>
            <div style={card}><div style={label}>Aggregate bandwidth</div><div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>{gbps(result.throughput.aggregateGbps)}</div><div style={{ color: "#666" }}>Read + write planning target</div></div>
            <div style={card}><div style={label}>Storage racks</div><div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>{result.racks.total}</div><div style={{ color: "#666" }}>{result.racks.fast} fast · {result.racks.bulk} bulk</div></div>
            <div style={card}><div style={label}>Provisional power</div><div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>{result.estimatedPowerKw.toFixed(1)} kW</div><div style={{ color: "#666" }}>Feeds Power</div></div>
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

        <section style={{ ...card, marginBottom: 18, borderLeft: "6px solid #c8102e" }}>
          <h2 style={{ marginTop: 0 }}>4. Accept downstream requirement</h2>
          <p style={{ color: "#555", lineHeight: 1.55 }}>
            Accepting stages the storage requirement only. Power can consume rack count and storage kW; Fabric can consume read/write bandwidth; TCO receives the capacity requirement but remains quote-dependent until OEM/BOM pricing is available.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <button type="button" style={{ ...primaryButton, opacity: validation.valid ? 1 : 0.5 }} disabled={!validation.valid} onClick={stageDependencies}>Accept storage requirement</button>
            <a href="/__phase2/power" style={{ ...primaryButton, textDecoration: "none", background: "#222" }}>Open Power preview</a>
            <a href="/__phase2/tco" style={{ ...primaryButton, textDecoration: "none", background: "#fff", color: "#222", border: "1px solid #aaa" }}>Open TCO receiving preview</a>
          </div>
          {acceptance && <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: acceptance.ok ? "#eaf7ee" : "#fff0f3", border: `1px solid ${acceptance.ok ? "#b8dec3" : "#efc9cf"}` }}>{acceptance.ok ? `Accepted ${acceptance.acceptedAt}` : acceptance.message}</div>}
        </section>
      </main>
    </div>
  );
}
