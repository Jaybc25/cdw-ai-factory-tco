import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import cdwLogo from "./cdw-logo.png";
import { AuthProvider, useAuth, useAutosaveSnapshot } from "./AuthContext";
import AuthWidget from "./AuthWidget";
import { loadSessionState, saveSessionState } from "./sessionState.js";
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
  page: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    background: BG,
    color: CHARCOAL,
    maxWidth: 1100,
    margin: "0 auto",
    padding: "0 16px 48px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    borderBottom: `1px solid ${GRAY_BORDER}`,
    padding: "20px 0",
    marginBottom: 24,
    flexWrap: "wrap",
  },
  logoWordmark: {
    fontWeight: 800,
    fontSize: 20,
    color: RED,
    letterSpacing: "-0.02em",
  },
  eyebrow: {
    color: RED,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    margin: "2px 0 0",
    color: CHARCOAL,
  },
  versionPill: {
    marginLeft: "auto",
    background: RED,
    color: "#fff",
    fontSize: 11,
    fontWeight: 700,
    padding: "4px 10px",
    borderRadius: 999,
    letterSpacing: "0.03em",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "minmax(0,1.1fr) minmax(0,0.9fr)",
    gap: 24,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    background: RED,
    color: "#fff",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    padding: "8px 12px",
    borderRadius: 6,
    marginBottom: 12,
  },
  field: {
    marginBottom: 14,
  },
  fieldLabelRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: CHARCOAL,
  },
  inputRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  input: {
    flex: 1,
    border: `1px solid ${GRAY_BORDER}`,
    borderRadius: 6,
    padding: "8px 10px",
    fontSize: 14,
    fontFamily: "inherit",
    color: CHARCOAL,
    background: "#fff",
  },
  inputError: {
    borderColor: RED,
  },
  unit: {
    fontSize: 12,
    color: GRAY_TEXT,
    minWidth: 48,
  },
  errorText: {
    fontSize: 11,
    color: RED,
    marginTop: 3,
  },
  tipDot: {
    width: 16,
    height: 16,
    borderRadius: "50%",
    border: `1.5px solid ${RED}`,
    color: RED,
    fontSize: 10,
    fontWeight: 700,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    background: "#fff",
    flexShrink: 0,
  },
  tipBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: 20,
  },
  tipCard: {
    background: "#fff",
    border: `1.5px solid ${RED}`,
    borderRadius: 10,
    padding: 18,
    maxWidth: 360,
    boxShadow: "0 12px 32px rgba(0,0,0,0.2)",
    position: "relative",
  },
  tipClose: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: "50%",
    border: "none",
    background: "#f2f2f2",
    color: CHARCOAL,
    fontSize: 14,
    cursor: "pointer",
  },
  tipText: {
    fontSize: 13,
    lineHeight: 1.5,
    color: CHARCOAL,
    paddingRight: 20,
  },
  resultsCard: {
    background: CHARCOAL,
    borderRadius: 12,
    padding: 20,
    color: "#fff",
    position: "sticky",
    top: 16,
  },
  resultsSectionHeader: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "#F5A3A3",
    borderBottom: "1px solid rgba(255,255,255,0.15)",
    paddingBottom: 6,
    marginBottom: 10,
    marginTop: 18,
  },
  resultRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 8,
    gap: 10,
  },
  resultLabel: {
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
  },
  resultLabelSecondary: {
    fontSize: 12,
    color: "rgba(255,255,255,0.55)",
    fontStyle: "italic",
  },
  resultValue: {
    fontSize: 15,
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  resultValueSecondary: {
    fontSize: 13,
    fontWeight: 500,
    color: "rgba(255,255,255,0.6)",
    whiteSpace: "nowrap",
  },
  headlineValue: {
    fontSize: 30,
    fontWeight: 800,
    borderBottom: `3px solid ${RED}`,
    display: "inline-block",
    paddingBottom: 2,
  },
  note: {
    fontSize: 11,
    color: "rgba(255,255,255,0.55)",
    lineHeight: 1.5,
    marginTop: 4,
  },
  guardrail: {
    marginTop: 20,
    padding: 12,
    border: `1px solid ${RED}`,
    borderRadius: 8,
    fontSize: 12,
    fontStyle: "italic",
    fontWeight: 600,
    color: RED,
    lineHeight: 1.5,
  },
  expandToggle: {
    background: "none",
    border: "none",
    color: "#F5A3A3",
    fontSize: 12,
    cursor: "pointer",
    padding: 0,
    marginBottom: 8,
    textDecoration: "underline",
  },
  guardText: {
    fontSize: 13,
    fontWeight: 700,
    color: "#F5A3A3",
  },
};

// ---------------------------------------------------------------------------
// TipDot / TipBox — modal tooltip, matches the GPU Sizing Tool's v1.6 pattern:
// closes on any tap outside the card (document pointerdown, capture phase),
// Escape key, or the close button. Not backdrop-geometry dependent.
// ---------------------------------------------------------------------------
function TipDot({ id, text, openTipId, setOpenTipId }) {
  const cardRef = useRef(null);
  const isOpen = openTipId === id;

  useEffect(() => {
    if (!isOpen) return;
    function handlePointerDown(e) {
      if (cardRef.current && !cardRef.current.contains(e.target)) {
        setOpenTipId(null);
      }
    }
    function handleKey(e) {
      if (e.key === "Escape") setOpenTipId(null);
    }
    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKey);
    };
  }, [isOpen, setOpenTipId]);

  return (
    <>
      <button
        type="button"
        aria-label="More info"
        style={styles.tipDot}
        onClick={() => setOpenTipId(isOpen ? null : id)}
      >
        ?
      </button>
      {isOpen && typeof document !== "undefined" && createPortal(
        <div style={styles.tipBackdrop}>
          <div ref={cardRef} style={styles.tipCard}>
            <button
              type="button"
              aria-label="Close"
              style={styles.tipClose}
              onClick={() => setOpenTipId(null)}
            >
              ×
            </button>
            <div style={styles.tipText}>{text}</div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Field — a labeled, bounded input with an optional tooltip and inline error
// ---------------------------------------------------------------------------
function Field({
  label, unit, value, onChange, error, tip, id, openTipId, setOpenTipId,
  step = "any", isPercent = false,
}) {
  const displayValue = isPercent && value !== "" ? value * 100 : value;
  const handleChange = (e) => {
    const raw = e.target.value;
    if (raw === "") { onChange(""); return; }
    const num = Number(raw);
    onChange(isPercent ? num / 100 : num);
  };
  return (
    <div style={styles.field}>
      <div style={styles.fieldLabelRow}>
        <span style={styles.fieldLabel}>{label}</span>
        {tip && <TipDot id={id} text={tip} openTipId={openTipId} setOpenTipId={setOpenTipId} />}
      </div>
      <div style={styles.inputRow}>
        <input
          type="number"
          step={step}
          style={{ ...styles.input, ...(error ? styles.inputError : {}) }}
          value={displayValue}
          onChange={handleChange}
        />
        <span style={styles.unit}>{unit}</span>
      </div>
      {error && <div style={styles.errorText}>{error}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------
const fmtCurrency = (v) => v == null ? NA_TEXT :
  `$${excelRound(v, 0).toLocaleString("en-US")}`;
const fmtHours = (v) => v == null ? NA_TEXT :
  `${excelRound(v, 0).toLocaleString("en-US")} hrs/yr`;
const fmtPercent = (v) => v == null ? NA_TEXT : `${(v * 100).toFixed(1)}%`;
const fmtMonths = (v) => v == null ? PAYBACK_GUARD_TEXT : `${v.toFixed(1)} months`;
const fmtFte = (v) => v == null ? NA_TEXT : `~${v.toFixed(1)} FTE-equivalent`;

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
function getIncomingParams() {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search);
}

function getInitialInputs(savedInputs) {
  const params = getIncomingParams();
  const initialCost = params?.get("initialCost");
  const recurringCost = params?.get("recurringCost");
  const base = savedInputs ?? DEFAULT_INPUTS;
  if (initialCost == null && recurringCost == null) return base;
  return {
    ...base,
    ...(initialCost != null && !Number.isNaN(+initialCost) ? { initialCost: +initialCost } : {}),
    ...(recurringCost != null && !Number.isNaN(+recurringCost) ? { recurringCost: +recurringCost } : {}),
  };
}

function getInitialPlanningBasis() {
  const raw = getIncomingParams()?.get("planningBasis");
  return raw === "workload" || raw === "spend" ? raw : null;
}

function AuditFormula({ label, formula, substituted, result }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: CHARCOAL, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 10.5, color: GRAY_TEXT }}>{formula}</div>
      <div style={{ fontSize: 10.5, color: GRAY_TEXT }}>{substituted}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: CHARCOAL, marginTop: 2 }}>= {result}</div>
    </div>
  );
}

// Genuine reconciliation: "calculated" redoes the arithmetic in the audit's
// own rendering code, starting only from already-engine-provided
// intermediate values (never re-deriving those intermediates itself), and
// compares the result to the engine's own field for that same formula --
// two independent evaluations of the same arithmetic, not one property read
// twice.
function ReconCheck({ label, parts, calculated, engineValue, format }) {
  if (engineValue == null || calculated == null) {
    return (
      <div style={{ border: `1px solid ${GRAY_BORDER}`, borderRadius: 8, padding: "12px 14px", marginBottom: 10, background: "#F7F7F7" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: CHARCOAL, marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 11, color: GRAY_TEXT }}>Not applicable in this scenario ({PAYBACK_GUARD_TEXT.toLowerCase()}).</div>
      </div>
    );
  }
  const isPercent = format === "percent";
  const fmt = isPercent ? fmtPercent : fmtCurrency;
  const diff = Math.abs(calculated - engineValue);
  const pass = diff < (isPercent ? 0.0005 : 1); // percent is stored as a decimal ratio (0.0005 = 0.05 percentage points); currency needs sub-dollar tolerance for floating point only
  return (
    <div style={{ border: `1px solid ${pass ? "#1E7A3D" : RED}`, borderRadius: 8, padding: "12px 14px", marginBottom: 10, background: pass ? "#EAF6EE" : "#FEF2F2" }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: CHARCOAL, marginBottom: 6 }}>{label}</div>
      {parts.map((p, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: GRAY_TEXT, marginBottom: 2 }}>
          <span>{p.label}</span><span>{p.value}</span>
        </div>
      ))}
      <div style={{ borderTop: `1px solid ${GRAY_BORDER}`, marginTop: 4, paddingTop: 4, display: "flex", justifyContent: "space-between", fontSize: 11.5, fontWeight: 600, color: CHARCOAL }}>
        <span>Reconstructed from constituent parts above</span><span>{fmt(calculated)}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: GRAY_TEXT }}>
        <span>Engine's own value (separate code path)</span><span>{fmt(engineValue)}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, fontWeight: 700, marginTop: 4, color: pass ? "#1E7A3D" : RED }}>
        <span>Difference: {isPercent ? `${(diff * 100).toFixed(2)} pts` : diff < 0.001 ? "$0" : fmtCurrency(diff)}</span><span>{pass ? "RECONCILED" : "MISMATCH — FLAG THIS"}</span>
      </div>
    </div>
  );
}

function AuditRow({ label, value, sub }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", padding: "5px 0", fontSize: 12 }}>
      <div style={{ color: GRAY_TEXT }}>{label}{sub && <div style={{ fontSize: 10, color: "#8A8A8A" }}>{sub}</div>}</div>
      <div style={{ color: CHARCOAL, fontWeight: 600, textAlign: "right" }}>{value}</div>
    </div>
  );
}

// Distinguishes three real states rather than a single permanent
// "sourced from TCO" flag: a value can be untouched since handoff, or
// prefilled and then adjusted -- those aren't the same claim, and the
// audit shouldn't keep attributing an edited number to TCO.
function tcoProvenanceFor(currentValue, originalValue) {
  if (originalValue == null) return "entered directly";
  if (currentValue === originalValue) return "prefilled from the TCO Calculator, unmodified";
  return `prefilled from the TCO Calculator (${fmtCurrency(originalValue)}), then adjusted here to ${fmtCurrency(currentValue)}`;
}

function RoiCalculatorInner() {
  const { isLoggedIn, needsSetup, account, logDownloadEvent } = useAuth();

  const [arrivedFromTco] = useState(() => {
    const params = getIncomingParams();
    return !!(params?.get("initialCost") || params?.get("recurringCost"));
  });
  // The original values as handed off, captured once and never updated --
  // needed to tell "still exactly what TCO sent" apart from "arrived from
  // TCO, then the user changed it here." arrivedFromTco alone can't make
  // that distinction, since it stays true forever after handoff regardless
  // of later edits.
  const [tcoOriginalValues] = useState(() => {
    const params = getIncomingParams();
    const ic = params?.get("initialCost");
    const rc = params?.get("recurringCost");
    return {
      initialCost: ic != null && !Number.isNaN(+ic) ? +ic : null,
      recurringCost: rc != null && !Number.isNaN(+rc) ? +rc : null,
    };
  });
  const [tcoPlanningBasis] = useState(getInitialPlanningBasis);

  // Consume the handoff -- see TcoCalculator.jsx's identical fix for the
  // full rationale. Runs once, after every lazy initializer above has
  // already captured whatever it needed from the URL.
  useEffect(() => {
    if (arrivedFromTco && typeof window !== "undefined") {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- intentionally mount-only, after initial param capture

  // Shared, field-level truth for whether each TCO-handed-off value still
  // matches what was actually sent -- computed once here, reused by the
  // audit trail, the normal report's summary sentence, and the snapshot's
  // costSource, so none of the three can silently drift from the others.
  // Field-level, not one collapsed flag: only one of the two costs may have
  // been touched, and callers that need that distinction can see it.

  // Saved session state always loads, regardless of an incoming handoff.
  // Field-level precedence, not all-or-nothing: getInitialInputs only
  // overrides initialCost/recurringCost when a real TCO handoff carries
  // them, merged onto this saved base -- every other input (workforce
  // assumptions, ramp, horizon, etc.) was never part of any handoff, so it
  // keeps restoring from the last saved session either way.
  const saved = loadSessionState("roi");

  const [inputs, setInputs] = useState(() => getInitialInputs(saved?.inputs));
  const [openTipId, setOpenTipId] = useState(null);
  const [showFte, setShowFte] = useState(saved?.showFte ?? false);
  const [showUpside, setShowUpside] = useState(saved?.showUpside ?? false);
  const [view, setView] = useState("calc"); // calc | report | audit
  const [lead, setLead] = useState({ name: "", company: "", email: "" });
  const [leadStatus, setLeadStatus] = useState("");
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" && window.matchMedia("(max-width: 720px)").matches
  );

  // Persist inputs and display toggles (not view/lead/leadStatus/openTipId --
  // transient UI flow and lead-capture PII don't belong in session-restored
  // state) so leaving for another tool and coming back restores exactly
  // where this tab left off, instead of resetting to defaults on every full
  // page load (every cross-tool link is a plain <a href>, not client-side
  // routing, so the whole page reloads and every component remounts fresh).
  useEffect(() => {
    saveSessionState("roi", { inputs, showFte, showUpside });
  }, [inputs, showFte, showUpside]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const mq = window.matchMedia("(max-width: 720px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  const errors = useMemo(() => validateInputs(inputs), [inputs]);
  const hasErrors = Object.keys(errors).length > 0;
  const engine = useMemo(
    () => (hasErrors ? null : computeEngine(inputs)),
    [inputs, hasErrors]
  );

  const initialCostModified = tcoOriginalValues.initialCost != null && inputs.initialCost !== tcoOriginalValues.initialCost;
  const recurringCostModified = tcoOriginalValues.recurringCost != null && inputs.recurringCost !== tcoOriginalValues.recurringCost;
  const tcoCostsModified = initialCostModified || recurringCostModified;

  const set = (key) => (val) => setInputs((prev) => ({ ...prev, [key]: val }));

  useAutosaveSnapshot(
    "roi",
    inputs,
    engine
      ? {
          grossCapacity: engine.grossCapacity,
          redeployableCapacity: engine.redeployableCapacity,
          fteEquivalent: engine.fteEquivalent,
          steadyStateValue: engine.steadyStateValue,
          year1Value: engine.year1Value,
          year1Net: engine.year1Net,
          horizonNet: engine.horizonNet,
          horizonROI: engine.horizonROI,
          horizonYears: inputs.horizonYears,
          payback: engine.payback,
          costSource: tcoPlanningBasis ? `TCO Calculator (${tcoPlanningBasis === "workload" ? "Workload Requirement" : "Existing Cloud Spend"}) — ${tcoCostsModified ? "subsequently adjusted in ROI" : "unmodified"}` : "Manual entry",
        }
      : null
  );


  function requestReport() {
    if (isLoggedIn && !needsSetup && account) {
      setLead({ name: account.name || "", company: account.company || "", email: account.email || "" });
      logDownloadEvent("roi", {
        people: inputs.people,
        tasksPerDay: inputs.tasksPerDay,
        reductionPct: inputs.reductionPct,
        year1Net: engine?.year1Net ?? null,
        horizonROI: engine?.horizonROI ?? null,
        payback: engine?.payback ?? null,
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
          flexBasis: isMobile ? "100%" : "auto",
          width: isMobile ? "fit-content" : "auto",
        }}>PROTOTYPE v1.0</span>
      </div>

      <div className="no-print" style={{ padding: "0 0 12px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, borderBottom: `1px solid ${GRAY_BORDER}`, marginBottom: 16 }}>
        {arrivedFromTco ? (
          <a href="/tco" style={{ fontSize: 12, fontWeight: 600, color: RED, textDecoration: "none" }}>&larr; Adjust TCO assumptions</a>
        ) : <span />}
        <AuthWidget />
      </div>

      {view === "gate" && (
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 0" }}>
          <div style={{ border: `1px solid ${GRAY_BORDER}`, borderRadius: 12, padding: 24 }}>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4, color: CHARCOAL }}>Get the full ROI report</div>
            <div style={{ fontSize: 12, color: GRAY_TEXT, marginBottom: 16 }}>
              The report includes the full scenario economics -- capacity created, its economic value, and the
              investment result -- as an executive-summary-ready artifact.
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
            <button onClick={() => setView("audit")} style={{ fontSize: 13, padding: "10px 12px", borderRadius: 8, border: `1px solid ${GRAY_BORDER}`, cursor: "pointer", background: "#fff", color: CHARCOAL }}>
              Calculation Methodology &amp; Audit Trail
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

          <div style={{ background: "#FBEAEA", borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: RED, textTransform: "uppercase" }}>
              {inputs.horizonYears}-Yr Net Benefit
            </div>
            <div style={{ fontSize: 30, fontWeight: 700, color: RED }}>{fmtCurrency(engine.horizonNet)}</div>
            <div style={{ fontSize: 12, color: CHARCOAL }}>
              Year 1 net: {fmtCurrency(engine.year1Net)} &middot; Payback: {fmtMonths(engine.payback)} &middot; {inputs.horizonYears}-yr ROI: {fmtPercent(engine.horizonROI)}
            </div>
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: GRAY_TEXT, textTransform: "uppercase", marginBottom: 8 }}>Capacity created</div>
          <div style={{ border: `1px solid ${GRAY_BORDER}`, borderRadius: 10, padding: 14, marginBottom: 16, fontSize: 13, color: CHARCOAL }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", rowGap: 6, columnGap: 12 }}>
              <div style={{ color: GRAY_TEXT }}>Gross capacity created</div><div>{fmtHours(engine.grossCapacity)}</div>
              <div style={{ color: GRAY_TEXT }}>Productively redeployable</div><div>{fmtHours(engine.redeployableCapacity)}</div>
              <div style={{ color: GRAY_TEXT }}>FTE-equivalent</div><div>{fmtFte(engine.fteEquivalent)}</div>
            </div>
            <div style={{ fontSize: 11, color: GRAY_TEXT, marginTop: 8 }}>Capacity created, not a staffing recommendation.</div>
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: GRAY_TEXT, textTransform: "uppercase", marginBottom: 8 }}>Economic value &amp; investment result</div>
          {arrivedFromTco && (
            <div style={{ fontSize: 11, color: GRAY_TEXT, marginBottom: 8 }}>
              {!tcoCostsModified ? (
                <>Initial ({fmtCurrency(inputs.initialCost)}) and recurring ({fmtCurrency(inputs.recurringCost)}/yr) AI cost sourced from the TCO
                Calculator{tcoPlanningBasis === "workload" ? " (Workload Requirement fleet sizing)" : tcoPlanningBasis === "spend" ? " (reported cloud spend)" : ""}.</>
              ) : (
                <>AI costs were initially prefilled from the TCO Calculator{tcoPlanningBasis === "workload" ? " (Workload Requirement fleet sizing)" : tcoPlanningBasis === "spend" ? " (reported cloud spend)" : ""}; {initialCostModified && recurringCostModified ? "both the initial and recurring costs have" : initialCostModified ? "the initial cost has" : "the recurring cost has"} since been adjusted here (now {initialCostModified && <>initial {fmtCurrency(inputs.initialCost)}</>}{initialCostModified && recurringCostModified ? ", " : ""}{recurringCostModified && <>recurring {fmtCurrency(inputs.recurringCost)}/yr</>}).</>
              )}
            </div>
          )}
          <div style={{ border: `1px solid ${GRAY_BORDER}`, borderRadius: 10, padding: 14, marginBottom: 16, fontSize: 13, color: CHARCOAL }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", rowGap: 6, columnGap: 12 }}>
              <div style={{ color: GRAY_TEXT }}>Steady-state economic value</div><div>{fmtCurrency(engine.steadyStateValue)}/yr</div>
              <div style={{ color: GRAY_TEXT }}>Year 1 realized value (ramped)</div><div>{fmtCurrency(engine.year1Value)}/yr</div>
              <div style={{ color: GRAY_TEXT }}>Year 1 net benefit</div><div>{fmtCurrency(engine.year1Net)}</div>
              <div style={{ color: GRAY_TEXT }}>{inputs.horizonYears}-yr horizon net benefit</div><div>{fmtCurrency(engine.horizonNet)}</div>
              <div style={{ color: GRAY_TEXT }}>{inputs.horizonYears}-yr horizon ROI</div><div>{fmtPercent(engine.horizonROI)}</div>
              <div style={{ color: GRAY_TEXT }}>Estimated payback period</div><div>{fmtMonths(engine.payback)}</div>
            </div>
          </div>

          <div style={{ ...styles.guardrail, marginBottom: 16 }}>
            These results represent capacity created and its economic value, not headcount reduction. No output in
            this report should be read as a staffing recommendation.
          </div>

          <div style={{ fontSize: 11, color: GRAY_TEXT, padding: 14, background: "#F7F7F7", borderRadius: 10, marginBottom: 16, lineHeight: 1.5 }}>
            This is a directional scenario model based on the inputs shown, not a validated business case. Loaded
            cost/hr is a proxy for the value of usable capacity, not an assertion that payroll expense drops. Actual
            results depend on real adoption, task complexity, and change-management execution. Confirm with a CDW
            AI Factory specialist before using these figures in a formal business case.
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

      {view === "audit" && engine && (
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "12px 0" }}>
          <div className="no-print" style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            <button onClick={() => window.print()} style={{ flex: 1, fontWeight: 700, fontSize: 13, padding: 10, borderRadius: 8, border: "none", cursor: "pointer", background: CHARCOAL, color: "#fff" }}>
              Print / Save as PDF
            </button>
            <button onClick={() => setView("report")} style={{ fontSize: 13, padding: "10px 12px", borderRadius: 8, border: `1px solid ${GRAY_BORDER}`, cursor: "pointer", background: "#fff", color: GRAY_TEXT }}>
              Back to report
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <img src={cdwLogo} alt="CDW" style={{ height: 32, width: "auto" }} />
            <div style={{ fontSize: 10, letterSpacing: 1.5, color: GRAY_TEXT, textTransform: "uppercase" }}>AI Factory &middot; Calculation Methodology &amp; Audit Trail</div>
          </div>
          <div style={{ fontSize: 21, fontWeight: 700, margin: "4px 0 2px", color: CHARCOAL }}>
            Prepared for {lead.name || "you"}{lead.company ? `, ${lead.company}` : ""}
          </div>
          <div style={{ fontSize: 12, color: GRAY_TEXT, marginBottom: 4 }}>{new Date().toLocaleDateString()} &middot; Reproducible derivation of the material calculations supporting the {inputs.horizonYears}-year ROI result shown in the main report</div>
          <div style={{ fontSize: 11, color: GRAY_TEXT, marginBottom: 16, fontStyle: "italic" }}>
            This document formats and explains the same calculation the main report already ran -- it does not run a separate or independent calculation. Every figure below traces to the same engine output shown on screen.
          </div>

          {/* SECTION 1: SCENARIO OVERVIEW */}
          <div style={{ fontSize: 11, letterSpacing: 1, color: CHARCOAL, marginBottom: 8, borderBottom: `2px solid ${CHARCOAL}`, paddingBottom: 4, textTransform: "uppercase" }}>1. Scenario Overview</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: GRAY_TEXT, marginTop: 6, marginBottom: 2 }}>What you told us -- workflow</div>
          <AuditRow label="People performing this task" value={inputs.people.toLocaleString()} />
          <AuditRow label="Tasks per person per day" value={inputs.tasksPerDay.toLocaleString()} />
          <AuditRow label="Working days per year" value={inputs.workingDays.toLocaleString()} />
          <AuditRow label="Minutes per task" value={inputs.minutesPerTask.toLocaleString()} />
          <AuditRow label="Loaded cost per hour" value={fmtCurrency(inputs.loadedCost)} />
          <AuditRow label="Hours per workday (for FTE-equivalent)" value={inputs.hoursPerWorkday.toLocaleString()} />

          <div style={{ fontSize: 11, fontWeight: 700, color: GRAY_TEXT, marginTop: 12, marginBottom: 2 }}>What you told us -- capture assumptions</div>
          <AuditRow label="Task time reduction" value={fmtPercent(inputs.reductionPct)} sub="how much of each task's time is eliminated" />
          <AuditRow label="Adoption" value={fmtPercent(inputs.adoptionPct)} sub="share of eligible work actually using the new approach" />
          <AuditRow label="Realization" value={fmtPercent(inputs.realizationPct)} sub="share of freed time actually captured as productive redeployment, not lost to friction" />
          <AuditRow label="Year 1 ramp" value={fmtPercent(inputs.rampPct)} sub="Year 1 value as a share of full steady-state (100% = no ramp)" />
          {inputs.upliftPerHr > 0 && <AuditRow label="Illustrative uplift per hour" value={fmtCurrency(inputs.upliftPerHr)} sub="a separate, illustrative-only figure -- not included in the horizon net benefit or ROI below" />}

          <div style={{ fontSize: 11, fontWeight: 700, color: GRAY_TEXT, marginTop: 12, marginBottom: 2 }}>Investment assumptions</div>
          <AuditRow label="Initial (one-time) cost" value={fmtCurrency(inputs.initialCost)} sub={`${tcoProvenanceFor(inputs.initialCost, tcoOriginalValues.initialCost)}${arrivedFromTco && !initialCostModified && tcoPlanningBasis ? (tcoPlanningBasis === "workload" ? " (Workload Requirement fleet sizing)" : " (reported cloud spend)") : ""}`} />
          <AuditRow label="Recurring (annual) cost" value={`${fmtCurrency(inputs.recurringCost)}/yr`} sub={tcoProvenanceFor(inputs.recurringCost, tcoOriginalValues.recurringCost)} />
          <AuditRow label="Analysis horizon" value={`${inputs.horizonYears} years`} />

          <div style={{ fontSize: 11, color: CHARCOAL, marginTop: 12, marginBottom: 14, background: "#F7F7F7", borderRadius: 8, padding: "10px 12px" }}>
            <b>Key assumptions worth stress-testing:</b> realization (the gap between time freed and value actually captured), adoption, the loaded cost per hour, and the recurring cost, since it repeats every year of the horizon while the initial cost is paid once.
          </div>

          {/* SECTION 2: CAPACITY CALCULATION */}
          <div style={{ fontSize: 11, letterSpacing: 1, color: CHARCOAL, marginTop: 18, marginBottom: 8, borderBottom: `2px solid ${CHARCOAL}`, paddingBottom: 4, textTransform: "uppercase" }}>2. How Capacity Created Was Calculated</div>
          <AuditFormula
            label="Baseline hours (total time this task consumes today, per year)"
            formula="baselineHours = people × tasksPerDay × workingDays × (minutesPerTask ÷ 60)"
            substituted={`= ${inputs.people.toLocaleString()} × ${inputs.tasksPerDay} × ${inputs.workingDays} × (${inputs.minutesPerTask} ÷ 60)`}
            result={`${Math.round(engine.baselineHours).toLocaleString()} hrs/yr`}
          />
          <AuditFormula
            label="Gross capacity created"
            formula="grossCapacity = baselineHours × reduction × adoption"
            substituted={`= ${Math.round(engine.baselineHours).toLocaleString()} × ${fmtPercent(inputs.reductionPct)} × ${fmtPercent(inputs.adoptionPct)}`}
            result={fmtHours(engine.grossCapacity)}
          />
          <AuditFormula
            label="Productively redeployable capacity"
            formula="redeployableCapacity = grossCapacity × realization"
            substituted={`= ${Math.round(engine.grossCapacity).toLocaleString()} × ${fmtPercent(inputs.realizationPct)}`}
            result={fmtHours(engine.redeployableCapacity)}
          />
          <div style={{ fontSize: 11, color: GRAY_TEXT, marginBottom: 6 }}>Capacity created describes freed-up productive time, not a staffing recommendation.</div>

          {/* SECTION 3: VALUE & INVESTMENT CALCULATION */}
          <div style={{ fontSize: 11, letterSpacing: 1, color: CHARCOAL, marginTop: 18, marginBottom: 8, borderBottom: `2px solid ${CHARCOAL}`, paddingBottom: 4, textTransform: "uppercase" }}>3. How Value &amp; Investment Were Calculated</div>
          <AuditFormula
            label="Steady-state economic value"
            formula="steadyStateValue = redeployableCapacity × loadedCost"
            substituted={`= ${Math.round(engine.redeployableCapacity).toLocaleString()} hrs × ${fmtCurrency(inputs.loadedCost)}/hr`}
            result={`${fmtCurrency(engine.steadyStateValue)}/yr`}
          />
          <AuditFormula
            label="Year 1 value (ramped)"
            formula="year1Value = steadyStateValue × ramp"
            substituted={`= ${fmtCurrency(engine.steadyStateValue)} × ${fmtPercent(inputs.rampPct)}`}
            result={`${fmtCurrency(engine.year1Value)}/yr`}
          />
          <AuditFormula
            label="Year 1 net benefit"
            formula="year1Net = year1Value − (initialCost + recurringCost)"
            substituted={`= ${fmtCurrency(engine.year1Value)} − (${fmtCurrency(inputs.initialCost)} + ${fmtCurrency(inputs.recurringCost)})`}
            result={fmtCurrency(engine.year1Net)}
          />
          <div style={{ fontSize: 11, color: GRAY_TEXT, marginBottom: 10 }}>Only Year 1 ramps. Years 2 through {inputs.horizonYears} are each valued at the full steady-state figure above, not a multi-year ramp curve.</div>
          <AuditFormula
            label={`${inputs.horizonYears}-year horizon value`}
            formula="horizonValue = year1Value + steadyStateValue × (horizonYears − 1)"
            substituted={`= ${fmtCurrency(engine.year1Value)} + ${fmtCurrency(engine.steadyStateValue)} × (${inputs.horizonYears} − 1)`}
            result={fmtCurrency(engine.horizonValue)}
          />
          <AuditFormula
            label={`${inputs.horizonYears}-year horizon cost`}
            formula="horizonCost = initialCost + recurringCost × horizonYears"
            substituted={`= ${fmtCurrency(inputs.initialCost)} + ${fmtCurrency(inputs.recurringCost)} × ${inputs.horizonYears}`}
            result={fmtCurrency(engine.horizonCost)}
          />
          <AuditFormula
            label={`${inputs.horizonYears}-year net benefit`}
            formula="horizonNet = horizonValue − horizonCost"
            substituted={`= ${fmtCurrency(engine.horizonValue)} − ${fmtCurrency(engine.horizonCost)}`}
            result={fmtCurrency(engine.horizonNet)}
          />
          <AuditFormula
            label={`${inputs.horizonYears}-year ROI`}
            formula="horizonROI = horizonNet ÷ horizonCost"
            substituted={engine.horizonCost === 0 ? "horizonCost = 0 -- ROI is not defined" : `= ${fmtCurrency(engine.horizonNet)} ÷ ${fmtCurrency(engine.horizonCost)}`}
            result={fmtPercent(engine.horizonROI)}
          />
          <AuditFormula
            label="Estimated payback period"
            formula="payback = initialCost ÷ (year1Value/12 − recurringCost/12)"
            substituted={engine.payback == null ? `Year 1's monthly net benefit is zero or negative -- ${PAYBACK_GUARD_TEXT}` : `= ${fmtCurrency(inputs.initialCost)} ÷ (${fmtCurrency(engine.year1Value / 12)} − ${fmtCurrency(inputs.recurringCost / 12)})`}
            result={fmtMonths(engine.payback)}
          />
          <AuditFormula
            label="FTE-equivalent"
            formula="fteEquivalent = redeployableCapacity ÷ (workingDays × hoursPerWorkday)"
            substituted={`= ${Math.round(engine.redeployableCapacity).toLocaleString()} ÷ (${inputs.workingDays} × ${inputs.hoursPerWorkday})`}
            result={fmtFte(engine.fteEquivalent)}
          />

          {/* SECTION 4: RECONCILIATION */}
          <div style={{ fontSize: 11, letterSpacing: 1, color: CHARCOAL, marginTop: 18, marginBottom: 8, borderBottom: `2px solid ${CHARCOAL}`, paddingBottom: 4, textTransform: "uppercase" }}>4. Reconciliation</div>
          <div style={{ fontSize: 11, color: GRAY_TEXT, marginBottom: 10 }}>Each check below redoes the arithmetic from already-shown intermediate values and compares the result to the engine's own field for that formula -- not the same number read twice.</div>
          <ReconCheck
            label={`${inputs.horizonYears}-year horizon value`}
            parts={[
              { label: "Year 1 value", value: fmtCurrency(engine.year1Value) },
              { label: `Steady-state value × (${inputs.horizonYears} − 1) years`, value: fmtCurrency(engine.steadyStateValue * (inputs.horizonYears - 1)) },
            ]}
            calculated={engine.year1Value + engine.steadyStateValue * (inputs.horizonYears - 1)}
            engineValue={engine.horizonValue}
            format="currency"
          />
          <ReconCheck
            label={`${inputs.horizonYears}-year horizon cost`}
            parts={[
              { label: "Initial cost", value: fmtCurrency(inputs.initialCost) },
              { label: `Recurring cost × ${inputs.horizonYears} years`, value: fmtCurrency(inputs.recurringCost * inputs.horizonYears) },
            ]}
            calculated={inputs.initialCost + inputs.recurringCost * inputs.horizonYears}
            engineValue={engine.horizonCost}
            format="currency"
          />
          <ReconCheck
            label={`${inputs.horizonYears}-year net benefit`}
            parts={[
              { label: "Horizon value (above)", value: fmtCurrency(engine.horizonValue) },
              { label: "Less: horizon cost (above)", value: `−${fmtCurrency(engine.horizonCost)}` },
            ]}
            calculated={engine.horizonValue - engine.horizonCost}
            engineValue={engine.horizonNet}
            format="currency"
          />
          <ReconCheck
            label={`${inputs.horizonYears}-year ROI`}
            parts={[
              { label: "Horizon net (above)", value: fmtCurrency(engine.horizonNet) },
              { label: "÷ horizon cost (above)", value: fmtCurrency(engine.horizonCost) },
            ]}
            calculated={engine.horizonCost === 0 ? null : engine.horizonNet / engine.horizonCost}
            engineValue={engine.horizonROI}
            format="percent"
          />

          <div style={{ fontSize: 10.5, color: GRAY_TEXT, marginTop: 12, lineHeight: 1.5 }}>
            All figures on this page are directional planning estimates derived from the inputs shown above, using the same calculation the main report already ran. This is a directional scenario model, not a validated business case. Loaded cost/hr is a proxy for the value of usable capacity, not an assertion that payroll expense drops. Confirm with a CDW AI Factory specialist before using these figures in a formal business case.
          </div>

          <div style={{ borderTop: `2px solid ${CHARCOAL}`, marginTop: 16, paddingTop: 10, display: "flex", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: CHARCOAL }}>Jay B. Carlile</div>
              <div style={{ fontSize: 11, color: GRAY_TEXT }}>AI Solutions Executive &middot; CDW AI Factory</div>
            </div>
            <div style={{ fontSize: 11, color: GRAY_TEXT, textAlign: "right" }}>Questions about this derivation?<br />Bring your actual workload data for a validated pass</div>
          </div>
        </div>
      )}

      {view === "calc" && (
      <div className="no-print">
      {arrivedFromTco && (
        <div style={{ background: "#F5F5F5", border: `1px solid ${GRAY_BORDER}`, borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: 13, color: "#444" }}>
          Initial and recurring AI cost pre-filled from your TCO Calculator results
          {tcoPlanningBasis === "workload" ? (
            <> (based on the Workload Requirement fleet sizing, not a reported cloud bill)</>
          ) : tcoPlanningBasis === "spend" ? (
            <> (based on your reported cloud spend)</>
          ) : null}
          . Adjust the workload fields below to see the full ROI case.
          <div style={{ marginTop: 6, color: "#666" }}>
            These costs and the task-automation inputs below are independent: make sure the workflow you're describing
            here is actually what that infrastructure spend is meant to accelerate, this tool doesn't verify that for you.
          </div>
        </div>
      )}
      <div style={{
        ...styles.grid,
        gridTemplateColumns: isMobile ? "minmax(0,1fr)" : styles.grid.gridTemplateColumns,
        gap: isMobile ? 16 : styles.grid.gap,
      }}>
        {/* ---------------- INPUTS COLUMN ---------------- */}
        <div>
          <div style={styles.section}>
            <div style={styles.sectionHeader}>Workload (current state)</div>
            <Field id="people" openTipId={openTipId} setOpenTipId={setOpenTipId} label="People performing this task" unit="count"
              value={inputs.people} onChange={set("people")} error={errors.people}
              tip="Employees whose work includes this task today." />
            <Field id="tasksPerDay" openTipId={openTipId} setOpenTipId={setOpenTipId} label="Tasks per person per working day" unit="tasks/day"
              value={inputs.tasksPerDay} onChange={set("tasksPerDay")} error={errors.tasksPerDay}
              tip="Average, not peak." />
            <Field id="workingDays" openTipId={openTipId} setOpenTipId={setOpenTipId} label="Working days per year" unit="days" step="1"
              value={inputs.workingDays} onChange={set("workingDays")} error={errors.workingDays}
              tip="Excludes weekends/holidays/PTO if you want a realistic base." />
            <Field id="minutesPerTask" openTipId={openTipId} setOpenTipId={setOpenTipId} label="End-to-end minutes per task (before AI)" unit="minutes"
              value={inputs.minutesPerTask} onChange={set("minutesPerTask")} error={errors.minutesPerTask}
              tip="Total time for the whole task today, start to finish." />
            <Field id="loadedCost" openTipId={openTipId} setOpenTipId={setOpenTipId} label="Loaded cost per hour" unit="$/hr"
              value={inputs.loadedCost} onChange={set("loadedCost")} error={errors.loadedCost}
              tip="Fully loaded (salary + benefits + overhead), not base wage alone." />
          </div>

          <div style={styles.section}>
            <div style={styles.sectionHeader}>AI Impact</div>
            <Field id="reductionPct" openTipId={openTipId} setOpenTipId={setOpenTipId} label="AI time reduction" unit="%" isPercent
              value={inputs.reductionPct} onChange={set("reductionPct")} error={errors.reductionPct}
              tip="The % drop in the TOTAL task time, start to finish — not just the AI-assisted sub-step. A 50% faster research step inside a 30-minute task is not a 50% faster task; convert to end-to-end % first." />
            <Field id="adoptionPct" openTipId={openTipId} setOpenTipId={setOpenTipId} label="Adoption rate" unit="%" isPercent
              value={inputs.adoptionPct} onChange={set("adoptionPct")} error={errors.adoptionPct}
              tip="Share of this task's volume actually run through the AI workflow." />
            <Field id="realizationPct" openTipId={openTipId} setOpenTipId={setOpenTipId} label="Productive redeployment realization" unit="%" isPercent
              value={inputs.realizationPct} onChange={set("realizationPct")} error={errors.realizationPct}
              tip="Of the capacity created, the % expected to be productively used elsewhere (vs. absorbed as slack). One combined field by design." />
            <Field id="rampPct" openTipId={openTipId} setOpenTipId={setOpenTipId} label="Year 1 benefit realization / ramp" unit="%" isPercent
              value={inputs.rampPct} onChange={set("rampPct")} error={errors.rampPct}
              tip="Share of steady-state benefit actually realized in Year 1, to account for implementation and rollout time. Default 100% = no ramp assumed. Years 2+ are always full steady state." />
          </div>

          <div style={styles.section}>
            <div style={styles.sectionHeader}>AI Cost</div>
            <Field id="initialCost" openTipId={openTipId} setOpenTipId={setOpenTipId} label="Initial implementation cost" unit="$"
              value={inputs.initialCost} onChange={set("initialCost")} error={errors.initialCost}
              tip="One-time: integration, deployment, change management." />
            <Field id="recurringCost" openTipId={openTipId} setOpenTipId={setOpenTipId} label="Annual recurring AI cost" unit="$/yr"
              value={inputs.recurringCost} onChange={set("recurringCost")} error={errors.recurringCost}
              tip="Licensing, API/compute spend, ongoing support/ops." />
          </div>

          <div style={styles.section}>
            <div style={styles.sectionHeader}>Optional / Advanced</div>
            <Field id="upliftPerHr" openTipId={openTipId} setOpenTipId={setOpenTipId} label="Redeployment value uplift (illustrative only)" unit="$/hr"
              value={inputs.upliftPerHr} onChange={set("upliftPerHr")} error={errors.upliftPerHr}
              tip="Value differential if redeployed time moves to higher-value work. Defaults to $0 and stays out of the headline ROI. Softest number in the model — don't let it carry the pitch." />
          </div>

          <div style={styles.section}>
            <div style={styles.sectionHeader}>Analysis Settings</div>
            <Field id="horizonYears" openTipId={openTipId} setOpenTipId={setOpenTipId} label="Analysis horizon" unit="years" step="1"
              value={inputs.horizonYears} onChange={set("horizonYears")} error={errors.horizonYears} />
            <Field id="hoursPerWorkday" openTipId={openTipId} setOpenTipId={setOpenTipId} label="Hours per workday (FTE basis)" unit="hrs/day"
              value={inputs.hoursPerWorkday} onChange={set("hoursPerWorkday")} error={errors.hoursPerWorkday}
              tip="Used only to express capacity as an FTE-equivalent (secondary detail), never as a staffing recommendation." />
          </div>
        </div>

        {/* ---------------- RESULTS COLUMN ---------------- */}
        <div>
          <div style={{
            ...styles.resultsCard,
            position: isMobile ? "static" : "sticky",
            top: isMobile ? "auto" : styles.resultsCard.top,
            padding: isMobile ? 16 : styles.resultsCard.padding,
          }}>
            {hasErrors || !engine ? (
              <div style={styles.guardText}>
                Fix the highlighted inputs to see results.
              </div>
            ) : (
              <>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Capacity Created — Operational Result
                </div>
                <div style={{ marginTop: 10 }}>
                  <span style={{ ...styles.headlineValue, fontSize: isMobile ? 26 : styles.headlineValue.fontSize }}>{fmtHours(engine.grossCapacity)}</span>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 4 }}>
                    gross capacity created — the operationally established result
                  </div>
                </div>
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.15)" }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "#fff" }}>
                    {fmtHours(engine.redeployableCapacity)}
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>
                    productively redeployable, after a {fmtPercent(inputs.realizationPct)} realization assumption
                  </div>
                </div>
                <button style={styles.expandToggle} onClick={() => setShowFte(!showFte)}>
                  {showFte ? "Hide" : "Show"} FTE-equivalent detail
                </button>
                {showFte && (
                  <div style={{
                      ...styles.resultRow,
                      alignItems: isMobile ? "flex-start" : styles.resultRow.alignItems,
                      flexWrap: isMobile ? "wrap" : "nowrap",
                    }}>
                    <span style={styles.resultLabelSecondary}>Redeployable Capacity Equivalent</span>
                    <span style={{ ...styles.resultValueSecondary, whiteSpace: isMobile ? "normal" : styles.resultValueSecondary.whiteSpace }}>{fmtFte(engine.fteEquivalent)}</span>
                  </div>
                )}
                <div style={styles.note}>Capacity created, not a staffing recommendation.</div>

                <div style={styles.resultsSectionHeader}>Economic Value of Redeployed Capacity</div>
                <div style={{
                    ...styles.resultRow,
                    alignItems: isMobile ? "flex-start" : styles.resultRow.alignItems,
                    flexWrap: isMobile ? "wrap" : "nowrap",
                  }}>
                  <span style={styles.resultLabel}>Steady-state economic value</span>
                  <span style={{ ...styles.resultValue, whiteSpace: isMobile ? "normal" : styles.resultValue.whiteSpace }}>{fmtCurrency(engine.steadyStateValue)}/yr</span>
                </div>
                <div style={{
                    ...styles.resultRow,
                    alignItems: isMobile ? "flex-start" : styles.resultRow.alignItems,
                    flexWrap: isMobile ? "wrap" : "nowrap",
                  }}>
                  <span style={styles.resultLabel}>Year 1 realized value (ramped)</span>
                  <span style={{ ...styles.resultValue, whiteSpace: isMobile ? "normal" : styles.resultValue.whiteSpace }}>{fmtCurrency(engine.year1Value)}/yr</span>
                </div>
                {engine.illustrativeUpside > 0 && (
                  <>
                    <button style={styles.expandToggle} onClick={() => setShowUpside(!showUpside)}>
                      {showUpside ? "Hide" : "Show"} illustrative upside
                    </button>
                    {showUpside && (
                      <div style={{
                    ...styles.resultRow,
                    alignItems: isMobile ? "flex-start" : styles.resultRow.alignItems,
                    flexWrap: isMobile ? "wrap" : "nowrap",
                  }}>
                        <span style={styles.resultLabelSecondary}>Illustrative upside (excluded from ROI)</span>
                        <span style={{ ...styles.resultValueSecondary, whiteSpace: isMobile ? "normal" : styles.resultValueSecondary.whiteSpace }}>{fmtCurrency(engine.illustrativeUpside)}/yr</span>
                      </div>
                    )}
                  </>
                )}
                <div style={styles.note}>
                  Loaded cost/hr is a proxy for the value of usable capacity, not an assertion that payroll expense drops.
                </div>

                <div style={styles.resultsSectionHeader}>Investment Result</div>
                <div style={{
                    ...styles.resultRow,
                    alignItems: isMobile ? "flex-start" : styles.resultRow.alignItems,
                    flexWrap: isMobile ? "wrap" : "nowrap",
                  }}>
                  <span style={styles.resultLabel}>Year 1 net benefit</span>
                  <span style={{ ...styles.resultValue, whiteSpace: isMobile ? "normal" : styles.resultValue.whiteSpace }}>{fmtCurrency(engine.year1Net)}</span>
                </div>
                <div style={{
                    ...styles.resultRow,
                    alignItems: isMobile ? "flex-start" : styles.resultRow.alignItems,
                    flexWrap: isMobile ? "wrap" : "nowrap",
                  }}>
                  <span style={styles.resultLabel}>{inputs.horizonYears}-yr horizon net benefit</span>
                  <span style={{ ...styles.resultValue, whiteSpace: isMobile ? "normal" : styles.resultValue.whiteSpace }}>{fmtCurrency(engine.horizonNet)}</span>
                </div>
                <div style={{
                    ...styles.resultRow,
                    alignItems: isMobile ? "flex-start" : styles.resultRow.alignItems,
                    flexWrap: isMobile ? "wrap" : "nowrap",
                  }}>
                  <span style={styles.resultLabel}>{inputs.horizonYears}-yr horizon ROI</span>
                  <span style={{ ...styles.resultValue, whiteSpace: isMobile ? "normal" : styles.resultValue.whiteSpace }}>{fmtPercent(engine.horizonROI)}</span>
                </div>
                <div style={{
                    ...styles.resultRow,
                    alignItems: isMobile ? "flex-start" : styles.resultRow.alignItems,
                    flexWrap: isMobile ? "wrap" : "nowrap",
                  }}>
                  <span style={styles.resultLabel}>Estimated payback period</span>
                  <span style={engine.payback == null ? styles.guardText : styles.resultValue}>
                    {fmtMonths(engine.payback)}
                  </span>
                </div>
                <div style={styles.note}>
                  Simplified estimate based on average Year-1 realized benefit, spread evenly across 12 months. Actual timing will vary with implementation timing and the shape of the adoption ramp — not a worst-case figure.
                </div>
                <button
                  onClick={requestReport}
                  style={{ width: "100%", marginTop: 14, fontWeight: 700, fontSize: 14, padding: "11px 12px", borderRadius: 8, border: "none", cursor: "pointer", background: RED, color: "#fff" }}
                >
                  Get the full ROI report
                </button>
                <div style={{ ...styles.guardrail, marginTop: 14, marginBottom: 0, background: "rgba(255,255,255,0.06)" }}>
                  These results represent capacity created and its economic value, not headcount reduction. No output in this tool should be read as a staffing recommendation.
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      </div>
      )}
    </div>
  );
}

export default function RoiCalculator() {
  return (
    <AuthProvider>
      <RoiCalculatorInner />
    </AuthProvider>
  );
}
