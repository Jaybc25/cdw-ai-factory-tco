import React, { useState } from "react";
import {
  ArrowRight,
  BarChart3,
  CheckSquare,
  Cloud,
  Cpu,
  Layers3,
  Lightbulb,
  Mail,
  Target,
  Users,
} from "lucide-react";
import cdwLogo from "./cdw-logo.png";
import datacenterPanel from "./assets/login-datacenter-panel.png";
import { AuthProvider, useAuth } from "./AuthContext.jsx";

const SITE_USE_URL = "https://www.cdw.com/content/cdw/en/terms-conditions/site-use.html";
const PRIVACY_URL = "https://www.cdw.com/content/cdw/en/terms-conditions/privacy-notice.html";
const E2E_AUTH_BYPASS = import.meta.env.VITE_E2E_AUTH_BYPASS === "true";

const TOOL_CARDS = [
  { Icon: Lightbulb, name: "AI Use Case Explorer", desc: "Match your industry's use cases to NVIDIA Blueprints CDW can execute." },
  { Icon: Layers3, name: "Open-Weight Model Advisor", desc: "Recommend open-weight models by workload, then hand off to GPU sizing." },
  { Icon: Cpu, name: "GPU Sizing Tool", desc: "Right-size GPU class, count, and cluster shape for a target workload." },
  { Icon: Cloud, name: "Cloud vs On-Prem TCO Calculator", desc: "Translate cloud AI spend into on-prem infrastructure cost and payback." },
  { Icon: BarChart3, name: "AI Use Case ROI Calculator", desc: "Translate workload acceleration into capacity created and economic value." },
  { Icon: CheckSquare, name: "AI Readiness Checklists", desc: "Work through what data, security, and infrastructure need before deployment." },
];

function LoadingState({ text }) {
  return (
    <div className="afd-loading" role="status" aria-live="polite">
      <img src={cdwLogo} alt="CDW" />
      <span>{text}</span>
      <style>{`
        .afd-loading { min-height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px; font-family:'Inter',system-ui,sans-serif; color:#666; font-size:14px; }
        .afd-loading img { width:74px; height:auto; }
      `}</style>
    </div>
  );
}

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

  // This flag is injected only into the local PR browser-regression build.
  // It is never present in Vercel preview or production builds.
  if (E2E_AUTH_BYPASS) return children;
  if (loading) return <LoadingState text="Opening AI Factory Tools…" />;
  if (isLoggedIn && !account) return <LoadingState text="Preparing your workspace…" />;
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
        .afd-page,.afd-page *{box-sizing:border-box}
        .afd-page{--red:#CC0000;--red-dark:#A30000;--ink:#20242B;--muted:#5F6772;min-height:100vh;background:#fff;color:var(--ink);font-family:'Inter',system-ui,sans-serif}
        .afd-shell{width:min(1400px,calc(100% - 48px));margin:0 auto}
        .afd-header{height:58px;border-bottom:1px solid #E2E5E8;background:#fff;display:flex;align-items:center}
        .afd-brand-wrap{display:flex;align-items:center;gap:18px}
        .afd-logo{width:64px;height:auto}
        .afd-brand-divider{width:1px;height:25px;background:#D5D9DD}
        .afd-brand{color:var(--red);font-size:13px;font-weight:800;letter-spacing:.14em;text-transform:uppercase}

        .afd-hero{height:414px;display:grid;grid-template-columns:38% 37% 25%;position:relative;background:linear-gradient(115deg,#fff 0%,#fff 51%,#F6F7F8 72%,#EEF0F2 100%)}
        .afd-intro{padding:35px 34px 28px 8px;align-self:center}
        .afd-kicker{font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:#66707C;font-weight:750;margin-bottom:14px}
        .afd-intro h1{margin:0 0 13px;max-width:510px;font-size:clamp(35px,3.15vw,48px);line-height:1.02;letter-spacing:-.035em;font-weight:850}
        .afd-intro h1 span{color:var(--red)}
        .afd-intro-copy{margin:0;max-width:470px;color:#5A626D;font-size:15px;line-height:1.46}
        .afd-accent-rule{width:54px;height:3px;background:var(--red);margin:17px 0 16px}
        .afd-benefits{display:grid;grid-template-columns:repeat(3,1fr);gap:15px;max-width:500px}
        .afd-benefit{display:flex;align-items:center;gap:9px;font-size:12px;line-height:1.2;font-weight:700;color:#252A31}
        .afd-benefit-icon{width:30px;height:30px;color:var(--red);flex:0 0 auto}

        .afd-access-wrap{display:flex;align-items:center;justify-content:center;padding:24px 16px;position:relative;z-index:3}
        .afd-card{width:100%;max-width:430px;background:rgba(255,255,255,.985);border:1px solid #DDE1E5;border-radius:16px;box-shadow:0 14px 42px rgba(24,29,35,.10);padding:24px 28px 22px}
        .afd-card h2{margin:0 0 6px;text-align:center;font-size:27px;line-height:1.15;letter-spacing:-.02em}
        .afd-sub{margin:0 auto 16px;text-align:center;max-width:340px;color:#626A75;font-size:13px;line-height:1.4}
        .afd-field{margin-bottom:10px}
        .afd-field label{display:block;margin-bottom:5px;font-size:11px;font-weight:750;color:#3B424B}
        .afd-input-wrap{position:relative}
        .afd-input-icon{position:absolute;left:12px;top:50%;transform:translateY(-50%);width:18px;height:18px;color:#7A828C;pointer-events:none}
        .afd-field input{width:100%;border:1px solid #C9CED4;border-radius:8px;padding:11px 12px;font:inherit;font-size:14px;outline:none;background:#fff}
        .afd-field input.with-icon{padding-left:39px}
        .afd-field input:focus{border-color:var(--red);box-shadow:0 0 0 3px rgba(204,0,0,.08)}
        .afd-primary{width:100%;border:0;border-radius:8px;background:var(--red);color:#fff;padding:11px 14px;font-size:14px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px}
        .afd-primary:hover:not(:disabled){background:var(--red-dark)}
        .afd-primary:disabled{opacity:.6;cursor:wait}
        .afd-switch{margin-top:10px;text-align:center}
        .afd-switch button{border:0;background:none;color:var(--red);text-decoration:underline;font-size:11.5px;cursor:pointer;padding:2px 4px}
        .afd-sent{border:1px solid #CFE8D8;background:#F4FBF6;color:#27653A;border-radius:8px;padding:9px 10px;font-size:11.5px;line-height:1.4;margin-bottom:10px}
        .afd-error{border:1px solid #F0B4B4;background:#FFF4F4;color:#8F1D1D;border-radius:8px;padding:8px 10px;margin:9px 0 0;font-size:11px;line-height:1.35}
        .afd-legal{margin-top:12px;padding-top:11px;border-top:1px solid #E8EBEE;color:#6F7782;font-size:10.5px;line-height:1.4;text-align:center}
        .afd-legal a{color:var(--red)}
        .afd-temp-note{margin-top:7px;color:#8B929A;font-size:9.7px;line-height:1.35;text-align:center}

        .afd-visual{position:relative;overflow:hidden}
        .afd-visual img{display:block;width:100%;height:100%;object-fit:cover;object-position:center}

        .afd-tools-section{height:218px;border-top:1px solid #E3E6E9;padding:14px 0 18px;background:#fff}
        .afd-tools-heading{display:flex;align-items:center;gap:20px;color:#69717C;font-size:10.5px;letter-spacing:.29em;font-weight:750;text-transform:uppercase;margin-bottom:13px}
        .afd-tools-heading:before,.afd-tools-heading:after{content:"";height:1px;background:#D9DDE1;flex:1}
        .afd-tools{display:grid;grid-template-columns:repeat(6,1fr);gap:14px}
        .afd-tool{min-height:158px;border-radius:10px;background:linear-gradient(180deg,#FBFBFC,#F7F8F9);padding:11px 9px 9px;text-align:center;color:#20242B}
        .afd-tool-icon{width:39px;height:39px;margin:0 auto 7px;border-radius:10px;background:#FFF0F0;color:var(--red);display:flex;align-items:center;justify-content:center}
        .afd-tool-icon svg{width:23px;height:23px;stroke-width:2}
        .afd-tool strong{display:block;font-size:11.5px;line-height:1.18;margin-bottom:5px}
        .afd-tool span{display:block;color:#616974;font-size:10px;line-height:1.28}

        .afd-footer{min-height:58px;background:#111418;color:#D4D8DC;display:flex;align-items:center}
        .afd-footer-inner{display:flex;align-items:center;justify-content:space-between;gap:20px;width:100%;font-size:10px}
        .afd-footer-brand{display:flex;align-items:center;gap:11px;font-weight:700;color:#fff}
        .afd-footer-brand img{width:47px;height:auto;filter:grayscale(1) brightness(4)}
        .afd-footer-links{display:flex;align-items:center;gap:9px;flex-wrap:wrap}
        .afd-footer-links a{color:#fff}

        @media(max-width:1120px){.afd-shell{width:min(100% - 30px,1400px)}.afd-hero{grid-template-columns:46% 54%;height:auto;min-height:410px}.afd-visual{display:none}.afd-tools-section{height:auto}.afd-tools{grid-template-columns:repeat(3,1fr)}.afd-tool{min-height:145px}}
        @media(max-width:760px){.afd-header{height:62px}.afd-hero{grid-template-columns:1fr}.afd-intro{padding:28px 4px 14px}.afd-access-wrap{padding:14px 0 28px;justify-content:flex-start}.afd-card{max-width:520px}.afd-benefits{grid-template-columns:1fr}.afd-tools{grid-template-columns:repeat(2,1fr)}.afd-footer-inner{align-items:flex-start;flex-direction:column;padding:14px 0}}
        @media(max-width:480px){.afd-brand-divider{display:none}.afd-brand{font-size:11px}.afd-intro h1{font-size:36px}.afd-card{padding:22px 18px}.afd-tools{grid-template-columns:1fr}}
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
            <div className="afd-kicker">Real insights. Real outcomes.</div>
            <h1 id="afd-title">Infrastructure economics, <span>sized and costed</span> before you buy.</h1>
            <p className="afd-intro-copy">AI planning tools to help you model, compare and accelerate your path from possibility to production.</p>
            <div className="afd-accent-rule" aria-hidden="true" />
            <div className="afd-benefits" aria-label="AI Factory benefits">
              <div className="afd-benefit"><Target className="afd-benefit-icon" /><span>Plan with confidence</span></div>
              <div className="afd-benefit"><BarChart3 className="afd-benefit-icon" /><span>Optimize investments</span></div>
              <div className="afd-benefit"><Users className="afd-benefit-icon" /><span>Backed by CDW expertise</span></div>
            </div>
          </section>

          <section className="afd-access-wrap">
            <div className="afd-card" aria-label={setupMode ? "Complete account setup" : "Access AI Factory Tools"}>
              {setupMode ? (
                <form onSubmit={handleSetup}>
                  <h2>Finish setting up your account</h2>
                  <p className="afd-sub">Add the details that will appear on saved AI Factory summaries.</p>
                  <div className="afd-field"><label htmlFor="afd-name">Name</label><input id="afd-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required /></div>
                  <div className="afd-field"><label htmlFor="afd-company">Company</label><input id="afd-company" autoComplete="organization" value={company} onChange={(e) => setCompany(e.target.value)} required /></div>
                  <button className="afd-primary" type="submit" disabled={savingSetup}>{savingSetup ? "Saving…" : "Enter AI Factory Tools"}<ArrowRight size={17} /></button>
                  {error && <div className="afd-error" role="alert">{error}</div>}
                </form>
              ) : (
                <form onSubmit={handleSignIn}>
                  <h2>Access AI Factory Tools</h2>
                  <p className="afd-sub">Enter your professional email address to sign in or create an account.</p>
                  {mode === "magic" && linkSent && <div className="afd-sent" role="status">Sign-in link sent to <strong>{email}</strong>. You can leave this tab open.</div>}
                  <div className="afd-field">
                    <label htmlFor="afd-email">Professional email</label>
                    <div className="afd-input-wrap"><Mail className="afd-input-icon" /><input className="with-icon" id="afd-email" type="email" autoComplete="email" placeholder="you@company.com" value={email} onChange={(e) => { setEmail(e.target.value); setLinkSent(false); }} required /></div>
                  </div>
                  {mode === "password" && <div className="afd-field"><label htmlFor="afd-password">Password</label><input id="afd-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>}
                  <button className="afd-primary" type="submit" disabled={sending || (mode === "magic" && linkSent)}>{sending ? "Working…" : mode === "password" ? "Sign in" : linkSent ? "Link sent" : "Send sign-in link"}<ArrowRight size={17} /></button>
                  <div className="afd-switch"><button type="button" onClick={() => { setMode(mode === "password" ? "magic" : "password"); setPassword(""); setLinkSent(false); setError(""); }}>{mode === "password" ? "Use a sign-in link instead" : "Use password instead"}</button></div>
                  {error && <div className="afd-error" role="alert">{error}</div>}
                  <div className="afd-legal">By continuing, you agree to CDW's <a href={SITE_USE_URL} target="_blank" rel="noreferrer">Site Use</a> and <a href={PRIVACY_URL} target="_blank" rel="noreferrer">Privacy Notice</a>.</div>
                  <div className="afd-temp-note">Password sign-in is a temporary compatibility option for provisioned users while corporate email delivery is being finalized.</div>
                </form>
              )}
            </div>
          </section>

          <aside className="afd-visual">
            <img src={datacenterPanel} alt="Modern AI data center" />
          </aside>
        </main>

        <section className="afd-tools-section" aria-label="AI Factory tools">
          <div className="afd-tools-heading">Six tools. End-to-end clarity.</div>
          <div className="afd-tools">
            {TOOL_CARDS.map(({ Icon, name: toolName, desc }) => (
              <div className="afd-tool" key={toolName}>
                <div className="afd-tool-icon" aria-hidden="true"><Icon /></div>
                <strong>{toolName}</strong>
                <span>{desc}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <footer className="afd-footer">
        <div className="afd-shell afd-footer-inner">
          <div className="afd-footer-brand"><img src={cdwLogo} alt="CDW" /><span>People Who Get IT®</span></div>
          <div className="afd-footer-links"><a href={SITE_USE_URL} target="_blank" rel="noreferrer">Terms of Use</a><span>|</span><a href={PRIVACY_URL} target="_blank" rel="noreferrer">Privacy Policy</a><span>|</span><span>© 2026 CDW. All rights reserved.</span></div>
        </div>
      </footer>
    </div>
  );
}

export default function LoginFrontDoor({ children }) {
  return <AuthProvider><LoginFrontDoorInner>{children}</LoginFrontDoorInner></AuthProvider>;
}