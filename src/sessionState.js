// Generic sessionStorage-backed state persistence so tweaking one tool,
// jumping to another, and coming back doesn't lose your inputs.
//
// Why this is needed: every cross-tool link (GPU Sizing -> TCO, TCO -> ROI,
// the home logo, etc.) is a plain <a href>, not client-side routing -- each
// click is a full browser page load, so every component fully remounts and
// loses all React state, in both directions, forward and via browser back.
//
// Precedence is per FIELD, not all-or-nothing across the whole saved object:
//   1. An incoming URL handoff value, for whichever specific fields that
//      handoff actually carries (e.g. GPU Sizing's model= handoff owns
//      infModel, nothing else -- concurrency, duty cycle, quant, etc. are
//      never part of any handoff)
//   2. Saved session state from a previous visit to this same tool in this
//      browser tab, for every other field
//   3. Hardcoded defaults, if neither of the above exists
//
// Concretely: arriving with a new model= does NOT wipe previously-tweaked
// concurrency or duty cycle just because *some* handoff param showed up.
// Each tool loads its saved state unconditionally, then layers only the
// specific fields its own handoff params own on top of that -- it never
// gates the whole saved object behind "was there any handoff at all."
//
// Deliberately sessionStorage, not localStorage: clears when the tab closes,
// so a customer's numbers from three weeks ago can't quietly resurface in a
// new working session and get mistaken for current inputs.

const PREFIX = "ai-factory-session:";
const RESET_EPOCH_KEY = "ai-factory-workspace-reset-epoch";
const RESET_EPOCH_SEEN_KEY = "ai-factory-workspace-reset-epoch-seen";

// Phase 2 originally used a single positional Power override as an early
// preview handoff. Power can now legitimately produce multiple override
// combinations (for example energy + facility, or an all-in colo facility
// line only), so that channel is ambiguous and must never be read or written.
// Complete accepted bundles are authoritative instead.
const DEPRECATED_SESSION_KEYS = new Set([
  "phase2-preview-override",
]);

const PHASE2_ROUTE_BUNDLE = Object.freeze({
  "/__phase2/storage": "phase2-storage-writeback",
  "/__phase2/network": "phase2-network-writeback",
  "/__phase2/power": "phase2-power-writeback",
  "/__phase2/software": "phase2-software-writeback",
});

export function phase2BundleKeyForPath(pathname) {
  if (typeof pathname !== "string") return null;
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return PHASE2_ROUTE_BUNDLE[normalized] || null;
}

function clearPrefixedSessionState() {
  const keys = [];
  for (let i = 0; i < sessionStorage.length; i += 1) {
    const key = sessionStorage.key(i);
    if (key?.startsWith(PREFIX)) keys.push(key);
  }
  keys.forEach((key) => sessionStorage.removeItem(key));
}

function retireDeprecatedSessionKey(key) {
  if (!DEPRECATED_SESSION_KEYS.has(key)) return false;
  try {
    sessionStorage.removeItem(PREFIX + key);
  } catch {
    // no-op
  }
  return true;
}

// A reset can be committed from another tab. Before any tool reads OR writes
// session state, compare the cross-tab reset epoch against what this tab has
// seen. If they differ, invalidate this tab first. This closes the edge case
// where a suspended/background tab misses the storage event and later tries
// to resurrect an old scenario.
function syncWorkspaceResetEpoch() {
  try {
    const currentEpoch = window.localStorage.getItem(RESET_EPOCH_KEY) || "0";
    const seenEpoch = sessionStorage.getItem(RESET_EPOCH_SEEN_KEY) || "0";
    if (currentEpoch !== seenEpoch) {
      clearPrefixedSessionState();
      sessionStorage.setItem(RESET_EPOCH_SEEN_KEY, currentEpoch);
    }
  } catch {
    // Storage may be unavailable in sandbox/private mode. Existing behavior
    // remains safe-to-default in that case.
  }
}

export function loadSessionState(key) {
  try {
    syncWorkspaceResetEpoch();
    if (retireDeprecatedSessionKey(key)) return null;
    const raw = sessionStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    // sessionStorage unavailable (private browsing, storage disabled) or the
    // saved value is corrupted JSON -- fail safe to defaults, never throw.
    return null;
  }
}

export function saveSessionState(key, stateObject) {
  try {
    syncWorkspaceResetEpoch();
    if (retireDeprecatedSessionKey(key)) return;
    sessionStorage.setItem(PREFIX + key, JSON.stringify(stateObject));
  } catch {
    // Storage full, unavailable, or the object contains something
    // unserializable -- this is a convenience feature, not critical, so
    // fail silently rather than break the tool over a save.
  }
}

export function clearSessionState(key) {
  try {
    sessionStorage.removeItem(PREFIX + key);
  } catch {
    // no-op
  }
}

export function markPhase2BundleStale(bundle, reason = "Local inputs changed after this result was accepted.", staleAt = new Date().toISOString()) {
  if (!bundle || bundle.stale) return bundle;
  const overrides = (bundle.overrides || []).map((override) => {
    if (override?.state === "REVERTED" || override?.state === "STALE") return override;
    return { ...override, state: "STALE", staleReason: reason };
  });
  return {
    ...bundle,
    stale: true,
    staleReason: reason,
    staleAt,
    overrides,
    requirements: bundle.requirements ? {
      ...bundle.requirements,
      stale: true,
      staleReason: reason,
      staleAt,
    } : bundle.requirements,
  };
}

export function markPhase2SessionBundleStale(key, reason) {
  const bundle = loadSessionState(key);
  if (!bundle || bundle.stale) return bundle;
  const next = markPhase2BundleStale(bundle, reason);
  saveSessionState(key, next);
  return next;
}

function installPhase2LocalEditStaleGuard() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__aiFactoryPhase2LocalEditStaleGuardInstalled) return;
  window.__aiFactoryPhase2LocalEditStaleGuardInstalled = true;

  const markCurrentRouteStale = (event) => {
    if (!event?.isTrusted) return;
    const key = phase2BundleKeyForPath(window.location.pathname);
    if (!key) return;
    const reason = "Local inputs changed after this result was accepted. Recompute and accept this tool again before client use or downstream write-back.";
    markPhase2SessionBundleStale(key, reason);
  };

  // `input` covers text/number edits as they happen. `change` covers selects,
  // radios and checkboxes. Some local mutations are button-driven (for example
  // adding/removing software rows or pulling accepted Storage into Fabric), so
  // button clicks also stale the previously accepted bundle. Accept/recompute
  // buttons may stale the old bundle a moment before writing the new accepted
  // bundle, which is safe and preserves the required explicit transition.
  window.addEventListener("input", markCurrentRouteStale, true);
  window.addEventListener("change", markCurrentRouteStale, true);
  window.addEventListener("click", (event) => {
    const target = event?.target;
    if (!target?.closest?.("button")) return;
    markCurrentRouteStale(event);
  }, true);
}

installPhase2LocalEditStaleGuard();

// Global Reset uses the prefix instead of a hardcoded list so any future tool
// that follows the shared sessionState convention is automatically included.
export function hasAnySessionState() {
  try {
    syncWorkspaceResetEpoch();
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(PREFIX)) return true;
    }
  } catch {
    // no-op
  }
  return false;
}

export function clearAllSessionState() {
  try {
    clearPrefixedSessionState();
    // Mark the current reset epoch as seen so the next state read doesn't
    // perform a second unnecessary clear in this tab.
    const currentEpoch = window.localStorage.getItem(RESET_EPOCH_KEY) || "0";
    sessionStorage.setItem(RESET_EPOCH_SEEN_KEY, currentEpoch);
  } catch {
    // no-op
  }
}
