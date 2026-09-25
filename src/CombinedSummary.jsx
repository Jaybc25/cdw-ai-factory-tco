import React, { useEffect, useState, useRef } from "react";
import cdwLogo from "./cdw-logo.png";
import { AuthProvider, useAuth } from "./AuthContext";
import AuthWidget from "./AuthWidget";
import { supabase } from "./supabaseClient";
import { TOOL_LABELS, TOOL_ORDER, presentSummary, buildScenarioConsistencyIssues } from "./combinedSummaryPresentation.js";

const RED = "#CC0000";
const CHARCOAL = "#2D2D2D";
const GRAY_BORDER = "#D1D5DB";
const GRAY_TEXT = "#595959";

function CombinedSummaryInner() {
  const { isLoggedIn, needsSetup, account, logDownloadEvent, loading: authLoading } = useAuth();
  const [snapshots, setSnapshots] = useState(null);
  const [loadingSnapshots, setLoadingSnapshots] = useState(true);
  const hasLogged = useRef(false);

  useEffect(() => {
    // Fix (Bug 5, part 1): AuthContext's own session check (authLoading) is
    // a separate loading phase from this component's snapshot fetch, and
    // isLoggedIn is reliably false during that window regardless of
    // whether the user actually has a session. Treating that transient
    // false as a real "signed out" state below was the trigger for the
    // whole bug -- it fired the early-return branch and set
    // loadingSnapshots(false) before there was ever a real fetch to wait
    // on. Don't decide anything here until auth itself has resolved.
    if (authLoading) return;

    // Fix (Bug 5, part 3 -- caught in post-remediation regression testing):
    // this used to be one combined `!isLoggedIn || !account?.id` branch,
    // which collapsed two genuinely different states into the same
    // outcome. "Not logged in" is a real terminal state -- there is
    // nothing to load, loadingSnapshots(false) is correct. But "logged in,
    // account row not yet loaded" is a THIRD loading phase (auth resolved
    // -> account fetch in flight -> snapshot fetch not yet started), and
    // treating it identically to "not logged in" set loadingSnapshots
    // false during that window too -- with needsSetup also false while
    // account is null, that combination lands squarely on the empty-state
    // render for exactly as long as the account fetch takes. Confirmed
    // live on a throttled connection: a real, perceptible "Nothing to
    // summarize yet" flash before "Loading your summary..." even
    // reappeared. Splitting the two states so only a genuine "not logged
    // in" sets loadingSnapshots false; "account not loaded yet" is treated
    // as its own explicit loading state instead.
    if (!isLoggedIn) {
      setLoadingSnapshots(false);
      return;
    }
    if (!account?.id) {
      setLoadingSnapshots(true);
      return;
    }

    // Fix (Bug 5, part 2 -- the original reported symptom): explicitly
    // reset to true right before starting a real fetch. loadingSnapshots's
    // initial value (useState(true) above) only covers the very first
    // render. By the time account?.id actually becomes available, this
    // effect has typically already run once or twice via the earlier
    // branches (while auth/account were still resolving), which already
    // set loadingSnapshots to false or true along the way -- explicitly
    // setting it true here regardless of that prior state guarantees the
    // fetch window itself is always covered.
    setLoadingSnapshots(true);
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
  }, [authLoading, isLoggedIn, account?.id]);

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
  const consistencyIssues = buildScenarioConsistencyIssues(ordered);

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Inter', system-ui, sans-serif", color: CHARCOAL }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff; }
          .summary-card { break-inside: avoid; page-break-inside: avoid; }
          .scenario-warning { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>
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
        {/* Fix (Bug 5, part 1, render side): a matching guard for the effect's
            new authLoading check above -- without this, the exact same
            transient "auth hasn't resolved yet" window that used to corrupt
            loadingSnapshots would instead render "Sign in above..." for a
            fraction of a second, even for an already-signed-in user. */}
        {authLoading && (
          <div style={{ textAlign: "center", padding: "48px 0", color: GRAY_TEXT, fontSize: 14 }}>Loading...</div>
        )}

        {!authLoading && !isLoggedIn && (
          <div style={{ textAlign: "center", padding: "48px 0", color: GRAY_TEXT }}>
            <p style={{ fontSize: 15, marginBottom: 4 }}>Sign in above to view your combined summary.</p>
            <p style={{ fontSize: 13 }}>This pulls together the latest saved results from the five snapshot-backed AI Factory tools included in My Summary. Inference Economics and Use Case Explorer are not included in this summary.</p>
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
            <p style={{ fontSize: 13 }}>Run one of the five snapshot-backed tools included in My Summary and your latest saved result will appear here.</p>
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
            <div style={{ fontSize: 12, color: GRAY_TEXT, marginBottom: consistencyIssues.length ? 12 : 24 }}>
              {new Date().toLocaleDateString()} &middot; covering {ordered.length} of 5 AI Factory tools
            </div>

            {consistencyIssues.length > 0 && (
              <div className="scenario-warning" style={{ border: "1px solid #D97706", background: "#FFFBEB", borderRadius: 10, padding: 14, marginBottom: 18, fontSize: 12, lineHeight: 1.5 }}>
                <div style={{ fontWeight: 700, color: "#92400E", marginBottom: 4 }}>Some results come from different saved scenarios</div>
                <div style={{ color: "#78350F", marginBottom: 6 }}>Re-run the downstream tools you want included together before using this as one connected business case.</div>
                <ul style={{ margin: 0, paddingLeft: 18, color: "#78350F" }}>
                  {consistencyIssues.map((issue) => <li key={issue}>{issue}</li>)}
                </ul>
              </div>
            )}

            {ordered.map((s) => (
              <div key={s.tool} className="summary-card" style={{ border: `1px solid ${GRAY_BORDER}`, borderRadius: 12, padding: 20, marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{TOOL_LABELS[s.tool] || s.tool}</div>
                  <div style={{ fontSize: 11, color: GRAY_TEXT }}>updated {new Date(s.updated_at).toLocaleString()}</div>
                </div>
                {s.summary ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", rowGap: 6, columnGap: 12, fontSize: 13 }}>
                    {presentSummary(s.tool, s.summary).map((field) => (
                      <React.Fragment key={field.key}>
                        <div style={{ color: GRAY_TEXT }}>{field.label}</div>
                        <div>{field.value}</div>
                      </React.Fragment>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: GRAY_TEXT }}>In progress, no results yet.</div>
                )}
              </div>
            ))}

            <div style={{ fontSize: 11, color: GRAY_TEXT, padding: 14, background: "#F7F7F7", borderRadius: 10, marginTop: 8, lineHeight: 1.5 }}>
              These are the latest saved results and may describe different scenarios. Each is directional; confirm
              the scenario and inputs with a CDW AI Factory specialist before using this summary in a formal proposal.
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
