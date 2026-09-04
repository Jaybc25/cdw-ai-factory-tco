import React from "react";

const RED = "#CC0000";
const INK = "#2D2D2D";
const SUB = "#666666";
const LINE = "#D9D9D9";
const SOFT = "#F7F7F7";

function money(value) {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function confidenceTone(confidence) {
  if (confidence === "LISTED") return { bg: "#EAF6EE", fg: "#1D6B39" };
  if (confidence === "NODE-NORM") return { bg: "#FFF5DB", fg: "#7A5700" };
  if (confidence === "QUOTE") return { bg: "#F3EAF7", fg: "#6A3C78" };
  return { bg: "#FDECEC", fg: "#8B2F2F" };
}

export default function BestValueGpuAasPanel({
  rows = [],
  gpuClass,
  horizon,
  activeProvider,
  onUseProvider,
  onClose,
}) {
  if (!rows.length) return null;

  const winner = rows[0];
  const winnerQualifier = winner.confidence === "LISTED"
    ? "Lowest modeled GPUaaS cost"
    : "Lowest modeled GPUaaS estimate";

  return (
    <section
      aria-label="Best modeled GPUaaS value"
      style={{
        border: `1px solid ${LINE}`,
        borderLeft: `4px solid ${RED}`,
        borderRadius: 10,
        background: "#FFFFFF",
        marginTop: 10,
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "12px 14px 10px", borderBottom: `1px solid ${LINE}` }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.8, color: RED, textTransform: "uppercase" }}>
              Best modeled GPUaaS value
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: INK, marginTop: 3 }}>
              {winnerQualifier}: {winner.provider}
            </div>
            <div style={{ fontSize: 11.5, color: SUB, marginTop: 3, lineHeight: 1.4 }}>
              Like-for-like {gpuClass} pricing only · {horizon}-year modeled cloud cost · current TCO workload assumptions
            </div>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close best-value GPUaaS results"
              style={{ border: "none", background: "transparent", color: SUB, cursor: "pointer", fontSize: 18, lineHeight: 1, padding: 2 }}
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: "6px 14px" }}>
        {rows.map((row, index) => {
          const tone = confidenceTone(row.confidence);
          const isActive = row.provider === activeProvider;
          return (
            <div
              key={`${row.provider}-${row.gpuClass}`}
              style={{
                display: "grid",
                gridTemplateColumns: "28px minmax(105px, 1fr) minmax(110px, auto) minmax(104px, auto) auto",
                gap: 10,
                alignItems: "center",
                padding: "9px 0",
                borderBottom: index === rows.length - 1 ? "none" : `1px solid ${LINE}`,
              }}
            >
              <div style={{ width: 24, height: 24, borderRadius: 12, background: index === 0 ? RED : SOFT, color: index === 0 ? "#fff" : INK, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 }}>
                {index + 1}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: INK }}>{row.provider}</div>
                <div style={{ fontSize: 10.5, color: SUB }}>{row.gpuClass}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: INK }}>{money(row.cloudTotal)}</div>
                <div style={{ fontSize: 10.5, color: SUB }}>{horizon}-yr cloud</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <span
                  title={row.rateNote || row.confidenceLabel}
                  style={{ display: "inline-block", background: tone.bg, color: tone.fg, borderRadius: 999, padding: "4px 7px", fontSize: 10, fontWeight: 800, whiteSpace: "nowrap" }}
                >
                  {row.confidence}
                </span>
              </div>
              <button
                type="button"
                disabled={isActive}
                onClick={() => onUseProvider?.(row.provider)}
                style={{
                  border: isActive ? `1px solid ${LINE}` : "none",
                  borderRadius: 6,
                  background: isActive ? SOFT : RED,
                  color: isActive ? SUB : "#FFFFFF",
                  padding: "7px 9px",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: isActive ? "default" : "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {isActive ? "Current" : "Use provider"}
              </button>
            </div>
          );
        })}
      </div>

      <div style={{ background: SOFT, padding: "8px 14px", fontSize: 10.5, color: SUB, lineHeight: 1.45 }}>
        Ranked by modeled cost, not by SLA, region, enterprise discounts, support, security, availability, or procurement fit. Pricing confidence is shown for every option; QUOTE, EST, and NODE-NORM results should be validated before a customer decision.
      </div>
    </section>
  );
}
