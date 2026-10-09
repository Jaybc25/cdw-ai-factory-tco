import assert from "node:assert/strict";

const store = new Map();
global.sessionStorage = {
  get length() { return store.size; },
  key(index) { return [...store.keys()][index] ?? null; },
  getItem(key) { return store.has(key) ? store.get(key) : null; },
  setItem(key, value) { store.set(key, String(value)); },
  removeItem(key) { store.delete(key); },
};

global.window = {
  location: { pathname: "/__phase2/storage" },
  localStorage: {
    getItem() { return "0"; },
  },
  addEventListener() {},
};
global.document = {};

const {
  saveSessionState,
  loadSessionState,
  markPhase2BundleStale,
  markPhase2SessionBundleStale,
  phase2BundleKeyForPath,
} = await import("../src/sessionState.js");

assert.equal(phase2BundleKeyForPath("/__phase2/storage"), "phase2-storage-writeback");
assert.equal(phase2BundleKeyForPath("/__phase2/storage/"), "phase2-storage-writeback", "trailing slash must resolve to the same stale-guard bundle");
assert.equal(phase2BundleKeyForPath("/__phase2/network///"), "phase2-network-writeback", "multiple trailing slashes must normalize safely");
assert.equal(phase2BundleKeyForPath("/__phase2"), null, "non-tool Phase 2 routes must not stale a tool bundle");

const current = {
  fingerprint: "storage-current",
  stale: false,
  overrides: [
    { id: "capacity", state: "CURRENT" },
    { id: "reverted", state: "REVERTED" },
  ],
  requirements: { totalRawTb: 1000 },
};

const stale = markPhase2BundleStale(current, "Edited after acceptance", "2026-10-09T13:00:00Z");
assert.equal(stale.stale, true);
assert.equal(stale.staleReason, "Edited after acceptance");
assert.equal(stale.staleAt, "2026-10-09T13:00:00Z");
assert.equal(stale.overrides[0].state, "STALE");
assert.equal(stale.overrides[0].staleReason, "Edited after acceptance");
assert.equal(stale.overrides[1].state, "REVERTED", "reverted overrides must remain reverted");
assert.equal(stale.requirements.stale, true);

saveSessionState("phase2-storage-writeback", current);
const persisted = markPhase2SessionBundleStale("phase2-storage-writeback", "Local input changed");
assert.equal(persisted.stale, true);
assert.equal(loadSessionState("phase2-storage-writeback").stale, true);
assert.equal(loadSessionState("phase2-storage-writeback").overrides[0].state, "STALE");

const requirementOnly = {
  fingerprint: "fabric-current",
  stale: false,
  overrides: [],
  requirements: { topology: "leaf-spine" },
};
saveSessionState("phase2-network-writeback", requirementOnly);
const staleRequirementOnly = markPhase2SessionBundleStale("phase2-network-writeback", "Fabric input changed");
assert.equal(staleRequirementOnly.stale, true, "bundles without cost overrides must still become stale");
assert.equal(staleRequirementOnly.requirements.stale, true);
assert.equal(staleRequirementOnly.overrides.length, 0);

const secondPass = markPhase2BundleStale(staleRequirementOnly, "different reason");
assert.equal(secondPass, staleRequirementOnly, "stale transition must be idempotent");

console.log("Phase 2 local-edit staleness persistence verification passed");
