import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import cdwLogo from "./cdw-logo.png";
import { AuthProvider, useAuth } from "./AuthContext";
import AuthWidget from "./AuthWidget";
import {
  DEFAULT_INPUTS, BOUNDS, validateInputs, computeEngine,
  PAYBACK_GUARD_TEXT, NA_TEXT, excelRound,
} from "./engine";

// ---------------------------------------------------------------------------
// CDW brand tokens (matches TCO / GPU Sizing / Use Case Explorer)
// ---------------------------------------------------------------------------
const RED = "#CC0000";
const CHARCOAL = "#2D2D2D";
const GRAY_BORDER = "#D1D5DB";
const GRAY_TEXT = "#595959";
const BG = "#FFFFFF";

const styles = {
  page: { background: BG, minHeight: "100vh", fontFamily: "'Inter', system-ui, sans-serif", padding: "0 24px 48px", color: CHARCOAL },
  header: { display: "flex", alignItems: "center", gap: 16, padding: "24px 0", marginBottom: 24, borderBottom: `1px solid ${GRAY_BORDER}` },
  eyebrow: { fontSize: 11, fontWeight: 700, letterSpacing: 1, color: RED, textTransform: "uppercase" },
  title: { fontSize: 20, fontWeight: 700, color: CHARCOAL, margin: 0 },
  versionPill: { fontSize: 10, fontWeight: 700, padding: "4px 8px", borderRadius: 6, background: RED, color: "#fff", whiteSpace: "nowrap" },
  logoWordmark: { fontSize: 22, fontWeight: 800, color: RED, letterSpacing: -0.5 },
};

function fmtInt(n) {
  return Math.round(n).toLocaleString();
}
function fmtUsd(n) {
  const abs = Math.abs(n);
  if (abs >= 1e6) return `${n < 0 ? "-" : ""}$${(abs / 1e6).toFixed(2)}M`;
  return `${n < 0 ? "-" : ""}$${Math.round(abs).toLocaleString()}`;
}
function fmtPct(n) {
  return `${(n * 100).toFixed(0)}%`;
}

function TipDot({ tip }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    function onOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onOutside, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onOutside, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <span style={{ position: "relative", display: "inline-block", marginLeft: 6 }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="More info"
        style={{ width: 16, height: 16, borderRadius: 8, border: `1.5px solid ${RED}`, background: "transparent", color: RED, fontSize: 10, fontWeight: 700, lineHeight: "14px", padding: 0, cursor: "pointer" }}
      >
        ?
      </button>
      {open && (
        <div ref={ref} style={{ position: "absolute", zIndex: 30, top: 22, left: 0, width: 260, background: "#fff", border: `1.5px solid ${RED}`, borderRadius: 10, padding: 12, fontSize: 12, color: CHARCOAL, boxShadow: "0 8px 24px rgba(0,0,0,0.15)" }}>
          {tip}
        </div>
      )}
    </span>
  );
}

function Field({ label, tip, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", fontSize: 13, fontWeight: 600, color: CHARCOAL, marginBottom: 4 }}>
        {label}
        {tip && <TipDot tip={tip} />}
      </div>
      {children}
    </div>
  );
}

function NumberField({ value, onChange, unit, min, max }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        style={{ flex: 1, border: `1px solid ${GRAY_BORDER}`, borderRadius: 8, padding: "9px 12px", fontSize: 14, color: CHARCOAL }}
      />
      {unit && <span style={{ fontSize: 12, color: GRAY_TEXT }}>{unit}</span>}
    </div>
  );
}

function SectionHeader({ children }) {
  return (
    <div style={{ background: RED, color: "#fff", fontSize: 13, fontWeight: 700, letterSpacing: 0.3, padding: "10px 16px", borderRadius: 8, marginBottom: 16, textTransform: "uppercase" }}>
      {children}
    </div>
  );
}

function CapacityPanel({ inputs, engine }) {
  return (
    <div style={{ background: CHARCOAL, color: "#fff", borderRadius: 12, padding: 16, minWidth: 220 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "#ABABAB", textTransform: "uppercase", marginBottom: 4 }}>Capacity (current state)</div>
      <div style={{ fontSize: 28, fontWeight: 700 }}>{fmtInt(engine.grossCapacity)}</div>
      <div style={{ fontSize: 11, color: "#ABABAB" }}>gross capacity (tasks/yr)</div>
    </div>
  );
}

function ResultTile({ label, value, sub }) {
  return (
    <div style={{ background: "#F7F7F7", borderRadius: 10, padding: 14, flex: 1, minWidth: 160 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: GRAY_TEXT, textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: CHARCOAL }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: GRAY_TEXT, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function AppInner() {
  const { isLoggedIn, needsSetup, account, logDownloadEvent } = useAuth();

  const [inputs, setInputs] = useState(DEFAULT_INPUTS);
  const [view, setView] = useState("calc");
  const [lead, setLead] = useState({ name: "", company: "", email: "" });
  const [leadStatus, setLeadStatus] = useState("");

  const isMobile = false;
  const set = (key) => (val) => setInputs((prev) => ({ ...prev, [key]: val }));
  const errors = useMemo(() => validateInputs(inputs), [inputs]);
  const engine = useMemo(() => (errors.length ? null : computeEngine(inputs)), [inputs, errors]);

  function requestReport() {
    if (isLoggedIn && !needsSetup && account) {
      setLead({ name: account.name || "", company: account.company || "", email: account.email || "" });
      logDownloadEvent("roi", {
        peoplePerformingTask: inputs.peoplePerformingTask,
        tasksPerPersonPerDay: inputs.tasksPerPersonPerDay,
        annualSavings: engine?.annualSavings ?? null,
        paybackMonths: engine?.paybackMonths ?? null,
      });
      setView("report");
    } else {
      setView("gate");
    }
  }

  function submitLead() {
    if (!lead.name || !lead.email || !lead.company) { setLeadStatus("Please fill in all three fields."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) { setLeadStatus("Please enter a valid email address."); return; }
    setLeadStatus("");
    setView("report");
  }

  return (
    <div style={{ ...styles.page, padding: isMobile ? "0 12px 32px" : styles.page.padding }}>
      <style>{`@media print { .no-print { display: none !important; } body { background: #fff; } }`}</style>
      <div style={{
        ...styles.header,
        padding: isMobile ? "14px 0" : styles.header.padding,
        marginBottom: isMobile ? 16 : styles.header.marginBottom,
        gap: isMobile ? 8 : styles.header.gap,
      }}>
        <a href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center" }} aria-label="AI Factory Tools home">
          <img src={cdwLogo} alt="CDW" style={{ height: 36, width: "auto" }} />
        </a>
        <div>
          <div style={styles.eyebrow}>AI Factory Tools</div>
          <h1 style={styles.title}>AI Use Case ROI Calculator</h1>
        </div>
        <span style={{
          ...styles.versionPill,
          marginLeft: isMobile ? 0 : "auto",
        }}>PROTOTYPE v1.0</span>
      </div>

      <div className="no-print" style={{ padding: "0 0 12px", display: "flex", justifyContent: "flex-end", borderBottom: `1px solid ${GRAY_BORDER}`, marginBottom: 16 }}>
        <AuthWidget />
      </div>

      {view === "gate" && (
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 0" }}>
          <div style={{ border: `1px solid ${GRAY_BORDER}`, borderRadius: 12, padding: 24 }}>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4, color: CHARCOAL }}>Get the full ROI report</div>
            <div style={{ fontSize: 12, color: GRAY_TEXT, marginBottom: 16 }}>
              The report includes the full scenario economics -- capacity, savings, payback -- as an executive-summary-ready artifact.
            </div>
            {["name", "company", "email"].map((f) => (
              <input
                key={f}
                placeholder={f === "name" ? "Full name" : f === "company" ? "Company" : "Work email"}
                value={lead[f]}
                type={f === "email" ? "email" : "text"}
                onChange={(e) => setLead({ ...lead, [f]: e.target.value })}
                style={{ width: "100%", boxSizing: "border-box", fontSize: 14, padding: "11px 12px", marginBottom: 8, borderRadius: 8, border: `1px solid ${GRAY_BORDER}`, color: CHARCOAL }}
              />
            ))}
            {leadStatus && <div style={{ fontSize: 12, color: RED, marginBottom: 8 }}>{leadStatus}</div>}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={submitLead} style={{ flex: 1, fontWeight: 700, fontSize: 14, padding: 12, borderRadius: 8, border: "none", cursor: "pointer", background: RED, color: "#fff" }}>
                View my report
              </button>
              <button onClick={() => setView("calc")} style={{ fontSize: 14, padding: "12px 14px", borderRadius: 8, border: `1px solid ${GRAY_BORDER}`, cursor: "pointer", background: "#fff", color: GRAY_TEXT }}>
                Back
              </button>
            </div>
          </div>
        </div>
      )}

      {view === "report" && engine && (
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "12px 0" }}>
          <div className="no-print" style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            <button onClick={() => window.print()} style={{ flex: 1, fontWeight: 700, fontSize: 13, padding: 10, borderRadius: 8, border: "none", cursor: "pointer", background: CHARCOAL, color: "#fff" }}>
              Print / Save as PDF
            </button>
            <button onClick={() => setView("calc")} style={{ fontSize: 13, padding: "10px 12px", borderRadius: 8, border: `1px solid ${GRAY_BORDER}`, cursor: "pointer", background: "#fff", color: GRAY_TEXT }}>
              Back to calculator
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <img src={cdwLogo} alt="CDW" style={{ height: 32, width: "auto" }} />
            <div style={{ fontSize: 10, letterSpacing: 1.5, color: GRAY_TEXT, textTransform: "uppercase" }}>AI Factory &middot; ROI Executive Summary</div>
          </div>
          <div style={{ fontSize: 21, fontWeight: 700, margin: "4px 0 2px", color: CHARCOAL }}>
            Prepared for {lead.name || "you"}{lead.company ? `, ${lead.company}` : ""}
          </div>
          <div style={{ fontSize: 12, color: GRAY_TEXT, marginBottom: 16 }}>{new Date().toLocaleDateString()}</div>

          <div style={{ background: engine.annualSavings > 0 ? "#FBEAEA" : "#F1F1F1", borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: RED, textTransform: "uppercase" }}>Annual Savings</div>
            <div style={{ fontSize: 30, fontWeight: 700, color: RED }}>{fmtUsd(engine.annualSavings)}</div>
            <div style={{ fontSize: 12, color: CHARCOAL }}>
              Payback: {engine.paybackMonths != null ? `${excelRound(engine.paybackMonths)} months` : PAYBACK_GUARD_TEXT}
            </div>
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: GRAY_TEXT, textTransform: "uppercase", marginBottom: 8 }}>Scenario inputs</div>
          <div style={{ border: `1px solid ${GRAY_BORDER}`, borderRadius: 10, padding: 14, marginBottom: 16, fontSize: 13, color: CHARCOAL }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", rowGap: 6, columnGap: 12 }}>
              <div style={{ color: GRAY_TEXT }}>People performing this task</div><div>{fmtInt(inputs.peoplePerformingTask)}</div>
              <div style={{ color: GRAY_TEXT }}>Tasks per person per working day</div><div>{inputs.tasksPerPersonPerDay}</div>
            </div>
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: GRAY_TEXT, textTransform: "uppercase", marginBottom: 8 }}>Capacity &amp; economics</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
            <ResultTile label="Gross capacity" value={fmtInt(engine.grossCapacity)} sub="tasks/yr, current state" />
            {engine.hoursSavedAnnual != null && <ResultTile label="Hours saved / yr" value={fmtInt(engine.hoursSavedAnnual)} />}
            {engine.roiPct != null && <ResultTile label="ROI" value={fmtPct(engine.roiPct)} />}
          </div>

          <div style={{ fontSize: 11, color: GRAY_TEXT, padding: 14, background: "#F7F7F7", borderRadius: 10, marginBottom: 16, lineHeight: 1.5 }}>
            This is a directional scenario model based on the inputs above, not a validated business case. Actual
            savings depend on real adoption rates, task complexity, and change-management execution. Confirm with a
            CDW AI Factory specialist before using these figures in a formal business case.
          </div>

          <div style={{ borderTop: `2px solid ${CHARCOAL}`, marginTop: 8, paddingTop: 10, display: "flex", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: CHARCOAL }}>Jay B. Carlile</div>
              <div style={{ fontSize: 11, color: GRAY_TEXT }}>AI Solutions Executive &middot; CDW AI Factory</div>
            </div>
            <div style={{ fontSize: 11, color: GRAY_TEXT, textAlign: "right" }}>Next step: bring your actual<br />workload data for a validated model</div>
          </div>
        </div>
      )}

      {view === "calc" && (
      <>
      <SectionHeader>Workload (current state)</SectionHeader>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 32 }}>
        <div style={{ flex: 2, minWidth: 280 }}>
          <Field label="People performing this task" tip="How many people currently do this task, at least part of their role.">
            <NumberField value={inputs.peoplePerformingTask} onChange={set("peoplePerformingTask")} unit="count" min={BOUNDS.peoplePerformingTask?.min} max={BOUNDS.peoplePerformingTask?.max} />
          </Field>
          <Field label="Tasks per person per working day" tip="How many times one person completes this task on a typical working day.">
            <NumberField value={inputs.tasksPerPersonPerDay} onChange={set("tasksPerPersonPerDay")} min={BOUNDS.tasksPerPersonPerDay?.min} max={BOUNDS.tasksPerPersonPerDay?.max} />
          </Field>
        </div>
        {engine && <CapacityPanel inputs={inputs} engine={engine} />}
      </div>

      {errors.length > 0 ? (
        <div style={{ background: "#FBEAEA", border: "1px solid #CC0000", borderRadius: 10, padding: 16, marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: RED, marginBottom: 6, textTransform: "uppercase" }}>Fix these before continuing</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: CHARCOAL }}>
            {errors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      ) : engine && (
        <>
          <SectionHeader>Results</SectionHeader>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
            <ResultTile label="Annual savings" value={fmtUsd(engine.annualSavings)} />
            <ResultTile label="Payback" value={engine.paybackMonths != null ? `${excelRound(engine.paybackMonths)} mo` : NA_TEXT} />
            {engine.hoursSavedAnnual != null && <ResultTile label="Hours saved / yr" value={fmtInt(engine.hoursSavedAnnual)} />}
          </div>

          <button
            onClick={requestReport}
            style={{ width: "100%", fontWeight: 700, fontSize: 15, padding: 14, borderRadius: 10, border: "none", cursor: "pointer", background: RED, color: "#fff" }}
          >
            Get the full ROI report
          </button>
        </>
      )}
      </>
      )}
    </div>
  );
}

export default function RoiCalculator() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
