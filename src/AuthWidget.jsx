import React, { useState } from "react";
import { useAuth } from "./AuthContext";

const RED = "#CC0000";
const CHARCOAL = "#2D2D2D";
const BORDER = "#D1D5DB";

export default function AuthWidget() {
  const { isLoggedIn, needsSetup, account, signInWithEmail, signInWithPassword, signOut, completeSetup, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("magic");
  const [linkSent, setLinkSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [savingSetup, setSavingSetup] = useState(false);
  const [error, setError] = useState(null);

  if (loading) return null;

  const inputStyle = {
    border: `1px solid ${BORDER}`,
    borderRadius: 6,
    padding: "6px 10px",
    fontSize: 13,
    fontFamily: "inherit",
  };
  const buttonStyle = {
    background: RED,
    color: "#fff",
    border: "none",
    borderRadius: 6,
    padding: "6px 14px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  };
  const linkButtonStyle = {
    background: "none",
    border: "none",
    color: RED,
    fontSize: 12,
    cursor: "pointer",
    padding: 0,
    textDecoration: "underline",
  };

  if (isLoggedIn && !needsSetup) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: CHARCOAL }}>
        <span>{account?.name || account?.email}</span>
        <a href="/summary" style={{ color: RED, fontSize: 12, fontWeight: 600, textDecoration: "none" }}>My Summary</a>
        <button onClick={signOut} style={{ background: "none", border: "none", color: "#999", cursor: "pointer", fontSize: 12, textDecoration: "underline", padding: 0 }}>Sign out</button>
      </div>
    );
  }

  if (isLoggedIn && needsSetup) {
    return (
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setSavingSetup(true);
          setError(null);
          const { error } = await completeSetup({ name, company });
          setSavingSetup(false);
          if (error) setError(error.message);
        }}
        style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}
      >
        <input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required style={{ ...inputStyle, width: 120 }} />
        <input placeholder="Company" value={company} onChange={(e) => setCompany(e.target.value)} required style={{ ...inputStyle, width: 140 }} />
        <button type="submit" disabled={savingSetup} style={buttonStyle}>{savingSetup ? "Saving..." : "Continue"}</button>
        {error && <span style={{ color: RED, fontSize: 12 }}>{error}</span>}
      </form>
    );
  }

  if (mode === "magic" && linkSent) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: CHARCOAL, flexWrap: "wrap" }}>
        <span>Check <strong>{email}</strong> for a sign-in link.</span>
        <button type="button" style={linkButtonStyle} onClick={() => { setMode("password"); setLinkSent(false); setError(null); }}>Use password instead</button>
      </div>
    );
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setSending(true);
        setError(null);
        const result = mode === "password"
          ? await signInWithPassword(email, password)
          : await signInWithEmail(email);
        setSending(false);
        if (result.error) setError(result.error.message);
        else if (mode === "magic") setLinkSent(true);
      }}
      style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, flexWrap: "wrap" }}
    >
      <input type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ ...inputStyle, width: 180 }} />
      {mode === "password" && (
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ ...inputStyle, width: 150 }} />
      )}
      <button type="submit" disabled={sending} style={buttonStyle}>
        {sending ? "Signing in..." : mode === "password" ? "Sign in" : "Send magic link"}
      </button>
      <button
        type="button"
        style={linkButtonStyle}
        onClick={() => {
          setMode(mode === "password" ? "magic" : "password");
          setLinkSent(false);
          setPassword("");
          setError(null);
        }}
      >
        {mode === "password" ? "Use magic link" : "Use password"}
      </button>
      {error && <span style={{ color: RED, fontSize: 12 }}>{error}</span>}
    </form>
  );
}
