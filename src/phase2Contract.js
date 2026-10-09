// Phase 2 shared contract.
//
// This module intentionally contains no calculator-specific formulas. It defines
// how Phase 2 values identify their origin, declare dependencies, become stale,
// and are explicitly accepted/recomputed/reverted before they can replace a
// Phase 1/TCO reference value.

export const PHASE2_SOURCE = Object.freeze({
  LISTED: "LISTED",
  CUSTOMER: "CUSTOMER",
  EST: "EST",
  QUOTE: "QUOTE",
});

export const PHASE2_DERIVATION = Object.freeze({
  DIRECT: "DIRECT",
  CALCULATED: "CALCULATED",
  NODE_NORM: "NODE-NORM",
});

export const PHASE2_STATE = Object.freeze({
  CURRENT: "CURRENT",
  STALE: "STALE",
  RECOMPUTED: "RECOMPUTED",
  REVERTED: "REVERTED",
});

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeForFingerprint(value) {
  if (Array.isArray(value)) return value.map(normalizeForFingerprint);
  if (isPlainObject(value)) {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = normalizeForFingerprint(value[key]);
        return acc;
      }, {});
  }
  if (typeof value === "number" && Object.is(value, -0)) return 0;
  return value;
}

// Small deterministic FNV-1a hash. This is an integrity/version fingerprint,
// not a security primitive. Keeping it synchronous and dependency-free lets
// the same contract run in the browser, fixtures, and Node verification scripts.
export function fingerprintInputs(inputs) {
  const serialized = JSON.stringify(normalizeForFingerprint(inputs ?? {}));
  let hash = 0x811c9dc5;
  for (let i = 0; i < serialized.length; i += 1) {
    hash ^= serialized.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `p2-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function makeProvenance({ source, derivation, asOf = null, label = null } = {}) {
  if (!Object.values(PHASE2_SOURCE).includes(source)) {
    throw new Error(`Invalid Phase 2 provenance source: ${source}`);
  }
  if (!Object.values(PHASE2_DERIVATION).includes(derivation)) {
    throw new Error(`Invalid Phase 2 derivation: ${derivation}`);
  }
  return { source, derivation, asOf, label };
}

export function createPhase2Override({
  id,
  target,
  value,
  unit,
  sourceTool,
  provenance,
  dependencies = {},
  referenceValue = null,
  referenceUnit = unit,
  createdAt = new Date().toISOString(),
}) {
  if (!id || !target || !sourceTool || !unit) {
    throw new Error("Phase 2 override requires id, target, sourceTool, and unit");
  }
  if (!provenance?.source || !provenance?.derivation) {
    throw new Error("Phase 2 override requires source + derivation provenance");
  }

  const fingerprint = fingerprintInputs(dependencies);
  return {
    schemaVersion: 1,
    id,
    target,
    value,
    unit,
    sourceTool,
    provenance,
    dependencies,
    inputFingerprint: fingerprint,
    state: PHASE2_STATE.CURRENT,
    staleReason: null,
    createdAt,
    computedAt: createdAt,
    referenceValue,
    referenceUnit,
  };
}

export function evaluatePhase2Override(override, currentDependencies, reason = "An upstream input changed") {
  if (!override) throw new Error("Override is required");
  if (override.state === PHASE2_STATE.REVERTED) return override;

  const currentFingerprint = fingerprintInputs(currentDependencies);
  if (currentFingerprint === override.inputFingerprint) return override;

  return {
    ...override,
    state: PHASE2_STATE.STALE,
    staleReason: reason,
    currentInputFingerprint: currentFingerprint,
  };
}

export function recomputePhase2Override(
  override,
  { value, dependencies, provenance = override.provenance, computedAt = new Date().toISOString() },
) {
  if (!override) throw new Error("Override is required");
  return {
    ...override,
    value,
    provenance,
    dependencies,
    inputFingerprint: fingerprintInputs(dependencies),
    currentInputFingerprint: undefined,
    state: PHASE2_STATE.RECOMPUTED,
    staleReason: null,
    computedAt,
  };
}

export function markPhase2OverrideCurrent(override) {
  if (!override) throw new Error("Override is required");
  if (override.state === PHASE2_STATE.REVERTED) return override;
  return { ...override, state: PHASE2_STATE.CURRENT, staleReason: null };
}

export function revertPhase2Override(override, revertedAt = new Date().toISOString()) {
  if (!override) throw new Error("Override is required");
  return {
    ...override,
    state: PHASE2_STATE.REVERTED,
    staleReason: null,
    revertedAt,
  };
}

export function phase2OverrideCanWriteBack(override) {
  return override?.state === PHASE2_STATE.CURRENT || override?.state === PHASE2_STATE.RECOMPUTED;
}

export function validatePhase2Override(override) {
  const errors = [];
  if (!override || typeof override !== "object") return { valid: false, errors: ["override must be an object"] };
  if (override.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  if (!override.id) errors.push("id is required");
  if (!override.target) errors.push("target is required");
  if (!override.sourceTool) errors.push("sourceTool is required");
  if (!override.unit) errors.push("unit is required");
  if (!Object.values(PHASE2_SOURCE).includes(override.provenance?.source)) errors.push("invalid provenance source");
  if (!Object.values(PHASE2_DERIVATION).includes(override.provenance?.derivation)) errors.push("invalid derivation");
  if (!Object.values(PHASE2_STATE).includes(override.state)) errors.push("invalid state");
  if (!override.inputFingerprint) errors.push("inputFingerprint is required");
  return { valid: errors.length === 0, errors };
}
