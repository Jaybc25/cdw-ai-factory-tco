import React, { useState } from "react";
import cdwLogo from "./cdw-logo.png";
import { AuthProvider, useAuth } from "./AuthContext.jsx";

const SITE_USE_URL = "https://www.cdw.com/content/cdw/en/terms-conditions/site-use.html";
const PRIVACY_URL = "https://www.cdw.com/content/cdw/en/terms-conditions/privacy-notice.html";

const TOOL_CARDS = [
  { icon: "◉", name: "AI Use Case Explorer", desc: "Match your industry's use cases to NVIDIA Blueprints CDW can execute." },
  { icon: "▱", name: "Open-Weight Model Advisor", desc: "Recommend open-weight models by workload, then hand off to GPU sizing." },
  { icon: "▣", name: "GPU Sizing Tool", desc: "Right-size GPU class, count, and cluster shape for a target workload." },
  { icon: "☁", name: "Cloud vs On-Prem TCO Calculator", desc: "Translate cloud AI spend into on-prem infrastructure cost and payback." },
  { icon: "↗", name: "AI Use Case ROI Calculator", desc: "Translate workload acceleration into capacity created and economic value." },
  { icon: "✓", name: "AI Readiness Checklists", desc: "Work through what data, security, and infrastructure need before deployment." },
];

function LoginFrontDoorInner({ children }) {
  const {
    isLoggedIn,
    account,
    needsSetup,
    loading,
    signInWithEmail,
    signInWithPassword,
    completeSetup,
  } = useAuth();

  const [mode, setMode] = useState("magic");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sending, setSending] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [savingSetup, setSavingSetup] = useState(false);

  if (loading) {
    return (
      <div className="afd-loading" role="status" aria-live="polite">
        <img src={cdwLogo} alt="CDW" />
        <span>Opening AI Factory Tools…</span>
        <style>{`
          .afd-loading { min-height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px; font-family:'Inter',system-ui,sans-serif; color:#666; font-size:14px; }
          .afd-loading img { width:74px; height:auto; }
        `}</style>
      </div>
    );
  }

  if (isLoggedIn && !account) {
    return (
      <div className="afd-loading" role="status" aria-live="polite">
        <img src={cdwLogo} alt="CDW" />
        <span>Preparing your workspace…</span>
        <style>{`
          .afd-loading { min-height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px; font-family:'Inter',system-ui,sans-serif; color:#666; font-size:14px; }
          .afd-loading img { width:74px; height:auto; }
        `}</style>
      </div>
    );
  }

  if (isLoggedIn && !needsSetup) return children;

  async function handleSignIn(event) {
    event.preventDefault();
    setSending(true);
    setError("");
    const result = mode === "password"
      ? await signInWithPassword(email, password)
      : await signInWithEmail(email);
    setSending(false);
    if (result.error) {
      setError(result.error.message || "Sign-in could not be completed.");
      return;
    }
    if (mode === "magic") setLinkSent(true);
  }

  async function handleSetup(event) {
    event.preventDefault();
    setSavingSetup(true);
    setError("");
    const result = await completeSetup({ name: name.trim(), company: company.trim() });
    setSavingSetup(false);
    if (result.error) setError(result.error.message || "Account setup could not be completed.");
  }

  const setupMode = isLoggedIn && needsSetup;

  return (
    <div className="afd-page">
      <style>{`
        .afd-page, .afd-page * { box-sizing:border-box; }
        .afd-page { --red:#CC0000; --red-dark:#A30000; --charcoal:#20242C; --muted:#59616D; min-height:100vh; background:linear-gradient(135deg,#FFFFFF 0%,#FAFAFA 52%,#F4F4F4 100%); color:var(--charcoal); font-family:'Inter',system-ui,sans-serif; }
        .afd-shell { width:min(1380px,calc(100% - 40px)); margin:0 auto; }
        .afd-header { height:74px; display:flex; align-items:center; border-bottom:1px solid #E4E6E8; }
        .afd-brand-wrap { display:flex; align-items:center; gap:20px; }
        .afd-logo { width:70px; height:auto; }
        .afd-brand-divider { width:1px; height:28px; background:#D8DADD; }
        .afd-brand { color:var(--red); font-size:14px; letter-spacing:.13em; text-transform:uppercase; font-weight:800; }

        .afd-hero { display:grid; grid-template-columns:minmax(0,1.02fr) minmax(420px,.86fr) minmax(300px,.72fr); align-items:stretch; min-height:500px; }
        .afd-intro { padding:42px 36px 34px 0; align-self:center; }
        .afd-kicker { color:#69707A; font-size:12px; letter-spacing:.26em; font-weight:700; text-transform:uppercase; margin-bottom:18px; }
        .afd-intro h1 { margin:0 0 20px; max-width:620px; font-size:clamp(42px,4.4vw,64px); line-height:1.03; letter-spacing:-.038em; font-weight:850; }
        .afd-intro h1 span { color:var(--red); }
        .afd-intro-copy { max-width:520px; margin:0 0 30px; color:#555D68; font-size:17px; line-height:1.55; }
        .afd-benefits { display:grid; gap:18px; max-width:390px; }
        .afd-benefit { display:flex; align-items:center; gap:14px; font-size:14px; font-weight:650; color:#252A32; }
        .afd-benefit-icon { width:38px; height:38px; border-radius:10px; background:#FFF1F1; border:1px solid #F5D5D5; color:var(--red); display:flex; align-items:center; justify-content:center; font-size:20px; font-weight:800; flex-shrink:0; }

        .afd-access-wrap { display:flex; align-items:center; justify-content:center; padding:34px 26px; position:relative; z-index:2; }
        .afd-card { width:100%; max-width:500px; background:rgba(255,255,255,.98); border:1px solid #DEE1E5; border-radius:18px; box-shadow:0 18px 55px rgba(20,25,32,.10); padding:34px 36px 30px; }
        .afd-card h2 { margin:0 0 8px; font-size:30px; line-height:1.15; text-align:center; letter-spacing:-.02em; }
        .afd-sub { margin:0 auto 24px; max-width:360px; color:#626A75; font-size:15px; line-height:1.45; text-align:center; }
        .afd-field { margin-bottom:13px; }
        .afd-field label { display:block; margin-bottom:6px; font-size:12px; font-weight:750; color:#343A43; }
        .afd-field input { width:100%; border:1px solid #C8CDD3; border-radius:9px; padding:13px 14px; font:inherit; font-size:15px; outline:none; background:#fff; }
        .afd-field input:focus { border-color:var(--red); box-shadow:0 0 0 3px rgba(204,0,0,.08); }
        .afd-primary { width:100%; border:0; border-radius:9px; background:var(--red); color:#fff; padding:13px 16px; font-size:15px; font-weight:800; cursor:pointer; }
        .afd-primary:hover:not(:disabled) { background:var(--red-dark); }
        .afd-primary:disabled { opacity:.6; cursor:wait; }
        .afd-switch { margin-top:14px; text-align:center; }
        .afd-switch button { border:0; background:none; color:var(--red); text-decoration:underline; font-size:13px; cursor:pointer; padding:2px 4px; }
        .afd-sent { border:1px solid #CFE8D8; background:#F4FBF6; color:#27653A; border-radius:10px; padding:12px 13px; font-size:13px; line-height:1.5; margin-bottom:14px; }
        .afd-error { border:1px solid #F0B4B4; background:#FFF4F4; color:#8F1D1D; border-radius:8px; padding:9px 11px; margin:12px 0 0; font-size:12px; line-height:1.4; }
        .afd-legal { margin-top:20px; padding-top:18px; border-top:1px solid #ECEFF1; color:#737B86; font-size:11px; line-height:1.5; text-align:center; }
        .afd-legal a { color:var(--red); }
        .afd-temp-note { margin-top:12px; color:#858C95; font-size:10.5px; line-height:1.45; text-align:center; }

        .afd-visual { position:relative; min-height:500px; overflow:hidden; background:linear-gradient(145deg,#350000 0%,#8C0000 40%,#D40000 100%); }
        .afd-visual:before { content:""; position:absolute; inset:0; background:linear-gradient(115deg,rgba(255,255,255,.13),transparent 28%),repeating-linear-gradient(90deg,rgba(0,0,0,.35) 0 18px,rgba(255,255,255,.04) 18px 22px,rgba(0,0,0,.45) 22px 47px); opacity:.9; }
        .afd-visual:after { content:""; position:absolute; inset:0; background:linear-gradient(150deg,rgba(255,255,255,.08) 0 9%,transparent 9% 18%,rgba(255,0,0,.16) 18% 35%,transparent 35% 100%); }
        .afd-racks { position:absolute; inset:56px 26px 52px 62px; display:grid; grid-template-columns:repeat(4,1fr); gap:14px; transform:perspective(700px) rotateY(-6deg); }
        .afd-rack { border:1px solid rgba(255,255,255,.22); background:linear-gradient(180deg,rgba(0,0,0,.9),rgba(20,0,0,.8)); box-shadow:0 0 24px rgba(255,0,0,.28); position:relative; }
        .afd-rack:before { content:""; position:absolute; inset:12px 8px; background:repeating-linear-gradient(180deg,#171717 0 9px,#4E0B0B 9px 11px,#050505 11px 18px); border:1px solid rgba(255,255,255,.08); }
        .afd-rack:after { content:""; position:absolute; left:8px; right:8px; top:18px; height:2px; background:#FF1C1C; box-shadow:0 48px 0 #B50000,0 96px 0 #FF1C1C,0 144px 0 #B50000,0 192px 0 #FF1C1C; }
        .afd-visual-message { position:absolute; left:40px; bottom:64px; z-index:2; color:#fff; font-size:15px; line-height:1.55; font-weight:800; letter-spacing:.18em; text-transform:uppercase; max-width:170px; text-shadow:0 2px 12px rgba(0,0,0,.45); }
        .afd-visual-rule { width:34px; height:3px; background:#1B0000; margin-top:16px; }

        .afd-tools-section { border-top:1px solid #E5E7E9; padding:30px 0 36px; }
        .afd-tools-heading { display:flex; align-items:center; gap:22px; color:#69707A; font-size:12px; letter-spacing:.27em; font-weight:750; text-transform:uppercase; margin-bottom:24px; }
        .afd-tools-heading:before,.afd-tools-heading:after { content:""; height:1px; background:#DDE0E3; flex:1; }
        .afd-tools { display:grid; grid-template-columns:repeat(6,1fr); gap:22px; }
        .afd-tool { text-align:center; color:#20242C; }
        .afd-tool-icon { width:58px; height:58px; margin:0 auto 10px; border-radius:14px; background:#FFF0F0; color:var(--red); display:flex; align-items:center; justify-content:center; font-size:28px; font-weight:800; border:1px solid #F6DCDC; }
        .afd-tool strong { display:block; font-size:13px; line-height:1.25; margin-bottom:7px; }
        .afd-tool span { display:block; color:#646C77; font-size:11.5px; line-height:1.35; }

        .afd-footer { border-top:1px solid #E1E4E6; padding:18px 0 26px; color:#707781; font-size:11px; }
        .afd-footer-inner { display:flex; align-items:center; justify-content:space-between; gap:20px; flex-wrap:wrap; }
        .afd-footer-brand { display:flex; align-items:center; gap:12px; font-weight:700; color:#30363E; }
        .afd-footer-brand img { width:48px; height:auto; }
        .afd-footer-links { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
        .afd-footer-links a { color:#5D6570; }

        @media(max-width:1120px){ .afd-hero{grid-template-columns:1fr 1fr}.afd-visual{display:none}.afd-tools{grid-template-columns:repeat(3,1fr)} }
        @media(max-width:820px){ .afd-shell{width:min(100% - 28px,1380px)}.afd-header{height:66px}.afd-hero{grid-template-columns:1fr}.afd-intro{padding:34px 0 16px}.afd-access-wrap{padding:18px 0 34px;justify-content:flex-start}.afd-card{max-width:560px}.afd-tools{grid-template-columns:repeat(2,1fr)} }
        @media(max-width:520px){ .afd-brand-divider{display:none}.afd-brand{font-size:12px}.afd-intro h1{font-size:38px}.afd-benefits{gap:12px}.afd-card{padding:26px 20px}.afd-tools{grid-template-columns:1fr}.afd-tools-heading{font-size:10px;gap:12px}.afd-footer-inner{align-items:flex-start;flex-direction:column} }
      `}</style>

      <header className="afd-header">
        <div className="afd-shell afd-brand-wrap">
          <img className="afd-logo" src={cdwLogo} alt="CDW" />
          <div className="afd-brand-divider" aria-hidden="true" />
          <div className="afd-brand">AI Factory Tools</div>
        </div>
      </header>

      <div className="afd-shell">
        <main className="afd-hero">
          <section className="afd-intro" aria-labelledby="afd-title">
            <div className="afd-kicker">Plan &nbsp;|&nbsp; Analyze &nbsp;|&nbsp; Compare &nbsp;|&nbsp; Accelerate</div>
            <h1 id="afd-title">Infrastructure economics, <span>sized and costed</span> before you buy.</h1>
            <p className="afd-intro-copy">Planning tools for AI infrastructure, workload sizing, economics, and readiness.</p>
            <div className="afd-benefits" aria-label="AI Factory benefits">
              <div className="afd-benefit"><span className="afd-benefit-icon">↗</span><span>Make informed decisions</span></div>
              <div className="afd-benefit"><span className="afd-benefit-icon">⚙</span><span>Accelerate AI adoption</span></div>
              <div className="afd-benefit"><span className="afd-benefit-icon">◎</span><span>Backed by CDW expertise</span></div>
            </div>
          </section>

          <section className="afd-access-wrap">
            <div className="afd-card" aria-label={setupMode ? "Complete account setup" : "Access AI Factory Tools"}>
              {setupMode ? (
                <form onSubmit={handleSetup}>
                  <h2>Finish setting up your account</h2>
                  <p className="afd-sub">Add the details that will appear on saved AI Factory summaries.</p>
                  <div className="afd-field">
                    <label htmlFor="afd-name">Name</label>
                    <input id="afd-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required />
                  </div>
                  <div className="afd-field">
                    <label htmlFor="afd-company">Company</label>
                    <input id="afd-company" autoComplete="organization" value={company} onChange={(e) => setCompany(e.target.value)} required />
                  </div>
                  <button className="afd-primary" type="submit" disabled={savingSetup}>{savingSetup ? "Saving…" : "Enter AI Factory Tools"}</button>
                  {error && <div className="afd-error" role="alert">{error}</div>}
                </form>
              ) : (
                <form onSubmit={handleSignIn}>
                  <h2>Access AI Factory Tools</h2>
                  <p className="afd-sub">Enter your professional email address to sign in or create an account.</p>

                  {mode === "magic" && linkSent && (
                    <div className="afd-sent" role="status">Sign-in link sent to <strong>{email}</strong>. You can leave this tab open.</div>
                  )}

                  <div className="afd-field">
                    <label htmlFor="afd-email">Professional email</label>
                    <input id="afd-email" type="email" autoComplete="email" placeholder="you@company.com" value={email} onChange={(e) => { setEmail(e.target.value); setLinkSent(false); }} required />
                  </div>

                  {mode === "password" && (
                    <div className="afd-field">
                      <label htmlFor="afd-password">Password</label>
                      <input id="afd-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </div>
                  )}

                  <button className="afd-primary" type="submit" disabled={sending || (mode === "magic" && linkSent)}>
                    {sending ? "Working…" : mode === "password" ? "Sign in" : linkSent ? "Link sent" : "Send sign-in link"}
                  </button>

                  <div className="afd-switch">
                    <button type="button" onClick={() => { setMode(mode === "password" ? "magic" : "password"); setPassword(""); setLinkSent(false); setError(""); }}>
                      {mode === "password" ? "Use a sign-in link instead" : "Use password instead"}
                    </button>
                  </div>

                  {error && <div className="afd-error" role="alert">{error}</div>}

                  <div className="afd-legal">By continuing, you agree to CDW's <a href={SITE_USE_URL} target="_blank" rel="noreferrer">Site Use</a> and <a href={PRIVACY_URL} target="_blank" rel="noreferrer">Privacy Notice</a>.</div>
                  <div className="afd-temp-note">Password sign-in is a temporary compatibility option for provisioned users while corporate email delivery is being finalized.</div>
                </form>
              )}
            </div>
          </section>

          <aside className="afd-visual" aria-label="AI infrastructure visual">
            <div className="afd-racks" aria-hidden="true">
              <div className="afd-rack" /><div className="afd-rack" /><div className="afd-rack" /><div className="afd-rack" />
            </div>
            <div className="afd-visual-message">Real insights.<br />Greater possibilities.<div className="afd-visual-rule" /></div>
          </aside>
        </main>

        <section className="afd-tools-section" aria-label="AI Factory tools">
          <div className="afd-tools-heading">Six tools. A clearer path to AI.</div>
          <div className="afd-tools">
            {TOOL_CARDS.map((tool) => (
              <div className="afd-tool" key={tool.name}>
                <div className="afd-tool-icon" aria-hidden="true">{tool.icon}</div>
                <strong>{tool.name}</strong>
                <span>{tool.desc}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <footer className="afd-footer">
        <div className="afd-shell afd-footer-inner">
          <div className="afd-footer-brand"><img src={cdwLogo} alt="CDW" /><span>People Who Get IT®</span></div>
          <div className="afd-footer-links">
            <span>© 2026 CDW. All rights reserved.</span>
            <a href={SITE_USE_URL} target="_blank" rel="noreferrer">Site Use</a>
            <span>|</span>
            <a href={PRIVACY_URL} target="_blank" rel="noreferrer">Privacy Notice</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function LoginFrontDoor({ children }) {
  return <AuthProvider><LoginFrontDoorInner>{children}</LoginFrontDoorInner></AuthProvider>;
}
