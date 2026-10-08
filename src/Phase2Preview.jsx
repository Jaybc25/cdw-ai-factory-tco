import React, { useMemo, useState } from "react";
import {
  PHASE2_DERIVATION,
  PHASE2_SOURCE,
  PHASE2_STATE,
  createPhase2Override,
  evaluatePhase2Override,
  makeProvenance,
  phase2OverrideCanWriteBack,
  recomputePhase2Override,
  revertPhase2Override,
} from "./phase2Contract.js";

const tools = [
  ["Power, cooling and rack planner", "Size rack footprint, design power, cooling requirement and facility fit. Energy cost and facility burden remain separate.", "Wave 1"],
  ["Storage sizer", "Derive fast and bulk capacity plus throughput from the workload, then feed storage requirements downstream.", "Wave 2"],
  ["Software stack and licensing configurator", "Itemize software layers, entitlement terms and year-by-year licensing cost without treating $0 license as $0 operating cost.", "Wave 3"],
  ["Network fabric planner", "Size compute, storage and management fabrics and produce a fleet-size-dependent cost schedule rather than a single per-system scalar.", "Wave 4"],
];

const foundation = [
  "System-profile registry extension",
  "Source + derivation provenance model",
  "Named TCO override contract",
  "Dependency fingerprints and STALE state",
  "User-triggered recompute / revert behavior",
  "Owned datacenter vs colocation facility-cost branches",
  "Pod Brief data contract",
  "Phase 2 gating and seller signal",
];

const styles = {
  page: { minHeight: "100vh", background: "#f5f5f5", color: "#171717", fontFamily: "Arial, Helvetica, sans-serif", padding: "32px 20px 56px" },
  wrap: { width: "min(1120px, 100%)", margin: "0 auto" },
  banner: { background: "#111", color: "#fff", borderLeft: "6px solid #c8102e", padding: "14px 16px", marginBottom: 24, fontSize: 14, lineHeight: 1.45 },
  kicker: { color: "#c8102e", fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", fontSize: 13, marginBottom: 10 },
  h1: { fontSize: "clamp(32px, 5vw, 54px)", lineHeight: 1.02, margin: "0 0 12px", letterSpacing: "-.03em" },
  intro: { fontSize: 18, lineHeight: 1.55, maxWidth: 860, margin: "0 0 28px", color: "#444" },
  section: { background: "#fff", border: "1px solid #ddd", borderRadius: 14, padding: 24, marginBottom: 22, boxShadow: "0 8px 30px rgba(0,0,0,.04)" },
  sectionTitle: { margin: "0 0 8px", fontSize: 24 },
  sectionCopy: { margin: "0 0 18px", color: "#555", lineHeight: 1.5 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 },
  card: { border: "1px solid #ddd", borderRadius: 12, padding: 18, background: "#fafafa" },
  badge: { display: "inline-block", fontSize: 12, fontWeight: 800, color: "#c8102e", background: "#fff0f3", border: "1px solid #f0c5cf", borderRadius: 999, padding: "4px 9px", marginBottom: 10 },
  cardTitle: { margin: "0 0 8px", fontSize: 18, lineHeight: 1.25 },
  cardText: { margin: 0, color: "#555", lineHeight: 1.5, fontSize: 14 },
  list: { margin: 0, paddingLeft: 20, lineHeight: 1.7 },
  flow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10 },
  flowItem: { padding: 14, borderRadius: 10, background: "#f7f7f7", border: "1px solid #e2e2e2", fontWeight: 700, lineHeight: 1.35 },
  demoGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, alignItems: "end" },
  label: { display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6 },
  input: { width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "1px solid #bbb", borderRadius: 8, fontSize: 16, background: "#fff" },
  buttonRow: { display: "flex", flexWrap: "wrap", gap: 10, marginTop: 16 },
  button: { border: 0, borderRadius: 8, padding: "10px 14px", fontWeight: 800, cursor: "pointer", background: "#c8102e", color: "#fff" },
  secondaryButton: { border: "1px solid #aaa", borderRadius: 8, padding: "10px 14px", fontWeight: 700, cursor: "pointer", background: "#fff", color: "#222" },
  statusBox: { marginTop: 18, border: "1px solid #d7d7d7", borderRadius: 10, padding: 16, background: "#fcfcfc" },
  mono: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12, overflowWrap: "anywhere" },
};

function buildEnergyOverride({ systems, avgKwPerSystem, pue, utilityRatePerKwh }) {
  const dependencies = { systems, avgKwPerSystem, pue, utilityRatePerKwh };
  const value = systems * avgKwPerSystem * 730 * pue * utilityRatePerKwh;
  return createPhase2Override({
    id: "power.energy.monthly",
    target: "tco.power.energy.monthly",
    value: Math.round(value),
    unit: "USD/month",
    sourceTool: "power-planner",
    provenance: makeProvenance({
      source: PHASE2_SOURCE.CUSTOMER,
      derivation: PHASE2_DERIVATION.CALCULATED,
      label: "Customer utility rate + workload energy inputs",
    }),
    dependencies,
    referenceValue: 12000,
  });
}

export default function Phase2Preview() {
  const [systems, setSystems] = useState(8);
  const [avgKwPerSystem, setAvgKwPerSystem] = useState(14.4);
  const [pue, setPue] = useState(1.35);
  const [utilityRatePerKwh, setUtilityRatePerKwh] = useState(0.11);
  const [override, setOverride] = useState(() => buildEnergyOverride({ systems: 8, avgKwPerSystem: 14.4, pue: 1.35, utilityRatePerKwh: 0.11 }));

  const dependencies = useMemo(() => ({ systems, avgKwPerSystem, pue, utilityRatePerKwh }), [systems, avgKwPerSystem, pue, utilityRatePerKwh]);
  const evaluated = useMemo(
    () => evaluatePhase2Override(override, dependencies, "Power-planner inputs changed after this TCO override was calculated"),
    [override, dependencies],
  );

  const status = evaluated.state;
  const canWriteBack = phase2OverrideCanWriteBack(evaluated);

  function recompute() {
    const value = Math.round(systems * avgKwPerSystem * 730 * pue * utilityRatePerKwh);
    setOverride(recomputePhase2Override(evaluated, { value, dependencies }));
  }

  function revert() {
    setOverride(revertPhase2Override(evaluated));
  }

  function restart() {
    setOverride(buildEnergyOverride({ systems, avgKwPerSystem, pue, utilityRatePerKwh }));
  }

  return (
    <div style={styles.page}>
      <main style={styles.wrap}>
        <div style={styles.banner}>
          <strong>Phase 2 construction preview.</strong> This route exists only on the Phase 2 feature branch. Nothing here is exposed from the production landing page and nothing writes into production TCO yet.
        </div>

        <div style={styles.kicker}>CDW AI Factory · Phase 2</div>
        <h1 style={styles.h1}>From AI economics to a pod that can actually be built.</h1>
        <p style={styles.intro}>
          Phase 1 answers whether the workload makes sense and what it costs. Phase 2 sizes the site requirements and replaces reference averages with explicit customer-specific inputs. The tools size and cost; CDW engineers design.
        </p>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Wave 0A is now live in this preview</h2>
          <p style={styles.sectionCopy}>
            The contract below is functional, not just mock copy. Change any input and the accepted value becomes STALE without being silently replaced. Recompute explicitly to produce a new write-back-eligible value, or revert it.
          </p>
          <div style={styles.demoGrid}>
            <label><span style={styles.label}>Systems</span><input style={styles.input} type="number" min="1" value={systems} onChange={(e) => setSystems(Number(e.target.value))} /></label>
            <label><span style={styles.label}>Average kW / system</span><input style={styles.input} type="number" step="0.1" min="0" value={avgKwPerSystem} onChange={(e) => setAvgKwPerSystem(Number(e.target.value))} /></label>
            <label><span style={styles.label}>PUE</span><input style={styles.input} type="number" step="0.01" min="1" value={pue} onChange={(e) => setPue(Number(e.target.value))} /></label>
            <label><span style={styles.label}>Utility rate ($/kWh)</span><input style={styles.input} type="number" step="0.01" min="0" value={utilityRatePerKwh} onChange={(e) => setUtilityRatePerKwh(Number(e.target.value))} /></label>
          </div>
          <div style={styles.statusBox}>
            <div style={{ ...styles.badge, marginBottom: 8 }}>{status}</div>
            <div><strong>Accepted Phase 2 energy override:</strong> ${Math.round(evaluated.value).toLocaleString()}/month</div>
            <div><strong>TCO write-back eligible:</strong> {canWriteBack ? "Yes" : "No"}</div>
            <div><strong>Source:</strong> {evaluated.provenance.source} · <strong>Derivation:</strong> {evaluated.provenance.derivation}</div>
            {evaluated.staleReason && <div style={{ marginTop: 8, color: "#9b1c31" }}><strong>Why stale:</strong> {evaluated.staleReason}</div>}
            <div style={{ ...styles.mono, marginTop: 10 }}>Accepted fingerprint: {evaluated.inputFingerprint}</div>
            {evaluated.currentInputFingerprint && <div style={styles.mono}>Current fingerprint: {evaluated.currentInputFingerprint}</div>}
          </div>
          <div style={styles.buttonRow}>
            <button style={styles.button} onClick={recompute} disabled={status === PHASE2_STATE.REVERTED}>Recompute and accept</button>
            <button style={styles.secondaryButton} onClick={revert} disabled={status === PHASE2_STATE.REVERTED}>Revert override</button>
            <button style={styles.secondaryButton} onClick={restart}>Start new override</button>
          </div>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Wave 0 · Shared foundation</h2>
          <p style={styles.sectionCopy}>The first build is plumbing-first: a trustworthy contract for provenance, write-back, dependencies and stale-state handling before calculator math ships.</p>
          <div style={styles.grid}>{foundation.map((item) => <div key={item} style={styles.card}><div style={styles.badge}>FOUNDATION</div><div style={styles.cardTitle}>{item}</div></div>)}</div>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>The four Phase 2 tools</h2>
          <p style={styles.sectionCopy}>Build order is Power → Storage → Software → Network. Final dependency order differs: Storage and Fabric can invalidate Power, so downstream results become STALE until the user explicitly recomputes them.</p>
          <div style={styles.grid}>{tools.map(([name, purpose, statusLabel]) => <article key={name} style={styles.card}><div style={styles.badge}>{statusLabel}</div><h3 style={styles.cardTitle}>{name}</h3><p style={styles.cardText}>{purpose}</p></article>)}</div>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>V2 modeling guardrails already locked</h2>
          <ul style={styles.list}>
            <li>Energy expense and facility burden are separate; utility-rate math never replaces a fully loaded facility-cost assumption.</li>
            <li>Owned datacenter and colocation are separate economic branches.</li>
            <li>Provenance has two dimensions: source and derivation.</li>
            <li>Facility feasibility uses design / maximum rated power; utilization affects energy consumption only.</li>
            <li>Heat rejection is based on IT load, not IT load multiplied by PUE.</li>
            <li>Fabric cost writes back as a fleet-size step schedule.</li>
            <li>Carbon reporting is parked for a later release.</li>
            <li>Open-source software can show $0 license cost, never $0 operating cost.</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
