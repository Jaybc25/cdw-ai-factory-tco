import React, { createContext, useContext, useEffect, useRef, useState } from "react";
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

      // Fire the Slack notification directly from the client, rather than
      // relying on a Supabase Database Webhook -- this project is hitting a
      // known Supabase platform bug ("schema supabase_functions does not
      // exist") that blocks database-triggered webhooks entirely. Calling
      // the same Edge Function directly sidesteps it. Best-effort: a failed
      // notification should never block the download the user actually asked
      // for, so this failure is only logged, never surfaced to the user.
      supabase.functions
        .invoke("bright-endpoint", { body: { record: insertedRow } })
        .catch((err) => console.error("Failed to send download notification:", err));
    } catch (err) {
      console.error("Failed to log download event:", err);
    }
  }

  // Saves this tool's CURRENT state to the account -- overwritten each call,
  // not appended (see tool_snapshots' unique(account_id, tool) constraint).
  // This is what powers the Combined Summary: it captures where someone
  // stands even if they never clicked "get report" on this specific tool.
  // Fire-and-forget, same reasoning as logDownloadEvent -- a save failure
  // should never interrupt someone using the tool.
  async function saveSnapshot(tool, inputs, summary) {
    if (!session?.user?.id) return;
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

// Drop this one line into any tool to get autosave for free:
//   useAutosaveSnapshot("tco", inputs, summaryObject);
// Debounced -- waits for a pause in changes before saving, so it doesn't
// fire on every keystroke. Does nothing while signed out.
//
// Fix (Bug 4, autosave debounce lost update): every cross-tool link in this
// app is a plain <a href> full page load, not client-side routing (see
// sessionState.js) -- so an edit made less than `delayMs` before the user
// navigates away schedules this setTimeout, then the browsing context that
// owns it is torn down mid-wait as the page unloads. It's not that React
// cleans the timer up and cancels it on purpose; the timer simply never
// gets the chance to fire at all, so that last edit never reaches the
// account snapshot even though the tool's own sessionStorage state (a
// separate, always-synchronous persistence layer -- see sessionState.js)
// is already correct. The exposure: a user who edits, then immediately
// jumps tools or straight to My Summary/a PPTX export without ever
// revisiting this tool gets a report reflecting the state minus that edit.
//
// Fix: also flush the pending save the moment the page is actually being
// left, via `pagehide` (the modern, bfcache-safe event for this -- not
// `beforeunload`, which several browsers now discourage/penalize) and a
// `visibilitychange`-to-hidden fallback for mobile Safari and backgrounded
// tabs, where `pagehide` doesn't always fire before the page is suspended.
// A ref holds the latest values so the flush handler never closes over a
// stale tool/inputs/summary from an earlier render.
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
