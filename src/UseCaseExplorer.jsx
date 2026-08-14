import { useState, useRef, useEffect } from "react";
import blueprintData from "./blueprints.json";

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
  { id: "customer-service",      label: "Customer Service",          gov: "Citizen Services / Contact Center" },
  { id: "cybersecurity",         label: "Cybersecurity",             gov: "CISO / Information Security" },
  { id: "data-analytics",        label: "Data & Analytics",          gov: "Data Office / Policy Analytics" },
  { id: "finance",               label: "Finance",                   gov: "Fiscal / Budget / Comptroller" },
  { id: "human-resources",       label: "Human Resources",           gov: "Personnel / HR / CMS" },
  { id: "information-technology",label: "Information Technology",    gov: "DoIT / State CIO / Enterprise IT" },
  { id: "legal-compliance",      label: "Legal & Compliance",        gov: "AG Office / Inspector General / Courts" },
  { id: "marketing",             label: "Marketing",                 gov: "Communications / Public Affairs" },
  { id: "operations",            label: "Operations",                gov: "Facilities / Ops / Emergency Mgmt" },
  { id: "research-engineering",  label: "Research & Engineering",    gov: "Policy Research / Public Health Lab" },
  { id: "sales",                 label: "Sales",                     gov: "Economic Development / Procurement" },
  { id: "supply-chain-logistics",label: "Supply Chain & Logistics",  gov: "Procurement / Surplus / Warehousing" },
  { id: "communications",        label: "Communications",            gov: "Agency Comms / Governor's Office" },
];

const CATEGORIES = blueprintData.meta.use_case_categories;
const ALL_BLUEPRINTS = blueprintData.blueprints;

// ─── helpers ──────────────────────────────────────────────────────────────────

function getBlueprintsForIndustry(industryId) {
  return ALL_BLUEPRINTS.filter(
    bp => bp.industry_fit && bp.industry_fit[industryId]
  ).sort((a, b) => {
    const fitOrder = { primary: 0, adjacent: 1 };
    const fa = fitOrder[a.industry_fit[industryId]] ?? 2;
    const fb = fitOrder[b.industry_fit[industryId]] ?? 2;
    return fa - fb || a.name.localeCompare(b.name);
  });
}

function getBlueprintsForFunction(funcId) {
  return ALL_BLUEPRINTS.filter(
    bp => bp.department_fit && bp.department_fit[funcId]
  ).sort((a, b) => {
    const fitOrder = { primary: 0, adjacent: 1 };
    const fa = fitOrder[a.department_fit[funcId]] ?? 2;
    const fb = fitOrder[b.department_fit[funcId]] ?? 2;
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
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      padding: "2px 7px",
      borderRadius: 4,
      backgroundColor: isPrimary ? "#e8f5e9" : "#fff3e0",
      color: isPrimary ? "#2e7d32" : "#e65100",
      border: `1px solid ${isPrimary ? "#a5d6a7" : "#ffcc80"}`,
      whiteSpace: "nowrap",
    }}>
      {isPrimary ? "Best Fit" : "Also Relevant"}
    </span>
  );
}

function BlueprintCard({ bp, fit, onSelect }) {
  return (
    <div
      onClick={() => onSelect(bp)}
      style={{
        background: "#fff",
        border: "1px solid #e0e0e0",
        borderRadius: 10,
        padding: "14px 16px",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        transition: "box-shadow 0.15s, border-color 0.15s",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.10)";
        e.currentTarget.style.borderColor = "#76b900";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.borderColor = "#e0e0e0";
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a", lineHeight: 1.35 }}>{bp.name}</span>
        {fit && <FitBadge fit={fit} />}
      </div>
      {bp.status === "legacy" && (
        <span style={{ fontSize: 10, fontWeight: 700, color: "#b45309", background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 4, padding: "1px 6px", width: "fit-content" }}>LEGACY</span>
      )}
      <p style={{ fontSize: 13, color: "#555", margin: 0, lineHeight: 1.5 }}>{bp.description}</p>
    </div>
  );
}

function CategorySection({ category, blueprints, fit, onSelect, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = `cat-${category.replace(/\s+/g, "-")}`;

  return (
    <div style={{ marginBottom: 12 }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls={contentId}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "#f5f5f5",
          border: "1px solid #e0e0e0",
          borderRadius: open ? "8px 8px 0 0" : 8,
          padding: "10px 14px",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 14, color: "#1a1a1a" }}>{category}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: "#666", fontWeight: 500 }}>{blueprints.length} blueprint{blueprints.length !== 1 ? "s" : ""}</span>
          <span style={{ fontSize: 12, transform: open ? "rotate(90deg)" : "none", transition: "transform 0.2s", display: "inline-block" }}>▶</span>
        </span>
      </button>
      {open && (
        <div
          id={contentId}
          style={{
            border: "1px solid #e0e0e0",
            borderTop: "none",
            borderRadius: "0 0 8px 8px",
            padding: "12px",
            background: "#fafafa",
            display: "flex",
            flexDirection: "column",
            gap: 10,
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

function DetailModal({ bp, contextLabel, contextFit, onClose }) {
  const ref = useRef();
  const infraRef = useRef();

  useEffect(() => {
    const handler = e => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    const keyHandler = e => { if (e.key === "Escape") onClose(); };
    document.addEventListener("pointerdown", handler);
    document.addEventListener("keydown", keyHandler);
    return () => {
      document.removeEventListener("pointerdown", handler);
      document.removeEventListener("keydown", keyHandler);
    };
  }, [onClose]);

  const practiceKey = contextLabel
    ? ALL_BLUEPRINTS.find(b => b.id === bp.id)?.detail_in_practice
    : null;

  const practiceText = bp.detail_in_practice?.[contextLabel] || bp.detail_in_practice?.default;

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: 20,
    }}>
      <div
        ref={ref}
        style={{
          background: "#fff", borderRadius: 14, maxWidth: 680, width: "100%",
          maxHeight: "85vh", overflowY: "auto", padding: "28px 28px 24px",
          display: "flex", flexDirection: "column", gap: 18,
          boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#76b900", letterSpacing: "0.08em", textTransform: "uppercase" }}>{bp.use_case_category}</span>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#1a1a1a", lineHeight: 1.3 }}>{bp.name}</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#888", flexShrink: 0, padding: "0 4px" }}
          >×</button>
        </div>

        {contextFit && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <FitBadge fit={contextFit} />
            {contextLabel && (
              <span style={{ fontSize: 12, color: "#888" }}>for {contextLabel}</span>
            )}
          </div>
        )}

        {bp.status === "legacy" && (
          <div style={{ background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#92400e" }}>
            <strong>Legacy blueprint:</strong> This blueprint has been superseded. It may still be deployed but is no longer actively maintained by NVIDIA.
          </div>
        )}

        <div>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: "#444", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6, marginTop: 0 }}>What it does</h3>
          <p style={{ margin: 0, fontSize: 14, color: "#333", lineHeight: 1.6 }}>{bp.detail_what_it_does || bp.description}</p>
        </div>

        {practiceText && (
          <div>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: "#444", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6, marginTop: 0 }}>
              What this looks like in practice
            </h3>
            <p style={{ margin: 0, fontSize: 14, color: "#333", lineHeight: 1.6 }}>{practiceText}</p>
          </div>
        )}

        {bp.detail_infrastructure && (
          <div>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: "#444", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6, marginTop: 0 }}>
              What it typically needs
            </h3>
            <p ref={infraRef} style={{ margin: 0, fontSize: 14, color: "#333", lineHeight: 1.6 }}>{bp.detail_infrastructure}</p>
          </div>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, paddingTop: 4 }}>
          <a
            href="/model-advisor"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "#76b900", color: "#fff", border: "none",
              borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 600,
              cursor: "pointer", textDecoration: "none",
            }}
          >
            Model Advisor →
          </a>
          <a
            href="/gpu-sizing"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "#1a1a1a", color: "#fff", border: "none",
              borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 600,
              cursor: "pointer", textDecoration: "none",
            }}
          >
            GPU Sizing →
          </a>
          <a
            href="/tco"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "#fff", color: "#1a1a1a", border: "1px solid #ccc",
              borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 600,
              cursor: "pointer", textDecoration: "none",
            }}
          >
            TCO Calculator →
          </a>
          {bp.nvidia_url && (
            <a
              href={bp.nvidia_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: "none", color: "#76b900", border: "1px solid #76b900",
                borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 600,
                cursor: "pointer", textDecoration: "none",
              }}
            >
              View on NVIDIA ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── main component ────────────────────────────────────────────────────────────

export default function UseCaseExplorer() {
  // "home" | "industry-pick" | "industry-results" | "function-pick" | "function-results"
  const [view, setView] = useState("home");
  const [selectedIndustry, setSelectedIndustry] = useState(null);
  const [selectedFunction, setSelectedFunction] = useState(null);
  const [activeCategory, setActiveCategory] = useState("All");
  const [modalBp, setModalBp] = useState(null);
  const [sectionsOpen, setSectionsOpen] = useState({});

  // derive results
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

  // open first section by default when results load
  useEffect(() => {
    if ((view === "industry-results" || view === "function-results") && activeBlueprints.length > 0) {
      const firstCat = activeBlueprints[0].use_case_category;
      setSectionsOpen({ [firstCat]: true });
    }
  }, [view, selectedIndustry, selectedFunction]);

  // expand all matching sections when filter applied
  useEffect(() => {
    if (activeCategory !== "All") {
      setSectionsOpen({ [activeCategory]: true });
    }
  }, [activeCategory]);

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

  const contextLabel = view === "industry-results"
    ? selectedIndustry?.id
    : selectedFunction?.id;

  // ─── render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", minHeight: "100vh", background: "#f9f9f9" }}>
      {/* header */}
      <div style={{
        background: "#1a1a1a", padding: "16px 28px",
        display: "flex", alignItems: "center", gap: 14, borderBottom: "3px solid #76b900",
      }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#76b900", letterSpacing: "0.14em", textTransform: "uppercase" }}>CDW AI Factory Tools</span>
          <span style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>AI Use Case Explorer</span>
        </div>
        <span style={{ marginLeft: "auto", fontSize: 10, color: "#666", fontWeight: 500, border: "1px solid #333", borderRadius: 4, padding: "2px 8px" }}>v2.0</span>
      </div>

      {/* breadcrumb */}
      {view !== "home" && (
        <div style={{ background: "#fff", borderBottom: "1px solid #e8e8e8", padding: "10px 28px", display: "flex", gap: 6, alignItems: "center", fontSize: 13 }}>
          <button onClick={resetToHome} style={{ background: "none", border: "none", cursor: "pointer", color: "#76b900", fontWeight: 600, padding: 0, fontSize: 13 }}>Home</button>
          <span style={{ color: "#bbb" }}>›</span>
          {(view === "industry-pick" || view === "industry-results") && (
            <>
              <button
                onClick={() => { setView("industry-pick"); setSelectedIndustry(null); setActiveCategory("All"); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: view === "industry-pick" ? "#333" : "#76b900", fontWeight: 600, padding: 0, fontSize: 13 }}
              >By Industry</button>
              {view === "industry-results" && selectedIndustry && (
                <><span style={{ color: "#bbb" }}>›</span><span style={{ color: "#333", fontWeight: 600 }}>{selectedIndustry.label}</span></>
              )}
            </>
          )}
          {(view === "function-pick" || view === "function-results") && (
            <>
              <button
                onClick={() => { setView("function-pick"); setSelectedFunction(null); setActiveCategory("All"); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: view === "function-pick" ? "#333" : "#76b900", fontWeight: 600, padding: 0, fontSize: 13 }}
              >By Business Function</button>
              {view === "function-results" && selectedFunction && (
                <><span style={{ color: "#bbb" }}>›</span><span style={{ color: "#333", fontWeight: 600 }}>{selectedFunction.label}</span></>
              )}
            </>
          )}
        </div>
      )}

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "28px 20px" }}>

        {/* ── HOME SCREEN ── */}
        {view === "home" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            <div style={{ textAlign: "center" }}>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: "#1a1a1a", margin: "0 0 10px" }}>Explore AI Use Cases</h1>
              <p style={{ fontSize: 15, color: "#666", margin: 0, maxWidth: 540, marginInline: "auto", lineHeight: 1.6 }}>
                Match NVIDIA AI Blueprints to your organization. Choose how you'd like to explore.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {/* By Industry */}
              <button
                onClick={() => setView("industry-pick")}
                style={{
                  background: "#fff",
                  border: "2px solid #e0e0e0",
                  borderRadius: 14,
                  padding: "32px 28px",
                  cursor: "pointer",
                  textAlign: "left",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  transition: "border-color 0.15s, box-shadow 0.15s",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = "#76b900";
                  e.currentTarget.style.boxShadow = "0 6px 24px rgba(118,185,0,0.12)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = "#e0e0e0";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <span style={{ fontSize: 32 }}>🏢</span>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#1a1a1a", marginBottom: 6 }}>By Industry</div>
                  <div style={{ fontSize: 14, color: "#666", lineHeight: 1.55 }}>What are organizations like mine doing with AI?</div>
                </div>
                <div style={{ fontSize: 12, color: "#76b900", fontWeight: 700, letterSpacing: "0.05em" }}>
                  {INDUSTRIES.length} industries →
                </div>
              </button>

              {/* By Business Function */}
              <button
                onClick={() => setView("function-pick")}
                style={{
                  background: "#fff",
                  border: "2px solid #e0e0e0",
                  borderRadius: 14,
                  padding: "32px 28px",
                  cursor: "pointer",
                  textAlign: "left",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  transition: "border-color 0.15s, box-shadow 0.15s",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = "#76b900";
                  e.currentTarget.style.boxShadow = "0 6px 24px rgba(118,185,0,0.12)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = "#e0e0e0";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <span style={{ fontSize: 32 }}>🧩</span>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#1a1a1a", marginBottom: 6 }}>By Business Function</div>
                  <div style={{ fontSize: 14, color: "#666", lineHeight: 1.55 }}>What can AI do for my team?</div>
                </div>
                <div style={{ fontSize: 12, color: "#76b900", fontWeight: 700, letterSpacing: "0.05em" }}>
                  {BUSINESS_FUNCTIONS.length} functions →
                </div>
              </button>
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
              <h2 style={{ fontSize: 22, fontWeight: 800, color: "#1a1a1a", margin: "0 0 6px" }}>Choose your industry</h2>
              <p style={{ fontSize: 14, color: "#666", margin: 0 }}>See which NVIDIA AI Blueprints are most relevant to organizations in your sector.</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
              {INDUSTRIES.map(ind => (
                <button
                  key={ind.id}
                  onClick={() => selectIndustry(ind)}
                  style={{
                    background: "#fff", border: "1px solid #e0e0e0", borderRadius: 10,
                    padding: "14px 16px", cursor: "pointer", textAlign: "left",
                    fontSize: 14, fontWeight: 600, color: "#1a1a1a",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    transition: "border-color 0.15s, background 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#76b900"; e.currentTarget.style.background = "#f9ffe6"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#e0e0e0"; e.currentTarget.style.background = "#fff"; }}
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
              <h2 style={{ fontSize: 22, fontWeight: 800, color: "#1a1a1a", margin: "0 0 6px" }}>Choose your business function</h2>
              <p style={{ fontSize: 14, color: "#666", margin: 0 }}>See which NVIDIA AI Blueprints are most relevant to your team's work — regardless of industry.</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
              {BUSINESS_FUNCTIONS.map(fn => (
                <button
                  key={fn.id}
                  onClick={() => selectFunction(fn)}
                  style={{
                    background: "#fff", border: "1px solid #e0e0e0", borderRadius: 10,
                    padding: "14px 16px", cursor: "pointer", textAlign: "left",
                    display: "flex", flexDirection: "column", gap: 4,
                    transition: "border-color 0.15s, background 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#76b900"; e.currentTarget.style.background = "#f9ffe6"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#e0e0e0"; e.currentTarget.style.background = "#fff"; }}
                >
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>{fn.label}</span>
                  <span style={{ fontSize: 11, color: "#888" }}>Gov: {fn.gov}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── RESULTS (shared for industry + function) ── */}
        {(view === "industry-results" || view === "function-results") && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* context banner */}
            <div style={{ background: "#1a1a1a", borderRadius: 10, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 11, color: "#76b900", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
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
                {activeBlueprints.filter(bp => (view === "industry-results" ? bp.industry_fit?.[selectedIndustry?.id] : bp.department_fit?.[selectedFunction?.id]) === "primary").length} best fit
                &nbsp;·&nbsp;
                {activeBlueprints.filter(bp => (view === "industry-results" ? bp.industry_fit?.[selectedIndustry?.id] : bp.department_fit?.[selectedFunction?.id]) === "adjacent").length} also relevant
              </span>
            </div>

            {/* category chips */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              {availableCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    padding: "6px 14px", borderRadius: 20,
                    border: activeCategory === cat ? "1.5px solid #76b900" : "1.5px solid #ddd",
                    background: activeCategory === cat ? "#76b900" : "#fff",
                    color: activeCategory === cat ? "#fff" : "#444",
                    fontSize: 12, fontWeight: 600, cursor: "pointer",
                    transition: "all 0.12s",
                  }}
                >
                  {cat}
                </button>
              ))}
              <button
                onClick={() => {
                  const allOpen = {};
                  Object.keys(grouped).forEach(c => { allOpen[c] = true; });
                  setSectionsOpen(allOpen);
                }}
                style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#76b900", fontWeight: 600 }}
              >
                Expand all
              </button>
              <button
                onClick={() => setSectionsOpen({})}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#888", fontWeight: 600 }}
              >
                Collapse all
              </button>
            </div>

            {/* grouped results */}
            {Object.entries(grouped).map(([cat, bps], i) => (
              <CategorySection
                key={cat}
                category={cat}
                blueprints={bps}
                fit={fitMap}
                onSelect={setModalBp}
                defaultOpen={sectionsOpen[cat] ?? i === 0}
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

      {/* detail modal */}
      {modalBp && (
        <DetailModal
          bp={modalBp}
          contextLabel={contextLabel}
          contextFit={fitMap[modalBp.id]}
          onClose={() => setModalBp(null)}
        />
      )}
    </div>
  );
}
