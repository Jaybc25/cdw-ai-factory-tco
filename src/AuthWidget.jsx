import React, { useState } from "react";
import { useAuth } from "./AuthContext";

const RED = "#CC0000";
const CHARCOAL = "#2D2D2D";
const BORDER = "#D1D5DB";

// Drop <AuthWidget /> into any tool's header (inside an <AuthProvider>).
// Handles all four states on its own: signed out, magic-link-sent,
// needs-first-time-setup, and signed in.
export default function AuthWidget() {
  const { isLoggedIn, needsSetup, account, signInWithEmail, signOut, completeSetup, loading } = useAuth();
  const [email, setEmail] = useState("");
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

  // --- Signed in and fully set up: just show who's logged in ---
  if (isLoggedIn && !needsSetup) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: CHARCOAL }}>
        <span>{account?.name || account?.email}</span>
        <button
          onClick={signOut}
          style={{ background: "none", border: "none", color: "#999", cursor: "pointer", fontSize: 12, textDecoration: "underline", padding: 0 }}
        >
          Sign out
        </button>
      </div>
    );
  }

  // --- Signed in, first login: capture name + company once ---
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
        <input
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          style={{ ...inputStyle, width: 120 }}
        />
        <input
          placeholder="Company"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          required
          style={{ ...inputStyle, width: 140 }}
        />
        <button type="submit" disabled={savingSetup} style={buttonStyle}>
          {savingSetup ? "Saving..." : "Continue"}
        </button>
        {error && <span style={{ color: RED, fontSize: 12 }}>{error}</span>}
      </form>
    );
  }

  // --- Signed out, link already sent: waiting for click-through ---
  if (linkSent) {
    return (
      <div style={{ fontSize: 13, color: CHARCOAL }}>
        Check <strong>{email}</strong> for a sign-in link.
      </div>
    );
  }

  // --- Signed out: email input + send magic link ---
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setSending(true);
        setError(null);
        const { error } = await signInWithEmail(email);
        setSending(false);
        if (error) setError(error.message);
        else setLinkSent(true);
      }}
      style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}
    >
      <input
        type="email"
        placeholder="you@company.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        style={{ ...inputStyle, width: 180 }}
      />
      <button type="submit" disabled={sending} style={buttonStyle}>
        {sending ? "Sending..." : "Sign in"}
      </button>
      {error && <span style={{ color: RED, fontSize: 12 }}>{error}</span>}
    </form>
  );
}
