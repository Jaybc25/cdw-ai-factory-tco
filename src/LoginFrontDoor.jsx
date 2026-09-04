import React, { useState } from "react";
import cdwLogo from "./cdw-logo.png";
import { AuthProvider, useAuth } from "./AuthContext.jsx";

const SITE_USE_URL = "https://www.cdw.com/content/cdw/en/terms-conditions/site-use.html";
const PRIVACY_URL = "https://www.cdw.com/content/cdw/en/terms-conditions/privacy-notice.html";

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

  // Auth has resolved, but the account row is still loading. Do not briefly
  // expose the app or the setup form until we know the user's account state.
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
        .afd-page { --red:#CC0000; --red-dark:#A30000; --charcoal:#2D2D2D; --muted:#666; min-height:100vh; background:#F7F7F7; color:var(--charcoal); font-family:'Inter',system-ui,sans-serif; display:flex; flex-direction:column; }
        .afd-top { width:min(1100px,calc(100% - 40px)); margin:0 auto; padding:28px 0 20px; display:flex; align-items:center; gap:14px; }
        .afd-logo { width:72px; height:auto; }
        .afd-brand { color:var(--red); font-size:13px; letter-spacing:.12em; text-transform:uppercase; font-weight:800; }
        .afd-main { flex:1; width:min(1100px,calc(100% - 40px)); margin:0 auto; display:grid; grid-template-columns:minmax(0,1.05fr) minmax(360px,.72fr); gap:64px; align-items:center; padding:28px 0 64px; }
        .afd-copy h1 { margin:0 0 18px; max-width:650px; font-size:clamp(38px,5.2vw,64px); line-height:1.02; letter-spacing:-.035em; font-weight:850; }
        .afd-copy h1 span { color:var(--red); }
        .afd-copy p { margin:0; max-width:590px; color:#5F5F5F; font-size:17px; line-height:1.65; }
        .afd-points { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-top:30px; max-width:650px; }
        .afd-point { background:#fff; border:1px solid #E4E4E4; border-radius:12px; padding:14px 15px; font-size:12px; line-height:1.4; color:#555; }
        .afd-point strong { display:block; color:var(--charcoal); font-size:13px; margin-bottom:3px; }
        .afd-card { background:#fff; border:1px solid #E1E1E1; border-radius:18px; box-shadow:0 18px 55px rgba(0,0,0,.08); padding:30px; }
        .afd-card h2 { margin:0 0 7px; font-size:24px; line-height:1.2; }
        .afd-sub { margin:0 0 22px; color:#6C6C6C; font-size:13px; line-height:1.5; }
        .afd-field { margin-bottom:13px; }
        .afd-field label { display:block; margin-bottom:6px; font-size:12px; font-weight:700; color:#444; }
        .afd-field input { width:100%; border:1px solid #CBCBCB; border-radius:8px; padding:11px 12px; font:inherit; font-size:14px; outline:none; background:#fff; }
        .afd-field input:focus { border-color:var(--red); box-shadow:0 0 0 3px rgba(204,0,0,.08); }
        .afd-primary { width:100%; border:0; border-radius:8px; background:var(--red); color:#fff; padding:11px 14px; font-size:14px; font-weight:800; cursor:pointer; }
        .afd-primary:hover:not(:disabled) { background:var(--red-dark); }
        .afd-primary:disabled { opacity:.6; cursor:wait; }
        .afd-switch { margin-top:13px; text-align:center; }
        .afd-switch button { border:0; background:none; color:var(--red); text-decoration:underline; font-size:12px; cursor:pointer; padding:2px 4px; }
        .afd-sent { border:1px solid #CFE8D8; background:#F4FBF6; color:#27653A; border-radius:10px; padding:12px 13px; font-size:13px; line-height:1.5; margin-bottom:14px; }
        .afd-error { border:1px solid #F0B4B4; background:#FFF4F4; color:#8F1D1D; border-radius:8px; padding:9px 11px; margin:12px 0 0; font-size:12px; line-height:1.4; }
        .afd-note { margin-top:18px; padding-top:16px; border-top:1px solid #ECECEC; color:#7A7A7A; font-size:11px; line-height:1.5; }
        .afd-note a { color:#666; }
        .afd-footer { width:min(1100px,calc(100% - 40px)); margin:0 auto; padding:18px 0 28px; border-top:1px solid #E1E1E1; display:flex; justify-content:space-between; gap:20px; flex-wrap:wrap; color:#8A8A8A; font-size:11px; }
        .afd-footer a { color:#777; }
        @media(max-width:860px){ .afd-main{grid-template-columns:1fr;gap:34px;align-items:start}.afd-copy h1{font-size:clamp(34px,9vw,52px)}.afd-points{grid-template-columns:1fr 1fr 1fr}.afd-card{max-width:520px;width:100%} }
        @media(max-width:560px){ .afd-top,.afd-main,.afd-footer{width:min(100% - 28px,1100px)}.afd-top{padding-top:20px}.afd-main{padding-top:16px}.afd-points{grid-template-columns:1fr}.afd-card{padding:22px}.afd-copy p{font-size:15px} }
      `}</style>

      <header className="afd-top">
        <img className="afd-logo" src={cdwLogo} alt="CDW" />
        <div className="afd-brand">AI Factory Tools</div>
      </header>

      <main className="afd-main">
        <section className="afd-copy" aria-labelledby="afd-title">
          <h1 id="afd-title">Plan AI infrastructure with <span>fewer assumptions.</span></h1>
          <p>
            Size workloads, compare cloud and on-prem economics, evaluate model fit,
            and connect the results into one saved planning workspace.
          </p>
          <div className="afd-points" aria-label="AI Factory tool capabilities">
            <div className="afd-point"><strong>Size</strong>Translate workload demand into GPU class and count.</div>
            <div className="afd-point"><strong>Compare</strong>Pressure-test cloud, GPUaaS, and on-prem economics.</div>
            <div className="afd-point"><strong>Connect</strong>Carry your scenario across tools and into My Summary.</div>
          </div>
        </section>

        <section className="afd-card" aria-label={setupMode ? "Complete account setup" : "Sign in"}>
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
              <h2>Sign in to continue</h2>
              <p className="afd-sub">Your workspace saves the latest scenario from each AI Factory tool.</p>

              {mode === "magic" && linkSent && (
                <div className="afd-sent" role="status">Sign-in link sent to <strong>{email}</strong>. You can leave this tab open.</div>
              )}

              <div className="afd-field">
                <label htmlFor="afd-email">Work email</label>
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

              <div className="afd-note">
                Access is authenticated through the AI Factory account service. Password sign-in is a temporary compatibility option for provisioned users while corporate email delivery is being finalized.
              </div>
            </form>
          )}
        </section>
      </main>

      <footer className="afd-footer">
        <span>CDW AI Factory · Planning estimates are directional until validated with a CDW specialist.</span>
        <span><a href={SITE_USE_URL} target="_blank" rel="noreferrer">Site Use</a> · <a href={PRIVACY_URL} target="_blank" rel="noreferrer">Privacy Notice</a></span>
      </footer>
    </div>
  );
}

export default function LoginFrontDoor({ children }) {
  return <AuthProvider><LoginFrontDoorInner>{children}</LoginFrontDoorInner></AuthProvider>;
}
