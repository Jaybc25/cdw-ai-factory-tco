import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import cdwLogo from "./cdw-logo.png";
import { inspectWorkspaceResetState, resetWorkspace } from "./workspaceReset.js";

// AI Factory tools landing page — home page at "/"
// Order reflects the customer journey: use case -> model -> sizing -> cost -> ROI -> readiness.
const TOOLS = [
  { key: "use-cases", name: "AI Use Case\nExplorer", desc: "Match your industry's use cases to NVIDIA Blueprints CDW can execute.", status: "live", path: "/use-cases" },
  { key: "model-advisor", name: "Open-Weight\nModel Advisor", desc: "Recommends open-weight models by workload, then hands off to GPU sizing.", status: "live", path: "/model-advisor" },
  { key: "gpu-sizing", name: "GPU Sizing Tool", desc: "Right-size GPU class, count, and cluster shape for a target workload.", status: "live", path: "/gpu-sizing" },
  { key: "tco", name: "Cloud vs On-Prem\nTCO Calculator", desc: "Cloud AI spend translated into on-prem infrastructure cost and payback.", status: "live", path: "/tco" },
  { key: "roi", name: "AI Use Case\nROI Calculator", desc: "Workload acceleration translated into capacity created and its economic value.", status: "live", path: "/roi" },
  { key: "readiness", name: "AI Readiness\nChecklists", desc: "Work through what your data, security, and infrastructure need before deployment.", status: "live", path: "/readiness" },
];

export default function LandingPage() {
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetState, setResetState] = useState({ loading: true, hasState: true });

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
      // Unknown should remain actionable; never falsely tell the user there is
      // nothing to reset because a status check itself failed.
      setResetState({ loading: false, hasState: true, checkFailed: true });
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
      await resetWorkspace();
      setResetOpen(false);
      setResetState({ loading: false, hasState: false });
      showToast("Workspace reset. You're ready to start a new scenario.");
    } catch (error) {
      console.error("Workspace reset failed:", error);
      setResetError("Reset could not be completed. Your current scenario was left intact. Please try again.");
    } finally {
      setResetBusy(false);
    }
  }

  const resetDisabled = resetState.loading || !resetState.hasState || resetBusy;

  return (
    <div className="afl-wrap">
      <style>{`
        .afl-wrap, .afl-wrap * { box-sizing: border-box; }
        .afl-wrap {
          --red: #CC0000; --red-dark: #A30000; --charcoal: #2D2D2D; --gray: #6B6B6B;
          font-family: 'Inter', sans-serif; max-width: 1000px; margin: 0 auto;
          padding: 48px 32px 100px; color: var(--charcoal);
        }
        .afl-header { display: flex; align-items: center; gap: 14px; margin-bottom: 10px; }
        .afl-logo { height: 42px; width: auto; flex-shrink: 0; }
        .afl-eyebrow { font-size: 12px; font-weight: 700; color: var(--red); letter-spacing: 0.1em; text-transform: uppercase; }
        .afl-hero { margin: 28px 0 18px; max-width: 720px; }
        .afl-hero h1 { margin: 0 0 14px 0; font-weight: 800; font-size: clamp(26px, 3.6vw, 34px); line-height: 1.28; letter-spacing: -0.01em; }
        .afl-hero h1 span { color: var(--red); }
        .afl-hero p { margin: 0; color: var(--gray); font-size: 15px; line-height: 1.6; max-width: 620px; }
        .afl-reset-row { display: flex; align-items: center; gap: 10px; margin: 0 0 36px; }
        .afl-reset-btn { border: 1px solid #C7C7C7; background: #fff; color: #4A4A4A; border-radius: 8px; padding: 8px 12px; font-size: 12px; font-weight: 700; cursor: pointer; }
        .afl-reset-btn:hover:not(:disabled) { border-color: var(--red); color: var(--red); background: #FFF8F8; }
        .afl-reset-btn:disabled { cursor: default; opacity: 0.5; }
        .afl-reset-note { color: #8A8A8A; font-size: 11px; }
        .afl-bubbles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; }
        .afl-bubble { background: var(--red); border-radius: 26px; padding: 30px 24px; min-height: 168px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; cursor: pointer; text-decoration: none; transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease; box-shadow: 0 10px 22px rgba(0,0,0,0.06); position: relative; border: none; }
        .afl-bubble:hover { transform: translateY(-3px); box-shadow: 0 16px 32px rgba(204,0,0,0.18); background: var(--red-dark); }
        .afl-bubble.disabled { background: #E4E4E4; cursor: default; box-shadow: none; }
        .afl-bubble.disabled:hover { transform: none; box-shadow: none; background: #E4E4E4; }
        .afl-bubble.disabled .afl-name { color: #8A8A8A; } .afl-bubble.disabled .afl-desc { color: #A6A6A6; }
        .afl-bubble.empty { background: #FAFAFA; border: 1.5px dashed #D6D6D6; box-shadow: none; }
        .afl-bubble.empty:hover { transform: none; background: #F5F5F5; }
        .afl-bubble.empty .afl-name { color: #B0B0B0; font-weight: 600; } .afl-bubble.empty .afl-desc { color: #C2C2C2; }
        .afl-badge { position: absolute; top: 14px; right: 16px; font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: rgba(255,255,255,0.85); display: flex; align-items: center; gap: 5px; }
        .afl-badge .dot { width: 6px; height: 6px; border-radius: 50%; background: #6EE7A0; }
        .afl-name { color: #FFFFFF; font-weight: 700; font-size: 19px; line-height: 1.25; margin-bottom: 8px; white-space: pre-line; }
        .afl-desc { color: rgba(255,255,255,0.88); font-size: 13px; line-height: 1.5; max-width: 220px; }
        .afl-toast { position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%) translateY(20px); background: var(--charcoal); color: #fff; font-size: 13px; font-weight: 500; padding: 12px 20px; border-radius: 10px; opacity: 0; pointer-events: none; transition: opacity 0.25s ease, transform 0.25s ease; box-shadow: 0 8px 30px rgba(0,0,0,0.25); white-space: nowrap; z-index: 1100; }
        .afl-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); pointer-events: auto; }
        .afl-reset-backdrop { position: fixed; inset: 0; z-index: 1000; background: rgba(25,25,25,0.52); display: flex; align-items: center; justify-content: center; padding: 24px; }
        .afl-reset-modal { width: min(460px, 100%); background: #fff; border-radius: 16px; box-shadow: 0 24px 70px rgba(0,0,0,0.28); padding: 28px 28px 24px; text-align: center; }
        .afl-reset-icon { width: 48px; height: 48px; border-radius: 50%; margin: 0 auto 14px; background: #FBEAEA; color: var(--red); display: flex; align-items: center; justify-content: center; font-size: 25px; font-weight: 800; }
        .afl-reset-modal h2 { margin: 0 0 10px; font-size: 22px; line-height: 1.25; color: var(--charcoal); }
        .afl-reset-copy { margin: 0 auto; max-width: 380px; color: #666; font-size: 14px; line-height: 1.55; }
        .afl-reset-reassure { margin: 16px 0 0; padding: 10px 12px; border-radius: 8px; background: #F7F7F7; color: #555; font-size: 12px; display: flex; justify-content: center; align-items: center; gap: 7px; }
        .afl-reset-error { margin-top: 12px; border: 1px solid #F0B4B4; background: #FFF3F3; color: #8F1D1D; padding: 9px 11px; border-radius: 8px; font-size: 12px; line-height: 1.4; text-align: left; }
        .afl-reset-actions { border-top: 1px solid #E5E7EB; margin-top: 20px; padding-top: 18px; display: flex; justify-content: flex-end; gap: 10px; }
        .afl-reset-cancel, .afl-reset-confirm { border-radius: 8px; padding: 10px 15px; font-size: 13px; font-weight: 700; cursor: pointer; }
        .afl-reset-cancel { border: 1px solid #D1D5DB; background: #fff; color: #555; }
        .afl-reset-confirm { border: 1px solid var(--red); background: var(--red); color: #fff; min-width: 128px; }
        .afl-reset-cancel:disabled, .afl-reset-confirm:disabled { opacity: 0.55; cursor: wait; }
        @media (max-width: 900px) { .afl-bubbles { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 560px) { .afl-wrap { padding: 32px 18px 80px; } .afl-bubbles { grid-template-columns: 1fr; } .afl-bubble { min-height: 140px; } .afl-reset-row { align-items: flex-start; flex-direction: column; } .afl-reset-actions { flex-direction: column-reverse; } .afl-reset-cancel, .afl-reset-confirm { width: 100%; } }
      `}</style>

      <div className="afl-header">
        <img className="afl-logo" src={cdwLogo} alt="CDW logo" />
        <div className="afl-eyebrow">AI Factory Tools</div>
      </div>

      <div className="afl-hero">
        <h1>Infrastructure economics, <span>sized and costed</span> before you buy.</h1>
        <p>Calculators for planning your AI infrastructure and workloads.</p>
      </div>

      <div className="afl-reset-row">
        <button className="afl-reset-btn" type="button" disabled={resetDisabled} onClick={() => { setResetError(""); setResetOpen(true); }}>
          {resetState.loading ? "Checking workspace…" : resetState.hasState ? "Reset All Tools" : "Nothing to reset"}
        </button>
        <span className="afl-reset-note">Start a fresh scenario without changing your account.</span>
      </div>

      <div className="afl-bubbles">
        {TOOLS.map((tool) => {
          if (tool.status === "live") {
            return (
              <Link to={tool.path} key={tool.key} className="afl-bubble">
                <div className="afl-badge"><span className="dot" />Live</div>
                <div className="afl-name">{tool.name}</div>
                <div className="afl-desc">{tool.desc}</div>
              </Link>
            );
          }
          const cls = tool.status === "empty" ? "afl-bubble empty" : "afl-bubble disabled";
          return (
            <div key={tool.key} className={cls} onClick={() => showToast(`${tool.name.replace("\n", " ")} is still being built — check back soon`)}>
              {tool.status === "building" && <div className="afl-badge"><span className="dot" />Building</div>}
              <div className="afl-name">{tool.name}</div>
              <div className="afl-desc">{tool.desc}</div>
            </div>
          );
        })}
      </div>

      {resetOpen && (
        <div className="afl-reset-backdrop" role="presentation">
          <div className="afl-reset-modal" role="dialog" aria-modal="true" aria-labelledby="reset-title" aria-describedby="reset-description">
            <div className="afl-reset-icon" aria-hidden="true">!</div>
            <h2 id="reset-title">Reset all AI Factory tools?</h2>
            <p id="reset-description" className="afl-reset-copy">This will clear your saved tool inputs, results, and My Summary so you can start a new scenario.</p>
            <div className="afl-reset-reassure"><span aria-hidden="true">✓</span><span>Your account and profile will not be affected.</span></div>
            {resetError && <div className="afl-reset-error" role="alert">{resetError}</div>}
            <div className="afl-reset-actions">
              <button className="afl-reset-cancel" type="button" disabled={resetBusy} onClick={() => setResetOpen(false)}>Cancel</button>
              <button className="afl-reset-confirm" type="button" disabled={resetBusy} onClick={confirmReset}>{resetBusy ? "Resetting…" : "Reset All Tools"}</button>
            </div>
          </div>
        </div>
      )}

      <div className={`afl-toast${toast ? " show" : ""}`} role="status" aria-live="polite">{toast}</div>
    </div>
  );
}
