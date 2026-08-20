import React, { useEffect, useState, useRef } from "react";
import cdwLogo from "./cdw-logo.png";
import { AuthProvider, useAuth } from "./AuthContext";
import AuthWidget from "./AuthWidget";
import { supabase } from "./supabaseClient";

const RED = "#CC0000";
const CHARCOAL = "#2D2D2D";
const GRAY_BORDER = "#D1D5DB";
const GRAY_TEXT = "#595959";

const TOOL_LABELS = {
  "tco": "Cloud vs On-Prem TCO Calculator",
  "gpu-sizing": "GPU Sizing Tool",
  "model-advisor": "Open-Weight Model Advisor",
  "roi": "AI Use Case ROI Calculator",
  "readiness": "AI Readiness Checklists",
};

// Tool display order matches the roadmap/handoff order, not alphabetical or
// insertion order, so the summary reads like a natural progression through
// the tools rather than a random list.
const TOOL_ORDER = ["tco", "gpu-sizing", "model-advisor", "roi", "readiness"];

// Explicit format for every field currently produced by any tool's
// useAutosaveSnapshot call (TCO, GPU Sizing, Model Advisor, ROI). This
// replaces a substring-matching heuristic that silently dollar-formatted
// lowerCostCount (an integer GPU count) because the key contains "cost" --
// the underlying GPU Sizing data was always correct, this renderer was
// misreading it. Explicit keys are unambiguous; add new fields here when a
// tool's snapshot payload changes rather than relying on word-guessing.
const FIELD_FORMAT = {
  // TCO
  savings: "money", floorCaseSavings: "money", cloudCost: "money", onPremCost: "money",
  capexPlusOneTime: "money", monthlyOpex: "money", residualCredit: "money", monthlyBill: "money",
  paybackMonths: "months",
  // GPU Sizing
  budget: "money", lowerCostCount: "count", higherGrowthCount: "count", minTechnical: "count",
  recommended: "count", utilizationPct: "percent",
  // Model Advisor
  topModelParams: "count", eligibleCount: "count", totalCount: "count",
  otherEligibleCount: "count", verificationCandidateCount: "count",
  // ROI
  grossCapacity: "count", redeployableCapacity: "count", fteEquivalent: "count",
  steadyStateValue: "money", year1Value: "money", year1Net: "money", horizonNet: "money",
  horizonROI: "percent", horizonYears: "count", payback: "months",
};

// Lightweight formatter for values coming out of each tool's "summary"
// object. Known fields use the explicit table above; anything not yet in
// the table falls back to a heuristic, hardened to never money-format a
// key that ends in Count/Class/Years (a strong signal it's not a dollar
// figure even if it contains a money-ish substring elsewhere).
function fmtValue(key, value) {
  if (value == null) return "—";
  if (typeof value === "number") {
    const known = FIELD_FORMAT[key];
    if (known === "months") return `${value.toFixed(1)} months`;
    if (known === "percent") return `${(value * 100).toFixed(1)}%`;
    if (known === "money") return `$${Math.round(value).toLocaleString()}`;
    if (known === "count") return value.toLocaleString();

    // Fallback for fields not yet in FIELD_FORMAT (e.g. a newly added
    // snapshot key). Never trust a money-word match against a key that's
    // clearly a count/class/year field, regardless of substring content.
    const k = key.toLowerCase();
    const isCountLike = /count|class|years?$/i.test(key);
    if (!isCountLike) {
      if (k.includes("payback")) return `${value.toFixed(1)} months`;
      if ((k.includes("pct") || k.includes("roi")) && Math.abs(value) <= 5) {
        return `${(value * 100).toFixed(1)}%`;
      }
      const MONEY_WORDS = ["cost", "savings", "value", "budget", "net", "bill", "opex", "capex", "credit", "spend", "price", "amount"];
      if (MONEY_WORDS.some((w) => k.includes(w))) {
        return `$${Math.round(value).toLocaleString()}`;
      }
    }
    return value.toLocaleString();
  }
  return String(value);
}

// Known acronyms get their own casing rather than the generic
// first-letter-capitalized treatment ("Gpu" -> "GPU", "Roi" -> "ROI").
const ACRONYMS = ["GPU", "ROI", "AI", "TCO", "FTE"];

function labelize(key) {
  const spaced = key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());
  return spaced
    .split(" ")
    .map((word) => {
      const upper = word.toUpperCase();
      return ACRONYMS.includes(upper) ? upper : word;
    })
    .join(" ");
}

function CombinedSummaryInner() {
  const { isLoggedIn, needsSetup, account, logDownloadEvent } = useAuth();
  const [snapshots, setSnapshots] = useState(null);
  const [loadingSnapshots, setLoadingSnapshots] = useState(true);
  const hasLogged = useRef(false);

  useEffect(() => {
    if (!isLoggedIn || !account?.id) {
      setLoadingSnapshots(false);
      return;
    }
    supabase
      .from("tool_snapshots")
      .select("*")
      .eq("account_id", account.id)
      .then(({ data, error }) => {
        if (error) {
          console.error("Failed to load tool snapshots:", error.message);
          setSnapshots([]);
        } else {
          setSnapshots(data || []);
        }
        setLoadingSnapshots(false);
      });
  }, [isLoggedIn, account?.id]);

  // Fire the combined-summary notification once, the first time a real
  // summary (>=1 snapshot) is actually shown -- not on every render, and
  // not for an empty state with nothing to report.
  useEffect(() => {
    if (hasLogged.current) return;
    if (!snapshots || snapshots.length === 0) return;
    hasLogged.current = true;
    const included = snapshots
      .map((s) => TOOL_LABELS[s.tool] || s.tool)
      .join(", ");
    logDownloadEvent("combined-summary", { toolsIncluded: included, toolCount: snapshots.length });
  }, [snapshots, logDownloadEvent]);

  const ordered = snapshots
    ? [...snapshots].sort((a, b) => TOOL_ORDER.indexOf(a.tool) - TOOL_ORDER.indexOf(b.tool))
    : [];

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Inter', system-ui, sans-serif", color: CHARCOAL }}>
      <style>{`@media print { .no-print { display: none !important; } body { background: #fff; } }`}</style>
      <div style={{ borderBottom: `1px solid ${GRAY_BORDER}`, padding: "16px 24px", display: "flex", alignItems: "center", gap: 12 }}>
        <a href="/" style={{ display: "flex", alignItems: "center", flexShrink: 0 }} aria-label="AI Factory Tools home">
          <img src={cdwLogo} alt="CDW" style={{ height: 36, width: "auto" }} />
        </a>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: RED, textTransform: "uppercase" }}>AI Factory Tools</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Combined Summary</div>
        </div>
      </div>

      <div className="no-print" style={{ padding: "10px 24px", display: "flex", justifyContent: "flex-end", borderBottom: `1px solid #eee` }}>
        <AuthWidget />
      </div>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px 24px 64px" }}>
        {!isLoggedIn && (
          <div style={{ textAlign: "center", padding: "48px 0", color: GRAY_TEXT }}>
            <p style={{ fontSize: 15, marginBottom: 4 }}>Sign in above to view your combined summary.</p>
            <p style={{ fontSize: 13 }}>This pulls together everything you've worked on across the AI Factory tools, no need to remember which ones you already downloaded a report from.</p>
          </div>
        )}

        {isLoggedIn && needsSetup && (
          <div style={{ textAlign: "center", padding: "48px 0", color: GRAY_TEXT }}>
            <p style={{ fontSize: 15 }}>Finish setting up your account above to view your combined summary.</p>
          </div>
        )}

        {isLoggedIn && !needsSetup && loadingSnapshots && (
          <div style={{ textAlign: "center", padding: "48px 0", color: GRAY_TEXT, fontSize: 14 }}>Loading your summary...</div>
        )}

        {isLoggedIn && !needsSetup && !loadingSnapshots && ordered.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 0", color: GRAY_TEXT }}>
            <p style={{ fontSize: 15, marginBottom: 4 }}>Nothing to summarize yet.</p>
            <p style={{ fontSize: 13 }}>Visit any AI Factory tool and start adjusting inputs, your progress saves automatically and shows up here.</p>
          </div>
        )}

        {isLoggedIn && !needsSetup && !loadingSnapshots && ordered.length > 0 && (
          <>
            <div className="no-print" style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
              <button
                onClick={() => window.print()}
                style={{ fontWeight: 700, fontSize: 13, padding: "10px 18px", borderRadius: 8, border: "none", cursor: "pointer", background: CHARCOAL, color: "#fff" }}
              >
                Print / Save as PDF
              </button>
            </div>

            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 2 }}>
              Prepared for {account?.name || "you"}{account?.company ? `, ${account.company}` : ""}
            </div>
            <div style={{ fontSize: 12, color: GRAY_TEXT, marginBottom: 24 }}>
              {new Date().toLocaleDateString()} &middot; covering {ordered.length} of 5 AI Factory tools
            </div>

            {ordered.map((s) => (
              <div key={s.tool} style={{ border: `1px solid ${GRAY_BORDER}`, borderRadius: 12, padding: 20, marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{TOOL_LABELS[s.tool] || s.tool}</div>
                  <div style={{ fontSize: 11, color: GRAY_TEXT }}>updated {new Date(s.updated_at).toLocaleString()}</div>
                </div>
                {s.summary ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", rowGap: 6, columnGap: 12, fontSize: 13 }}>
                    {Object.entries(s.summary).map(([k, v]) => (
                      <React.Fragment key={k}>
                        <div style={{ color: GRAY_TEXT }}>{labelize(k)}</div>
                        <div>{fmtValue(k, v)}</div>
                      </React.Fragment>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: GRAY_TEXT }}>In progress, no results yet.</div>
                )}
              </div>
            ))}

            <div style={{ fontSize: 11, color: GRAY_TEXT, padding: 14, background: "#F7F7F7", borderRadius: 10, marginTop: 8, lineHeight: 1.5 }}>
              This combined summary reflects your most recent inputs in each tool as of the dates shown above. Each
              section is a directional estimate from that tool, not a validated business case. Confirm with a CDW AI
              Factory specialist before using these figures in a formal proposal.
            </div>

            <div style={{ borderTop: `2px solid ${CHARCOAL}`, marginTop: 20, paddingTop: 10, display: "flex", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>Jay B. Carlile</div>
                <div style={{ fontSize: 11, color: GRAY_TEXT }}>AI Solutions Executive &middot; CDW AI Factory</div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function CombinedSummary() {
  return (
    <AuthProvider>
      <CombinedSummaryInner />
    </AuthProvider>
  );
}
