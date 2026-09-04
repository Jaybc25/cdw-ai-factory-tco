import { supabase } from "./supabaseClient";
import { clearAllSessionState, hasAnySessionState } from "./sessionState.js";

export const READINESS_STORAGE_KEY = "cdw-readiness";
export const WORKSPACE_RESET_BARRIER_KEY = "ai-factory-workspace-reset-barrier";
export const WORKSPACE_RESET_EPOCH_KEY = "ai-factory-workspace-reset-epoch";

const RESET_GRACE_MS = 400;

function browserStorageAvailable() {
  return typeof window !== "undefined" && !!window.localStorage;
}

function makeResetId() {
  const randomPart = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
  return `${Date.now()}-${randomPart}`;
}

function publishBarrier(id, status) {
  if (!browserStorageAvailable()) return;
  try {
    window.localStorage.setItem(
      WORKSPACE_RESET_BARRIER_KEY,
      JSON.stringify({ id, status, at: new Date().toISOString() }),
    );
  } catch {
    // Cross-tab coordination is a hardening layer. The server delete and
    // current-tab storage clear still proceed if browser storage is blocked.
  }
}

export function getWorkspaceResetEpoch() {
  if (!browserStorageAvailable()) return "0";
  try {
    return window.localStorage.getItem(WORKSPACE_RESET_EPOCH_KEY) || "0";
  } catch {
    return "0";
  }
}

export function hasReadinessState() {
  if (!browserStorageAvailable()) return false;
  try {
    return window.localStorage.getItem(READINESS_STORAGE_KEY) != null;
  } catch {
    return false;
  }
}

export function hasLocalWorkspaceState() {
  return hasAnySessionState() || hasReadinessState();
}

export function clearLocalWorkspaceState() {
  clearAllSessionState();
  if (!browserStorageAvailable()) return;
  try {
    window.localStorage.removeItem(READINESS_STORAGE_KEY);
  } catch {
    // no-op; session-state clear still stands
  }
}

/**
 * Listen for resets initiated in another browser tab.
 *
 * pending: stop old tabs from writing snapshots while the reset is underway.
 * cancelled: release that write barrier if the server-side reset failed.
 * committed: clear this tab's local scenario state; the caller should keep
 *            autosave invalidated until the tab reloads or navigates.
 */
export function subscribeToWorkspaceReset(handler) {
  if (typeof window === "undefined") return () => {};

  function onStorage(event) {
    if (event.key === WORKSPACE_RESET_BARRIER_KEY && event.newValue) {
      try {
        handler({ kind: "barrier", ...JSON.parse(event.newValue) });
      } catch {
        // Ignore malformed coordination payloads.
      }
      return;
    }
    if (event.key === WORKSPACE_RESET_EPOCH_KEY && event.newValue) {
      handler({ kind: "committed", id: event.newValue });
    }
  }

  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}

/**
 * Determine whether Reset should be enabled on the home page.
 * A failed server check is treated as "unknown" rather than "empty" so the
 * UI never falsely disables the user's only recovery action.
 */
export async function inspectWorkspaceResetState() {
  const local = hasLocalWorkspaceState();

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    return { hasState: local || true, local, signedIn: false, checkFailed: true };
  }

  const userId = sessionData?.session?.user?.id;
  if (!userId) return { hasState: local, local, signedIn: false, checkFailed: false };

  const { data, error } = await supabase
    .from("tool_snapshots")
    .select("tool")
    .eq("account_id", userId)
    .limit(1);

  if (error) {
    return { hasState: true, local, signedIn: true, checkFailed: true };
  }

  return {
    hasState: local || (data?.length ?? 0) > 0,
    local,
    signedIn: true,
    checkFailed: false,
  };
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Reset the CURRENT scenario while preserving account/profile/auth identity
 * and historical download_events.
 *
 * Sequence matters:
 * 1. Publish a cross-tab write barrier so old tabs stop autosaving.
 * 2. Wait briefly for any already-dispatched pagehide flush to settle.
 * 3. Delete + verify server-side tool_snapshots for the signed-in account.
 * 4. Only after server success, clear browser scenario persistence.
 * 5. Publish the committed reset epoch so other tabs clear their local state.
 *
 * If the server delete fails, the barrier is cancelled and current-tab local
 * state is left intact. That prevents a partial "looks reset but My Summary
 * comes back" failure.
 */
export async function resetWorkspace() {
  const resetId = makeResetId();
  publishBarrier(resetId, "pending");

  try {
    // useAutosaveSnapshot flushes immediately on pagehide, but its network
    // request can outlive the old document. This grace window runs AFTER the
    // write barrier so no new old-scenario saves can start in other live tabs,
    // while an already-dispatched flush gets a chance to land before deletion.
    await wait(RESET_GRACE_MS);

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;

    const userId = sessionData?.session?.user?.id;
    if (userId) {
      const { error: deleteError } = await supabase
        .from("tool_snapshots")
        .delete()
        .eq("account_id", userId);
      if (deleteError) throw deleteError;

      // RLS can sometimes turn a disallowed mutation into zero affected rows
      // without making the UI symptom obvious. Read back the user's rows and
      // refuse to clear browser state unless the server is actually empty.
      const { data: remaining, error: verifyError } = await supabase
        .from("tool_snapshots")
        .select("tool")
        .eq("account_id", userId)
        .limit(1);
      if (verifyError) throw verifyError;
      if ((remaining?.length ?? 0) > 0) {
        throw new Error("Saved tool snapshots are still present after reset.");
      }
    }

    clearLocalWorkspaceState();

    if (browserStorageAvailable()) {
      try {
        window.localStorage.setItem(WORKSPACE_RESET_EPOCH_KEY, resetId);
      } catch {
        // Current tab is already cleared; cross-tab sync is best-effort.
      }
    }
    publishBarrier(resetId, "committed");

    return { ok: true, resetId, signedIn: !!userId };
  } catch (error) {
    publishBarrier(resetId, "cancelled");
    throw error;
  }
}
