import React, { useState, useRef } from "react";
import { Link } from "react-router-dom";
import cdwLogo from "./cdw-logo.png";

// AI Factory tools landing page — home page at "/"
// Each entry becomes a bubble. Add new tools here as they go live.
const TOOLS = [
  {
    key: "tco",
    name: "Cloud vs On-Prem\nTCO Calculator",
    desc: "Cloud AI spend translated into on-prem infrastructure cost and payback.",
    status: "live",
    path: "/tco",
  },
  {
    key: "gpu-sizing",
    name: "GPU Sizing Tool",
    desc: "Right-size GPU class, count, and cluster shape for a target workload.",
    status: "live",
    path: "/gpu-sizing",
  },
  {
    key: "model-advisor",
    name: "Open-Weight\nModel Advisor",
    desc: "Recommends open-weight models by workload, then hands off to GPU sizing.",
    status: "live",
    path: "/model-advisor",
  },
];

export default function LandingPage() {
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);

  function showToast(msg) {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2200);
  }

  return (
    <div className="afl-wrap">
      <style>{`
        .afl-wrap, .afl-wrap * { box-sizing: border-box; }
        .afl-wrap {
          --red: #CC0000;
          --red-dark: #A30000;
          --charcoal: #2D2D2D;
          --gray: #6B6B6B;
          font-family: 'Inter', sans-serif;
          max-width: 1000px;
          margin: 0 auto;
          padding: 48px 32px 100px;
          color: var(--charcoal);
        }
        .afl-header { display: flex; align-items: center; gap: 14px; margin-bottom: 10px; }
        .afl-logo { height: 42px; width: auto; flex-shrink: 0; }
        .afl-eyebrow { font-size: 12px; font-weight: 700; color: var(--red); letter-spacing: 0.1em; text-transform: uppercase; }
        .afl-hero { margin: 28px 0 44px; max-width: 720px; }
        .afl-hero h1 { margin: 0 0 14px 0; font-weight: 800; font-size: clamp(26px, 3.6vw, 34px); line-height: 1.28; letter-spacing: -0.01em; }
        .afl-hero h1 span { color: var(--red); }
        .afl-hero p { margin: 0; color: var(--gray); font-size: 15px; line-height: 1.6; max-width: 620px; }
        .afl-bubbles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; }
        .afl-bubble {
          background: var(--red); border-radius: 26px; padding: 30px 24px; min-height: 168px;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          text-align: center; cursor: pointer; text-decoration: none;
          transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
          box-shadow: 0 10px 22px rgba(0,0,0,0.06); position: relative; border: none;
        }
        .afl-bubble:hover { transform: translateY(-3px); box-shadow: 0 16px 32px rgba(204,0,0,0.18); background: var(--red-dark); }
        .afl-bubble.disabled { background: #E4E4E4; cursor: default; box-shadow: none; }
        .afl-bubble.disabled:hover { transform: none; box-shadow: none; background: #E4E4E4; }
        .afl-bubble.disabled .afl-name { color: #8A8A8A; }
        .afl-bubble.disabled .afl-desc { color: #A6A6A6; }
        .afl-bubble.empty { background: #FAFAFA; border: 1.5px dashed #D6D6D6; box-shadow: none; }
        .afl-bubble.empty:hover { transform: none; background: #F5F5F5; }
        .afl-bubble.empty .afl-name { color: #B0B0B0; font-weight: 600; }
        .afl-bubble.empty .afl-desc { color: #C2C2C2; }
        .afl-badge { position: absolute; top: 14px; right: 16px; font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: rgba(255,255,255,0.85); display: flex; align-items: center; gap: 5px; }
        .afl-badge .dot { width: 6px; height: 6px; border-radius: 50%; background: #6EE7A0; }
        .afl-bubble.disabled .afl-badge { color: #9A9A9A; }
        .afl-bubble.disabled .afl-badge .dot { background: #B8B8B8; }
        .afl-name { color: #FFFFFF; font-weight: 700; font-size: 19px; line-height: 1.25; margin-bottom: 8px; white-space: pre-line; }
        .afl-desc { color: rgba(255,255,255,0.88); font-size: 13px; line-height: 1.5; max-width: 220px; }
        .afl-toast {
          position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%) translateY(20px);
          background: var(--charcoal); color: #fff; font-size: 13px; font-weight: 500; padding: 12px 20px;
          border-radius: 10px; opacity: 0; pointer-events: none; transition: opacity 0.25s ease, transform 0.25s ease;
          box-shadow: 0 8px 30px rgba(0,0,0,0.25); white-space: nowrap;
        }
        .afl-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); pointer-events: auto; }
        @media (max-width: 720px) {
          .afl-bubbles { grid-template-columns: 1fr; }
          .afl-bubble { min-height: 140px; }
        }
      `}</style>

      <div className="afl-header">
        <img className="afl-logo" src={cdwLogo} alt="CDW logo" />
        <div className="afl-eyebrow">AI Factory Tools</div>
      </div>

      <div className="afl-hero">
        <h1>Infrastructure economics, <span>sized and costed</span> before you buy.</h1>
        <p>Calculators for planning your AI infrastructure and workloads.</p>
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
            <div
              key={tool.key}
              className={cls}
              onClick={() => showToast(`${tool.name.replace("\n", " ")} is still being built — check back soon`)}
            >
              {tool.status === "building" && (
                <div className="afl-badge"><span className="dot" />Building</div>
              )}
              <div className="afl-name">{tool.name}</div>
              <div className="afl-desc">{tool.desc}</div>
            </div>
          );
        })}
      </div>

      <div className={`afl-toast${toast ? " show" : ""}`}>{toast}</div>
    </div>
  );
}
