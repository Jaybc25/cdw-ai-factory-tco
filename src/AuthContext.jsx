import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "./supabaseClient";
import { clearLocalWorkspaceState, getWorkspaceResetBarrier, subscribeToWorkspaceReset } from "./workspaceReset.js";

const AuthContext = createContext(null);
const SUPABASE_CONFIGURED = !!supabase;
const NO_AUTH_ERROR = () => ({ error: new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to enable login, snapshots, and download logging.") });

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const snapshotWritesBlockedRef = useRef(getWorkspaceResetBarrier()?.status === "pending");

  async function loadAccount(userId) {
    if (!SUPABASE_CONFIGURED) { setLoading(false); return; }
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
    if (!SUPABASE_CONFIGURED) {
      setLoading(false);
      const unsubscribeReset = subscribeToWorkspaceReset((event) => {
        if (event.kind === "barrier") {
          if (event.status === "pending") snapshotWritesBlockedRef.current = true;
          if (event.status === "cancelled") snapshotWritesBlockedRef.current = false;
          if (event.status === "committed") snapshotWritesBlockedRef.current = true;
          return;
        }
        if (event.kind === "committed") {
          snapshotWritesBlockedRef.current = true;
          clearLocalWorkspaceState();
        }
      });
      return () => unsubscribeReset();
    }

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

    const unsubscribeReset = subscribeToWorkspaceReset((event) => {
      if (event.kind === "barrier") {
        if (event.status === "pending") snapshotWritesBlockedRef.current = true;
        if (event.status === "cancelled") snapshotWritesBlockedRef.current = false;
        if (event.status === "committed") snapshotWritesBlockedRef.current = true;
        return;
      }
      if (event.kind === "committed") {
        // A reset completed in another tab. Keep this mounted tool from
        // recreating its deleted snapshot and clear this tab's scenario state.
        snapshotWritesBlockedRef.current = true;
        clearLocalWorkspaceState();
      }
    });

    return () => {
      listener.subscription.unsubscribe();
      unsubscribeReset();
    };
  }, []);

  async function signInWithEmail(email) {
    if (!SUPABASE_CONFIGURED) return NO_AUTH_ERROR();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.href },
    });
    return { error };
  }

  // Temporary compatibility path for explicitly provisioned users while
  // corporate mail filtering prevents magic-link delivery / preview redirects.
  // This still performs real Supabase authentication against the existing user
  // account and UID; it is not an email-only bypass and can be removed later.
  async function signInWithPassword(email, password) {
    if (!SUPABASE_CONFIGURED) return NO_AUTH_ERROR();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }

  async function signOut() {
    if (!SUPABASE_CONFIGURED) return NO_AUTH_ERROR();
    await supabase.auth.signOut();
  }

  async function completeSetup({ name, company }) {
    if (!SUPABASE_CONFIGURED) return NO_AUTH_ERROR();
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

  async function logDownloadEvent(tool, keyInputs) {
    if (!SUPABASE_CONFIGURED) return;
    if (!session?.user?.id) return;
    try {
      const { data: insertedRow, error } = await supabase
        .from("download_events")
        .insert({
          account_id: session.user.id,
          tool,
          key_inputs: keyInputs,
        })
        .select()
        .single();
      if (error) throw error;

      supabase.functions
        .invoke("bright-endpoint", { body: { record: insertedRow } })
        .catch((err) => console.error("Failed to send download notification:", err));
    } catch (err) {
      console.error("Failed to log download event:", err);
    }
  }

  // Saves this tool's CURRENT state to the account. Global Reset sets a
  // cross-tab write barrier before deleting tool_snapshots; while that barrier
  // is active, stale tabs are forbidden from recreating the scenario.
  async function saveSnapshot(tool, inputs, summary) {
    if (!SUPABASE_CONFIGURED) return;
    if (!session?.user?.id || snapshotWritesBlockedRef.current) return;
    try {
      const { error } = await supabase.from("tool_snapshots").upsert(
        {
          account_id: session.user.id,
          tool,
          inputs,
          summary,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "account_id,tool" }
      );
      if (error) throw error;
    } catch (err) {
      console.error("Failed to save tool snapshot:", err);
    }
  }

  const value = {
    session,
    account,
    loading,
    isLoggedIn: !!session,
    needsSetup: !!session && account && !account.setup_completed,
    signInWithEmail,
    signInWithPassword,
    signOut,
    completeSetup,
    logDownloadEvent,
    saveSnapshot,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside an AuthProvider");
  return ctx;
}

// Debounced account snapshot autosave. The pagehide/visibility flush protects
// last-second edits during normal cross-tool navigation. Global Reset's barrier
// is enforced inside saveSnapshot(), so those same flush paths cannot resurrect
// a scenario after Reset has begun.
export function useAutosaveSnapshot(tool, inputs, summary, delayMs = 1500) {
  const { saveSnapshot, isLoggedIn } = useAuth();
  const inputsKey = JSON.stringify(inputs);
  const summaryKey = JSON.stringify(summary);

  const latestRef = useRef({ tool, inputs, summary });
  latestRef.current = { tool, inputs, summary };

  useEffect(() => {
    if (!isLoggedIn) return;

    let fired = false;
    const id = setTimeout(() => {
      fired = true;
      saveSnapshot(tool, inputs, summary);
    }, delayMs);

    function flushIfPending() {
      if (fired) return;
      fired = true;
      clearTimeout(id);
      const { tool: t, inputs: i, summary: s } = latestRef.current;
      saveSnapshot(t, i, s);
    }
    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") flushIfPending();
    }

    window.addEventListener("pagehide", flushIfPending);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", flushIfPending);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (!fired) clearTimeout(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool, inputsKey, summaryKey, isLoggedIn, delayMs]);
}
