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

function clearPrefixedSessionState() {
  const keys = [];
  for (let i = 0; i < sessionStorage.length; i += 1) {
    const key = sessionStorage.key(i);
    if (key?.startsWith(PREFIX)) keys.push(key);
  }
  keys.forEach((key) => sessionStorage.removeItem(key));
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
