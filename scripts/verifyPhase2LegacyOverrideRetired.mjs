import assert from "node:assert/strict";

class MemoryStorage {
  constructor() { this.map = new Map(); }
  get length() { return this.map.size; }
  key(index) { return [...this.map.keys()][index] ?? null; }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) { this.map.set(String(key), String(value)); }
  removeItem(key) { this.map.delete(key); }
  clear() { this.map.clear(); }
}

const sessionStorage = new MemoryStorage();
const localStorage = new MemoryStorage();
const listeners = [];

globalThis.sessionStorage = sessionStorage;
globalThis.window = {
  sessionStorage,
  localStorage,
  location: { pathname: "/__phase2/tco" },
  addEventListener(type, handler, capture) { listeners.push({ type, handler, capture }); },
};
globalThis.document = {};

const { loadSessionState, saveSessionState } = await import("../src/sessionState.js");

const prefix = "ai-factory-session:";
const legacyKey = "phase2-preview-override";
const normalKey = "phase2-power-writeback";

sessionStorage.setItem(prefix + legacyKey, JSON.stringify({
  source: "power-planner",
  override: { id: "power.facility-burden.monthly", value: 50000 },
}));

assert.equal(loadSessionState(legacyKey), null, "legacy single-override channel must never be read");
assert.equal(sessionStorage.getItem(prefix + legacyKey), null, "reading the retired channel should purge any stale legacy value");

saveSessionState(legacyKey, {
  source: "power-planner",
  override: { id: "power.energy.monthly", value: 12000 },
});
assert.equal(sessionStorage.getItem(prefix + legacyKey), null, "legacy single-override channel must never be written again");

const authoritativeBundle = {
  sourceTool: "power-planner",
  overrides: [
    { id: "power.energy.monthly", value: 12000 },
    { id: "power.facility-burden.monthly", value: 8000 },
  ],
};
saveSessionState(normalKey, authoritativeBundle);
assert.deepEqual(loadSessionState(normalKey), authoritativeBundle, "complete accepted Power bundle remains the authoritative handoff");

console.log("Phase 2 legacy single-override retirement verification: PASS");
