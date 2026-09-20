import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import cdwLogo from "./cdw-logo.png";
import { AuthProvider } from "./AuthContext.jsx";
import AuthWidget from "./AuthWidget.jsx";
import { clearBrowserWorkspace, inspectWorkspaceResetState, resetWorkspace } from "./workspaceReset.js";

const ANALYSIS_TOOLS = [
  { key: "use-cases", name: "AI Use Case\nExplorer", desc: "Match your industry's use cases to NVIDIA Blueprints CDW can execute.", status: "live", path: "/use-cases" },
  { key: "model-advisor", name: "Open-Weight\nModel Advisor", desc: "Recommends open-weight models by workload, then hands off to GPU sizing.", status: "live", path: "/model-advisor" },
  { key: "gpu-sizing", name: "GPU Sizing Tool", desc: "Right-size GPU class, count, and cluster shape for a target workload.", status: "live", path: "/gpu-sizing" },
  { key: "tco", name: "Cloud vs On-Prem\nTCO Calculator", desc: "Cloud AI spend translated into on-prem infrastructure cost and payback.", status: "live", path: "/tco" },
  { key: "inference-economics", name: "Inference\nEconomics", desc: "Compare effective private-AI inference cost per 1M output tokens with managed-API pricing.", status: "live", path: "/inference-economics" },
  { key: "roi", name: "AI Use Case\nROI Calculator", desc: "Workload acceleration translated into capacity created and its economic value.", status: "live", path: "/roi" },
];

const READINESS_TOOL = {
  key: "readiness",
  name: "AI Readiness Checklists",
  desc: "Assess data, security, and infrastructure readiness across your AI journey.",
  status: "live",
  path: "/readiness",
};

function LandingPageInner() {
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetState, setResetState] = useState({ loading: true, hasState: true, signedIn: false, local: false });

  function showToast(msg) {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2600);
  }

  async function refreshResetState() {
    try {
      const state = await inspectWorkspaceResetState();
      setResetState({ loading: false, ...state });
    } catch {
      setResetState({ loading: false, hasState: true, signedIn: false, local: true, checkFailed: true });
    }
  }

  useEffect(() => {
    refreshResetState();
    return () => clearTimeout(toastTimer.current);
  }, []);

  useEffect(() => {
    if (!resetOpen) return;
    function onKeyDown(event) {
      if (event.key === "Escape" && !resetBusy) setResetOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [resetOpen, resetBusy]);

  async function confirmReset() {
    setResetBusy(true);
    setResetError("");
    try {
      if (resetState.signedIn) {
        await resetWorkspace();
        showToast("Workspace reset. You're ready to start a new scenario.");
      } else {
        await clearBrowserWorkspace();
        showToast("This browser's tool inputs were cleared.");
      }
      setResetOpen(false);
      await refreshResetState();
    } catch (error) {
      console.error("Workspace reset failed:", error);
      setResetError(resetState.signedIn
        ? "Reset could not be completed. Your current scenario was left intact. Please try again."
        : "This browser's saved tool inputs could not be cleared. Please try again.");
    } finally {
      setResetBusy(false);
    }
  }

  const resetDisabled = resetState.loading || !resetState.hasState || resetBusy;
  const signedInReset = !!resetState.signedIn;

  return (
    <div className="afl-wrap">
      <style>{`
        .afl-wrap, .afl-wrap * { box-sizing: border-box; }
        .afl-wrap { --red:#CC0000; --red-dark:#A30000; --charcoal:#2D2D2D; --gray:#6B6B6B; font-family:'Inter',sans-serif; max-width:1000px; margin:0 auto; padding:32px 32px 100px; color:var(--charcoal); }
        .afl-header { display:flex; align-items:center; justify-content:space-between; gap:20px; padding-bottom:16px; border-bottom:1px solid #E7E7E7; }
        .afl-brand { display:flex; align-items:center; gap:14px; flex-shrink:0; }
        .afl-account { display:flex; align-items:center; justify-content:flex-end; min-width:0; }
        .afl-logo { height:42px; width:auto; flex-shrink:0; }
        .afl-eyebrow { font-size:12px; font-weight:700; color:var(--red); letter-spacing:.1em; text-transform:uppercase; }
        .afl-hero { margin:32px 0 18px; max-width:720px; }
        .afl-hero h1 { margin:0 0 14px; font-weight:800; font-size:clamp(26px,3.6vw,34px); line-height:1.28; letter-spacing:-.01em; }
        .afl-hero h1 span { color:var(--red); }
        .afl-hero p { margin:0; color:var(--gray); font-size:15px; line-height:1.6; max-width:620px; }
        .afl-reset-row { display:flex; align-items:center; gap:10px; margin:0 0 36px; }
        .afl-reset-btn { border:1px solid #C7C7C7; background:#fff; color:#4A4A4A; border-radius:8px; padding:8px 12px; font-size:12px; font-weight:700; cursor:pointer; }
        .afl-reset-btn:hover:not(:disabled) { border-color:var(--red); color:var(--red); background:#FFF8F8; }
        .afl-reset-btn:disabled { cursor:default; opacity:.5; }
        .afl-reset-note { color:#8A8A8A; font-size:11px; }
        .afl-bubbles { display:grid; grid-template-columns:repeat(3,1fr); gap:22px; }
        .afl-bubble { background:var(--red); border-radius:26px; padding:30px 24px; min-height:168px; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; cursor:pointer; text-decoration:none; transition:transform .18s ease,box-shadow .18s ease,background .18s ease; box-shadow:0 10px 22px rgba(0,0,0,.06); position:relative; border:none; }
        .afl-bubble:hover { transform:translateY(-3px); box-shadow:0 16px 32px rgba(204,0,0,.18); background:var(--red-dark); }
        .afl-badge { position:absolute; top:14px; right:16px; font-size:10px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:rgba(255,255,255,.85); display:flex; align-items:center; gap:5px; }
        .afl-badge .dot { width:6px; height:6px; border-radius:50%; background:#6EE7A0; }
        .afl-name { color:#fff; font-weight:700; font-size:19px; line-height:1.25; margin-bottom:8px; white-space:pre-line; }
        .afl-desc { color:rgba(255,255,255,.88); font-size:13px; line-height:1.5; max-width:220px; }
        .afl-readiness { margin-top:22px; min-height:78px; border:2px solid var(--red); border-radius:18px; background:#fff; color:var(--red); text-decoration:none; display:flex; align-items:center; justify-content:space-between; gap:24px; padding:16px 22px; transition:transform .18s ease,box-shadow .18s ease,background .18s ease; box-shadow:0 8px 20px rgba(0,0,0,.04); }
        .afl-readiness:hover { transform:translateY(-2px); box-shadow:0 12px 26px rgba(204,0,0,.12); background:#FFF8F8; }
        .afl-readiness-copy { min-width:0; }
        .afl-readiness-title { font-size:18px; line-height:1.2; font-weight:800; margin-bottom:4px; }
        .afl-readiness-desc { color:#666; font-size:13px; line-height:1.45; }
        .afl-readiness-action { flex-shrink:0; display:flex; align-items:center; gap:10px; font-size:12px; font-weight:800; }
        .afl-readiness-action .dot { width:6px; height:6px; border-radius:50%; background:#22A35A; }
        .afl-readiness-arrow { font-size:22px; line-height:1; }
        .afl-toast { position:fixed; bottom:28px; left:50%; transform:translateX(-50%) translateY(20px); background:var(--charcoal); color:#fff; font-size:13px; padding:12px 20px; border-radius:10px; opacity:0; pointer-events:none; transition:opacity .25s ease,transform .25s ease; box-shadow:0 8px 30px rgba(0,0,0,.25); white-space:nowrap; z-index:1100; }
        .afl-toast.show { opacity:1; transform:translateX(-50%) translateY(0); }
        .afl-reset-backdrop { position:fixed; inset:0; z-index:1000; background:rgba(25,25,25,.52); display:flex; align-items:center; justify-content:center; padding:24px; }
        .afl-reset-modal { width:min(460px,100%); background:#fff; border-radius:16px; box-shadow:0 24px 70px rgba(0,0,0,.28); padding:28px 28px 24px; text-align:center; }
        .afl-reset-icon { width:48px; height:48px; border-radius:50%; margin:0 auto 14px; background:#FBEAEA; color:var(--red); display:flex; align-items:center; justify-content:center; font-size:25px; font-weight:800; }
        .afl-reset-modal h2 { margin:0 0 10px; font-size:22px; line-height:1.25; }
        .afl-reset-copy { margin:0 auto; max-width:380px; color:#666; font-size:14px; line-height:1.55; }
        .afl-reset-reassure { margin:16px 0 0; padding:10px 12px; border-radius:8px; background:#F7F7F7; color:#555; font-size:12px; display:flex; justify-content:center; align-items:center; gap:7px; }
        .afl-reset-error { margin-top:12px; border:1px solid #F0B4B4; background:#FFF3F3; color:#8F1D1D; padding:9px 11px; border-radius:8px; font-size:12px; line-height:1.4; text-align:left; }
        .afl-reset-actions { border-top:1px solid #E5E7EB; margin-top:20px; padding-top:18px; display:flex; justify-content:flex-end; gap:10px; }
        .afl-reset-cancel,.afl-reset-confirm { border-radius:8px; padding:10px 15px; font-size:13px; font-weight:700; cursor:pointer; }
        .afl-reset-cancel { border:1px solid #D1D5DB; background:#fff; color:#555; }
        .afl-reset-confirm { border:1px solid var(--red); background:var(--red); color:#fff; min-width:128px; }
        .afl-reset-cancel:disabled,.afl-reset-confirm:disabled { opacity:.55; cursor:wait; }
        @media(max-width:900px){.afl-header{align-items:flex-start;flex-direction:column}.afl-account{width:100%;justify-content:flex-start}.afl-bubbles{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:560px){.afl-wrap{padding:24px 18px 80px}.afl-bubbles{grid-template-columns:1fr}.afl-bubble{min-height:140px}.afl-readiness{align-items:flex-start;gap:12px;padding:16px 18px}.afl-readiness-action{font-size:0}.afl-readiness-action .dot{display:none}.afl-readiness-arrow{font-size:22px}.afl-reset-row{align-items:flex-start;flex-direction:column}.afl-reset-actions{flex-direction:column-reverse}.afl-reset-cancel,.afl-reset-confirm{width:100%}}
      `}</style>

      <div className="afl-header">
        <div className="afl-brand">
          <img className="afl-logo" src={cdwLogo} alt="CDW logo" />
          <div className="afl-eyebrow">AI Factory Tools</div>
        </div>
        <div className="afl-account" aria-label="Account and saved summary">
          <AuthWidget />
        </div>
      </div>

      <div className="afl-hero">
        <h1>Infrastructure economics, <span>sized and costed</span> before you buy.</h1>
        <p>Calculators for planning your AI infrastructure and workloads.</p>
      </div>

      <div className="afl-reset-row">
        <button className="afl-reset-btn" type="button" disabled={resetDisabled} onClick={() => { setResetError(""); setResetOpen(true); }}>
          {resetState.loading ? "Checking workspace…" : resetState.hasState ? (signedInReset ? "Reset All Tools" : "Clear This Browser") : "Nothing to reset"}
        </button>
        <span className="afl-reset-note">
          {signedInReset ? "Start a fresh scenario without changing your account." : "Signed out: clears only tool inputs saved in this browser."}
        </span>
      </div>

      <div className="afl-bubbles">
        {ANALYSIS_TOOLS.map((tool) => (
          <Link to={tool.path} key={tool.key} className="afl-bubble">
            <div className="afl-badge"><span className="dot" />Live</div>
            <div className="afl-name">{tool.name}</div>
            <div className="afl-desc">{tool.desc}</div>
          </Link>
        ))}
      </div>

      <Link to={READINESS_TOOL.path} className="afl-readiness">
        <div className="afl-readiness-copy">
          <div className="afl-readiness-title">{READINESS_TOOL.name}</div>
          <div className="afl-readiness-desc">{READINESS_TOOL.desc}</div>
        </div>
        <div className="afl-readiness-action">
          <span className="dot" />
          <span>Live</span>
          <span className="afl-readiness-arrow" aria-hidden="true">→</span>
        </div>
      </Link>

      {resetOpen && (
        <div className="afl-reset-backdrop" role="presentation">
          <div className="afl-reset-modal" role="dialog" aria-modal="true" aria-labelledby="reset-title" aria-describedby="reset-description">
            <div className="afl-reset-icon" aria-hidden="true">!</div>
            <h2 id="reset-title">{signedInReset ? "Reset all AI Factory tools?" : "Clear tool inputs from this browser?"}</h2>
            <p id="reset-description" className="afl-reset-copy">
              {signedInReset
                ? "This will clear your saved tool inputs, results, and My Summary so you can start a new scenario."
                : "This will clear tool inputs saved in this browser. Account-backed results and My Summary cannot be cleared while you are signed out."}
            </p>
            <div className="afl-reset-reassure"><span aria-hidden="true">✓</span><span>{signedInReset ? "Your account and profile will not be affected." : "Sign in to reset saved account results and My Summary."}</span></div>
            {resetError && <div className="afl-reset-error" role="alert">{resetError}</div>}
            <div className="afl-reset-actions">
              <button className="afl-reset-cancel" type="button" disabled={resetBusy} onClick={() => setResetOpen(false)}>Cancel</button>
              <button className="afl-reset-confirm" type="button" disabled={resetBusy} onClick={confirmReset}>{resetBusy ? "Clearing…" : signedInReset ? "Reset All Tools" : "Clear This Browser"}</button>
            </div>
          </div>
        </div>
      )}

      <div className={`afl-toast${toast ? " show" : ""}`} role="status" aria-live="polite">{toast}</div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <AuthProvider>
      <LandingPageInner />
    </AuthProvider>
  );
}