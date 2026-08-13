import React, { useState, useMemo, useRef, useEffect } from "react";
import DATA from "./blueprints.json";
import cdwLogo from "./cdw-logo.png";

/*
  CDW AI Factory Tools — AI Use Case Explorer
  v1.0

  Browse tool, not a calculator. Pick an industry, see the NVIDIA Blueprints
  that map to it, grouped by use case category. Detail opens in-tool.

  Styling: inline styles only (this repo has no build-time Tailwind).
  Matches the visual language of TcoCalculator.jsx v2.8.

  Data lives in ./blueprints.json so the catalog can be updated without
  touching this file.

  LOGO NOTE: CDW logo usage was temp-approved for draft product artifacts
  only. Website publication is NOT approved.
*/

const RED = "#CC0000";
const CHARCOAL = "#2D2D2D";
const GRAY_300 = "#D1D5DB";
const GRAY_500 = "#6B7280";
const GRAY_50 = "#F9FAFB";
const FONT = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const VERSION = "v1.2";

/* ---------------------------------------------------------------- helpers */

function resolveInPractice(bp, industryId) {
  const d = bp.detail_in_practice || {};
  return d[industryId] || d.default || "";
}

function categoriesFor(bp, allCats) {
  return allCats.filter((c) => (bp.use_case_categories || []).includes(c.id));
}

/* ------------------------------------------------------------ detail panel */

function DetailPanel({ bp, industry, onClose }) {
  const cardRef = useRef(null);

  // Close on any pointer down outside the card, plus Escape.
  // (Backdrop-geometry click handlers proved fragile in the GPU sizing tool;
  // this ref-based approach doesn't depend on the backdrop covering the page.)
  useEffect(() => {
    function onPointerDown(e) {
      if (cardRef.current && !cardRef.current.contains(e.target)) onClose();
    }
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  if (!bp) return null;

  const deprecated = bp.status !== "active";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={bp.name}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        zIndex: 1000,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: 16,
        overflowY: "auto",
        boxSizing: "border-box",
      }}
    >
      <div
        ref={cardRef}
        style={{
          background: "#FFFFFF",
          borderRadius: 14,
          maxWidth: 640,
          width: "100%",
          marginTop: 24,
          marginBottom: 24,
          boxSizing: "border-box",
          boxShadow: "0 12px 40px rgba(0,0,0,0.28)",
        }}
      >
        {/* panel header */}
        <div
          style={{
            background: CHARCOAL,
            color: "#FFFFFF",
            padding: "18px 20px",
            borderTopLeftRadius: 14,
            borderTopRightRadius: 14,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            boxSizing: "border-box",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 11,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#FFFFFF",
                opacity: 0.7,
                fontWeight: 700,
                marginBottom: 6,
              }}
            >
              {industry.label}
            </div>
            <h2
              style={{
                margin: 0,
                fontSize: 19,
                lineHeight: 1.25,
                fontWeight: 700,
                boxSizing: "border-box",
              }}
            >
              {bp.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              flexShrink: 0,
              background: "rgba(255,255,255,0.12)",
              color: "#FFFFFF",
              border: "none",
              borderRadius: 8,
              width: 40,
              height: 40,
              fontSize: 20,
              lineHeight: 1,
              cursor: "pointer",
              fontFamily: FONT,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: 20, boxSizing: "border-box" }}>
          {deprecated && (
            <div
              style={{
                background: "#FEF3C7",
                border: "1px solid #F59E0B",
                borderRadius: 8,
                padding: "10px 12px",
                fontSize: 13,
                color: "#7C2D12",
                marginBottom: 16,
                boxSizing: "border-box",
              }}
            >
              NVIDIA has marked this blueprint deprecated. It's shown because the
              underlying use case still comes up; treat it as directional.
            </div>
          )}

          <Section title="What it does" body={bp.detail_what_it_does} />
          <Section
            title={`What this looks like in ${industry.label}`}
            body={resolveInPractice(bp, industry.id)}
          />
          <Section
            title="What it typically needs"
            body={bp.detail_infrastructure}
          />

          {/* handoff */}
          <div
            style={{
              borderTop: `1px solid ${GRAY_300}`,
              paddingTop: 16,
              marginTop: 4,
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                fontSize: 11,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: GRAY_500,
                fontWeight: 700,
                marginBottom: 10,
              }}
            >
              Size and cost it
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <HandoffLink href="/model-advisor" label="Pick a model" />
              <HandoffLink href="/gpu-sizing" label="Size the GPUs" />
              <HandoffLink href="/tco" label="Compare cloud vs on-prem cost" />
            </div>
          </div>

          {bp.nvidia_url && (
            <div style={{ marginTop: 18 }}>
              <a
                href={bp.nvidia_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: 12,
                  color: GRAY_500,
                  textDecoration: "underline",
                  fontFamily: FONT,
                }}
              >
                View the source blueprint on NVIDIA
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, body }) {
  if (!body) return null;
  return (
    <div style={{ marginBottom: 18, boxSizing: "border-box" }}>
      <div
        style={{
          fontSize: 11,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: RED,
          fontWeight: 700,
          marginBottom: 6,
        }}
      >
        {title}
      </div>
      <p
        style={{
          margin: 0,
          fontSize: 14.5,
          lineHeight: 1.6,
          color: CHARCOAL,
          boxSizing: "border-box",
        }}
      >
        {body}
      </p>
    </div>
  );
}

function HandoffLink({ href, label }) {
  return (
    <a
      href={href}
      style={{
        display: "inline-block",
        padding: "9px 14px",
        background: "#FFFFFF",
        border: `1px solid ${GRAY_300}`,
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 600,
        color: CHARCOAL,
        textDecoration: "none",
        fontFamily: FONT,
        boxSizing: "border-box",
      }}
    >
      {label}
    </a>
  );
}

/* -------------------------------------------------------------- main view */

export default function UseCaseExplorer() {
  const industries = DATA.industries;
  const categories = DATA.use_case_categories;
  const blueprints = DATA.blueprints;

  const [industryId, setIndustryId] = useState(null);
  const [activeCats, setActiveCats] = useState([]); // empty = show all
  const [openId, setOpenId] = useState(null);
  const [expanded, setExpanded] = useState([]); // category ids currently open

  const industry = industries.find((i) => i.id === industryId) || null;

  const matches = useMemo(() => {
    if (!industryId) return [];
    return blueprints.filter((b) => (b.industries || []).includes(industryId));
  }, [industryId, blueprints]);

  // Only show category chips that actually have results for this industry.
  const presentCats = useMemo(() => {
    const ids = new Set();
    matches.forEach((b) => (b.use_case_categories || []).forEach((c) => ids.add(c)));
    return categories.filter((c) => ids.has(c.id));
  }, [matches, categories]);

  const visible = useMemo(() => {
    if (activeCats.length === 0) return matches;
    return matches.filter((b) =>
      (b.use_case_categories || []).some((c) => activeCats.includes(c))
    );
  }, [matches, activeCats]);

  const grouped = useMemo(() => {
    return presentCats
      .filter((c) => activeCats.length === 0 || activeCats.includes(c.id))
      .map((c) => ({
        category: c,
        items: visible.filter((b) => (b.use_case_categories || []).includes(c.id)),
      }))
      .filter((g) => g.items.length > 0);
  }, [presentCats, visible, activeCats]);

  // Default expansion. On a fresh industry only the first section opens, so the
  // page stays short and the interaction is still visible. Once the visitor
  // filters, they've told us what they want — open everything that matches.
  const groupKey = grouped.map((g) => g.category.id).join("|");
  useEffect(() => {
    if (!industryId || grouped.length === 0) {
      setExpanded([]);
      return;
    }
    if (activeCats.length > 0) {
      setExpanded(grouped.map((g) => g.category.id));
    } else {
      setExpanded([grouped[0].category.id]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [industryId, activeCats.join("|"), groupKey]);

  function pickIndustry(id) {
    setIndustryId(id);
    setActiveCats([]);
    setOpenId(null);
  }

  function toggleSection(id) {
    setExpanded((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  const allOpen = grouped.length > 0 && expanded.length === grouped.length;

  function toggleCat(id) {
    setActiveCats((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  const openBp = openId ? blueprints.find((b) => b.id === openId) : null;

  return (
    <div
      style={{
        fontFamily: FONT,
        background: "#FFFFFF",
        color: CHARCOAL,
        minHeight: "100vh",
        boxSizing: "border-box",
      }}
    >
      {/* header */}
      <div
        style={{
          borderBottom: `1px solid ${GRAY_300}`,
          padding: "16px 18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <a href="/" aria-label="AI Factory Tools home" style={{ flexShrink: 0, display: "flex" }}>
            <img
              src={cdwLogo}
              alt="CDW"
              style={{ height: 36, width: "auto" }}
            />
          </a>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 11,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: RED,
                fontWeight: 800,
                marginBottom: 4,
              }}
            >
              AI Factory Tools
            </div>
            <h1
              style={{
                margin: 0,
                fontSize: 20,
                fontWeight: 800,
                lineHeight: 1.2,
                boxSizing: "border-box",
              }}
            >
              AI Use Case Explorer
            </h1>
          </div>
        </div>
        <span
          style={{
            flexShrink: 0,
            background: RED,
            color: "#FFFFFF",
            borderRadius: 999,
            padding: "5px 11px",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.04em",
            whiteSpace: "nowrap",
          }}
        >
          PROTOTYPE {VERSION}
        </span>
      </div>

      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: "20px 18px 48px",
          boxSizing: "border-box",
        }}
      >
        <p
          style={{
            margin: "0 0 22px",
            fontSize: 15,
            lineHeight: 1.6,
            color: GRAY_500,
            boxSizing: "border-box",
          }}
        >
          Match your industry's use cases to NVIDIA Blueprints CDW can execute.
        </p>

        {/* industry picker */}
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: CHARCOAL,
            fontWeight: 700,
            marginBottom: 10,
          }}
        >
          Choose your industry
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
            gap: 8,
            marginBottom: 28,
            boxSizing: "border-box",
          }}
        >
          {industries.map((ind) => {
            const on = ind.id === industryId;
            return (
              <button
                key={ind.id}
                onClick={() => pickIndustry(ind.id)}
                aria-pressed={on}
                style={{
                  textAlign: "left",
                  padding: "13px 14px",
                  borderRadius: 10,
                  border: on ? `1px solid ${RED}` : `1px solid ${GRAY_300}`,
                  background: on ? RED : "#FFFFFF",
                  color: on ? "#FFFFFF" : CHARCOAL,
                  fontSize: 14,
                  fontWeight: on ? 700 : 600,
                  cursor: "pointer",
                  fontFamily: FONT,
                  lineHeight: 1.3,
                  boxSizing: "border-box",
                }}
              >
                {ind.label}
              </button>
            );
          })}
        </div>

        {!industry && (
          <div
            style={{
              background: GRAY_50,
              border: `1px solid ${GRAY_300}`,
              borderRadius: 12,
              padding: "26px 20px",
              textAlign: "center",
              color: GRAY_500,
              fontSize: 14.5,
              lineHeight: 1.6,
              boxSizing: "border-box",
            }}
          >
            Pick an industry above to see the blueprints that apply to it.
          </div>
        )}

        {industry && (
          <>
            {/* framing */}
            <div
              style={{
                background: CHARCOAL,
                color: "#FFFFFF",
                borderRadius: 12,
                padding: "18px 20px",
                marginBottom: 22,
                boxSizing: "border-box",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  fontWeight: 700,
                  opacity: 0.7,
                  marginBottom: 8,
                }}
              >
                Why {industry.label} looks at this
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: 15,
                  lineHeight: 1.6,
                  boxSizing: "border-box",
                }}
              >
                {industry.framing}
              </p>
            </div>

            {/* count + chips */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 10,
                boxSizing: "border-box",
              }}
            >
              <span style={{ fontSize: 13, color: GRAY_500 }}>
                {matches.length} blueprint{matches.length === 1 ? "" : "s"} apply
                to {industry.label}
                {activeCats.length > 0 ? ` · ${visible.length} shown` : ""}
              </span>
              {grouped.length > 1 && (
                <button
                  onClick={() =>
                    setExpanded(allOpen ? [] : grouped.map((g) => g.category.id))
                  }
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    fontSize: 13,
                    fontWeight: 600,
                    color: RED,
                    cursor: "pointer",
                    fontFamily: FONT,
                  }}
                >
                  {allOpen ? "Collapse all" : "Expand all"}
                </button>
              )}
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 7,
                marginBottom: 26,
                boxSizing: "border-box",
              }}
            >
              <Chip
                label="All"
                on={activeCats.length === 0}
                onClick={() => setActiveCats([])}
              />
              {presentCats.map((c) => (
                <Chip
                  key={c.id}
                  label={c.label}
                  on={activeCats.includes(c.id)}
                  onClick={() => toggleCat(c.id)}
                />
              ))}
            </div>

            {/* grouped results */}
            {grouped.map((g) => {
              const open = expanded.includes(g.category.id);
              const panelId = `section-${g.category.id}`;
              return (
                <div key={g.category.id} style={{ marginBottom: open ? 30 : 12 }}>
                  <button
                    onClick={() => toggleSection(g.category.id)}
                    aria-expanded={open}
                    aria-controls={panelId}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                      marginBottom: open ? 12 : 0,
                      padding: "4px 0 8px",
                      background: "none",
                      border: "none",
                      borderBottom: `2px solid ${open ? RED : GRAY_300}`,
                      cursor: "pointer",
                      fontFamily: FONT,
                      textAlign: "left",
                      boxSizing: "border-box",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        display: "inline-block",
                        fontSize: 11,
                        color: RED,
                        transform: open ? "rotate(90deg)" : "none",
                        transition: "transform 120ms ease",
                      }}
                    >
                      ▶
                    </span>
                    <span
                      style={{
                        fontSize: 15,
                        fontWeight: 800,
                        letterSpacing: "0.01em",
                        color: CHARCOAL,
                      }}
                    >
                      {g.category.label}
                    </span>
                    <span style={{ fontSize: 12.5, color: GRAY_500 }}>
                      {g.items.length}
                    </span>
                  </button>

                  {open && (
                    <div
                      id={panelId}
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fill, minmax(260px, 1fr))",
                        gap: 12,
                        boxSizing: "border-box",
                      }}
                    >
                      {g.items.map((bp) => (
                        <BlueprintCard
                          key={bp.id + g.category.id}
                          bp={bp}
                          onOpen={() => setOpenId(bp.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {grouped.length === 0 && (
              <div
                style={{
                  background: GRAY_50,
                  border: `1px solid ${GRAY_300}`,
                  borderRadius: 12,
                  padding: "24px 20px",
                  textAlign: "center",
                  color: GRAY_500,
                  fontSize: 14.5,
                  boxSizing: "border-box",
                }}
              >
                No blueprints match those filters. Clear a filter to see more.
              </div>
            )}
          </>
        )}

        {/* footer */}
        <div
          style={{
            borderTop: `1px solid ${GRAY_300}`,
            marginTop: 34,
            paddingTop: 16,
            fontSize: 12,
            color: GRAY_500,
            lineHeight: 1.7,
            boxSizing: "border-box",
          }}
        >
          <div>
            Blueprint catalog current as of {DATA.meta.catalog_last_verified}.
            NVIDIA adds and retires blueprints regularly.
          </div>
          <div style={{ marginTop: 8 }}>
            <a href="/" style={{ color: GRAY_500 }}>
              All AI Factory Tools
            </a>
          </div>
        </div>
      </div>

      {openBp && industry && (
        <DetailPanel
          bp={openBp}
          industry={industry}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  );
}

function Chip({ label, on, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      style={{
        padding: "8px 14px",
        borderRadius: 999,
        border: on ? `1px solid ${RED}` : `1px solid ${GRAY_300}`,
        background: on ? RED : "#FFFFFF",
        color: on ? "#FFFFFF" : CHARCOAL,
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        fontFamily: FONT,
        whiteSpace: "nowrap",
        boxSizing: "border-box",
      }}
    >
      {label}
    </button>
  );
}

function BlueprintCard({ bp, onOpen }) {
  const deprecated = bp.status !== "active";
  return (
    <button
      onClick={onOpen}
      style={{
        textAlign: "left",
        background: "#FFFFFF",
        border: `1px solid ${GRAY_300}`,
        borderRadius: 12,
        padding: "15px 16px",
        cursor: "pointer",
        fontFamily: FONT,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        height: "100%",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <span
          style={{
            fontSize: 14.5,
            fontWeight: 700,
            color: CHARCOAL,
            lineHeight: 1.3,
          }}
        >
          {bp.name}
        </span>
        {deprecated && (
          <span
            style={{
              flexShrink: 0,
              fontSize: 9.5,
              fontWeight: 800,
              letterSpacing: "0.06em",
              color: "#92400E",
              background: "#FEF3C7",
              borderRadius: 999,
              padding: "3px 7px",
              whiteSpace: "nowrap",
            }}
          >
            LEGACY
          </span>
        )}
      </div>

      <span
        style={{
          fontSize: 13,
          lineHeight: 1.5,
          color: GRAY_500,
        }}
      >
        {bp.description}
      </span>

      <span
        style={{
          fontSize: 13.5,
          lineHeight: 1.5,
          color: CHARCOAL,
          fontWeight: 500,
          borderLeft: `3px solid ${RED}`,
          paddingLeft: 10,
          marginTop: 2,
        }}
      >
        {bp.industry_pitch}
      </span>

      <span
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: RED,
          marginTop: "auto",
          paddingTop: 6,
        }}
      >
        See how this applies →
      </span>
    </button>
  );
}
