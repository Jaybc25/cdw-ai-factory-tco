import { supabase } from "./supabaseClient";
import { clearAllSessionState, hasAnySessionState } from "./sessionState.js";

export const READINESS_STORAGE_KEY = "cdw-readiness";
export const WORKSPACE_RESET_BARRIER_KEY = "ai-factory-workspace-reset-barrier";
export const WORKSPACE_RESET_EPOCH_KEY = "ai-factory-workspace-reset-epoch";

const PRE_DELETE_GRACE_MS = 650;
const POST_DELETE_SETTLE_MS = 450;

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
    // Cross-tab coordination is best-effort.
  }
}

export function getWorkspaceResetBarrier() {
  if (!browserStorageAvailable()) return null;
  try {
    const raw = window.localStorage.getItem(WORKSPACE_RESET_BARRIER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
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
    // no-op
  }
}

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

async function deleteSnapshotsForAccount(userId) {
  const { error } = await supabase
    .from("tool_snapshots")
    .delete()
    .eq("account_id", userId);
  if (error) throw error;
}

async function verifySnapshotsEmpty(userId) {
  const { data, error } = await supabase
    .from("tool_snapshots")
    .select("tool")
    .eq("account_id", userId)
    .limit(1);
  if (error) throw error;
  if ((data?.length ?? 0) > 0) {
    throw new Error("Saved tool snapshots are still present after reset.");
  }
}

function commitBrowserReset(resetId) {
  if (browserStorageAvailable()) {
    try {
      window.localStorage.setItem(WORKSPACE_RESET_EPOCH_KEY, resetId);
    } catch {
      // Current-tab clear still proceeds.
    }
  }
  clearLocalWorkspaceState();
  publishBarrier(resetId, "committed");
}

/**
 * Signed-out/local-only action. Clears this browser's current scenario state,
 * but cannot and does not alter account-backed tool_snapshots / My Summary.
 */
export async function clearBrowserWorkspace() {
  const resetId = makeResetId();
  publishBarrier(resetId, "pending");
  try {
    commitBrowserReset(resetId);
    return { ok: true, resetId, scope: "browser" };
  } catch (error) {
    publishBarrier(resetId, "cancelled");
    throw error;
  }
}

/**
 * Signed-in GLOBAL reset. Clears current browser state and the signed-in
 * account's current tool_snapshots / My Summary data. Historical activity
 * such as download_events is preserved.
 */
export async function resetWorkspace() {
  const resetId = makeResetId();
  publishBarrier(resetId, "pending");

  try {
    await wait(PRE_DELETE_GRACE_MS);

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;

    const userId = sessionData?.session?.user?.id;
    if (!userId) {
      throw new Error("Sign in is required to clear saved account results and My Summary.");
    }

    await deleteSnapshotsForAccount(userId);
    await wait(POST_DELETE_SETTLE_MS);
    await deleteSnapshotsForAccount(userId);
    await verifySnapshotsEmpty(userId);

    commitBrowserReset(resetId);
    return { ok: true, resetId, scope: "account" };
  } catch (error) {
    publishBarrier(resetId, "cancelled");
    throw error;
  }
}
