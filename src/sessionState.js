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
//
// Usage in a tool component:
//   const saved = loadSessionState(KEY); // always load, regardless of handoff
//   const [foo, setFoo] = useState(() => (incomingFooParam ? handoffFoo : saved?.foo ?? DEFAULT_FOO));
//   const [bar, setBar] = useState(saved?.bar ?? DEFAULT_BAR); // never part of any handoff -- always prefers saved
//   ...
//   useEffect(() => {
//     saveSessionState(KEY, { foo, bar, baz, ... });
//   }, [foo, bar, baz, ...]);

const PREFIX = "ai-factory-session:";

export function loadSessionState(key) {
  try {
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
