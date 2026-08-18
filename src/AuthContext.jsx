import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

// ---------------------------------------------------------------------------
// Shared session + account state for every AI Factory tool.
// Wrap each tool's top-level component (or a shared App shell, if one gets
// built later) in <AuthProvider> once, then call useAuth() anywhere below it.
//
// Sign-in method: magic link (passwordless email OTP), not password-based.
// No password to set, reset, or leak, and it matches the low-friction bar
// this feature was scoped for -- log in once, not fight a password screen.
// ---------------------------------------------------------------------------

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadAccount(userId) {
    const { data, error } = await supabase
      .from("accounts")
      .select("*")
      .eq("id", userId)
      .single();
    if (error) {
      console.error("Failed to load account row:", error.message);
      setAccount(null);
    } else {
      setAccount(data);
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user?.id) loadAccount(session.user.id);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user?.id) {
        loadAccount(session.user.id);
      } else {
        setAccount(null);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function signInWithEmail(email) {
    // redirectTo brings the user back to whichever tool they started the
    // login from, not always the homepage -- window.location.href captures
    // that at click time.
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.href },
    });
    return { error };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function completeSetup({ name, company }) {
    if (!session?.user?.id) return { error: new Error("Not logged in") };
    const { data, error } = await supabase
      .from("accounts")
      .update({ name, company, setup_completed: true })
      .eq("id", session.user.id)
      .select()
      .single();
    if (!error) setAccount(data);
    return { error };
  }

  // Called from each tool's download button. Fire-and-forget by design --
  // a logging failure should never block the actual PDF download the user
  // asked for.
  async function logDownloadEvent(tool, keyInputs) {
    if (!session?.user?.id) return;
    try {
      await supabase.from("download_events").insert({
        account_id: session.user.id,
        tool,
        key_inputs: keyInputs,
      });
    } catch (err) {
      console.error("Failed to log download event:", err);
    }
  }

  const value = {
    session,
    account,
    loading,
    isLoggedIn: !!session,
    needsSetup: !!session && account && !account.setup_completed,
    signInWithEmail,
    signOut,
    completeSetup,
    logDownloadEvent,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside an AuthProvider");
  return ctx;
}
