import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext.jsx";
import { supabase } from "./supabaseClient.js";
import { buildPodBrief } from "./podBriefEngine.js";
import { createAcceptedPodBriefRecord, evaluateAcceptedPodBrief, POD_BRIEF_STATUS } from "./podBriefState.js";
import { loadSessionState, saveSessionState } from "./sessionState.js";

const card = { border: "1px solid #ddd", borderRadius: 12, padding: 16, background: "#fff" };
const label = { fontSize: 12, fontWeight: 800, color: "#555", textTransform: "uppercase", letterSpacing: ".05em" };
const button = { border: 0, borderRadius: 8, padding: "10px 14px", fontWeight: 800, cursor: "pointer", background: "#c8102e", color: "#fff" };

function money(v) { return v == null ? "UNRESOLVED" : `$${Math.round(Number(v)).toLocaleString()}`; }
function num(v, digits = 1) { return v == null ? "—" : Number(v).toFixed(digits); }

function briefStatusTone(brief) {
  if (brief.clientReady) {
    return {
      accent: "#176b31",
      background: "#eaf7ee",
      text: "#176b31",
      explanation: "All required Phase 2 inputs are current and no unresolved quote or pricing items remain.",
    };
  }
  if (brief.engineeringReviewReady) {
    return {
      accent: "#b7791f",
      background: "#fff7e8",
      text: "#7a5600",
      explanation: "Sizing is coherent and current for engineering review, but open commercial or quote items remain before client-ready use.",
    };
  }
  return {
    accent: "#c8102e",
    background: "#fff0f3",
    text: "#8a1026",
    explanation: "One or more accepted dependencies, fleet identities, or freshness checks require review before engineering handoff.",
  };
}

export default function PodBriefPreview() {
  const { session, isLoggedIn } = useAuth();
  const storageBundle = useMemo(() => loadSessionState("phase2-storage-writeback"), []);
  const fabricBundle = useMemo(() => loadSessionState("phase2-network-writeback"), []);
  const powerBundle = useMemo(() => loadSessionState("phase2-power-writeback"), []);
  const softwareBundle = useMemo(() => loadSessionState("phase2-software-writeback"), []);
  const [phase1Snapshot, setPhase1Snapshot] = useState(null);
  const [phase1Loading, setPhase1Loading] = useState(Boolean(isLoggedIn));
  const [acceptedRecord, setAcceptedRecord] = useState(() => loadSessionState("phase2-pod-brief"));
  const [acceptMessage, setAcceptMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadPhase1() {
      if (!session?.user?.id) {
        setPhase1Loading(false);
        return;
      }
      setPhase1Loading(true);
      const { data, error } = await supabase
        .from("tool_snapshots")
        .select("tool,inputs,summary,updated_at")
        .eq("account_id", session.user.id)
        .eq("tool", "tco")
        .maybeSingle();
      if (!cancelled) {
        if (!error && data) setPhase1Snapshot(data);
        setPhase1Loading(false);
      }
    }
    loadPhase1();
    return () => { cancelled = true; };
  }, [session?.user?.id]);

  const dependencies = useMemo(() => ({ storageBundle, fabricBundle, powerBundle, softwareBundle }), [storageBundle, fabricBundle, powerBundle, softwareBundle]);
  const brief = useMemo(() => buildPodBrief({ ...dependencies, phase1Snapshot }), [dependencies, phase1Snapshot]);
  const evaluatedRecord = useMemo(() => evaluateAcceptedPodBrief(acceptedRecord, { dependencies, phase1Snapshot }), [acceptedRecord, dependencies, phase1Snapshot]);
  const statusTone = useMemo(() => briefStatusTone(brief), [brief]);
  const reviewItems = useMemo(() => [...new Set([...(brief.unresolved || []), ...(brief.stale || []), ...(brief.fleetIssues || [])])], [brief.unresolved, brief.stale, brief.fleetIssues]);

  function acceptBrief() {
    const record = createAcceptedPodBriefRecord({ brief, dependencies, phase1Snapshot });
    saveSessionState("phase2-pod-brief", record);
    setAcceptedRecord(record);
    setAcceptMessage("Pod Brief accepted against the current Phase 2 dependencies and saved for this browser workspace. It is intentionally not added to the production My Summary snapshot set during Phase 2 preview.");
  }

  const acceptedState = evaluatedRecord?.state || null;
  const powerMonthlyLabel = brief.economics.powerFacilityComplete ? "Power + facility monthly" : "Power energy monthly (facility unresolved)";
  const powerAnnualLabel = brief.economics.powerFacilityComplete ? "Power + facility annualized" : "Power energy annualized (facility unresolved)";

  return (
    <div className="pod-brief-root" style={{ background: "#f5f5f5", minHeight: "100vh", padding: "24px 16px 56px", fontFamily: "Arial, Helvetica, sans-serif" }}>
      <style>{`
        @media print {
          .pod-brief-root { background:#fff!important; padding:0!important; }
          .pod-brief-root main { width:100%!important; max-width:none!important; margin:0!important; }
          .pod-no-print { display:none!important; }
          .pod-print-card { break-inside:avoid; page-break-inside:avoid; box-shadow:none!important; }
          @page { size: Letter; margin: .45in; }
        }
      `}</style>
      <main style={{ width: "min(1180px, 100%)", margin: "0 auto" }}>
        <div className="pod-no-print" style={{ background: "#111", color: "#fff", borderLeft: "6px solid #c8102e", padding: 14, marginBottom: 20 }}>
          <strong>Phase 2 · Wave 5C remediation.</strong> Durable, dependency-aware, printable Pod Brief with non-additive Phase 1 comparison context.
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 900, color: "#c8102e", letterSpacing: ".08em", textTransform: "uppercase" }}>CDW AI Factory · Pre-Architecture Handoff</div>
            <h1 style={{ margin: "5px 0 8px", fontSize: "clamp(30px, 5vw, 48px)" }}>AI Factory Pod Brief</h1>
            <p style={{ margin: 0, color: "#555", fontSize: 17, lineHeight: 1.55, maxWidth: 900 }}>
              What the environment needs, which Phase 2 economics refine existing Phase 1 assumptions, what remains unresolved, and what CDW engineering should validate next.
            </p>
          </div>
          <div className="pod-print-card" style={{ ...card, minWidth: 280, maxWidth: 380, borderLeft: `6px solid ${statusTone.accent}`, background: statusTone.background }}>
            <div style={label}>Live brief status</div>
            <div style={{ fontSize: 22, fontWeight: 900, marginTop: 6, color: statusTone.text }}>{brief.status}</div>
            <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.45, color: "#555" }}>{statusTone.explanation}</div>
            {acceptedState && <div style={{ marginTop: 10, fontSize: 13 }}><strong>Accepted copy:</strong> {acceptedState}</div>}
          </div>
        </div>

        {evaluatedRecord?.state === POD_BRIEF_STATUS.STALE && (
          <section className="pod-print-card" style={{ ...card, marginTop: 18, background: "#fff7e8", borderColor: "#e4c679" }}>
            <strong style={{ color: "#7a5600" }}>STALE ACCEPTED POD BRIEF</strong>
            <p style={{ marginBottom: 0, lineHeight: 1.5 }}>{evaluatedRecord.staleReason} Re-accept the brief after reviewing the current calculations.</p>
          </section>
        )}

        <section className="pod-no-print" style={{ ...card, marginTop: 18, marginBottom: 18 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <button type="button" onClick={acceptBrief} style={button}>Accept current Pod Brief</button>
            <button type="button" onClick={() => window.print()} style={{ ...button, background: "#222" }}>Print / Save as PDF</button>
            <a href="/__phase2/tco" style={{ ...button, textDecoration: "none", background: "#fff", color: "#222", border: "1px solid #aaa" }}>Open Phase 2 TCO preview</a>
          </div>
          {acceptMessage && <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: "#eaf7ee", border: "1px solid #b8dec3" }}>{acceptMessage}</div>}
          {evaluatedRecord && <div style={{ marginTop: 10, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12, overflowWrap: "anywhere" }}>Accepted dependency fingerprint: {evaluatedRecord.dependencyFingerprint}</div>}
        </section>

        <section style={{ marginTop: 20, marginBottom: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}>
            <div className="pod-print-card" style={card}><div style={label}>Compute system</div><div style={{ fontSize: 24, fontWeight: 900, marginTop: 6 }}>{brief.compute.systemName || "—"}</div></div>
            <div className="pod-print-card" style={card}><div style={label}>Total racks</div><div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>{brief.compute.totalRacks ?? "—"}</div></div>
            <div className="pod-print-card" style={card}><div style={label}>Design IT load</div><div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>{num(brief.facility?.designItKw)} kW</div></div>
            <div className="pod-print-card" style={card}><div style={label}>Facility demand</div><div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>{num(brief.facility?.facilityDesignKw)} kW</div></div>
            <div className="pod-print-card" style={card}><div style={label}>Cooling</div><div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>{num(brief.facility?.coolingTons)} tons</div></div>
            <div className="pod-print-card" style={card}><div style={label}>Storage raw</div><div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>{brief.storage ? Math.round(brief.storage.totalRawTb).toLocaleString() : "—"} TB</div></div>
            <div className="pod-print-card" style={card}><div style={label}>Fabric</div><div style={{ fontSize: 24, fontWeight: 900, marginTop: 6 }}>{brief.fabric ? `${brief.fabric.technology} · ${brief.fabric.linkGbps}G` : "—"}</div></div>
            <div className="pod-print-card" style={card}><div style={label}>Software horizon</div><div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>{brief.software?.horizonYears ?? "—"} years</div></div>
          </div>
        </section>

        <section className="pod-print-card" style={{ ...card, marginBottom: 18 }}>
          <h2 style={{ marginTop: 0 }}>1. Storage requirement</h2>
          {brief.storage ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}>
            <div><strong>Fast usable</strong><br />{Math.round(brief.storage.fastUsableTb).toLocaleString()} TB</div>
            <div><strong>Bulk usable</strong><br />{Math.round(brief.storage.bulkUsableTb).toLocaleString()} TB</div>
            <div><strong>Raw provisioned</strong><br />{Math.round(brief.storage.totalRawTb).toLocaleString()} TB</div>
            <div><strong>Storage racks</strong><br />{brief.storage.storageRacks}</div>
            <div><strong>Storage power</strong><br />{num(brief.storage.storagePowerKw)} kW</div>
            <div><strong>Aggregate bandwidth</strong><br />{num(brief.storage.aggregateGBps ?? brief.storage.aggregateGbps)} GB/s</div>
          </div> : <p>No accepted Storage requirement.</p>}
        </section>

        <section className="pod-print-card" style={{ ...card, marginBottom: 18 }}>
          <h2 style={{ marginTop: 0 }}>2. Network fabric requirement</h2>
          {brief.fabric ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}>
            <div><strong>Technology</strong><br />{brief.fabric.technology}</div><div><strong>Topology</strong><br />{brief.fabric.topology}</div>
            <div><strong>Leaf / spine</strong><br />{brief.fabric.switches?.leaf ?? 0} / {brief.fabric.switches?.spine ?? 0}</div>
            <div><strong>Endpoint ports</strong><br />{brief.fabric.endpointPorts ?? "—"}</div><div><strong>Total links</strong><br />{brief.fabric.totalLinks ?? "—"}</div>
            <div><strong>Switch power</strong><br />{num(brief.fabric.switchPowerKw)} kW</div><div><strong>Fleet schedule steps</strong><br />{brief.fabric.fleetStepSchedule.length}</div>
          </div> : <p>No accepted Fabric requirement.</p>}
        </section>

        <section className="pod-print-card" style={{ ...card, marginBottom: 18 }}>
          <h2 style={{ marginTop: 0 }}>3. Facility requirement</h2>
          {brief.facility ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}>
            <div><strong>Facility verdict</strong><br />{brief.facility.verdict}</div><div><strong>Design IT</strong><br />{num(brief.facility.designItKw)} kW</div>
            <div><strong>Facility demand</strong><br />{num(brief.facility.facilityDesignKw)} kW</div><div><strong>Cooling</strong><br />{num(brief.facility.coolingTons)} tons</div>
            <div><strong>Compute racks</strong><br />{brief.facility.racks?.compute ?? "—"}</div><div><strong>Storage racks</strong><br />{brief.facility.racks?.storage ?? "—"}</div><div><strong>Network racks</strong><br />{brief.facility.racks?.network ?? "—"}</div>
          </div> : <p>No accepted Power requirement.</p>}
        </section>

        <section className="pod-print-card" style={{ ...card, marginBottom: 18 }}>
          <h2 style={{ marginTop: 0 }}>4. Software stack</h2>
          {brief.software ? <><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12, marginBottom: 12 }}>
            <div><strong>Components</strong><br />{brief.software.components.length}</div><div><strong>Year 1 recurring</strong><br />{money(brief.software.totals?.annualRecurringYear1)}</div>
            <div><strong>Implementation</strong><br />{money(brief.software.totals?.implementation)}</div><div><strong>Horizon total</strong><br />{money(brief.software.totals?.total)}</div>
          </div><ul style={{ lineHeight: 1.6 }}>{brief.software.components.map((item) => <li key={`${item.name}-${item.unit}`}><strong>{item.name}</strong> — {item.mode} · {item.priceSource} · {item.unit} × {item.quantity}</li>)}</ul></> : <p>No accepted Software requirement.</p>}
        </section>

        <section className="pod-print-card" style={{ ...card, marginBottom: 18, borderLeft: "6px solid #c8102e" }}>
          <h2 style={{ marginTop: 0 }}>5. Phase 2 refined cost lines</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}>
            <div><strong>{powerMonthlyLabel}</strong><br />{money(brief.economics.powerMonthly)}</div><div><strong>{powerAnnualLabel}</strong><br />{money(brief.economics.powerAnnualized)}</div>
            <div><strong>Fabric current-fleet CAPEX</strong><br />{money(brief.economics.networkCapex)}</div><div><strong>Software Year 1</strong><br />{money(brief.economics.softwareByYear?.[1])}</div>
          </div>
          <p style={{ color: "#666", marginBottom: 0, marginTop: 12 }}>{brief.economics.note}</p>
        </section>

        <section className="pod-print-card" style={{ ...card, marginBottom: 18 }}>
          <h2 style={{ marginTop: 0 }}>6. Phase 1 context and Phase 2 line comparison</h2>
          {phase1Loading ? <p>Loading saved Phase 1 TCO snapshot…</p> : brief.phase1Comparison ? <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}>
              <div><strong>Phase 1 on-prem total</strong><br />{money(brief.phase1Comparison.baselineOnPrem)}</div>
              <div><strong>Phase 1 cloud baseline</strong><br />{brief.phase1Comparison.baselineCloud == null ? "—" : money(brief.phase1Comparison.baselineCloud)}</div>
              <div><strong>{brief.economics.powerFacilityComplete ? "Phase 2 power/facility annualized" : "Phase 2 power energy annualized (facility unresolved)"}</strong><br />{money(brief.phase1Comparison.phase2RefinedLines.powerFacilityAnnualized)}</div>
              <div><strong>Phase 2 fabric CAPEX</strong><br />{money(brief.phase1Comparison.phase2RefinedLines.networkCapex)}</div>
              <div><strong>Phase 2 software over Phase 1 horizon</strong><br />{money(brief.phase1Comparison.phase2RefinedLines.softwareHorizon)}</div>
            </div>
            <div style={{ marginTop: 14, padding: 12, borderRadius: 8, background: "#fff7e8", border: "1px solid #e4c679", lineHeight: 1.55 }}>
              <strong>Replacement/additive treatment required.</strong> Phase 1 already contains overlapping power, networking, software, and storage economics. Power and Fabric Phase 2 lines refine/replace Phase 1 assumptions and remain blocked until exact replacement mapping exists; only Software components explicitly classified as incremental are additive. Adjusted on-prem cost and savings remain intentionally suppressed until those mappings are complete.
            </div>
            <p style={{ color: "#666", marginBottom: 0 }}>{brief.phase1Comparison.note}</p>
          </> : <p>No saved Phase 1 TCO account snapshot is available yet. Run/save TCO while signed in to populate comparison context.</p>}
        </section>

        {reviewItems.length > 0 && <section className="pod-print-card" style={{ ...card, marginBottom: 18, background: brief.engineeringReviewReady ? "#fff7e8" : "#fff0f3", borderColor: brief.engineeringReviewReady ? "#e4c679" : "#efc9cf" }}>
          <h2 style={{ marginTop: 0 }}>7. Unresolved / review-required items</h2>
          <ul style={{ lineHeight: 1.6 }}>{reviewItems.map((item) => <li key={item}>{item}</li>)}</ul>
          {brief.fleetIssues.length > 0 && <p style={{ marginBottom: 0, color: "#555" }}><strong>Fleet coherence:</strong> fleet-identity issues block engineering-review readiness until the accepted Phase 2 bundles can be compared to the canonical Phase 1 fleet.</p>}
        </section>}

        <section className="pod-print-card" style={{ ...card, marginBottom: 18 }}>
          <h2 style={{ marginTop: 0 }}>8. CDW engineering handoff</h2>
          <ul style={{ lineHeight: 1.7 }}>{brief.engineeringHandoff.map((item) => <li key={item}>{item}</li>)}</ul>
          <p style={{ marginBottom: 0, color: "#555" }}><strong>Boundary:</strong> the tools size and cost. CDW engineers design.</p>
        </section>

        <section className="pod-no-print" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a href="/__phase2/storage" style={{ textDecoration: "none", background: "#222", color: "#fff", borderRadius: 8, padding: "10px 14px", fontWeight: 800 }}>Storage</a>
          <a href="/__phase2/network" style={{ textDecoration: "none", background: "#222", color: "#fff", borderRadius: 8, padding: "10px 14px", fontWeight: 800 }}>Fabric</a>
          <a href="/__phase2/power" style={{ textDecoration: "none", background: "#222", color: "#fff", borderRadius: 8, padding: "10px 14px", fontWeight: 800 }}>Power</a>
          <a href="/__phase2/software" style={{ textDecoration: "none", background: "#222", color: "#fff", borderRadius: 8, padding: "10px 14px", fontWeight: 800 }}>Software</a>
          <a href="/__phase2/tco" style={{ textDecoration: "none", background: "#c8102e", color: "#fff", borderRadius: 8, padding: "10px 14px", fontWeight: 800 }}>TCO receiving preview</a>
        </section>
      </main>
    </div>
  );
}
