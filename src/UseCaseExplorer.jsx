import { useState, useRef, useEffect } from "react";
import cdwLogo from "./cdw-logo.png";
import blueprintData from "./blueprints.json";

// ─── design tokens (CDW red, matches other tools) ─────────────────────────────
const CDW_RED    = "#cc0000";
const CDW_DARK   = "#1a1a1a";
const CDW_BORDER = "#e0e0e0";
const CDW_BG     = "#f5f5f5";

// ─── constants ────────────────────────────────────────────────────────────────

const INDUSTRIES = [
  { id: "education",               label: "Education" },
  { id: "federal-defense",         label: "Federal / Defense Contractors" },
  { id: "financial-services",      label: "Financial Services" },
  { id: "food-cpg-manufacturing",  label: "Food & CPG Manufacturing" },
  { id: "general-manufacturing",   label: "General Manufacturing" },
  { id: "healthcare-life-sciences",label: "Healthcare & Life Sciences" },
  { id: "legal-services",          label: "Legal Services" },
  { id: "oil-gas",                 label: "Oil & Gas" },
  { id: "retail-distribution",     label: "Retail & Distribution" },
  { id: "state-local-government",  label: "State & Local Government" },
  { id: "transportation-logistics",label: "Transportation & Logistics" },
  { id: "utilities-energy",        label: "Utilities & Energy" },
  { id: "general-enterprise",      label: "Other / General Enterprise" },
];

const BUSINESS_FUNCTIONS = [
  { id: "customer-service",      label: "Customer Service",         gov: "Citizen Services / Contact Center" },
  { id: "cybersecurity",         label: "Cybersecurity",            gov: "CISO / Information Security" },
  { id: "data-analytics",        label: "Data & Analytics",         gov: "Data Office / Policy Analytics" },
  { id: "finance",               label: "Finance",                  gov: "Fiscal / Budget / Comptroller" },
  { id: "human-resources",       label: "Human Resources",          gov: "Personnel / HR / CMS" },
  { id: "information-technology",label: "Information Technology",   gov: "DoIT / State CIO / Enterprise IT" },
  { id: "legal-compliance",      label: "Legal & Compliance",       gov: "AG Office / Inspector General / Courts" },
  { id: "marketing",             label: "Marketing",                gov: "Communications / Public Affairs" },
  { id: "operations",            label: "Operations",               gov: "Facilities / Ops / Emergency Mgmt" },
  { id: "research-engineering",  label: "Research & Engineering",   gov: "Policy Research / Public Health Lab" },
  { id: "sales",                 label: "Sales",                    gov: "Economic Development / Procurement" },
  { id: "supply-chain-logistics",label: "Supply Chain & Logistics", gov: "Procurement / Surplus / Warehousing" },
  { id: "communications",        label: "Communications",           gov: "Agency Comms / Governor's Office" },
];

const CATEGORIES = blueprintData.meta.use_case_categories;
const ALL_BLUEPRINTS = blueprintData.blueprints;

// ─── helpers ──────────────────────────────────────────────────────────────────

function getBlueprintsForIndustry(industryId) {
  return ALL_BLUEPRINTS.filter(bp => bp.industry_fit && bp.industry_fit[industryId])
    .sort((a, b) => {
      const order = { primary: 0, adjacent: 1 };
      const fa = order[a.industry_fit[industryId]] ?? 2;
      const fb = order[b.industry_fit[industryId]] ?? 2;
      return fa - fb || a.name.localeCompare(b.name);
    });
}

function getBlueprintsForFunction(funcId) {
  return ALL_BLUEPRINTS.filter(bp => bp.department_fit && bp.department_fit[funcId])
    .sort((a, b) => {
      const order = { primary: 0, adjacent: 1 };
      const fa = order[a.department_fit[funcId]] ?? 2;
      const fb = order[b.department_fit[funcId]] ?? 2;
      return fa - fb || a.name.localeCompare(b.name);
    });
}

function groupByCategory(blueprints) {
  const groups = {};
  blueprints.forEach(bp => {
    const cat = bp.use_case_category || "Other";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(bp);
  });
  return groups;
}

// ─── sub-components ───────────────────────────────────────────────────────────

function FitBadge({ fit }) {
  if (!fit) return null;
  const isPrimary = fit === "primary";
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
      textTransform: "uppercase", padding: "2px 7px", borderRadius: 4,
      backgroundColor: isPrimary ? "#fff0f0" : "#fff8f0",
      color: isPrimary ? CDW_RED : "#c45000",
      border: `1px solid ${isPrimary ? "#ffcccc" : "#ffd5aa"}`,
      whiteSpace: "nowrap", flexShrink: 0,
    }}>
      {isPrimary ? "Best Fit" : "Also Relevant"}
    </span>
  );
}

// BlueprintCard: button element for full keyboard accessibility
function BlueprintCard({ bp, fit, onSelect }) {
  return (
    <button
      onClick={(e) => onSelect(bp, e.currentTarget)}
      style={{
        background: "#fff", border: `1px solid ${CDW_BORDER}`, borderRadius: 10,
        padding: "14px 16px", cursor: "pointer", textAlign: "left",
        display: "flex", flexDirection: "column", gap: 8, width: "100%",
        transition: "box-shadow 0.15s, border-color 0.15s",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.10)";
        e.currentTarget.style.borderColor = CDW_RED;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.borderColor = CDW_BORDER;
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: CDW_DARK, lineHeight: 1.35 }}>{bp.name}</span>
        {fit && <FitBadge fit={fit} />}
      </div>
      {bp.status === "legacy" && (
        <span style={{
          fontSize: 10, fontWeight: 700, color: "#92400e",
          background: "#fef3c7", border: "1px solid #fcd34d",
          borderRadius: 4, padding: "1px 6px", width: "fit-content",
        }}>LEGACY</span>
      )}
      <p style={{ fontSize: 13, color: "#555", margin: 0, lineHeight: 1.5 }}>{bp.description}</p>
    </button>
  );
}

// CategorySection: controlled — open/onToggle come from parent, no local state
function CategorySection({ category, blueprints, fit, onSelect, open, onToggle }) {
  const contentId = `cat-${category.replace(/\s+/g, "-")}`;
  return (
    <div style={{ marginBottom: 12 }}>
      <button
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={contentId}
        style={{
          width: "100%", display: "flex", justifyContent: "space-between",
          alignItems: "center", background: CDW_BG, border: `1px solid ${CDW_BORDER}`,
          borderRadius: open ? "8px 8px 0 0" : 8, padding: "10px 14px",
          cursor: "pointer", textAlign: "left",
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 14, color: CDW_DARK }}>{category}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: "#666", fontWeight: 500 }}>
            {blueprints.length} blueprint{blueprints.length !== 1 ? "s" : ""}
          </span>
          <span style={{ fontSize: 12, transform: open ? "rotate(90deg)" : "none", transition: "transform 0.2s", display: "inline-block" }}>▶</span>
        </span>
      </button>
      {open && (
        <div
          id={contentId}
          style={{
            border: `1px solid ${CDW_BORDER}`, borderTop: "none",
            borderRadius: "0 0 8px 8px", padding: "12px", background: "#fafafa",
            display: "flex", flexDirection: "column", gap: 10,
          }}
        >
          {blueprints.map(bp => (
            <BlueprintCard key={bp.id} bp={bp} fit={fit ? fit[bp.id] : null} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

// DetailModal: proper role/aria, focus trap, focus return on close
function DetailModal({ bp, contextLabel, contextFit, triggerEl, onClose }) {
  const dialogRef = useRef();
  const closeButtonRef = useRef();
  const titleId = `modal-title-${bp.id}`;

  // Focus close button on open
  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  // Close on outside click or Escape; trap Tab inside
  useEffect(() => {
    const handlePointer = e => {
      if (dialogRef.current && !dialogRef.current.contains(e.target)) onClose();
    };
    const handleKey = e => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "Tab") {
        const focusable = dialogRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last.focus(); }
        } else {
          if (document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      }
    };
    document.addEventListener("pointerdown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("pointerdown", handlePointer);
      document.removeEventListener("keydown", handleKey);
      // Return focus to the card that opened the modal
      triggerEl?.focus();
    };
  }, [onClose, triggerRef]);

  const practiceText = bp.detail_in_practice?.[contextLabel] || bp.detail_in_practice?.default;

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: 20,
    }}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{
          background: "#fff", borderRadius: 14, maxWidth: 680, width: "100%",
          maxHeight: "85vh", overflowY: "auto", padding: "28px 28px 24px",
          display: "flex", flexDirection: "column", gap: 18,
          boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
        }}
      >
        {/* header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: CDW_RED, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              {bp.use_case_category}
            </span>
            <h2 id={titleId} style={{ margin: 0, fontSize: 20, fontWeight: 700, color: CDW_DARK, lineHeight: 1.3 }}>{bp.name}</h2>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close"
            style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#888", flexShrink: 0, padding: "0 4px" }}
          >×</button>
        </div>

        {/* fit badge */}
        {contextFit && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <FitBadge fit={contextFit} />
          </div>
        )}

        {/* legacy warning */}
        {bp.status === "legacy" && (
          <div style={{ background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#92400e" }}>
            <strong>Legacy blueprint:</strong> NVIDIA no longer actively maintains this Blueprint. It is retained here because the underlying use case remains relevant.
          </div>
        )}

        {/* what it does */}
        <div>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: "#444", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6, marginTop: 0 }}>What it does</h3>
          <p style={{ margin: 0, fontSize: 14, color: "#333", lineHeight: 1.6 }}>{bp.detail_what_it_does || bp.description}</p>
        </div>

        {/* what it looks like in practice */}
        {practiceText && (
          <div>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: "#444", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6, marginTop: 0 }}>
              What this looks like in practice
            </h3>
            <p style={{ margin: 0, fontSize: 14, color: "#333", lineHeight: 1.6 }}>{practiceText}</p>
          </div>
        )}

        {/* infrastructure */}
        {bp.detail_infrastructure && (
          <div>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: "#444", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6, marginTop: 0 }}>
              What it typically needs
            </h3>
            <p style={{ margin: 0, fontSize: 14, color: "#333", lineHeight: 1.6 }}>{bp.detail_infrastructure}</p>
          </div>
        )}

        {/* handoff pills */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, paddingTop: 4 }}>
          <a href="/model-advisor" style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: CDW_RED, color: "#fff", borderRadius: 8,
            padding: "9px 16px", fontSize: 13, fontWeight: 600,
            cursor: "pointer", textDecoration: "none", border: "none",
          }}>Model Advisor →</a>
          <a href="/gpu-sizing" style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: CDW_DARK, color: "#fff", borderRadius: 8,
            padding: "9px 16px", fontSize: 13, fontWeight: 600,
            cursor: "pointer", textDecoration: "none", border: "none",
          }}>GPU Sizing →</a>
          <a href="/tco" style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "#fff", color: CDW_DARK, border: `1px solid #ccc`,
            borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 600,
            cursor: "pointer", textDecoration: "none",
          }}>TCO Calculator →</a>
          {bp.nvidia_url && (
            <a href={bp.nvidia_url} target="_blank" rel="noopener noreferrer" style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "none", color: "#666", border: "1px solid #ccc",
              borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 600,
              cursor: "pointer", textDecoration: "none",
            }}>View on NVIDIA ↗</a>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── main component ────────────────────────────────────────────────────────────

export default function UseCaseExplorer() {
  const [view, setView] = useState("home");
  const [selectedIndustry, setSelectedIndustry] = useState(null);
  const [selectedFunction, setSelectedFunction] = useState(null);
  const [activeCategory, setActiveCategory] = useState("All");
  const [modalBp, setModalBp] = useState(null);
  const [modalTrigger, setModalTrigger] = useState(null);
  const [sectionsOpen, setSectionsOpen] = useState({});

  const industryBlueprints = selectedIndustry ? getBlueprintsForIndustry(selectedIndustry.id) : [];
  const functionBlueprints = selectedFunction ? getBlueprintsForFunction(selectedFunction.id) : [];
  const activeBlueprints = view === "industry-results" ? industryBlueprints : functionBlueprints;

  const fitMap = (() => {
    const map = {};
    if (view === "industry-results" && selectedIndustry) {
      activeBlueprints.forEach(bp => { map[bp.id] = bp.industry_fit?.[selectedIndustry.id]; });
    } else if (view === "function-results" && selectedFunction) {
      activeBlueprints.forEach(bp => { map[bp.id] = bp.department_fit?.[selectedFunction.id]; });
    }
    return map;
  })();

  const filteredBlueprints = activeCategory === "All"
    ? activeBlueprints
    : activeBlueprints.filter(bp => bp.use_case_category === activeCategory);

  const grouped = groupByCategory(filteredBlueprints);
  const availableCategories = ["All", ...CATEGORIES.filter(c => activeBlueprints.some(bp => bp.use_case_category === c))];

  // open first section by default on results load
  useEffect(() => {
    if ((view === "industry-results" || view === "function-results") && activeBlueprints.length > 0) {
      const firstCat = activeBlueprints[0].use_case_category;
      setSectionsOpen({ [firstCat]: true });
    }
  }, [view, selectedIndustry?.id, selectedFunction?.id]);

  // when filter applied, open matching sections
  useEffect(() => {
    if (activeCategory !== "All") {
      setSectionsOpen({ [activeCategory]: true });
    }
  }, [activeCategory]);

  function toggleSection(cat) {
    setSectionsOpen(prev => ({ ...prev, [cat]: !prev[cat] }));
  }

  function expandAll() {
    const all = {};
    Object.keys(grouped).forEach(c => { all[c] = true; });
    setSectionsOpen(all);
  }

  function resetToHome() {
    setView("home");
    setSelectedIndustry(null);
    setSelectedFunction(null);
    setActiveCategory("All");
    setSectionsOpen({});
  }

  function selectIndustry(ind) {
    setSelectedIndustry(ind);
    setActiveCategory("All");
    setView("industry-results");
  }

  function selectFunction(fn) {
    setSelectedFunction(fn);
    setActiveCategory("All");
    setView("function-results");
  }

  const contextLabel = view === "industry-results" ? selectedIndustry?.id : selectedFunction?.id;

  // shared picker tile style
  const pickerTile = {
    background: "#fff", border: `1px solid ${CDW_BORDER}`, borderRadius: 10,
    padding: "14px 16px", cursor: "pointer", textAlign: "left",
    display: "flex", justifyContent: "space-between", alignItems: "center",
    fontSize: 14, fontWeight: 600, color: CDW_DARK,
    transition: "border-color 0.15s, background 0.15s",
  };

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", minHeight: "100vh", background: "#f9f9f9" }}>

      {/* ── header — matches other CDW tools ── */}
      <div style={{
        background: "#fff", borderBottom: "3px solid #e8e8e8",
        padding: "12px 24px", display: "flex", alignItems: "center", gap: 12,
      }}>
        <img src={cdwLogo} alt="CDW" style={{ height: 36, width: "auto" }} />
        <div style={{ borderLeft: "1px solid #e0e0e0", paddingLeft: 12, display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: CDW_RED, letterSpacing: "0.12em", textTransform: "uppercase" }}>AI Factory Tools</span>
          <span style={{ fontSize: 17, fontWeight: 700, color: CDW_DARK, lineHeight: 1.2 }}>AI Use Case Explorer</span>
        </div>
        <span style={{ marginLeft: "auto", fontSize: 10, color: "#999", fontWeight: 500, border: "1px solid #e0e0e0", borderRadius: 4, padding: "2px 8px" }}>v2.1</span>
      </div>

      {/* ── breadcrumb ── */}
      {view !== "home" && (
        <div style={{ background: "#fff", borderBottom: `1px solid ${CDW_BORDER}`, padding: "10px 24px", display: "flex", gap: 6, alignItems: "center", fontSize: 13 }}>
          <button onClick={resetToHome} style={{ background: "none", border: "none", cursor: "pointer", color: CDW_RED, fontWeight: 600, padding: 0, fontSize: 13 }}>Home</button>
          <span style={{ color: "#bbb" }}>›</span>
          {(view === "industry-pick" || view === "industry-results") && (
            <>
              <button
                onClick={() => { setView("industry-pick"); setSelectedIndustry(null); setActiveCategory("All"); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: view === "industry-pick" ? CDW_DARK : CDW_RED, fontWeight: 600, padding: 0, fontSize: 13 }}
              >By Industry</button>
              {view === "industry-results" && selectedIndustry && (
                <><span style={{ color: "#bbb" }}>›</span><span style={{ color: CDW_DARK, fontWeight: 600 }}>{selectedIndustry.label}</span></>
              )}
            </>
          )}
          {(view === "function-pick" || view === "function-results") && (
            <>
              <button
                onClick={() => { setView("function-pick"); setSelectedFunction(null); setActiveCategory("All"); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: view === "function-pick" ? CDW_DARK : CDW_RED, fontWeight: 600, padding: 0, fontSize: 13 }}
              >By Business Function</button>
              {view === "function-results" && selectedFunction && (
                <><span style={{ color: "#bbb" }}>›</span><span style={{ color: CDW_DARK, fontWeight: 600 }}>{selectedFunction.label}</span></>
              )}
            </>
          )}
        </div>
      )}

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "28px 20px" }}>

        {/* ── HOME ── */}
        {view === "home" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            <div style={{ textAlign: "center" }}>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: CDW_DARK, margin: "0 0 10px" }}>Explore AI Use Cases</h1>
              <p style={{ fontSize: 15, color: "#666", margin: 0, maxWidth: 540, marginInline: "auto", lineHeight: 1.6 }}>
                Match NVIDIA AI Blueprints to your organization. Choose how you'd like to explore.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {[
                { label: "By Industry", sub: "What are organizations like mine doing with AI?", count: `${INDUSTRIES.length} industries`, icon: "🏢", action: () => setView("industry-pick") },
                { label: "By Business Function", sub: "What can AI do for my team?", count: `${BUSINESS_FUNCTIONS.length} functions`, icon: "🧩", action: () => setView("function-pick") },
              ].map(card => (
                <button
                  key={card.label}
                  onClick={card.action}
                  style={{
                    background: "#fff", border: `2px solid ${CDW_BORDER}`, borderRadius: 14,
                    padding: "32px 28px", cursor: "pointer", textAlign: "left",
                    display: "flex", flexDirection: "column", gap: 12,
                    transition: "border-color 0.15s, box-shadow 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = CDW_RED; e.currentTarget.style.boxShadow = "0 6px 24px rgba(204,0,0,0.08)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = CDW_BORDER; e.currentTarget.style.boxShadow = "none"; }}
                >
                  <span style={{ fontSize: 32 }}>{card.icon}</span>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: CDW_DARK, marginBottom: 6 }}>{card.label}</div>
                    <div style={{ fontSize: 14, color: "#666", lineHeight: 1.55 }}>{card.sub}</div>
                  </div>
                  <div style={{ fontSize: 12, color: CDW_RED, fontWeight: 700, letterSpacing: "0.05em" }}>{card.count} →</div>
                </button>
              ))}
            </div>

            <p style={{ textAlign: "center", fontSize: 12, color: "#aaa", margin: 0 }}>
              {ALL_BLUEPRINTS.length} NVIDIA AI Blueprints · CDW AI Factory · Last verified {blueprintData.meta.last_verified}
            </p>
          </div>
        )}

        {/* ── INDUSTRY PICKER ── */}
        {view === "industry-pick" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: CDW_DARK, margin: "0 0 6px" }}>Choose your industry</h2>
              <p style={{ fontSize: 14, color: "#666", margin: 0 }}>See which NVIDIA AI Blueprints are most relevant to your sector.</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
              {INDUSTRIES.map(ind => (
                <button
                  key={ind.id}
                  onClick={() => selectIndustry(ind)}
                  style={pickerTile}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = CDW_RED; e.currentTarget.style.background = "#fff5f5"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = CDW_BORDER; e.currentTarget.style.background = "#fff"; }}
                >
                  <span>{ind.label}</span>
                  <span style={{ color: "#ccc", fontSize: 12 }}>›</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── FUNCTION PICKER ── */}
        {view === "function-pick" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: CDW_DARK, margin: "0 0 6px" }}>Choose your business function</h2>
              <p style={{ fontSize: 14, color: "#666", margin: 0 }}>See which NVIDIA AI Blueprints fit your team's work — regardless of industry.</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
              {BUSINESS_FUNCTIONS.map(fn => (
                <button
                  key={fn.id}
                  onClick={() => selectFunction(fn)}
                  style={{ ...pickerTile, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4, justifyContent: "flex-start" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = CDW_RED; e.currentTarget.style.background = "#fff5f5"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = CDW_BORDER; e.currentTarget.style.background = "#fff"; }}
                >
                  <span style={{ fontSize: 14, fontWeight: 700, color: CDW_DARK }}>{fn.label}</span>
                  <span style={{ fontSize: 11, color: "#999", fontWeight: 400 }}>Gov: {fn.gov}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── RESULTS (shared) ── */}
        {(view === "industry-results" || view === "function-results") && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* context banner */}
            <div style={{ background: CDW_DARK, borderRadius: 10, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 11, color: CDW_RED, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                {view === "industry-results" ? "Industry" : "Business Function"}
              </span>
              <span style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>
                {view === "industry-results" ? selectedIndustry?.label : selectedFunction?.label}
              </span>
              {view === "function-results" && selectedFunction?.gov && (
                <span style={{ fontSize: 12, color: "#aaa" }}>Gov equivalent: {selectedFunction.gov}</span>
              )}
              <span style={{ fontSize: 13, color: "#999", marginTop: 2 }}>
                {activeBlueprints.length} blueprint{activeBlueprints.length !== 1 ? "s" : ""} matched
                &nbsp;·&nbsp;
                {activeBlueprints.filter(bp =>
                  (view === "industry-results" ? bp.industry_fit?.[selectedIndustry?.id] : bp.department_fit?.[selectedFunction?.id]) === "primary"
                ).length} best fit
                &nbsp;·&nbsp;
                {activeBlueprints.filter(bp =>
                  (view === "industry-results" ? bp.industry_fit?.[selectedIndustry?.id] : bp.department_fit?.[selectedFunction?.id]) === "adjacent"
                ).length} also relevant
              </span>
            </div>

            {/* category chips + expand/collapse */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              {availableCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    padding: "6px 14px", borderRadius: 20,
                    border: activeCategory === cat ? `1.5px solid ${CDW_RED}` : "1.5px solid #ddd",
                    background: activeCategory === cat ? CDW_RED : "#fff",
                    color: activeCategory === cat ? "#fff" : "#444",
                    fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.12s",
                  }}
                >{cat}</button>
              ))}
              <button onClick={expandAll} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", fontSize: 12, color: CDW_RED, fontWeight: 600 }}>Expand all</button>
              <button onClick={() => setSectionsOpen({})} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#888", fontWeight: 600 }}>Collapse all</button>
            </div>

            {/* grouped results — controlled open state */}
            {Object.entries(grouped).map(([cat, bps]) => (
              <CategorySection
                key={cat}
                category={cat}
                blueprints={bps}
                fit={fitMap}
                onSelect={(bp, el) => { setModalBp(bp); setModalTrigger(el); }}
                open={!!sectionsOpen[cat]}
                onToggle={() => toggleSection(cat)}
              />
            ))}

            {filteredBlueprints.length === 0 && (
              <div style={{ textAlign: "center", padding: "48px 0", color: "#aaa", fontSize: 14 }}>
                No blueprints in this category for the selected {view === "industry-results" ? "industry" : "function"}.
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── detail modal ── */}
      {modalBp && (
        <DetailModal
          bp={modalBp}
          contextLabel={contextLabel}
          contextFit={fitMap[modalBp.id]}
          triggerEl={modalTrigger}
          onClose={() => { setModalBp(null); setModalTrigger(null); }}
        />
      )}
    </div>
  );
}
